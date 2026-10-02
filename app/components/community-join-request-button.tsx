"q1m8sa"
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JoinRequestStatus =
  | "none"
  | "pending"
  | "cancelled"
  | "declined";

type CommunityJoinRequestButtonProps = {
  communityId: string;
  initialStatus: JoinRequestStatus;
  isMember: boolean;
};

export default function CommunityJoinRequestButton({
  communityId,
  initialStatus,
  isMember,
}: CommunityJoinRequestButtonProps) {
  const router = useRouter();

  const [status, setStatus] =
    useState<JoinRequestStatus>(initialStatus);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendRequest() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/join-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to send the join request."
        );
      }

      setStatus("pending");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the join request."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function cancelRequest() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/join-requests",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to cancel the join request."
        );
      }

      setStatus("cancelled");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel the join request."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isMember) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {status === "pending" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)]">
            Request pending
          </span>

          <button
            type="button"
            onClick={cancelRequest}
            disabled={isLoading}
            className="min-h-11 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Cancelling..."
              : "Cancel request"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={sendRequest}
          disabled={isLoading}
          className="min-h-11 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Sending..."
            : status === "declined"
              ? "Request to join again"
              : status === "cancelled"
                ? "Request to join again"
                : "Request to join"}
        </button>
      )}

      {status === "declined" && (
        <p className="text-xs text-[var(--muted)]">
          Your previous request was declined. You can
          submit a new request.
        </p>
      )}

      {status === "cancelled" && (
        <p className="text-xs text-[var(--muted)]">
          Your previous request was cancelled.
        </p>
      )}

      {error && (
        <p
          className="text-xs font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
