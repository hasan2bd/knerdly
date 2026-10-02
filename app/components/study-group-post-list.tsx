"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { createClient } from "../../supabase/client";
import StudyGroupPostComments from "./study-group-post-comments";
import StudyGroupPostReactionButton from "./study-group-post-reaction-button";

type StudyGroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  post_type:
    | "discussion"
    | "question"
    | "announcement"
    | "resource";
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type StudyGroupPostListProps = {
  groupId: string;
};

const postTypeLabels: Record<
  StudyGroupPost["post_type"],
  string
> = {
  discussion: "Discussion",
  question: "Question",
  announcement: "Announcement",
  resource: "Resource",
};

export default function StudyGroupPostList({
  groupId,
}: StudyGroupPostListProps) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [posts, setPosts] = useState<StudyGroupPost[]>(
    []
  );

  const [profiles, setProfiles] = useState<
    Record<string, Profile>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPosts();
  }, [groupId]);

  async function loadPosts() {
    setLoading(true);
    setError("");

    const {
      data: postData,
      error: postError,
    } = await supabase
      .from("study_group_posts")
      .select(
        "id, group_id, author_id, content, post_type, created_at"
      )
      .eq("group_id", groupId)
      .order("created_at", {
        ascending: false,
      });

    if (postError) {
      setError(postError.message);
      setLoading(false);
      return;
    }

    const loadedPosts =
      (postData || []) as StudyGroupPost[];

    setPosts(loadedPosts);

    const authorIds = Array.from(
      new Set(
        loadedPosts.map(
          (post) => post.author_id
        )
      )
    );

    if (authorIds.length === 0) {
      setProfiles({});
      setLoading(false);
      return;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url"
      )
      .in("id", authorIds);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const profileMap: Record<string, Profile> =
      {};

    for (const profile of profileData || []) {
      profileMap[profile.id] = profile;
    }

    setProfiles(profileMap);
    setLoading(false);
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#dfe6e1] bg-white p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#edf2ee]" />

        <p className="mt-4 text-sm text-[#718078]">
          Loading discussions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.06 9.06 0 0 1-4.1-1L3 21l1.5-4.5A8.38 8.38 0 0 1 3 11.5 8.5 8.5 0 1 1 21 11.5Z"
            />
          </svg>
        </div>

        <h3 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold text-[#17352d]">
          No discussions yet
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718078]">
          Start the first discussion, ask a question,
          or share something useful with the group.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const profile = profiles[post.author_id];

        const username =
          profile?.username || "new-member";

        return (
          <article
            key={post.id}
            className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-6"
          >
            {/* Author */}
            <div className="flex items-start gap-3">
              <Link
                href={`/profile/${username}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white"
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/profile/${username}`}
                    className="text-sm font-semibold text-[#17352d] hover:text-[#285247]"
                  >
                    {profile?.display_name ||
                      "Knerd"}
                  </Link>

                  <span className="text-xs text-[#a0aaa5]">
                    ·
                  </span>

                  <span className="text-xs text-[#8a9891]">
                    {formatDate(post.created_at)}
                  </span>
                </div>

                <span className="mt-1 inline-flex rounded-full bg-[#edf2ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#557067]">
                  {postTypeLabels[post.post_type]}
                </span>
              </div>
            </div>

            {/* Post content */}
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#40564e]">
              {post.content}
            </div>

            {/* Reaction */}
            <div className="mt-3 border-t border-[#eef2ef] pt-2">
              <StudyGroupPostReactionButton
                studyGroupPostId={post.id}
              />
            </div>

            {/* Comments */}
            <StudyGroupPostComments
              postId={post.id}
            />
          </article>
        );
      })}
    </div>
  );
}