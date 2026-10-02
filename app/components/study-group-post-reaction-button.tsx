"use client";

import { useEffect, useState } from "react";

type StudyGroupPostReactionButtonProps = {
  studyGroupPostId: string;
};

type ReactionResponse = {
  count?: number;
  liked?: boolean;
  error?: string;
};

export default function StudyGroupPostReactionButton({
  studyGroupPostId,
}: StudyGroupPostReactionButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReaction() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/study-groups/posts/reactions?studyGroupPostId=${encodeURIComponent(
            studyGroupPostId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as ReactionResponse;

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load reaction."
          );
        }

        if (cancelled) {
          return;
        }

        setCount(data.count ?? 0);
        setLiked(Boolean(data.liked));
      } catch (reactionError) {
        if (cancelled) {
          return;
        }

        setError(
          reactionError instanceof Error
            ? reactionError.message
            : "Unable to load reaction."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReaction();

    return () => {
      cancelled = true;
    };
  }, [studyGroupPostId]);

  async function toggleReaction() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/study-groups/posts/reactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studyGroupPostId,
          }),
        }
      );

      const data =
        (await response.json()) as ReactionResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update reaction."
        );
      }

      setLiked(Boolean(data.liked));
      setCount(data.count ?? 0);
    } catch (reactionError) {
      setError(
        reactionError instanceof Error
          ? reactionError.message
          : "Unable to update reaction."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={toggleReaction}
        disabled={loading || submitting}
        aria-label={
          liked ? "Unlike this post" : "Like this post"
        }
        aria-pressed={liked}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold transition ${
          liked
            ? "bg-[#edf2eb] text-[#17352d]"
            : "text-[#718078] hover:bg-[#f3f5f2] hover:text-[#17352d]"
        } ${
          loading || submitting
            ? "cursor-wait opacity-60"
            : ""
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Zm0 10h9.4a2 2 0 0 0 1.9-1.4l2.1-6.5A2 2 0 0 0 18.5 9H14l.7-3.2A3 3 0 0 0 11.8 2L7 10v10Z"
          />
        </svg>

        <span>
          {liked ? "Liked" : "Like"}
        </span>

        <span className="tabular-nums">
          {loading ? "…" : count}
        </span>
      </button>

      {error && (
        <span
          role="alert"
          className="ml-2 max-w-[180px] truncate text-[10px] text-red-600"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}