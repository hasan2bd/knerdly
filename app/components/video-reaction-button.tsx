"use client";

import { useEffect, useState } from "react";

type VideoReactionButtonProps = {
  videoId: string;
};

export default function VideoReactionButton({
  videoId,
}: VideoReactionButtonProps) {
  const [count, setCount] = useState(0);
  const [reacted, setReacted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadReaction() {
      try {
        const response = await fetch(
          `/api/videos/reactions?videoId=${encodeURIComponent(
            videoId
          )}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load reaction."
          );
        }

        const data = await response.json();

        setCount(
          typeof data.count === "number"
            ? data.count
            : 0
        );

        setReacted(Boolean(data.reacted));
      } catch (error) {
        console.error(
          "Video reaction load error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadReaction();
  }, [videoId]);

  async function toggleReaction() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/videos/reactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update reaction."
        );
      }

      setReacted(Boolean(data.reacted));
      setCount(
        typeof data.count === "number"
          ? data.count
          : count
      );
    } catch (error) {
      console.error(
        "Video reaction error:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleReaction}
      disabled={
        loading || saving
      }
      aria-pressed={reacted}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${
        reacted
          ? "border-[#17352d] bg-[#17352d] text-white"
          : "border-[#d8e1db] bg-white text-[#557067] hover:border-[#17352d] hover:text-[#17352d]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={reacted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Zm0 10h9.3a2 2 0 0 0 1.9-1.4l2.1-6.5A2 2 0 0 0 18.4 9H14l.7-4.1A2.4 2.4 0 0 0 12.3 2L7 10v10Z"
        />
      </svg>

      <span>
        {count}
      </span>

      <span>
        {reacted ? "Liked" : "Like"}
      </span>
    </button>
  );
}