"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityPostModerationButtonProps = {
  postId: string;
};

export default function CommunityPostModerationButton({
  postId,
}: CommunityPostModerationButtonProps) {
  const router = useRouter();

  const [removing, setRemoving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function removePost() {
    if (removing) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this community post? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/posts/moderate",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not remove this post."
        );
        setRemoving(false);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Community post moderation error:",
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
        onClick={removePost}
        disabled={removing}
        className="inline-flex min-h-9 items-center rounded-full border border-[#e4d3d0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#8a5c56] transition hover:border-[#cda8a2] hover:bg-[#fbf5f4] disabled:cursor-not-allowed disabled:opacity-50"
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
