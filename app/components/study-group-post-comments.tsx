"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "../../supabase/client";

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type StudyGroupPostCommentsProps = {
  postId: string;
};

export default function StudyGroupPostComments({
  postId,
}: StudyGroupPostCommentsProps) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [comments, setComments] = useState<Comment[]>(
    []
  );

  const [profiles, setProfiles] = useState<
    Record<string, Profile>
  >({});

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadComments();
  }, [postId]);

  async function loadComments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/study-groups/comments?postId=${encodeURIComponent(
          postId
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load comments."
        );
      }

      setComments(data.comments || []);

      const profileMap: Record<string, Profile> =
        {};

      for (const profile of data.profiles || []) {
        profileMap[profile.id] = profile;
      }

      setProfiles(profileMap);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load comments."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
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
        "/api/study-groups/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId,
            content: trimmedContent,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to publish comment."
        );
      }

      setContent("");

      await loadComments();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to publish comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getInitials(profile?: Profile) {
    if (!profile?.display_name) {
      return "K";
    }

    return (
      profile.display_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => name[0])
        .join("")
        .toUpperCase() || "K"
    );
  }

  function formatDate(dateString: string) {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  }

  return (
    <div className="mt-5 border-t border-[#e6ebe7] pt-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9891]">
          Discussion
        </p>

        <span className="text-xs text-[#8a9891]">
          {comments.length}{" "}
          {comments.length === 1
            ? "comment"
            : "comments"}
        </span>
      </div>

      {/* Comments */}
      {loading ? (
        <div className="mt-4 rounded-2xl bg-[#f7f8f5] px-4 py-5 text-center">
          <p className="text-xs text-[#718078]">
            Loading comments...
          </p>
        </div>
      ) : comments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {comments.map((comment) => {
            const profile =
              profiles[comment.author_id];

            const username =
              profile?.username || "new-member";

            return (
              <div
                key={comment.id}
                className="flex gap-3 rounded-2xl bg-[#f7f8f5] p-3"
              >
                <Link
                  href={`/profile/${username}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-[10px] font-semibold text-white"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={
                        profile.display_name ||
                        "Knerd"
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(profile)
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link
                      href={`/profile/${username}`}
                      className="text-xs font-semibold text-[#17352d] hover:text-[#285247]"
                    >
                      {profile?.display_name ||
                        "Knerd"}
                    </Link>

                    <span className="text-[10px] text-[#9aa49f]">
                      {formatDate(
                        comment.created_at
                      )}
                    </span>
                  </div>

                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#52645d]">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-xs text-[#8a9891]">
          No comments yet. Start the discussion.
        </p>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {/* Comment form */}
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          maxLength={2000}
          placeholder="Write a comment..."
          disabled={submitting}
          className="min-w-0 flex-1 rounded-full border border-[#dfe6e1] bg-white px-4 py-2.5 text-xs text-[#17352d] outline-none transition placeholder:text-[#a0aaa5] focus:border-[#8ea69a]"
        />

        <button
          type="submit"
          disabled={
            submitting || !content.trim()
          }
          className="shrink-0 rounded-full bg-[#17352d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "..." : "Comment"}
        </button>
      </form>
    </div>
  );
}
