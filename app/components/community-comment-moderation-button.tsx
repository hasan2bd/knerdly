"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityCommentModerationButtonProps = {
  commentId: string;
};

export default function CommunityCommentModerationButton({
  commentId,
}: CommunityCommentModerationButtonProps) {
  const router = useRouter();

  const [removing, setRemoving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function removeComment() {
    if (removing) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this comment? Any replies to this comment will also be removed."
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/comments/moderate",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commentId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not remove this comment."
        );

        setRemoving(false);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Community comment moderation error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={removeComment}
        disabled={removing}
        aria-label="Remove comment"
        className="inline-flex min-h-8 items-center rounded-full border border-[#e4d3d0] bg-white px-3 py-1 text-[10px] font-semibold text-[#8a5c56] transition hover:border-[#cda8a2] hover:bg-[#fbf5f4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {removing
          ? "Removing..."
          : "Remove"}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-48 text-right text-[10px] leading-4 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
