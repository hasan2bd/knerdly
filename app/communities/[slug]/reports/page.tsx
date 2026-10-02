import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../supabase/server";
import CommunityReportStatusControl from "../../../components/community-report-status-control";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CommunityReport = {
  id: string;
  community_id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  answer_id: string | null;
  reason:
    | "spam"
    | "harassment"
    | "misinformation"
    | "inappropriate"
    | "off_topic"
    | "other";
  details: string | null;
  status:
    | "pending"
    | "reviewed"
    | "dismissed"
    | "action_taken";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Post = {
  id: string;
  title: string | null;
  content: string;
  post_type: string;
};

type Comment = {
  id: string;
  content: string;
  community_post_id: string;
};

type Answer = {
  id: string;
  content: string;
  community_post_id: string;
};

const reasonLabels: Record<
  CommunityReport["reason"],
  string
> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  inappropriate: "Inappropriate",
  off_topic: "Off topic",
  other: "Other",
};

const statusLabels: Record<
  CommunityReport["status"],
  string
> = {
  pending: "Pending",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
  action_taken: "Action taken",
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTargetType(
  report: CommunityReport
) {
  if (report.post_id) {
    return "Post";
  }

  if (report.comment_id) {
    return "Comment";
  }

  if (report.answer_id) {
    return "Answer";
  }

  return "Content";
}

function getTargetContent(
  report: CommunityReport,
  posts: Map<string, Post>,
  comments: Map<string, Comment>,
  answers: Map<string, Answer>
) {
  if (report.post_id) {
    const post = posts.get(report.post_id);

    if (!post) {
      return "This post is no longer available.";
    }

    return post.title
      ? `${post.title} — ${post.content}`
      : post.content;
  }

  if (report.comment_id) {
    return (
      comments.get(report.comment_id)?.content ||
      "This comment is no longer available."
    );
  }

  if (report.answer_id) {
    return (
      answers.get(report.answer_id)?.content ||
      "This answer is no longer available."
    );
  }

  return "Content unavailable.";
}

export default async function CommunityReportsPage({
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
      privacy
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
  const { data: membership } =
    await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();

  const isManager =
    membership?.role === "owner" ||
    membership?.role === "admin" ||
    membership?.role === "moderator";

  if (!isManager) {
    redirect(`/communities/${community.slug}`);
  }

  /*
   * Reports
   */
  const {
    data: reportData,
    error: reportsError,
  } = await supabase
    .from("community_reports")
    .select(
      `
      id,
      community_id,
      reporter_id,
      post_id,
      comment_id,
      answer_id,
      reason,
      details,
      status,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at
      `
    )
    .eq("community_id", community.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  const reports =
    (reportData as CommunityReport[] | null) ?? [];

  /*
   * Reporter profiles
   */
  const reporterIds = Array.from(
    new Set(
      reports.map(
        (report) => report.reporter_id
      )
    )
  );

  let reporterProfiles: Profile[] = [];

  if (reporterIds.length > 0) {
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
      .in("id", reporterIds);

    reporterProfiles =
      (data as Profile[] | null) ?? [];
  }

  const reporterMap = new Map(
    reporterProfiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  /*
   * Reviewed-by profiles
   */
  const reviewerIds = Array.from(
    new Set(
      reports
        .map((report) => report.reviewed_by)
        .filter(
          (id): id is string => Boolean(id)
        )
    )
  );

  let reviewerProfiles: Profile[] = [];

  if (reviewerIds.length > 0) {
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
      .in("id", reviewerIds);

    reviewerProfiles =
      (data as Profile[] | null) ?? [];
  }

  const reviewerMap = new Map(
    reviewerProfiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  /*
   * Reported posts
   */
  const postIds = reports
    .map((report) => report.post_id)
    .filter(
      (id): id is string => Boolean(id)
    );

  let postRows: Post[] = [];

  if (postIds.length > 0) {
    const { data } = await supabase
      .from("community_posts")
      .select(
        `
        id,
        title,
        content,
        post_type
        `
      )
      .in("id", postIds);

    postRows =
      (data as Post[] | null) ?? [];
  }

  /*
   * Reported comments
   */
  const commentIds = reports
    .map((report) => report.comment_id)
    .filter(
      (id): id is string => Boolean(id)
    );

  let commentRows: Comment[] = [];

  if (commentIds.length > 0) {
    const { data } = await supabase
      .from("community_post_comments")
      .select(
        `
        id,
        content,
        community_post_id
        `
      )
      .in("id", commentIds);

    commentRows =
      (data as Comment[] | null) ?? [];
  }

  /*
   * Reported answers
   */
  const answerIds = reports
    .map((report) => report.answer_id)
    .filter(
      (id): id is string => Boolean(id)
    );

  let answerRows: Answer[] = [];

  if (answerIds.length > 0) {
    const { data } = await supabase
      .from("community_post_answers")
      .select(
        `
        id,
        content,
        community_post_id
        `
      )
      .in("id", answerIds);

    answerRows =
      (data as Answer[] | null) ?? [];
  }

  const postMap = new Map(
    postRows.map((post) => [
      post.id,
      post,
    ])
  );

  const commentMap = new Map(
    commentRows.map((comment) => [
      comment.id,
      comment,
    ])
  );

  const answerMap = new Map(
    answerRows.map((answer) => [
      answer.id,
      answer,
    ])
  );

  const pendingCount = reports.filter(
    (report) => report.status === "pending"
  ).length;

  const reviewedCount = reports.filter(
    (report) => report.status === "reviewed"
  ).length;

  const dismissedCount = reports.filter(
    (report) => report.status === "dismissed"
  ).length;

  const actionTakenCount = reports.filter(
    (report) => report.status === "action_taken"
  ).length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link
              href={`/communities/${community.slug}`}
              className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--primary)]"
            >
              ← {community.name}
            </Link>

            <h1 className="mt-0.5 truncate text-lg font-semibold">
              Reports
            </h1>
          </div>

          <Link
            href={`/communities/${community.slug}/members`}
            className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            Members
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Intro */}
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Community management
          </p>

          <h2 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight">
            Report queue
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Review reports submitted by community
            members and record the outcome of each
            review.
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Pending
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Reviewed
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {reviewedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Dismissed
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {dismissedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Action taken
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {actionTakenCount}
            </p>
          </div>
        </div>

        {/* Reports */}
        {reports.length === 0 ? (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-light)] text-xl text-[var(--primary)]">
              ✓
            </div>

            <h3 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold">
              No reports
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
              There are currently no reports to review
              in this community.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const reporter =
                reporterMap.get(
                  report.reporter_id
                );

              const reviewer =
                report.reviewed_by
                  ? reviewerMap.get(
                      report.reviewed_by
                    )
                  : undefined;

              const targetType =
                getTargetType(report);

              const targetContent =
                getTargetContent(
                  report,
                  postMap,
                  commentMap,
                  answerMap
                );

              return (
                <article
                  key={report.id}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"
                >
                  {/* Report header */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
                        {reporter?.avatar_url ? (
                          <img
                            src={reporter.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(
                            reporter?.display_name ??
                              null,
                            reporter?.username ??
                              null
                          )
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {reporter?.display_name ||
                            reporter?.username ||
                            "Student"}
                        </p>

                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          Reported{" "}
                          {formatDate(
                            report.created_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        {reasonLabels[report.reason]}
                      </span>

                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {targetType}
                      </span>

                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                        {statusLabels[report.status]}
                      </span>
                    </div>
                  </div>

                  {/* Reported content */}
                  <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Reported content
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--foreground)]">
                      {targetContent}
                    </p>
                  </div>

                  {/* Reporter details */}
                  {report.details && (
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Reporter details
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]">
                        {report.details}
                      </p>
                    </div>
                  )}

                  {/* Review information */}
                  {reviewer && (
                    <p className="mt-4 text-xs text-[var(--muted)]">
                      Reviewed by{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {reviewer.display_name ||
                          reviewer.username ||
                          "Community manager"}
                      </span>

                      {report.reviewed_at
                        ? ` on ${formatDate(
                            report.reviewed_at
                          )}`
                        : ""}
                    </p>
                  )}

                  {/* Actions */}
                  {report.status === "pending" && (
                    <>
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
                        <Link
                          href={`/communities/${community.slug}`}
                          className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        >
                          View community
                        </Link>
                      </div>

                      <CommunityReportStatusControl
                        reportId={report.id}
                      />
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
