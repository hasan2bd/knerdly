import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../supabase/server";
import CommunityMemberRoleControl from "../../../components/community-member-role-control";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "moderator" | "member";
  joined_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  department: string | null;
};

const ROLE_ORDER = {
  owner: 1,
  admin: 2,
  moderator: 3,
  member: 4,
} as const;

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

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CommunityMembersPage({
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

  const { data: currentMembership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isMember = Boolean(currentMembership);
  const isOwner =
    currentMembership?.role === "owner";

  const { data: members, error: membersError } =
    await supabase
      .from("community_members")
      .select(
        `
        id,
        user_id,
        role,
        joined_at
        `
      )
      .eq("community_id", community.id)
      .order("joined_at", {
        ascending: true,
      });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const typedMembers =
    (members as Member[] | null) ?? [];

  const memberUserIds = typedMembers.map(
    (member) => member.user_id
  );

  let profiles: Profile[] = [];

  if (memberUserIds.length > 0) {
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
      .in("id", memberUserIds);

    profiles = (profileData as Profile[] | null) ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const sortedMembers = [...typedMembers].sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link
              href={`/communities/${community.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
            >
              <span aria-hidden="true">←</span>
              Back to community
            </Link>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Community
              </p>

              <h1 className="mt-1 truncate font-[var(--font-playfair)] text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                {community.name}
              </h1>
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]">
            {sortedMembers.length}{" "}
            {sortedMembers.length === 1
              ? "member"
              : "members"}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Intro */}
        <section className="mb-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              Community members
            </p>

            <h2 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Learn who is part of this community.
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
              Browse members, identify community roles,
              and keep track of the people contributing to
              this learning space.
            </p>
          </div>

          {!isMember && (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
              <p className="text-sm leading-6 text-[var(--muted)]">
                You can view this community&apos;s members, but
                you must join the community to participate.
              </p>
            </div>
          )}
        </section>

        {/* Members */}
        {sortedMembers.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-[var(--font-playfair)] text-xl font-semibold text-[var(--foreground)]">
                    All members
                  </h3>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Community roles and member information.
                  </p>
                </div>

                {isOwner && (
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                    Owner controls enabled
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {sortedMembers.map((member) => {
                const profile = profileMap.get(
                  member.user_id
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
                    key={member.id}
                    className="px-5 py-5 sm:px-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Identity */}
                      <div className="flex min-w-0 items-center gap-4">
                        <Link
                          href={
                            profile?.username
                              ? `/profile/${profile.username}`
                              : "#"
                          }
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]"
                          aria-label={`View ${displayName}'s profile`}
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
                            <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                              @{profile.username}
                            </p>
                          )}

                          {(profile?.institution ||
                            profile?.department) && (
                            <p className="mt-1 truncate text-xs text-[var(--muted)]">
                              {[
                                profile.institution,
                                profile.department,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Role + controls */}
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                            member.role === "owner"
                              ? "bg-[var(--primary)] text-white"
                              : member.role === "admin"
                                ? "bg-[var(--primary-light)] text-[var(--primary)]"
                                : member.role ===
                                    "moderator"
                                  ? "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]"
                                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                          }`}
                        >
                          {member.role}
                        </span>

                        <span className="text-xs text-[var(--muted)]">
                          Joined{" "}
                          {formatJoinedDate(
                            member.joined_at
                          )}
                        </span>

                        {isOwner &&
                          member.role !== "owner" && (
                            <CommunityMemberRoleControl
                              communityId={community.id}
                              userId={member.user_id}
                              currentRole={member.role}
                              memberName={displayName}
                            />
                          )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-light)] text-xl text-[var(--primary)]">
              ◎
            </div>

            <h3 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold text-[var(--foreground)]">
              No members yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
              This community does not have any visible
              members yet.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
