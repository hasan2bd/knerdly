"c8m2pa"
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../supabase/server";
import CommunityJoinRequestActions from "../../../components/community-join-request-actions";
type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type JoinRequest = {
  id: string;
  community_id: string;
  user_id: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  department: string | null;
};

function getInitials(
  displayName: string | null,
  username: string | null
) {
  const value =
    displayName?.trim() ||
    username?.trim() ||
    "Student";

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CommunityJoinRequestsPage({
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
   * Load community.
   */
  const { data: community, error: communityError } =
    await supabase
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
   * Only private communities have join requests.
   */
  if (community.privacy !== "private") {
    redirect(`/communities/${community.slug}`);
  }

  /*
   * Check current user's role.
   */
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !membership ||
    !["owner", "admin"].includes(membership.role)
  ) {
    redirect(`/communities/${community.slug}`);
  }

  /*
   * Load pending requests.
   */
  const { data: requests, error: requestsError } =
    await supabase
      .from("community_join_requests")
      .select(
        `
        id,
        community_id,
        user_id,
        status,
        created_at
        `
      )
      .eq("community_id", community.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: true,
      });

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  const typedRequests =
    (requests as JoinRequest[] | null) ?? [];

  /*
   * Load applicant profiles.
   */
  const applicantIds = typedRequests.map(
    (request) => request.user_id
  );

  let profiles: Profile[] = [];

  if (applicantIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        avatar_url,
        institution,
        department
        `
      )
      .in("id", applicantIds);

    profiles =
      (profileData as Profile[] | null) ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href={`/communities/${community.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
          >
            <span aria-hidden="true">←</span>
            Back to community
          </Link>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                Community administration
              </p>

              <h1 className="mt-1 font-[var(--font-playfair)] text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
                Join requests
              </h1>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Review students who want to join{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {community.name}
                </span>
                .
              </p>
            </div>

            <div className="self-start rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] sm:self-auto">
              {typedRequests.length}{" "}
              {typedRequests.length === 1
                ? "pending request"
                : "pending requests"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {typedRequests.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <h2 className="font-[var(--font-playfair)] text-xl font-semibold text-[var(--foreground)]">
                People waiting to join
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Review each request before granting
                community access.
              </p>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {typedRequests.map((request) => {
                const profile = profileMap.get(
                  request.user_id
                );

                const displayName =
                  profile?.display_name ||
                  profile?.username ||
                  "Student";

                const initials = getInitials(
                  profile?.display_name ?? null,
                  profile?.username ?? null
                );

                return (
                  <article
                    key={request.id}
                    className="px-5 py-5 sm:px-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <Link
                          href={
                            profile?.username
                              ? `/profile/${profile.username}`
                              : "#"
                          }
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]"
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
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
                              profile?.username
                                ? `/profile/${profile.username}`
                                : "#"
                            }
                            className="block truncate font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]"
                          >
                            {displayName}
                          </Link>

                          {profile?.username && (
                            <p className="mt-0.5 text-sm text-[var(--muted)]">
                              @{profile.username}
                            </p>
                          )}

                          {(profile?.institution ||
                            profile?.department) && (
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {[
                                profile.institution,
                                profile.department,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-[var(--muted)]">
                            Requested{" "}
                            {formatRequestDate(
                              request.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <CommunityJoinRequestActions
                        requestId={request.id}
                        applicantName={displayName}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-light)] text-2xl text-[var(--primary)]">
              ✓
            </div>

            <h2 className="mt-6 font-[var(--font-playfair)] text-2xl font-semibold text-[var(--foreground)]">
              No pending requests
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
              There are currently no students waiting for
              approval to join this community.
            </p>

            <Link
              href={`/communities/${community.slug}`}
              className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
            >
              Back to community
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

