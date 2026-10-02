"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../supabase/client";

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
};

type Profile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PostCommentsProps = {
  postId: string;
  comments: Comment[];
  profiles: Record<string, Profile>;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "K"
  );
}

function formatCommentDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function PostComments({
  postId,
  comments,
  profiles,
}: PostCommentsProps) {
  const router = useRouter();
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] =
    useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [showComments, setShowComments] =
    useState(false);

  const topLevelComments = useMemo(
    () =>
      comments.filter(
        (comment) => comment.parent_id === null
      ),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, Comment[]> = {};

    for (const comment of comments) {
      if (!comment.parent_id) {
        continue;
      }

      if (!map[comment.parent_id]) {
        map[comment.parent_id] = [];
      }

      map[comment.parent_id].push(comment);
    }

    return map;
  }, [comments]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    if (trimmedContent.length > 2000) {
      setError(
        "Comments cannot exceed 2000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your session has expired. Please log in again."
      );
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } =
      await supabase.from("comments").insert({
        post_id: postId,
        author_id: user.id,
        parent_id: replyTo?.id ?? null,
        content: trimmedContent,
      });

    if (insertError) {
      console.error(
        "Comment creation error:",
        insertError
      );

      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setContent("");
    setReplyTo(null);
    setIsSubmitting(false);

    router.refresh();
  }

  function startReply(comment: Comment) {
    const profile = profiles[comment.author_id];

    const name =
      profile?.display_name || "this person";

    setReplyTo(comment);
    setShowComments(true);
    setError("");

    requestAnimationFrame(() => {
      const textarea =
        document.getElementById(
          `comment-input-${postId}`
        ) as HTMLTextAreaElement | null;

      textarea?.focus();
    });

    void name;
  }

  function renderComment(
    comment: Comment,
    depth = 0
  ) {
    const profile = profiles[comment.author_id];

    if (!profile) {
      return null;
    }

    const displayName =
      profile.display_name || "Knerd";

    const username =
      profile.username || "new-member";

    const initials = getInitials(displayName);

    const replies =
      repliesByParent[comment.id] || [];

    const isReply = depth > 0;

    return (
      <div
        key={comment.id}
        className={
          isReply
            ? "ml-7 border-l border-[#dce4de] pl-3 sm:ml-10 sm:pl-4"
            : ""
        }
      >
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-[11px] font-semibold text-white">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="rounded-2xl bg-[#f3f5f2] px-3.5 py-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-semibold text-[#17352d]">
                  {displayName}
                </span>

                <span className="text-[10px] text-[#9aa59f]">
                  @{username}
                </span>
              </div>

              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#40534c]">
                {comment.content}
              </p>
            </div>

            <div className="mt-1.5 flex items-center gap-3 px-2">
              <span className="text-[10px] text-[#9aa59f]">
                {formatCommentDate(
                  comment.created_at
                )}
              </span>

              <button
                type="button"
                onClick={() =>
                  startReply(comment)
                }
                className="min-h-8 rounded-full px-2 text-[10px] font-semibold text-[#557067] transition hover:bg-[#f3f5f2] hover:text-[#17352d]"
              >
                Reply
              </button>
            </div>
          </div>
        </div>

        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
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

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() =>
          setShowComments((previous) => !previous)
        }
        className="min-h-9 rounded-full px-2 text-xs font-semibold text-[#557067] transition hover:bg-[#f3f5f2] hover:text-[#17352d]"
      >
        {showComments
          ? "Hide discussion"
          : comments.length > 0
            ? `${comments.length} ${
                comments.length === 1
                  ? "comment"
                  : "comments"
              } · Discuss`
            : "Discuss"}
      </button>

      {showComments && (
        <div className="mt-4 border-t border-[#edf0ed] pt-4">
          {topLevelComments.length > 0 ? (
            <div className="space-y-4">
              {topLevelComments.map((comment) =>
                renderComment(comment)
              )}
            </div>
          ) : (
            <p className="py-2 text-xs text-[#8a9892]">
              Be the first person to join the
              discussion.
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-5"
          >
            {replyTo && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-[#f3f5f2] px-3 py-2">
                <span className="min-w-0 truncate text-[11px] text-[#557067]">
                  Replying to{" "}
                  <strong className="text-[#17352d]">
                    {profiles[replyTo.author_id]
                      ?.display_name ||
                      "this person"}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setReplyTo(null)
                  }
                  className="ml-3 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold text-[#557067] hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eee9] text-xs font-semibold text-[#557067]">
                K
              </div>

              <div className="min-w-0 flex-1">
                <textarea
                  id={`comment-input-${postId}`}
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setError("");
                  }}
                  placeholder={
                    replyTo
                      ? "Write a reply..."
                      : "Join the discussion..."
                  }
                  rows={2}
                  maxLength={2000}
                  className="w-full resize-none rounded-2xl border border-[#dce4de] bg-white px-4 py-3 text-base leading-6 text-[#17352d] outline-none transition placeholder:text-[#9aa59f] focus:border-[#557067]"
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[#9aa59f]">
                    {content.length}/2000
                  </span>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !content.trim()
                    }
                    className="min-h-10 rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSubmitting
                      ? "Posting..."
                      : replyTo
                        ? "Reply"
                        : "Comment"}
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-2 rounded-xl bg-[#fff3f1] px-3 py-2 text-xs text-[#a24d42]"
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
