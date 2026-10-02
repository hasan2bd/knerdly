import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../supabase/server";
import CommunityMembershipButton from "../components/community-membership-button";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  privacy: "public" | "private";
  cover_image_url: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
};

type Membership = {
  community_id: string;
  role: "owner" | "admin" | "moderator" | "member";
};

type CommunitiesPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

const categoryDescriptions: Record<string, string> = {
  General:
    "Open conversations for students across different interests.",
  University:
    "Connect with students from universities and campuses.",
  Department:
    "Department-focused academic communities.",
  Subject:
    "Discuss subjects, courses, assignments, and ideas.",
  "Study Group":
    "Focused spaces for collaborative learning.",
  Technology:
    "Technology, programming, software, and digital skills.",
  Literature:
    "Literature, books, criticism, and literary discussion.",
  Business:
    "Business, entrepreneurship, management, and careers.",
  Career:
    "Career preparation, jobs, internships, and professional growth.",
  Language:
    "Language learning, communication, and practice.",
};

export default async function CommunitiesPage({
  searchParams,
}: CommunitiesPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const searchQuery =
    typeof params.q === "string"
      ? params.q.trim().slice(0, 80)
      : "";

  const selectedCategory =
    typeof params.category === "string"
      ? params.category.trim()
      : "";

  const { data: communities, error: communitiesError } =
    await supabase
      .from("communities")
      .select(
        `
          id,
          name,
          slug,
          description,
          category,
          privacy,
          cover_image_url,
          avatar_url,
          created_by,
          created_at
        `
      )
      .order("created_at", { ascending: false });

  if (communitiesError) {
    console.error(
      "Communities load error:",
      communitiesError
    );
  }

  const { data: memberships, error: membershipsError } =
    await supabase
      .from("community_members")
      .select("community_id, role")
      .eq("user_id", user.id);

  if (membershipsError) {
    console.error(
      "Memberships load error:",
      membershipsError
    );
  }

  const communityList = (communities ?? []) as Community[];
  const membershipList = (memberships ?? []) as Membership[];

  const membershipMap = new Map(
    membershipList.map((membership) => [
      membership.community_id,
      membership,
    ])
  );

  const joinedCount = membershipList.length;

  const publicCount = communityList.filter(
    (community) => community.privacy === "public"
  ).length;

  const privateCount = communityList.filter(
    (community) => community.privacy === "private"
  ).length;

  const categories = Array.from(
    new Set(
      communityList.map(
        (community) => community.category
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredCommunities = communityList.filter(
    (community) => {
      const matchesCategory =
        !selectedCategory ||
        community.category === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!searchQuery) {
        return true;
      }

      const searchableText = [
        community.name,
        community.description ?? "",
        community.category,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        searchQuery.toLowerCase()
      );
    }
  );

  const hasFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCategory);

  const clearFiltersHref = "/communities";

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
            >
              <span aria-hidden="true">←</span>
              Back to home
            </Link>

            <div className="mt-2">
              <h1 className="font-[var(--font-playfair)] text-2xl font-semibold tracking-tight sm:text-3xl">
                Communities
              </h1>

              <p className="mt-1 text-sm text-[#718078]">
                Learn together. Discuss ideas. Find your people.
              </p>
            </div>
          </div>

          <Link
            href="/communities/create"
            className="hidden min-h-11 shrink-0 items-center justify-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition hover:bg-[#285247] sm:inline-flex"
          >
            Create community
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Mobile create button */}
        <div className="mb-6 sm:hidden">
          <Link
            href="/communities/create"
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition active:bg-[#285247]"
          >
            Create community
          </Link>
        </div>

        {/* Overview */}
        <section className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
                Learning spaces
              </p>

              <h2 className="mt-3 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight text-[#17352d] sm:text-4xl">
                Find a community where you belong.
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#718078] sm:text-base">
                Join academic communities, study groups,
                subject discussions, career spaces, and
                conversations built around shared interests.
              </p>
            </div>

            {/* Statistics */}
            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-2xl sm:gap-4">
              <div className="rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4">
                <p className="text-2xl font-semibold text-[#17352d]">
                  {communityList.length}
                </p>

                <p className="mt-1 text-xs text-[#718078]">
                  Communities
                </p>
              </div>

              <div className="rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4">
                <p className="text-2xl font-semibold text-[#17352d]">
                  {joinedCount}
                </p>

                <p className="mt-1 text-xs text-[#718078]">
                  Joined
                </p>
              </div>

              <div className="rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4">
                <p className="text-2xl font-semibold text-[#17352d]">
                  {categories.length}
                </p>

                <p className="mt-1 text-xs text-[#718078]">
                  Categories
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search and filters */}
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
              Discovery
            </p>

            <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
              Find your space
            </h2>
          </div>

          <form
            action="/communities"
            method="get"
            className="rounded-3xl border border-[#dfe6e1] bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">
                  Search communities
                </span>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a9891]"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path
                    strokeLinecap="round"
                    d="m20 20-4-4"
                  />
                </svg>

                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search communities, subjects, interests..."
                  maxLength={80}
                  className="min-h-11 w-full rounded-full border border-[#dfe6e1] bg-[#f7f8f5] pl-12 pr-4 text-sm text-[#263a33] outline-none transition placeholder:text-[#9aa69f] focus:border-[#9bb0a5] focus:bg-white focus:ring-2 focus:ring-[#dce7e0]"
                />
              </label>

              {selectedCategory && (
                <input
                  type="hidden"
                  name="category"
                  value={selectedCategory}
                />
              )}

              <button
                type="submit"
                className="min-h-11 rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247]"
              >
                Search
              </button>
            </div>

            {/* Category filters */}
            {categories.length > 0 && (
              <div className="mt-4 border-t border-[#edf1ee] pt-4">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Link
                    href={
                      searchQuery
                        ? `/communities?q=${encodeURIComponent(
                            searchQuery
                          )}`
                        : "/communities"
                    }
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      !selectedCategory
                        ? "border-[#17352d] bg-[#17352d] text-white"
                        : "border-[#dfe6e1] bg-white text-[#557067] hover:border-[#b8c6bd] hover:text-[#17352d]"
                    }`}
                  >
                    All
                  </Link>

                  {categories.map((category) => {
                    const href = searchQuery
                      ? `/communities?q=${encodeURIComponent(
                          searchQuery
                        )}&category=${encodeURIComponent(
                          category
                        )}`
                      : `/communities?category=${encodeURIComponent(
                          category
                        )}`;

                    const isActive =
                      selectedCategory === category;

                    return (
                      <Link
                        key={category}
                        href={href}
                        className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "border-[#17352d] bg-[#17352d] text-white"
                            : "border-[#dfe6e1] bg-white text-[#557067] hover:border-[#b8c6bd] hover:text-[#17352d]"
                        }`}
                      >
                        {category}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Category summary */}
        {categories.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                  Explore
                </p>

                <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                  Browse by interest
                </h2>
              </div>

              <p className="hidden text-xs text-[#718078] sm:block">
                {publicCount} public · {privateCount} private
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/communities?category=${encodeURIComponent(
                    category
                  )}`}
                  className="shrink-0 rounded-full border border-[#dfe6e1] bg-white px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#b8c6bd] hover:text-[#17352d]"
                >
                  {category}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Community list */}
        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Community directory
              </p>

              <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                {hasFilters
                  ? "Matching communities"
                  : "Discover communities"}
              </h2>
            </div>

            {hasFilters && (
              <Link
                href={clearFiltersHref}
                className="shrink-0 text-xs font-semibold text-[#557067] transition hover:text-[#17352d]"
              >
                Clear filters
              </Link>
            )}
          </div>

          {hasFilters && (
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#718078]">
              <span>
                Showing{" "}
                <strong className="font-semibold text-[#17352d]">
                  {filteredCommunities.length}
                </strong>{" "}
                of{" "}
                <strong className="font-semibold text-[#17352d]">
                  {communityList.length}
                </strong>{" "}
                communities
              </span>

              {searchQuery && (
                <span className="rounded-full bg-[#edf2ee] px-3 py-1 font-medium text-[#557067]">
                  Search: “{searchQuery}”
                </span>
              )}

              {selectedCategory && (
                <span className="rounded-full bg-[#edf2ee] px-3 py-1 font-medium text-[#557067]">
                  {selectedCategory}
                </span>
              )}
            </div>
          )}

          {filteredCommunities.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white px-6 py-16 text-center">
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
              </div>

              <h3 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold">
                No communities found.
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#718078]">
                Try a different search term or browse all
                available communities.
              </p>

              <Link
                href={clearFiltersHref}
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247]"
              >
                Browse all communities
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCommunities.map(
                (community) => {
                  const membership =
                    membershipMap.get(
                      community.id
                    );

                  const isMember =
                    Boolean(membership);

                  const isOwner =
                    membership?.role ===
                    "owner";

                  return (
                    <article
                      key={community.id}
                      className="group overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[#c9d4cd]"
                    >
                      {/* Cover */}
                      <Link
                        href={`/communities/${community.slug}`}
                        className="relative block aspect-[16/7] overflow-hidden bg-[#e8ede9]"
                      >
                        {community.cover_image_url ? (
                          <img
                            src={
                              community.cover_image_url
                            }
                            alt=""
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[#e8ede9]">
                            <span className="font-[var(--font-playfair)] text-3xl font-semibold text-[#9aa9a1]">
                              {community.name
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

                        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#557067] backdrop-blur-sm">
                          {community.category}
                        </span>

                        {community.privacy ===
                          "private" && (
                          <span className="absolute right-4 top-4 rounded-full bg-[#17352d]/90 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                            Private
                          </span>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dfe6e1] bg-[#edf2ee]">
                            {community.avatar_url ? (
                              <img
                                src={
                                  community.avatar_url
                                }
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-[var(--font-playfair)] text-lg font-semibold text-[#557067]">
                                {community.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/communities/${community.slug}`}
                              className="block"
                            >
                              <h3 className="truncate font-[var(--font-playfair)] text-xl font-semibold text-[#17352d] transition group-hover:text-[#285247]">
                                {community.name}
                              </h3>
                            </Link>

                            <p className="mt-1 text-xs text-[#8a9891]">
                              {community.privacy ===
                              "private"
                                ? "Private community"
                                : "Public community"}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#718078]">
                          {community.description ||
                            categoryDescriptions[
                              community.category
                            ] ||
                            "A place for students to learn, discuss, and connect."}
                        </p>

                        <div className="mt-5 flex items-center gap-2">
                          <Link
                            href={`/communities/${community.slug}`}
                            className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-[#dfe6e1] px-4 text-xs font-semibold text-[#557067] transition hover:border-[#b8c6bd] hover:text-[#17352d]"
                          >
                            View community
                          </Link>

                          <div className="min-w-0 flex-1">
                            <CommunityMembershipButton
                              communityId={
                                community.id
                              }
                              isMember={isMember}
                              isOwner={isOwner}
                              privacy={
                                community.privacy
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
