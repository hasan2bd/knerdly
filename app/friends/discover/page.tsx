import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import FriendRequestButton from "../../components/friend-request-button";

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status:
    | "pending"
    | "accepted"
    | "declined"
    | "cancelled";
};

type DiscoverPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
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

function getRelationship(
  profileId: string,
  currentUserId: string,
  friendships: Friendship[]
) {
  const friendship = friendships.find(
    (item) =>
      (item.requester_id === currentUserId &&
        item.addressee_id === profileId) ||
      (item.requester_id === profileId &&
        item.addressee_id === currentUserId)
  );

  if (!friendship) {
    return "none";
  }

  if (friendship.status === "accepted") {
    return "friends";
  }

  if (friendship.status === "pending") {
    if (friendship.requester_id === currentUserId) {
      return "outgoing";
    }

    return "incoming";
  }

  return "none";
}

export default async function DiscoverPage({
  searchParams,
}: DiscoverPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = (params.q || "").trim();

  let profileQuery = supabase
    .from("profiles")
    .select(
      `
        id,
        username,
        display_name,
        bio,
        institution,
        department,
        program,
        academic_level,
        avatar_url,
        identity_mode
      `
    )
    .neq("id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  if (query) {
    const escapedQuery = query
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");

    profileQuery = profileQuery.or(
      `display_name.ilike.%${escapedQuery}%,username.ilike.%${escapedQuery}%,institution.ilike.%${escapedQuery}%,department.ilike.%${escapedQuery}%`
    );
  }

  const { data: profiles, error: profilesError } =
    await profileQuery;

  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, status"
    )
    .or(
      `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
    );

  const friendshipRows =
    (friendships || []) as Friendship[];

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#dfe6e1] bg-[#f6f7f4]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/friends"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce4de] bg-white text-sm font-bold text-[#17352d] transition hover:border-[#17352d] active:bg-[#f3f5f2]"
            aria-label="Back to friends"
          >
            ←
          </Link>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">
              Discover students
            </h1>

            <p className="text-[11px] text-[#7b8983]">
              Find people to learn with
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Search */}
        <form method="get" className="mb-6">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9892]"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path
                  strokeLinecap="round"
                  d="m20 20-4-4"
                />
              </svg>

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search students..."
                className="h-12 w-full rounded-2xl border border-[#dce4de] bg-white pl-11 pr-4 text-base text-[#17352d] outline-none transition placeholder:text-[#9aa59f] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
              />
            </div>

            <button
              type="submit"
              className="min-h-12 shrink-0 rounded-2xl bg-[#17352d] px-5 text-sm font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247]"
            >
              Search
            </button>
          </div>
        </form>

        {/* Heading */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9892]">
            {query
              ? "Search results"
              : "Students"}
          </p>

          <h2 className="mt-1 text-xl font-semibold text-[#17352d]">
            {query
              ? `People matching “${query}”`
              : "Meet other Knerds"}
          </h2>
        </div>

        {/* Error */}
        {profilesError && (
          <div className="rounded-2xl border border-[#ead8d5] bg-[#fff7f5] px-4 py-4 text-sm text-[#a24d42]">
            We couldn&apos;t load students right now.
            Please refresh and try again.
          </div>
        )}

        {/* Empty */}
        {!profilesError &&
          (!profiles || profiles.length === 0) && (
            <div className="rounded-3xl border border-[#dce4de] bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2ee] text-xl text-[#557067]">
                ?
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                {query
                  ? "No students found"
                  : "No students to discover yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7b8983]">
                {query
                  ? "Try a different name, username, institution, or department."
                  : "As more students join Knerdly, you&apos;ll see them here."}
              </p>

              {query && (
                <Link
                  href="/friends/discover"
                  className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition hover:bg-[#285247]"
                >
                  View all students
                </Link>
              )}
            </div>
          )}

        {/* Student grid */}
        {!profilesError &&
          profiles &&
          profiles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {profiles.map((profile) => {
                const displayName =
                  profile.identity_mode ===
                  "pseudonymous"
                    ? profile.username
                      ? `@${profile.username}`
                      : "Anonymous Knerd"
                    : profile.display_name ||
                      profile.username ||
                      "Knerd";

                const initials =
                  getInitials(
                    profile.display_name ||
                      profile.username ||
                      "Knerd"
                  );

                const relationship =
                  getRelationship(
                    profile.id,
                    user.id,
                    friendshipRows
                  );

                const profileHref =
                  profile.username
                    ? `/profile/${profile.username}`
                    : null;

                return (
                  <article
                    key={profile.id}
                    className="rounded-3xl border border-[#dce4de] bg-white p-5 transition hover:border-[#c8d4cd] sm:p-6"
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white">
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

                      {/* Identity */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-[#17352d]">
                          {displayName}
                        </h3>

                        {profile.username && (
                          <p className="mt-0.5 truncate text-xs text-[#8a9892]">
                            @{profile.username}
                          </p>
                        )}

                        {profile.institution && (
                          <p className="mt-2 truncate text-xs font-medium text-[#557067]">
                            {profile.institution}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Academic information */}
                    {(profile.department ||
                      profile.program ||
                      profile.academic_level) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.department && (
                          <span className="rounded-full bg-[#f3f5f2] px-3 py-1.5 text-[10px] font-semibold text-[#557067]">
                            {profile.department}
                          </span>
                        )}

                        {profile.program && (
                          <span className="rounded-full bg-[#f3f5f2] px-3 py-1.5 text-[10px] font-semibold text-[#557067]">
                            {profile.program}
                          </span>
                        )}

                        {profile.academic_level && (
                          <span className="rounded-full bg-[#f3f5f2] px-3 py-1.5 text-[10px] font-semibold text-[#557067]">
                            {profile.academic_level}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bio */}
                    {profile.bio && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#6f7e77]">
                        {profile.bio}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex gap-2">
                      {profileHref && (
                        <Link
                          href={profileHref}
                          className="flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#dce4de] px-4 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] active:bg-[#f3f5f2]"
                        >
                          View profile
                        </Link>
                      )}

                      {relationship === "friends" && (
                        <span className="flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#edf2ee] px-4 text-xs font-semibold text-[#557067]">
                          Friends
                        </span>
                      )}

                      {relationship === "outgoing" && (
                        <span className="flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#dce4de] px-4 text-xs font-semibold text-[#8a9892]">
                          Request sent
                        </span>
                      )}

                      {relationship === "incoming" && (
                        <Link
                          href="/friends/requests"
                          className="flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247]"
                        >
                          Respond
                        </Link>
                      )}

                      {relationship === "none" && (
                        <FriendRequestButton
                          userId={profile.id}
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </div>
    </main>
  );
}
