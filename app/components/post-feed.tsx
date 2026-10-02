import Link from "next/link";
import PostReactions from "./post-reactions";
import PostComments from "./post-comments";

type Reaction = {
  user_id: string;
  reaction_type:
    | "helpful"
    | "insightful"
    | "appreciate";
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
};

type Post = {
  id: string;
  author_id: string;
  post_type: string;
  content: string;
  visibility: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  department: string | null;
  identity_mode: string;
};

type CommentProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PostFeedProps = {
  posts: Post[];
  profiles: Record<string, Profile>;
  reactions: Record<string, Reaction[]>;
  comments: Record<string, Comment[]>;
  commentProfiles: Record<string, CommentProfile>;
};

const postTypeLabels: Record<string, string> = {
  thought: "Thought",
  study_update: "Study update",
  question: "Question",
  progress: "Progress",
  achievement: "Achievement",
  recommendation: "Recommendation",
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

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function PostFeed({
  posts,
  profiles,
  reactions,
  comments,
  commentProfiles,
}: PostFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-[#dce4de] bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2eb] text-xl text-[#557067]">
          ✦
        </div>

        <h2 className="mt-5 text-xl font-semibold">
          Your Knerdly feed starts here.
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7b8983]">
          Share your first thought, study update,
          question, achievement, or recommendation
          with the Knerdly community.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {posts.map((post) => {
        const profile = profiles[post.author_id];

        if (!profile) {
          return null;
        }

        const displayName =
          profile.display_name || "Knerd";

        const username =
          profile.username || "new-member";

        const initials = getInitials(displayName);

        return (
          <article
            key={post.id}
            className="rounded-3xl border border-[#dce4de] bg-white p-5"
          >
            {/* Post header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href={`/profile/${username}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </Link>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/profile/${username}`}
                      className="truncate text-sm font-semibold hover:text-[#557067]"
                    >
                      {displayName}
                    </Link>

                    <span className="rounded-full bg-[#edf2eb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#557067]">
                      {postTypeLabels[
                        post.post_type
                      ] || "Post"}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8a9892]">
                    <span>@{username}</span>

                    <span>·</span>

                    <span>
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <span className="shrink-0 text-xs text-[#9aa59f]">
                {post.visibility === "friends"
                  ? "Friends"
                  : "Public"}
              </span>
            </div>

            {/* Academic information */}
            {(profile.institution ||
              profile.department) && (
              <div className="mt-4 text-xs text-[#8a9892]">
                {profile.institution && (
                  <span>
                    {profile.institution}
                  </span>
                )}

                {profile.institution &&
                  profile.department && (
                    <span className="mx-1.5">
                      ·
                    </span>
                  )}

                {profile.department && (
                  <span>
                    {profile.department}
                  </span>
                )}
              </div>
            )}

            {/* Post content */}
            <div className="mt-5">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#30443d]">
                {post.content}
              </p>
            </div>

            {/* Reactions */}
            <PostReactions
              postId={post.id}
              reactions={
                reactions[post.id] || []
              }
            />

            {/* Comments */}
            <PostComments
              postId={post.id}
              comments={
                comments[post.id] || []
              }
              profiles={commentProfiles}
            />
          </article>
        );
      })}
    </div>
  );
}
