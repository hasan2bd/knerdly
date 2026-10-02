"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type VideoComment = {
  id: string;
  video_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author: Profile | null;
};

type VideoCommentsProps = {
  videoId: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getInitials(
  profile: Profile | null
) {
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

export default function VideoComments({
  videoId,
}: VideoCommentsProps) {
  const [comments, setComments] =
    useState<VideoComment[]>([]);

  const [content, setContent] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [replyTo, setReplyTo] =
    useState<string | null>(null);

  async function loadComments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/videos/comments?videoId=${encodeURIComponent(
          videoId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load comments."
        );
      }

      setComments(
        Array.isArray(data.comments)
          ? data.comments
          : []
      );
    } catch (error) {
      console.error(
        "Video comments load error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load comments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const topLevelComments =
    useMemo(
      () =>
        comments.filter(
          (comment) =>
            comment.parent_id === null
        ),
      [comments]
    );

  function repliesFor(
    commentId: string
  ) {
    return comments.filter(
      (comment) =>
        comment.parent_id === commentId
    );
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmed =
      content.trim();

    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/videos/comments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            videoId,
            content: trimmed,
            parentId: replyTo,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to post comment."
        );
      }

      setContent("");
      setReplyTo(null);

      await loadComments();
    } catch (error) {
      console.error(
        "Video comment submit error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to post comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function renderComment(
    comment: VideoComment,
    isReply = false
  ) {
    const author =
      comment.author;

    const replies =
      repliesFor(comment.id);

    return (
      <article
        key={comment.id}
        className={
          isReply
            ? "border-l border-[#dfe6e1] pl-4"
            : ""
        }
      >
        <div className="flex gap-3">
          {author?.username ? (
            <Link
              href={`/profile/${author.username}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white"
            >
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(author)
              )}
            </Link>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white">
              {author?.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(author)
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-[#17352d]">
                {author?.display_name ||
                  "Knerd member"}
              </p>

              <span className="text-[11px] text-[#9aa59f]">
                {formatDate(
                  comment.created_at
                )}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f7068]">
              {comment.content}
            </p>

            {!isReply && (
              <button
                type="button"
                onClick={() =>
                  setReplyTo(
                    replyTo ===
                      comment.id
                      ? null
                      : comment.id
                  )
                }
                className="mt-2 text-xs font-semibold text-[#557067] hover:text-[#17352d]"
              >
                {replyTo === comment.id
                  ? "Cancel reply"
                  : "Reply"}
              </button>
            )}
          </div>
        </div>

        {replies.length > 0 && (
          <div className="mt-4 space-y-4 pl-3 sm:pl-12">
            {replies.map(
              (reply) =>
                renderComment(
                  reply,
                  true
                )
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
            Discussion
          </p>

          <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
            Comments
          </h2>
        </div>

        <span className="rounded-full bg-[#edf2ee] px-3 py-1.5 text-xs font-semibold text-[#557067]">
          {comments.length}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={submitComment}
        className="mt-6"
      >
        {replyTo && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-[#f7f8f5] px-4 py-2.5">
            <p className="text-xs text-[#718078]">
              Replying to a comment
            </p>

            <button
              type="button"
              onClick={() =>
                setReplyTo(null)
              }
              className="text-xs font-semibold text-[#557067]"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value
              )
            }
            maxLength={2000}
            rows={3}
            placeholder={
              replyTo
                ? "Write a reply..."
                : "Share your thoughts about this video..."
            }
            className="min-h-12 flex-1 resize-y rounded-2xl border border-[#d8e1db] bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#a0aaa5] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
          />

          <button
            type="submit"
            disabled={
              submitting ||
              !content.trim()
            }
            className="min-h-12 shrink-0 rounded-2xl bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Posting..."
              : replyTo
                ? "Reply"
                : "Comment"}
          </button>
        </div>

        <p className="mt-2 text-right text-[11px] text-[#9aa59f]">
          {content.length}/2000
        </p>
      </form>

      <div className="mt-7 border-t border-[#edf0ed] pt-6">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#718078]">
            Loading comments...
          </div>
        ) : topLevelComments.length >
          0 ? (
          <div className="space-y-6">
            {topLevelComments.map(
              (comment) =>
                renderComment(
                  comment
                )
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-[#557067]">
              No comments yet.
            </p>

            <p className="mt-1 text-xs text-[#8a9891]">
              Start the discussion.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}