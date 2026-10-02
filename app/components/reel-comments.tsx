"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ReelComment = {
  id: string;
  reel_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author: Profile | null;
};

type ReelCommentsProps = {
  reelId: string;
};

const MAX_COMMENT_LENGTH = 2000;

function getInitials(profile: Profile | null) {
  if (!profile?.display_name) {
    return "K";
  }

  return (
    profile.display_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "K"
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function ReelComments({
  reelId,
}: ReelCommentsProps) {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<ReelComment | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadComments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/reels/comments?reelId=${encodeURIComponent(reelId)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load comments."
        );
      }

      setComments(data.comments ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load comments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [reelId]);

  const topLevelComments = useMemo(
    () =>
      comments.filter(
        (comment) => comment.parent_id === null
      ),
    [comments]
  );

  function repliesFor(commentId: string) {
    return comments.filter(
      (comment) => comment.parent_id === commentId
    );
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/reels/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reelId,
            content: trimmedContent,
            parentId: replyTo?.id ?? null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not post comment."
        );
      }

      setContent("");
      setReplyTo(null);

      await loadComments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not post comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-white sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Comments
          </h2>

          <p className="mt-1 text-xs text-white/50">
            {comments.length}{" "}
            {comments.length === 1 ? "comment" : "comments"}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs text-red-200"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-white/50">
          Loading comments...
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-white/70">
            No comments yet.
          </p>

          <p className="mt-1 text-xs text-white/40">
            Start the conversation.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {topLevelComments.map((comment) => {
            const profile = comment.author;
            const username =
              profile?.username || "new-member";
            const displayName =
              profile?.display_name || "Knerd";

            const replies = repliesFor(comment.id);

            return (
              <div key={comment.id}>
                <div className="flex gap-3">
                  <Link
                    href={`/profile/${username}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-[10px] font-semibold text-white"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(profile)
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
                      <Link
                        href={`/profile/${username}`}
                        className="text-xs font-semibold text-white hover:text-white/80"
                      >
                        {displayName}
                      </Link>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-white/80">
                        {comment.content}
                      </p>
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 px-1">
                      <span className="text-[10px] text-white/35">
                        {formatDate(comment.created_at)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo(comment)
                        }
                        className="text-[10px] font-semibold text-white/55 hover:text-white"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {replies.length > 0 && (
                  <div className="ml-12 mt-3 space-y-3 border-l border-white/10 pl-3">
                    {replies.map((reply) => {
                      const replyProfile = reply.author;
                      const replyUsername =
                        replyProfile?.username ||
                        "new-member";
                      const replyDisplayName =
                        replyProfile?.display_name ||
                        "Knerd";

                      return (
                        <div
                          key={reply.id}
                          className="flex gap-2.5"
                        >
                          <Link
                            href={`/profile/${replyUsername}`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-[9px] font-semibold text-white"
                          >
                            {replyProfile?.avatar_url ? (
                              <img
                                src={replyProfile.avatar_url}
                                alt={replyDisplayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(replyProfile)
                            )}
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                              <Link
                                href={`/profile/${replyUsername}`}
                                className="text-xs font-semibold text-white hover:text-white/80"
                              >
                                {replyDisplayName}
                              </Link>

                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-white/75">
                                {reply.content}
                              </p>
                            </div>

                            <p className="mt-1 px-1 text-[10px] text-white/30">
                              {formatDate(reply.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={submitComment}
        className="mt-5 border-t border-white/10 pt-4"
      >
        {replyTo && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] px-3 py-2">
            <p className="min-w-0 truncate text-xs text-white/60">
              Replying to{" "}
              <span className="font-semibold text-white/80">
                {replyTo.author?.display_name || "Knerd"}
              </span>
            </p>

            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="shrink-0 text-xs font-semibold text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        <textarea
          value={content}
          onChange={(event) =>
            setContent(
              event.target.value.slice(
                0,
                MAX_COMMENT_LENGTH
              )
            )
          }
          placeholder={
            replyTo
              ? "Write a reply..."
              : "Add a comment..."
          }
          rows={3}
          maxLength={MAX_COMMENT_LENGTH}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] text-white/30">
            {content.length}/{MAX_COMMENT_LENGTH}
          </span>

          <button
            type="submit"
            disabled={
              submitting || !content.trim()
            }
            className="min-h-10 rounded-full bg-white px-4 text-xs font-semibold text-[#17352d] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Posting..."
              : replyTo
                ? "Reply"
                : "Comment"}
          </button>
        </div>
      </form>
    </section>
  );
}