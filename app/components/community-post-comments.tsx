"use client";

import { useEffect, useMemo, useState } from "react";
import CommunityCommentModerationButton from "./community-comment-moderation-button";
import CommunityReportButton from "./community-report-button";

type CommunityComment = {
  id: string;
  community_post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type CommunityCommentAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommunityPostCommentsProps = {
  communityId: string;
  postId: string;
  comments: CommunityComment[];
  authors: CommunityCommentAuthor[];
  isMember: boolean;
  currentUserId: string;
  isCommunityManager: boolean;
};

function getInitials(
  displayName: string | null,
  username: string | null
) {
  const value =
    displayName?.trim() ||
    username?.trim() ||
    "Student";

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

function formatTime(
  value: string,
  now: number | null
) {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  if (now === null) {
    return date.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const seconds = Math.max(
    0,
    Math.floor((now - timestamp) / 1000)
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CommunityPostComments({
  communityId,
  postId,
  comments,
  authors,
  isMember,
  currentUserId,
  isCommunityManager,
}: CommunityPostCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");

  const [now, setNow] = useState<number | null>(
    null
  );

  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now());
    };

    updateNow();

    const interval = window.setInterval(
      updateNow,
      60_000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const authorMap = useMemo(() => {
    return new Map(
      authors.map((author) => [author.id, author])
    );
  }, [authors]);

  const topLevelComments = useMemo(() => {
    return comments.filter(
      (comment) => comment.parent_id === null
    );
  }, [comments]);

  function getReplies(commentId: string) {
    return comments.filter(
      (comment) => comment.parent_id === commentId
    );
  }

  function getAuthor(authorId: string) {
    return authorMap.get(authorId);
  }

  function startReply(commentId: string) {
    setReplyTo(commentId);
    setEditingId(null);
    setContent("");
    setError("");
    setIsOpen(true);
  }

  function startEdit(comment: CommunityComment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setReplyTo(null);
    setError("");
    setIsOpen(true);
  }

  function cancelComposer() {
    setReplyTo(null);
    setEditingId(null);
    setContent("");
    setEditContent("");
    setError("");
  }

  async function submitComment() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError(
        "Please write something before posting."
      );
      return;
    }

    if (trimmedContent.length > 2000) {
      setError(
        "Comments must be 2000 characters or fewer."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityPostId: postId,
            content: trimmedContent,
            parentId: replyTo,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to post comment."
        );
      }

      setContent("");
      setReplyTo(null);
      setIsOpen(true);

      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to post comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(commentId: string) {
    const trimmedContent = editContent.trim();

    if (!trimmedContent) {
      setError("Comment cannot be empty.");
      return;
    }

    if (trimmedContent.length > 2000) {
      setError(
        "Comments must be 2000 characters or fewer."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/comments",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commentId,
            content: trimmedContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to update comment."
        );
      }

      setEditingId(null);
      setEditContent("");

      window.location.reload();
    } catch (editError) {
      setError(
        editError instanceof Error
          ? editError.message
          : "Unable to update comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(commentId: string) {
    const confirmed = window.confirm(
      "Delete this comment?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(commentId);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/comments",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commentId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to delete comment."
        );
      }

      window.location.reload();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete comment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function renderComment(
    comment: CommunityComment,
    depth = 0
  ) {
    const author = getAuthor(comment.author_id);

    const displayName =
      author?.display_name ||
      author?.username ||
      "Student";

    const username =
      author?.username || "student";

    const replies = getReplies(comment.id);

    const isOwnComment =
      comment.author_id === currentUserId;

    const isEditing =
      editingId === comment.id;

    const visualDepth = Math.min(depth, 2);

    return (
      <div
        key={comment.id}
        className={
          visualDepth > 0
            ? "ml-6 border-l border-[var(--border)] pl-4 sm:ml-10 sm:pl-5"
            : ""
        }
      >
        <article className="py-4">
          <div className="flex items-start gap-3">
            <a
              href={
                author?.username
                  ? `/profile/${author.username}`
                  : "#"
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] text-[10px] font-bold text-[var(--primary)]"
              aria-label={`View ${displayName}'s profile`}
            >
              {author?.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(
                  author?.display_name ?? null,
                  author?.username ?? null
                )
              )}
            </a>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a
                  href={
                    author?.username
                      ? `/profile/${author.username}`
                      : "#"
                  }
                  className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                >
                  {displayName}
                </a>

                <span className="text-xs text-[var(--muted)]">
                  @{username}
                </span>

                <span className="text-xs text-[var(--muted)]">
                  ·
                </span>

                <span className="text-xs text-[var(--muted)]">
                  {formatTime(
                    comment.created_at,
                    now
                  )}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-3">
                  <textarea
                    value={editContent}
                    onChange={(event) =>
                      setEditContent(
                        event.target.value
                      )
                    }
                    maxLength={2000}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
                    aria-label="Edit comment"
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        saveEdit(comment.id)
                      }
                      disabled={submitting}
                      className="min-h-10 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Saving..."
                        : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                        setError("");
                      }}
                      disabled={submitting}
                      className="min-h-10 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                  {comment.content}
                </p>
              )}

              {!isEditing && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {isMember && (
                    <button
                      type="button"
                      onClick={() =>
                        startReply(comment.id)
                      }
                      className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--primary)]"
                    >
                      Reply
                    </button>
                  )}

                  <CommunityReportButton
                    communityId={communityId}
                    commentId={comment.id}
                  />

                  {isOwnComment && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(comment)
                        }
                        className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--primary)]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteComment(comment.id)
                        }
                        disabled={
                          deletingId === comment.id
                        }
                        className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === comment.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </>
                  )}

                  {isCommunityManager && (
                    <CommunityCommentModerationButton
                      commentId={comment.id}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </article>

        {replies.length > 0 && (
          <div>
            {replies.map((reply) =>
              renderComment(
                reply,
                Math.min(depth + 1, 2)
              )
            )}
          </div>
        )}
      </div>
    );
  }

  const commentCount = comments.length;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);

          if (isOpen) {
            cancelComposer();
          }
        }}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--primary)]"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4A8.5 8.5 0 0 1 12.5 20a8.38 8.38 0 0 1-4.1-1.05L3 20l1.05-5.4A8.38 8.38 0 0 1 3 10.5 8.5 8.5 0 0 1 11.5 2h1A8.5 8.5 0 0 1 21 10.5v1Z"
          />
        </svg>

        {commentCount === 0
          ? "Comments"
          : `${commentCount} ${
              commentCount === 1
                ? "comment"
                : "comments"
            }`}
      </button>

      {isOpen && (
        <div className="mt-3 border-t border-[var(--border)] pt-2">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {comments.length > 0 ? (
            <div>
              {topLevelComments.map((comment) =>
                renderComment(comment)
              )}
            </div>
          ) : (
            <div className="py-5 text-sm text-[var(--muted)]">
              No comments yet. Start the conversation.
            </div>
          )}

          {isMember ? (
            <div className="mt-3 border-t border-[var(--border)] pt-4">
              {replyTo && (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                  <span className="text-xs text-[var(--muted)]">
                    Replying to a comment
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(null);
                      setContent("");
                      setError("");
                    }}
                    className="text-xs font-semibold text-[var(--primary)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                maxLength={2000}
                rows={3}
                placeholder={
                  replyTo
                    ? "Write a reply..."
                    : "Write a comment..."
                }
                className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
                aria-label={
                  replyTo
                    ? "Write a reply"
                    : "Write a comment"
                }
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">
                  {content.length}/2000
                </span>

                <button
                  type="button"
                  onClick={submitComment}
                  disabled={
                    submitting ||
                    !content.trim()
                  }
                  className="min-h-10 rounded-full bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Posting..."
                    : replyTo
                      ? "Post reply"
                      : "Post comment"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
              Join this community to participate in
              comments and replies.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
