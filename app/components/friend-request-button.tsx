"use client";

import { useState } from "react";

type FriendRequestButtonProps = {
  userId: string;
};

export default function FriendRequestButton({
  userId,
}: FriendRequestButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent"
  >("idle");

  const [error, setError] = useState("");

  async function sendRequest() {
    if (status !== "idle") {
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const response = await fetch(
        "/api/friendships/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            addresseeId: userId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not send friend request."
        );
        setStatus("idle");
        return;
      }

      setStatus("sent");
    } catch (error) {
      console.error(
        "Friend request error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <span className="flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#dce4de] bg-[#edf2ee] px-4 text-xs font-semibold text-[#557067]">
        Request sent
      </span>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={sendRequest}
        disabled={status === "sending"}
        className="flex min-h-10 w-full items-center justify-center rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending"
          ? "Sending..."
          : "Add friend"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 text-center text-[10px] leading-4 text-[#a24d42]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
