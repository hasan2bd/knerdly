"use client";

import { useState } from "react";

type CommunityReportButtonProps = {
  communityId: string;
  postId?: string;
  commentId?: string;
  answerId?: string;
};

const REASONS = [
  {
    value: "spam",
    label: "Spam",
  },
  {
    value: "harassment",
    label: "Harassment",
  },
  {
    value: "misinformation",
    label: "Misinformation",
  },
  {
    value: "inappropriate",
    label: "Inappropriate content",
  },
  {
    value: "off_topic",
    label: "Off-topic",
  },
  {
    value: "other",
    label: "Other",
  },
] as const;

export default function CommunityReportButton({
  communityId,
  postId,
  commentId,
  answerId,
}: CommunityReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] =
    useState(false);

  function resetForm() {
    setReason("");
    setDetails("");
    setMessage("");
    setSuccess(false);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reason) {
      setMessage(
        "Please select a reason for your report."
      );
      return;
    }

    if (details.length > 1000) {
      setMessage(
        "Additional details must be 1000 characters or fewer."
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/communities/reports",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId,
            postId,
            commentId,
            answerId,
            reason,
            details,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to submit the report."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        "Thanks. Your report has been submitted for review."
      );
    } catch {
      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        aria-label="Report content"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 21V5m0 0c4-3 8 3 14 0v9c-6 3-10-3-14 0"
          />
        </svg>

        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-report-title"
        >
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                  Community safety
                </p>

                <h2
                  id="community-report-title"
                  className="mt-2 font-[var(--font-playfair)] text-2xl font-semibold text-[var(--foreground)]"
                >
                  Report content
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Tell us what is wrong with this
                  content. Community managers can
                  review submitted reports.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close report dialog"
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-light)] text-lg text-[var(--primary)]">
                  ✓
                </div>

                <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">
                  Report submitted
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {message}
                </p>

                <button
                  type="button"
                  onClick={closeDialog}
                  className="mt-5 min-h-11 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-6"
              >
                <label
                  htmlFor="community-report-reason"
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  Reason
                </label>

                <select
                  id="community-report-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  disabled={submitting}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
                >
                  <option value="">
                    Select a reason
                  </option>

                  {REASONS.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>

                <label
                  htmlFor="community-report-details"
                  className="mt-5 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Additional details
                  <span className="ml-1 font-normal text-[var(--muted)]">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="community-report-details"
                  value={details}
                  onChange={(event) =>
                    setDetails(
                      event.target.value.slice(
                        0,
                        1000
                      )
                    )
                  }
                  disabled={submitting}
                  rows={4}
                  placeholder="Briefly explain the issue..."
                  className="mt-2 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] disabled:opacity-60"
                />

                <div className="mt-2 flex justify-end text-xs text-[var(--muted)]">
                  {details.length}/1000
                </div>

                {message && (
                  <div
                    role="alert"
                    className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                  >
                    {message}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={submitting}
                    className="min-h-11 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      submitting || !reason
                    }
                    className="min-h-11 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
