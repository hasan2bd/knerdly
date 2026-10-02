"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../supabase/client";

const postTypes = [
  { value: "thought", label: "Thought" },
  { value: "study_update", label: "Study update" },
  { value: "question", label: "Question" },
  { value: "progress", label: "Progress" },
  { value: "achievement", label: "Achievement" },
  { value: "recommendation", label: "Recommendation" },
];

export default function CreatePost() {
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("thought");
  const [visibility, setVisibility] = useState("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("Write something before publishing.");
      return;
    }

    if (trimmedContent.length > 5000) {
      setError("Your post cannot exceed 5000 characters.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Your session has expired. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        post_type: postType,
        content: trimmedContent,
        visibility,
      });

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setContent("");
    setPostType("thought");
    setVisibility("public");
    setIsSubmitting(false);

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[#dce4de] bg-white p-5"
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#17352d] text-sm font-semibold text-white">
          K
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setError("");
            }}
            placeholder="What are you learning today?"
            rows={4}
            maxLength={5000}
            className="w-full resize-none rounded-2xl bg-[#f3f5f2] px-4 py-4 text-sm leading-6 text-[#17352d] outline-none transition placeholder:text-[#8a9892] focus:bg-[#edf1ed] focus:ring-2 focus:ring-[#dce4de]"
          />

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {postTypes.map((type) => {
                const active = postType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPostType(type.value)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-[#17352d] bg-[#17352d] text-white"
                        : "border-[#dce4de] text-[#557067] hover:border-[#17352d]"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#edf0ed] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="post-visibility"
                  className="text-xs font-medium text-[#7b8983]"
                >
                  Visibility
                </label>

                <select
                  id="post-visibility"
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value)
                  }
                  className="rounded-full border border-[#dce4de] bg-white px-3 py-2 text-xs font-semibold text-[#557067] outline-none"
                >
                  <option value="public">Everyone</option>
                  <option value="friends">Friends</option>
                </select>

                <span className="text-xs text-[#9aa59f]">
                  {content.length}/5000
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="rounded-full bg-[#17352d] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Publishing..." : "Publish"}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-[#fff3f1] px-4 py-3 text-xs font-medium text-[#a24d42]"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
