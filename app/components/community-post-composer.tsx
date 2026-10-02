"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityPostComposerProps = {
  communityId: string;
  role: "owner" | "admin" | "moderator" | "member";
};

const POST_TYPES = [
  {
    value: "discussion",
    label: "Discussion",
  },
  {
    value: "question",
    label: "Question",
  },
  {
    value: "resource",
    label: "Resource",
  },
  {
    value: "announcement",
    label: "Announcement",
  },
] as const;

type PostType =
  (typeof POST_TYPES)[number]["value"];

export default function CommunityPostComposer({
  communityId,
  role,
}: CommunityPostComposerProps) {
  const router = useRouter();

  const [postType, setPostType] =
    useState<PostType>("discussion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAnnounce =
    role === "owner" ||
    role === "admin" ||
    role === "moderator";

  async function submitPost() {
    if (isSubmitting) return;

    const trimmedContent = content.trim();
    const trimmedTitle = title.trim();

    setError("");
    setSuccess("");

    if (!trimmedContent) {
      setError("Please write something before posting.");
      return;
    }

    if (
      postType === "question" &&
      !trimmedTitle
    ) {
      setError(
        "Questions need a title."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/communities/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId,
            postType,
            title:
              postType === "question"
                ? trimmedTitle
                : null,
            content: trimmedContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not publish your post."
        );
        setIsSubmitting(false);
        return;
      }

      setTitle("");
      setContent("");
      setPostType("discussion");
      setSuccess("Your post has been published.");
      setIsSubmitting(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Community post creation error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a9891]">
            Community discussion
          </p>

          <h2 className="mt-1 text-lg font-semibold text-[#17352d]">
            Start a conversation
          </h2>
        </div>

        <span className="rounded-full bg-[#eef3ef] px-3 py-1.5 text-[10px] font-semibold text-[#557067]">
          Member
        </span>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {POST_TYPES.filter(
          (type) =>
            type.value !== "announcement" ||
            canAnnounce
        ).map((type) => {
          const isActive =
            postType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                setPostType(type.value)
              }
              className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition ${
                isActive
                  ? "bg-[#17352d] text-white"
                  : "border border-[#dce4de] bg-white text-[#557067] hover:border-[#b8c6bd] hover:text-[#17352d]"
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>

      {postType === "question" && (
        <div className="mt-4">
          <label
            htmlFor={`community-question-title-${communityId}`}
            className="mb-2 block text-xs font-semibold text-[#43544d]"
          >
            Question title
          </label>

          <input
            id={`community-question-title-${communityId}`}
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            maxLength={160}
            placeholder="What do you want to ask?"
            className="min-h-11 w-full rounded-2xl border border-[#dce4de] bg-[#fbfcfb] px-4 text-sm text-[#263a33] outline-none transition placeholder:text-[#9aa69f] focus:border-[#9aaca1] focus:bg-white"
          />
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor={`community-post-content-${communityId}`}
          className="mb-2 block text-xs font-semibold text-[#43544d]"
        >
          {postType === "question"
            ? "Details"
            : "Your post"}
        </label>

        <textarea
          id={`community-post-content-${communityId}`}
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          maxLength={5000}
          rows={5}
          placeholder={
            postType === "question"
              ? "Explain your question and give enough context for other students to help."
              : "Share an idea, resource, academic discovery, or something worth discussing."
          }
          className="w-full resize-y rounded-2xl border border-[#dce4de] bg-[#fbfcfb] px-4 py-3 text-sm leading-6 text-[#263a33] outline-none transition placeholder:text-[#9aa69f] focus:border-[#9aaca1] focus:bg-white"
        />

        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-[10px] text-[#9aa69f]">
            {content.length}/5000
          </span>

          <button
            type="button"
            onClick={submitPost}
            disabled={
              isSubmitting ||
              !content.trim()
            }
            className="min-h-10 rounded-full bg-[#17352d] px-5 text-xs font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Publishing..."
              : "Publish post"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-[#fff4f2] px-3 py-2 text-xs leading-5 text-[#a24d42]"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-[#eef5ef] px-3 py-2 text-xs leading-5 text-[#486a5d]"
        >
          {success}
        </p>
      )}
    </section>
  );
}
