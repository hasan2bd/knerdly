"use client";

import { useState } from "react";

type Action =
  | "accept"
  | "decline"
  | "cancel";

type FriendshipActionButtonsProps = {
  friendshipId: string;
  mode: "incoming" | "outgoing";
  onComplete?: () => void;
};

export default function FriendshipActionButtons({
  friendshipId,
  mode,
  onComplete,
}: FriendshipActionButtonsProps) {
  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] = useState("");

  async function handleAction(action: Action) {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/friendships/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            friendshipId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not update this request."
        );
        setIsLoading(false);
        return;
      }

      onComplete?.();
    } catch (error) {
      console.error(
        "Friendship action error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );
      setIsLoading(false);
    }
  }

  if (mode === "incoming") {
    return (
      <div className="min-w-0 flex-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              handleAction("accept")
            }
            disabled={isLoading}
            className="min-h-10 flex-1 rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Updating..."
              : "Accept"}
          </button>

          <button
            type="button"
            onClick={() =>
              handleAction("decline")
            }
            disabled={isLoading}
            className="min-h-10 flex-1 rounded-full border border-[#dce4de] px-4 text-xs font-semibold text-[#557067] transition hover:border-[#aebdb4] hover:text-[#17352d] active:bg-[#f3f5f2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Decline
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-2 text-[10px] leading-4 text-[#a24d42]"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() =>
          handleAction("cancel")
        }
        disabled={isLoading}
        className="min-h-10 w-full rounded-full border border-[#dce4de] px-4 text-xs font-semibold text-[#557067] transition hover:border-[#aebdb4] hover:text-[#17352d] active:bg-[#f3f5f2] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "Cancelling..."
          : "Cancel request"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 text-[10px] leading-4 text-[#a24d42]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
