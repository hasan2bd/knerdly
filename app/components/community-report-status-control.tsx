"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityReportStatusControlProps = {
  reportId: string;
};

type ReportStatus =
  | "reviewed"
  | "dismissed"
  | "action_taken";

const statusOptions: {
  value: ReportStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "reviewed",
    label: "Mark reviewed",
    description:
      "Keep the report on record without taking moderation action.",
  },
  {
    value: "dismissed",
    label: "Dismiss report",
    description:
      "Mark the report as reviewed with no action required.",
  },
  {
    value: "action_taken",
    label: "Action taken",
    description:
      "Record that moderation action was taken.",
  },
];

export default function CommunityReportStatusControl({
  reportId,
}: CommunityReportStatusControlProps) {
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] =
    useState<ReportStatus>("reviewed");

  const [confirming, setConfirming] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  function beginAction(status: ReportStatus) {
    setSelectedStatus(status);
    setError("");
    setConfirming(true);
  }

  function cancelAction() {
    if (loading) {
      return;
    }

    setConfirming(false);
    setError("");
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/reports/status",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportId,
            status: selectedStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to update this report."
        );
      }

      setConfirming(false);

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update this report."
      );
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    const selectedOption =
      statusOptions.find(
        (option) =>
          option.value === selectedStatus
      );

    return (
      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {selectedOption?.label}
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {selectedOption?.description}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Updating..."
                : "Confirm"}
            </button>

            <button
              type="button"
              onClick={cancelAction}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
      {statusOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() =>
            beginAction(option.value)
          }
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
