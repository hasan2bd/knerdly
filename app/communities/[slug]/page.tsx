import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../supabase/server";
import CommunityMembershipButton from "../../components/community-membership-button";
import CommunityJoinRequestButton from "../../components/community-join-request-button";
import CommunityPostComposer from "../../components/community-post-composer";
import CommunityPostComments from "../../components/community-post-comments";
import CommunityPostAnswers from "../../components/community-post-answers";
import CommunityPostModerationButton from "../../components/community-post-moderation-button";
import CommunityReportButton from "../../components/community-report-button";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommunityPost = {
  id: string;
  community_id: string;
  author_id: string;
  post_type:
    | "discussion"
    | "question"
    | "resource"
    | "announcement";
  title: string | null;
  content: string;
  created_at: string;
};

type CommunityComment = {
  id: string;
  community_post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type CommunityAnswer = {
  id: string;
  community_post_id: string;
  author_id: string;
  content: string;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
};

type JoinRequestStatus =
  | "pending"
  | "declined"
  | "cancelled";

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

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const now = new Date();

  const seconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000
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

function getPostTypeLabel(
  type: CommunityPost["post_type"]
) {
  const labels: Record<
    CommunityPost["post_type"],
    string
  > = {
    discussion: "Discussion",
    question: "Question",
    resource: "Resource",
    announcement: "Announcement",
  };

  return labels[type];
}

export default async function CommunityDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Community
   */
  const {
    data: community,
    error: communityError,
  } = await supabase
    .from("communities")
    .select(
      `
      id,
      name,
      slug,
      description,
      category,
      cover_image_url,
      avatar_url,
      privacy,
      created_by,
      created_at
      `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (communityError || !community) {
    notFound();
  }

  /*
   * Current membership
   */
  const { data: currentMembership } =
    await supabase
      .from("community_members")
      .select(
        `
        id,
        user_id,
        role
        `
      )
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();

  const isMember =
    Boolean(currentMembership);

  const currentRole =
    currentMembership?.role ?? null;

  const isOwner =
    currentMembership?.role === "owner";

  /*
   * Community managers:
   * owner, admin, and moderator.
   *
   * These roles can moderate community
   * posts, comments, replies, and answers.
   */
  const isCommunityManager =
    currentMembership?.role === "owner" ||
    currentMembership?.role === "admin" ||
    currentMembership?.role === "moderator";

  /*
   * Current private-community join request
   */
  let joinRequestStatus:
    | JoinRequestStatus
    | "none" = "none";

  if (
    community.privacy === "private" &&
    !isMember
  ) {
    const { data: joinRequest } =
      await supabase
        .from("community_join_requests")
        .select("status")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      joinRequest?.status === "pending" ||
      joinRequest?.status === "declined" ||
      joinRequest?.status === "cancelled"
    ) {
      joinRequestStatus =
        joinRequest.status;
    }
  }

  /*
   * Member count
   */
  const { count: memberCount } =
    await supabase
      .from("community_members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("community_id", community.id);

  /*
   * Community posts
   */
  const {
    data: posts,
    error: postsError,
  } = await supabase
    .from("community_posts")
    .select(
      `
      id,
      community_id,
      author_id,
      post_type,
      title,
      content,
      created_at
      `
    )
    .eq("community_id", community.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const typedPosts =
    (posts as CommunityPost[] | null) ?? [];

  /*
   * Post authors
   */
  const authorIds = Array.from(
    new Set(
      typedPosts.map(
        (post) => post.author_id
      )
    )
  );

  let authorProfiles: Profile[] = [];

  if (authorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        avatar_url
        `
      )
      .in("id", authorIds);

    authorProfiles =
      (data as Profile[] | null) ?? [];
  }

  const authorMap = new Map(
    authorProfiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  /*
   * Post IDs
   */
  const postIds = typedPosts.map(
    (post) => post.id
  );

  /*
   * Discussion comments
   */
  let comments: CommunityComment[] = [];

  if (postIds.length > 0) {
    const { data: commentData } =
      await supabase
        .from("community_post_comments")
        .select(
          `
          id,
          community_post_id,
          author_id,
          parent_id,
          content,
          created_at,
          updated_at
          `
        )
        .in(
          "community_post_id",
          postIds
        )
        .order("created_at", {
          ascending: true,
        });

    comments =
      (commentData as CommunityComment[] | null) ??
      [];
  }

  /*
   * Comment authors
   */
  const commentAuthorIds = Array.from(
    new Set(
      comments.map(
        (comment) => comment.author_id
      )
    )
  );

  let commentAuthors: Profile[] = [];

  if (commentAuthorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        avatar_url
        `
      )
      .in("id", commentAuthorIds);

    commentAuthors =
      (data as Profile[] | null) ?? [];
  }

  /*
   * Question answers
   */
  const questionPostIds = typedPosts
    .filter(
      (post) =>
        post.post_type === "question"
    )
    .map((post) => post.id);

  let answers: CommunityAnswer[] = [];

  if (questionPostIds.length > 0) {
    const {
      data: answerData,
      error: answersError,
    } = await supabase
      .from("community_post_answers")
      .select(
        `
        id,
        community_post_id,
        author_id,
        content,
        is_accepted,
        created_at,
        updated_at
        `
      )
      .in(
        "community_post_id",
        questionPostIds
      )
      .order("is_accepted", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (answersError) {
      console.error(
        "Community answers load error:",
        answersError
      );
    }

    answers =
      (answerData as CommunityAnswer[] | null) ??
      [];
  }

  /*
   * Answer authors
   */
  const answerAuthorIds = Array.from(
    new Set(
      answers.map(
        (answer) => answer.author_id
      )
    )
  );

  let answerAuthors: Profile[] = [];

  if (answerAuthorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        avatar_url
        `
      )
      .in("id", answerAuthorIds);

    answerAuthors =
      (data as Profile[] | null) ?? [];
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="relative mx-auto max-w-7xl">
          <div className="h-48 overflow-hidden bg-[var(--surface-muted)] sm:h-64 lg:h-72">
            {community.cover_image_url ? (
              <img
                src={community.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--surface-muted)]">
                <span className="font-[var(--font-playfair)] text-4xl font-semibold text-[var(--muted)]">
                  {community.name
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="px-4 pb-6 sm:px-6 lg:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-[var(--surface)] bg-[var(--primary-light)] text-2xl font-bold text-[var(--primary)] shadow-md sm:h-28 sm:w-28">
                  {community.avatar_url ? (
                    <img
                      src={community.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    community.name
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                      {community.category}
                    </span>

                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted)]">
                      {community.privacy}
                    </span>
                  </div>

                  <h1 className="mt-2 break-words font-[var(--font-playfair)] text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                    {community.name}
                  </h1>

                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {memberCount ?? 0}{" "}
                    {(memberCount ?? 0) === 1
                      ? "member"
                      : "members"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {community.privacy ===
                "public" ? (
                  <CommunityMembershipButton
                    communityId={community.id}
                    isMember={isMember}
                    isOwner={isOwner}
                    privacy="public"
                  />
                ) : isMember ? (
                  <CommunityMembershipButton
                    communityId={community.id}
                    isMember={true}
                    isOwner={isOwner}
                    privacy="private"
                  />
                ) : (
                  <CommunityJoinRequestButton
                    communityId={community.id}
                    initialStatus={
                      joinRequestStatus
                    }
                    isMember={false}
                  />
                )}

                <Link
                  href={`/communities/${community.slug}/members`}
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Members
                </Link>
              </div>
            </div>

            {community.description && (
              <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {community.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        {/* Feed */}
        <section className="min-w-0">
          {isMember && currentRole ? (
            <CommunityPostComposer
              communityId={community.id}
              role={currentRole}
            />
          ) : (
            <div className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6">
              <p className="text-sm leading-6 text-[var(--muted)]">
                {community.privacy ===
                "private"
                  ? "Join this private community to participate in discussions, ask questions, and share resources."
                  : "Join this community to participate in discussions, ask questions, and share resources."}
              </p>
            </div>
          )}

          {typedPosts.length > 0 ? (
            <div className="space-y-5">
              {typedPosts.map((post) => {
                const author = authorMap.get(
                  post.author_id
                );

                const displayName =
                  author?.display_name ||
                  author?.username ||
                  "Student";

                const initials = getInitials(
                  author?.display_name ?? null,
                  author?.username ?? null
                );

                const postComments =
                  comments.filter(
                    (comment) =>
                      comment.community_post_id ===
                      post.id
                  );

                const postCommentAuthorIds =
                  new Set(
                    postComments.map(
                      (comment) =>
                        comment.author_id
                    )
                  );

                const postCommentAuthors =
                  commentAuthors.filter(
                    (profile) =>
                      postCommentAuthorIds.has(
                        profile.id
                      )
                  );

                const postAnswers =
                  post.post_type === "question"
                    ? answers.filter(
                        (answer) =>
                          answer.community_post_id ===
                          post.id
                      )
                    : [];

                const postAnswerAuthorIds =
                  new Set(
                    postAnswers.map(
                      (answer) =>
                        answer.author_id
                    )
                  );

                const postAnswerAuthors =
                  answerAuthors.filter(
                    (profile) =>
                      postAnswerAuthorIds.has(
                        profile.id
                      )
                  );

                const isQuestion =
                  post.post_type ===
                  "question";

                return (
                  <article
                    key={post.id}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Link
                          href={
                            author?.username
                              ? `/profile/${author.username}`
                              : "#"
                          }
                          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]"
                        >
                          {author?.avatar_url ? (
                            <img
                              src={
                                author.avatar_url
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            href={
                              author?.username
                                ? `/profile/${author.username}`
                                : "#"
                            }
                            className="block truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                          >
                            {displayName}
                          </Link>

                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {formatRelativeTime(
                              post.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            isQuestion
                              ? "border-[var(--primary)]/20 bg-[var(--primary-light)] text-[var(--primary)]"
                              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
                          }`}
                        >
                          {getPostTypeLabel(
                            post.post_type
                          )}
                        </span>

                        <CommunityReportButton
                          communityId={community.id}
                          postId={post.id}
                        />

                        {isCommunityManager && (
                          <CommunityPostModerationButton
                            postId={post.id}
                          />
                        )}
                      </div>
                    </div>

                    {post.title && (
                      <h2 className="mt-5 font-[var(--font-playfair)] text-xl font-semibold leading-snug text-[var(--foreground)] sm:text-2xl">
                        {post.title}
                      </h2>
                    )}

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                      {post.content}
                    </p>

                    {isQuestion ? (
                      <CommunityPostAnswers
                        communityId={community.id}
                        postId={post.id}
                        answers={postAnswers}
                        authors={
                          postAnswerAuthors
                        }
                        isMember={isMember}
                        currentUserId={user.id}
                        questionAuthorId={
                          post.author_id
                        }
                        isCommunityManager={
                          isCommunityManager
                        }
                      />
                    ) : (
                      <div className="mt-6 border-t border-[var(--border)] pt-4">
                        <CommunityPostComments
                          communityId={community.id}
                          postId={post.id}
                          comments={postComments}
                          authors={
                            postCommentAuthors
                          }
                          isMember={isMember}
                          currentUserId={user.id}
                          isCommunityManager={
                            isCommunityManager
                          }
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-light)] text-xl text-[var(--primary)]">
                ✦
              </div>

              <h2 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold text-[var(--foreground)]">
                No posts yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
                Be the first member to start a
                discussion, ask a question, or
                share a useful resource.
              </p>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-5">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
              About
            </p>

            <h2 className="mt-2 font-[var(--font-playfair)] text-xl font-semibold text-[var(--foreground)]">
              Community information
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Category
                </dt>

                <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {community.category}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Privacy
                </dt>

                <dd className="mt-1 text-sm font-medium capitalize text-[var(--foreground)]">
                  {community.privacy}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Members
                </dt>

                <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {memberCount ?? 0}
                </dd>
              </div>
            </dl>
          </section>

          {isCommunityManager && (
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                Management
              </p>

              <h2 className="mt-2 font-[var(--font-playfair)] text-xl font-semibold text-[var(--foreground)]">
                Community administration
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Manage members, roles, join
                requests, and community reports
                from the management areas.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={`/communities/${community.slug}/members`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
                >
                  Manage members
                </Link>

                {community.privacy ===
                  "private" && (
                  <Link
                    href={`/communities/${community.slug}/requests`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    Join requests
                  </Link>
                )}

                <Link
                  href={`/communities/${community.slug}/reports`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Reports
                </Link>
              </div>
            </section>
          )}

          {community.privacy ===
            "private" &&
            !isMember &&
            joinRequestStatus ===
              "pending" && (
              <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Request submitted
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Your request is waiting for
                  review by a community owner or
                  administrator.
                </p>
              </section>
            )}
        </aside>
      </div>
    </main>
  );
}
