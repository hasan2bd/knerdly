"use client";

import { useState } from "react";

type NotificationFriendRequestActionsProps = {
  friendshipId: string;
};

export default function NotificationFriendRequestActions({
  friendshipId,
}: NotificationFriendRequestActionsProps) {
  const [loading, setLoading] = useState<
    "accept" | "decline" | null
  >(null);

  const [error, setError] = useState("");

  async function respond(
    action: "accept" | "decline"
  ) {
    if (loading) {
      return;
    }

    setLoading(action);
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

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to update friend request."
        );
        setLoading(null);
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "Friend request response error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setLoading(null);
    }
  }

  return (
    <div
      className="mt-3"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={loading !== null}
          className="min-h-9 rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "accept"
            ? "Accepting..."
            : "Accept"}
        </button>

        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={loading !== null}
          className="min-h-9 rounded-full border border-[#d8e0da] bg-white px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "decline"
            ? "Declining..."
            : "Decline"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}