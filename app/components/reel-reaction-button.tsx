"use client";

import { useEffect, useState } from "react";

type ReelReactionButtonProps = {
  reelId: string;
};

export default function ReelReactionButton({
  reelId,
}: ReelReactionButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReaction() {
      try {
        const response = await fetch(
          `/api/reels/reactions?reelId=${encodeURIComponent(
            reelId
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not load reaction."
          );
        }

        if (!cancelled) {
          setCount(data.count ?? 0);
          setLiked(Boolean(data.liked));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load reaction."
          );
        }
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
  }, [reelId]);

  async function toggleLike() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/reels/reactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reelId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update reaction."
        );
      }

      setCount(data.count ?? 0);
      setLiked(Boolean(data.liked));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update reaction."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={toggleLike}
        disabled={loading || submitting}
        aria-label={liked ? "Unlike Reel" : "Like Reel"}
        aria-pressed={liked}
        className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-sm transition ${
          liked
            ? "border-white bg-white text-[#17352d]"
            : "border-white/20 bg-black/45 text-white hover:bg-black/65"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.84 8.61a5.5 5.5 0 0 0-9.84-3.36L12 6.5l1-1.25a5.5 5.5 0 0 1 7.84 3.36c0 5.25-8.84 10.14-8.84 10.14S3.16 13.86 3.16 8.61A5.5 5.5 0 0 1 11 5.25L12 6.5"
          />
        </svg>
      </button>

      <span className="mt-1 text-xs font-semibold text-white">
        {loading ? "…" : count}
      </span>

      {error && (
        <span className="mt-2 max-w-24 text-center text-[9px] leading-3 text-red-200">
          {error}
        </span>
      )}
    </div>
  );
}