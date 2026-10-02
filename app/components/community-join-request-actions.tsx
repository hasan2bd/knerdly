"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityJoinRequestActionsProps = {
  requestId: string;
  applicantName: string;
};

export default function CommunityJoinRequestActions({
  requestId,
  applicantName,
}: CommunityJoinRequestActionsProps) {
  const router = useRouter();

  const [decision, setDecision] = useState<
    "approved" | "declined" | null
  >(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDecision(
    nextDecision: "approved" | "declined"
  ) {
    setError("");

    if (decision === nextDecision) {
      return;
    }

    setDecision(nextDecision);
  }

  async function confirmDecision() {
    if (!decision) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/join-requests",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            decision,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to process this join request."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
      setDecision(null);
    } finally {
      setIsLoading(false);
    }
  }

  function cancelDecision() {
    if (isLoading) {
      return;
    }

    setDecision(null);
    setError("");
  }

  if (decision) {
    const isApprove = decision === "approved";

    return (
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:w-auto sm:min-w-[250px]">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {isApprove
            ? `Approve ${applicantName}'s request?`
            : `Decline ${applicantName}'s request?`}
        </p>

        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {isApprove
            ? "They will become a member of this community."
            : "They will not be added to this community."}
        </p>

        {error && (
          <p className="mt-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={confirmDecision}
            disabled={isLoading}
            className={`min-h-10 flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isApprove
                ? "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isLoading
              ? "Processing..."
              : isApprove
                ? "Confirm"
                : "Decline"}
          </button>

          <button
            type="button"
            onClick={cancelDecision}
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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <button
        type="button"
        onClick={() => handleDecision("approved")}
        className="min-h-11 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
      >
        Approve
      </button>

      <button
        type="button"
        onClick={() => handleDecision("declined")}
        className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-red-300 hover:text-red-600"
      >
        Decline
      </button>

      {error && (
        <p className="text-xs font-medium text-red-600 sm:hidden">
          {error}
        </p>
      )}
    </div>
  );
}
