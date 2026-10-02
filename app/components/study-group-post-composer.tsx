"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type StudyGroupPostComposerProps = {
  groupId: string;
};

const postTypes = [
  {
    value: "discussion",
    label: "Discussion",
    description: "Start a conversation",
  },
  {
    value: "question",
    label: "Question",
    description: "Ask the group",
  },
  {
    value: "resource",
    label: "Resource",
    description: "Share something useful",
  },
  {
    value: "announcement",
    label: "Announcement",
    description: "Share an important update",
  },
];

export default function StudyGroupPostComposer({
  groupId,
}: StudyGroupPostComposerProps) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [postType, setPostType] =
    useState("discussion");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("Write something before publishing.");
      return;
    }

    if (trimmedContent.length > 5000) {
      setError(
        "Your post must be 5000 characters or fewer."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/study-groups/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupId,
            content: trimmedContent,
            postType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to publish your post."
        );
        return;
      }

      setContent("");
      setPostType("discussion");
      setSuccess("Your post has been published.");

      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
          Start a discussion
        </p>

        <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold text-[#17352d]">
          Share with the group
        </h2>
      </div>

      {/* Post type */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {postTypes.map((type) => {
          const active = postType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                setPostType(type.value)
              }
              className={`min-h-16 rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[#17352d] bg-[#edf2ee] text-[#17352d]"
                  : "border-[#dfe6e1] bg-white text-[#718078] hover:border-[#bcc9c1]"
              }`}
              aria-pressed={active}
            >
              <span className="block text-xs font-semibold">
                {type.label}
              </span>

              <span className="mt-1 block text-[10px] leading-4 text-[#8a9891]">
                {type.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-4">
        <label
          htmlFor="study-group-post"
          className="sr-only"
        >
          Post content
        </label>

        <textarea
          id="study-group-post"
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          placeholder="What would you like to discuss with the group?"
          rows={5}
          maxLength={5000}
          disabled={loading}
          className="w-full resize-none rounded-2xl border border-[#dfe6e1] bg-[#f7f8f5] px-4 py-3 text-sm leading-6 text-[#17352d] outline-none transition placeholder:text-[#9aa69f] focus:border-[#9aab9f] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-[#9aa69f]">
            Keep discussions focused and useful.
          </p>

          <p className="shrink-0 text-xs text-[#9aa69f]">
            {content.length}/5000
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-[#edf2ee] px-3 py-2 text-xs text-[#557067]"
        >
          {success}
        </p>
      )}

      {/* Submit */}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={
            loading || !content.trim()
          }
          className="min-h-11 rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Publishing..."
            : "Publish post"}
        </button>
      </div>
    </form>
  );
}
