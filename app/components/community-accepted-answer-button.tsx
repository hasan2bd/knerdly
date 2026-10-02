"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityAcceptedAnswerButtonProps = {
  postId: string;
  commentId: string;
  isAccepted: boolean;
};

export default function CommunityAcceptedAnswerButton({
  postId,
  commentId,
  isAccepted,
}: CommunityAcceptedAnswerButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/answers",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId,
            commentId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to accept this answer."
        );
      }

      setShowConfirmation(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemove() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/answers",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId,
            commentId: null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to remove the accepted answer."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isAccepted) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--primary-light)] px-3.5 py-2 text-xs font-semibold text-[var(--primary)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12 4 4L19 6"
            />
          </svg>

          Accepted answer
        </span>

        <button
          type="button"
          onClick={handleRemove}
          disabled={isLoading}
          className="min-h-9 rounded-full px-3.5 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Removing..."
            : "Remove acceptance"}
        </button>

        {error && (
          <p className="basis-full text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Accept this answer?
        </p>

        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          This will mark this response as the accepted
          answer to your question.
        </p>

        {error && (
          <p className="mt-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Accepting..."
              : "Confirm"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowConfirmation(false);
              setError("");
            }}
            disabled={isLoading}
            className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowConfirmation(true);
        }}
        className="min-h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        Accept answer
      </button>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
