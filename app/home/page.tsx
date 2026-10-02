import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "../../supabase/server";
import CreatePost from "../components/create-post";
import PostFeed from "../components/post-feed";
import NotificationBell from "../components/notification-bell";

type PageProps = {
  searchParams: Promise<{
    feed?: string;
  }>;
};

type PostProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  department: string | null;
  identity_mode: "real" | "pseudonymous";
};

type AvatarProps = {
  avatarUrl: string | null;
  initials: string;
  size?: string;
  textSize?: string;
};

function Avatar({
  avatarUrl,
  initials,
  size = "h-10 w-10",
  textSize = "text-sm",
}: AvatarProps) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] ${textSize} font-semibold text-white`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function getFeedValue(value?: string) {
  if (
    value === "following" ||
    value === "discover"
  ) {
    return value;
  }

  return "for-you";
}

export default async function HomePage({
  searchParams,
}: PageProps) {
  const { feed: requestedFeed } =
    await searchParams;

  const activeFeed =
    getFeedValue(requestedFeed);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(
      "Profile loading error:",
      profileError
    );
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    "Knerd";

  const username = profile?.username || "";

  const profileHref = username
    ? `/profile/${username}`
    : "/profile/edit";

  const avatarUrl =
    profile?.avatar_url || null;

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name: string) => name[0])
      .join("")
      .toUpperCase() || "K";

  /*
   * Load posts.
   *
   * RLS decides which posts the current user
   * is allowed to see.
   *
   * For now all three feed modes use the same
   * secure post source. We are making the
   * navigation interactive first; the ranking/
   * filtering logic can be added next without
   * changing the PostFeed component.
   */
  const {
    data: posts,
    error: postsError,
  } = await supabase
    .from("posts")
    .select(
      "id, author_id, post_type, content, visibility, created_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  if (postsError) {
    console.error(
      "Post loading error:",
      postsError
    );
  }

  const postList = posts || [];

  /*
   * Collect unique authors.
   */
  const authorIds = Array.from(
    new Set(
      postList.map(
        (post) => post.author_id
      )
    )
  );

  /*
   * Load post authors.
   */
  const {
    data: postProfiles,
  } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, institution, department, identity_mode"
          )
          .in("id", authorIds)
      : { data: [] };

  /*
   * Create author lookup.
   */
  const profileMap: Record<
    string,
    PostProfile
  > = {};

  for (
    const postProfile of postProfiles || []
  ) {
    profileMap[postProfile.id] =
      postProfile;
  }

  /*
   * Collect post IDs.
   */
  const postIds = postList.map(
    (post) => post.id
  );

  /*
   * Load reactions.
   */
  const {
    data: postReactions,
  } =
    postIds.length > 0
      ? await supabase
          .from("reactions")
          .select(
            "post_id, user_id, reaction_type"
          )
          .in("post_id", postIds)
      : { data: [] };

  const reactionMap: Record<
    string,
    {
      user_id: string;
      reaction_type:
        | "helpful"
        | "insightful"
        | "appreciate";
    }[]
  > = {};

  for (
    const reaction of postReactions || []
  ) {
    if (
      !reactionMap[reaction.post_id]
    ) {
      reactionMap[reaction.post_id] = [];
    }

    reactionMap[reaction.post_id].push({
      user_id: reaction.user_id,
      reaction_type:
        reaction.reaction_type,
    });
  }

  /*
   * Load comments.
   */
  const {
    data: postComments,
  } =
    postIds.length > 0
      ? await supabase
          .from("comments")
          .select(
            "id, post_id, author_id, parent_id, content, created_at"
          )
          .in("post_id", postIds)
          .order("created_at", {
            ascending: true,
          })
      : { data: [] };

  const commentList = postComments || [];

  /*
   * Collect comment authors.
   */
  const commentAuthorIds = Array.from(
    new Set(
      commentList.map(
        (comment) =>
          comment.author_id
      )
    )
  );

  /*
   * Load comment authors.
   */
  const {
    data: commentAuthorProfiles,
  } =
    commentAuthorIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url"
          )
          .in(
            "id",
            commentAuthorIds
          )
      : { data: [] };

  /*
   * Create comment lookup.
   */
  const commentMap: Record<
    string,
    {
      id: string;
      post_id: string;
      author_id: string;
      parent_id: string | null;
      content: string;
      created_at: string;
    }[]
  > = {};

  for (
    const comment of commentList
  ) {
    if (
      !commentMap[comment.post_id]
    ) {
      commentMap[comment.post_id] = [];
    }

    commentMap[comment.post_id].push(
      comment
    );
  }

  /*
   * Create comment-author lookup.
   */
  const commentProfileMap: Record<
    string,
    {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }
  > = {};

  for (
    const commentProfile of
      commentAuthorProfiles || []
  ) {
    commentProfileMap[
      commentProfile.id
    ] = {
      username:
        commentProfile.username,
      display_name:
        commentProfile.display_name,
      avatar_url:
        commentProfile.avatar_url,
    };
  }

  const feedTabs = [
    {
      key: "for-you",
      label: "For You",
      href: "/home?feed=for-you",
    },
    {
      key: "following",
      label: "Following",
      href: "/home?feed=following",
    },
    {
      key: "discover",
      label: "Discover",
      href: "/home?feed=discover",
    },
  ];

  const activeFeedDescription =
    activeFeed === "following"
      ? "Posts from people you connect with."
      : activeFeed === "discover"
        ? "Explore ideas, questions, and perspectives from the Knerdly community."
        : "A balanced timeline of academic conversations and community activity.";

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#17352d]">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header className="sticky top-0 z-30 border-b border-[#dfe5df] bg-[#f7f7f2]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="group flex shrink-0 items-center"
            aria-label="Knerdly home"
          >
            <span className="text-[22px] font-bold tracking-[-0.055em] text-[#17352d] transition group-hover:text-[#285247] sm:text-2xl">
              Knerdly
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main navigation"
          >
            <Link
              href="/home"
              className="relative rounded-full px-4 py-2.5 text-sm font-semibold text-[#17352d]"
              aria-current="page"
            >
              Home

              <span
                className="absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-[#17352d]"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/explore"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[#718079] transition hover:bg-white hover:text-[#17352d]"
            >
              Explore
            </Link>

            <Link
              href="/communities"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[#718079] transition hover:bg-white hover:text-[#17352d]"
            >
              Communities
            </Link>

            <Link
              href="/study"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[#718079] transition hover:bg-white hover:text-[#17352d]"
            >
              Study
            </Link>

            <Link
              href="/videos"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[#718079] transition hover:bg-white hover:text-[#17352d]"
            >
              Videos
            </Link>

            <Link
              href="/reels"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[#718079] transition hover:bg-white hover:text-[#17352d]"
            >
              Reels
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/communities/create"
              className="hidden min-h-10 items-center gap-2 rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] sm:inline-flex"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-sm leading-none"
                aria-hidden="true"
              >
                +
              </span>

              <span>
                Create community
              </span>
            </Link>

            <Link
              href="/communities/create"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e0da] bg-white text-lg font-medium text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:hidden"
              aria-label="Create community"
            >
              +
            </Link>

            <Link
              href="/friends"
              className="hidden min-h-10 items-center rounded-full border border-[#d8e0da] bg-white px-4 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:inline-flex"
            >
              Friends
            </Link>

            <div className="flex h-10 w-10 items-center justify-center">
              <NotificationBell />
            </div>

            <Link
              href={profileHref}
              className="group rounded-full p-0.5 ring-offset-2 transition hover:ring-2 hover:ring-[#b08f4c]/40"
              aria-label={
                username
                  ? "View profile"
                  : "Complete profile"
              }
            >
              <Avatar
                avatarUrl={avatarUrl}
                initials={initials}
                size="h-9 w-9 sm:h-10 sm:w-10"
                textSize="text-xs sm:text-sm"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE QUICK NAVIGATION
      ====================================================== */}
      <div className="border-b border-[#e4e9e5] bg-white md:hidden">
        <nav
          className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5 scrollbar-none"
          aria-label="Mobile navigation"
        >
          <Link
            href="/home"
            className="flex min-h-10 shrink-0 items-center rounded-full bg-[#edf2ee] px-4 text-xs font-semibold text-[#17352d]"
            aria-current="page"
          >
            Home
          </Link>

          <Link
            href="/explore"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Explore
          </Link>

          <Link
            href="/communities"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Communities
          </Link>

          <Link
            href="/friends"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Friends
          </Link>

          <Link
            href="/study"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Study
          </Link>

          <Link
            href="/videos"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Videos
          </Link>

          <Link
            href="/reels"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Reels
          </Link>

          <Link
            href="/messages"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-medium text-[#718079] transition active:bg-[#f3f5f2] active:text-[#17352d]"
          >
            Messages
          </Link>
        </nav>
      </div>

      {/* =====================================================
          MAIN LAYOUT
      ====================================================== */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[230px_minmax(0,1fr)_270px] lg:px-8">
        {/* =====================================================
            LEFT SIDEBAR
        ====================================================== */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <div className="sticky top-24 space-y-4">
            <section className="overflow-hidden rounded-3xl border border-[#dfe5df] bg-white">
              <div className="h-16 bg-[#17352d]" />

              <div className="px-5 pb-5">
                <div className="-mt-8">
                  <Avatar
                    avatarUrl={avatarUrl}
                    initials={initials}
                    size="h-16 w-16"
                    textSize="text-lg"
                  />
                </div>

                <div className="mt-3 min-w-0">
                  <Link
                    href={profileHref}
                    className="block truncate text-base font-semibold text-[#17352d] hover:text-[#285247]"
                  >
                    {displayName}
                  </Link>

                  {username && (
                    <p className="mt-0.5 truncate text-xs text-[#8a9892]">
                      @{username}
                    </p>
                  )}
                </div>

                {(profile?.institution ||
                  profile?.department ||
                  profile?.program) && (
                  <div className="mt-4 space-y-1 text-xs text-[#718079]">
                    {profile?.institution && (
                      <p className="truncate">
                        {profile.institution}
                      </p>
                    )}

                    {profile?.department && (
                      <p className="truncate">
                        {profile.department}
                      </p>
                    )}

                    {profile?.program && (
                      <p className="truncate">
                        {profile.program}
                      </p>
                    )}
                  </div>
                )}

                <Link
                  href={profileHref}
                  className="mt-4 flex min-h-10 w-full items-center justify-center rounded-full border border-[#d8e0da] bg-[#f7f8f5] px-4 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:bg-white hover:text-[#17352d]"
                >
                  {username
                    ? "View profile"
                    : "Complete profile"}
                </Link>
              </div>
            </section>

            <nav
              className="rounded-3xl border border-[#dfe5df] bg-white p-2"
              aria-label="Sidebar navigation"
            >
              <Link
                href="/home"
                className="flex min-h-11 items-center gap-3 rounded-2xl bg-[#edf2ee] px-4 text-sm font-semibold text-[#17352d]"
                aria-current="page"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm">
                  ⌂
                </span>
                <span>Home</span>
              </Link>

              <Link
                href="/explore"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ◌
                </span>
                <span>Explore</span>
              </Link>

              <Link
                href="/communities"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ◇
                </span>
                <span>Communities</span>
              </Link>

              <Link
                href="/friends"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ♡
                </span>
                <span>Friends</span>
              </Link>

              <Link
                href="/study"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ✦
                </span>
                <span>Study</span>
              </Link>

              <Link
                href="/videos"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ▶
                </span>
                <span>Videos</span>
              </Link>

              <Link
                href="/reels"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ↗
                </span>
                <span>Reels</span>
              </Link>

              <Link
                href="/messages"
                className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-[#718079] transition hover:bg-[#f7f8f5] hover:text-[#17352d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5] text-sm">
                  ✉
                </span>
                <span>Messages</span>
              </Link>
            </nav>

            {(profile?.academic_level ||
              profile?.program ||
              profile?.department) && (
              <section className="rounded-3xl border border-[#dfe5df] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b08f4c]">
                  Academic identity
                </p>

                {profile?.academic_level && (
                  <p className="mt-3 text-sm font-semibold text-[#17352d]">
                    {profile.academic_level}
                  </p>
                )}

                {profile?.program && (
                  <p className="mt-1 text-xs leading-5 text-[#718079]">
                    {profile.program}
                  </p>
                )}

                {profile?.department && (
                  <p className="mt-1 text-xs leading-5 text-[#718079]">
                    {profile.department}
                  </p>
                )}
              </section>
            )}
          </div>
        </aside>

        {/* =====================================================
            MAIN FEED
        ====================================================== */}
        <section className="min-w-0">
          {/* Feed header */}
          <section className="mb-5 rounded-3xl border border-[#dfe5df] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b08f4c] sm:text-xs">
                  Your learning space
                </p>

                <h1 className="mt-2 font-[var(--font-playfair)] text-2xl font-semibold tracking-[-0.035em] text-[#17352d] sm:text-3xl">
                  Welcome back
                  {profile?.display_name
                    ? `, ${
                        profile.display_name
                          .split(" ")[0]
                      }`
                    : ""}
                  .
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#718079]">
                  Share what you are learning,
                  ask questions, exchange ideas,
                  and stay connected with your
                  academic community.
                </p>
              </div>

              <Link
                href={profileHref}
                className="hidden shrink-0 rounded-full border border-[#d8e0da] bg-[#f7f8f5] px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:bg-white hover:text-[#17352d] sm:inline-flex"
              >
                {username
                  ? "View profile"
                  : "Complete profile"}
              </Link>
            </div>

            {/* Quick stats */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-sm sm:grid-cols-3 sm:gap-3">
              <div className="rounded-2xl bg-[#f7f8f5] px-3 py-3">
                <p className="text-base font-semibold text-[#17352d]">
                  {postList.length}
                </p>

                <p className="mt-0.5 text-[10px] text-[#8a9892] sm:text-xs">
                  Posts
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8f5] px-3 py-3">
                <p className="text-base font-semibold text-[#17352d]">
                  {
                    new Set(
                      postList.map(
                        (post) =>
                          post.author_id
                      )
                    ).size
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-[#8a9892] sm:text-xs">
                  Contributors
                </p>
              </div>

              <div className="col-span-2 rounded-2xl bg-[#f7f8f5] px-3 py-3 sm:col-span-1">
                <p className="text-base font-semibold text-[#17352d]">
                  {commentList.length}
                </p>

                <p className="mt-0.5 text-[10px] text-[#8a9892] sm:text-xs">
                  Comments
                </p>
              </div>
            </div>
          </section>

          {/* Create post */}
          <div className="mb-5">
            <CreatePost />
          </div>

          {/* Feed controls */}
          <section className="mb-5 rounded-3xl border border-[#dfe5df] bg-white p-2">
            <div
              className="grid grid-cols-3 gap-1"
              role="tablist"
              aria-label="Feed views"
            >
              {feedTabs.map((tab) => {
                const isActive =
                  activeFeed === tab.key;

                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    role="tab"
                    aria-selected={isActive}
                    className={`flex min-h-10 items-center justify-center rounded-2xl px-3 text-xs transition ${
                      isActive
                        ? "bg-[#edf2ee] font-semibold text-[#17352d]"
                        : "font-medium text-[#718079] hover:bg-[#f7f8f5] hover:text-[#17352d]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <div className="px-2 pb-1 pt-3">
              <p className="text-center text-[11px] leading-5 text-[#8a9892]">
                {activeFeedDescription}
              </p>
            </div>
          </section>

          {/* Feed */}
          <PostFeed
            posts={postList}
            profiles={profileMap}
            reactions={reactionMap}
            comments={commentMap}
            commentProfiles={commentProfileMap}
          />
        </section>

        {/* =====================================================
            RIGHT SIDEBAR
        ====================================================== */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-3xl border border-[#dce4de] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b08f4c]">
                    Learning
                  </p>

                  <h2 className="mt-1 font-semibold">
                    Study
                  </h2>
                </div>

                <Link
                  href="/study"
                  className="text-xs font-semibold text-[#557067] transition hover:text-[#17352d]"
                >
                  Open →
                </Link>
              </div>

              <div className="mt-5 rounded-2xl bg-[#f3f5f2] p-4">
                <p className="text-xs text-[#8a9892]">
                  Current goal
                </p>

                <p className="mt-2 text-base font-semibold leading-6">
                  Create your first study goal
                </p>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dce4de]">
                  <div className="h-full w-0 rounded-full bg-[#17352d]" />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#8a9892]">
                  <span>Progress</span>
                  <span>0%</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dce4de] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b08f4c]">
                Get started
              </p>

              <h2 className="mt-3 text-lg font-semibold">
                Build your profile
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#7b8983]">
                Add your academic information
                so other students can
                understand who you are.
              </p>

              <Link
                href="/profile/edit"
                className="mt-5 flex min-h-10 items-center justify-center rounded-full bg-[#17352d] px-5 text-xs font-semibold text-white transition hover:bg-[#285247]"
              >
                Edit profile
              </Link>
            </div>

            <div className="rounded-3xl border border-[#dce4de] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b08f4c]">
                Quick access
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/friends"
                  className="rounded-2xl bg-[#f3f5f2] px-3 py-3 text-center text-xs font-semibold text-[#557067] transition hover:bg-[#e9eee9] hover:text-[#17352d]"
                >
                  Friends
                </Link>

                <Link
                  href="/notifications"
                  className="rounded-2xl bg-[#f3f5f2] px-3 py-3 text-center text-xs font-semibold text-[#557067] transition hover:bg-[#e9eee9] hover:text-[#17352d]"
                >
                  Alerts
                </Link>

                <Link
                  href="/explore"
                  className="rounded-2xl bg-[#f3f5f2] px-3 py-3 text-center text-xs font-semibold text-[#557067] transition hover:bg-[#e9eee9] hover:text-[#17352d]"
                >
                  Explore
                </Link>

                <Link
                  href="/study"
                  className="rounded-2xl bg-[#f3f5f2] px-3 py-3 text-center text-xs font-semibold text-[#557067] transition hover:bg-[#e9eee9] hover:text-[#17352d]"
                >
                  Study
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ====================================================== */}
      <nav className="sticky bottom-0 z-30 border-t border-[#dfe5df] bg-white/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
          {[
            ["Home", "/home"],
            ["Explore", "/explore"],
            ["Friends", "/friends"],
            ["Study", "/study"],
            ["Profile", profileHref],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className={`flex min-h-11 items-center justify-center rounded-xl text-[11px] font-semibold ${
                label === "Home"
                  ? "bg-[#edf2ee] text-[#17352d]"
                  : "text-[#7b8983]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
