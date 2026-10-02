import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../supabase/server";

type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  institution: string | null;
  department: string | null;
  avatar_url: string | null;
};

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  privacy: "public" | "private";
  avatar_url: string | null;
};

type Post = {
  id: string;
  author_id: string;
  post_type: string;
  content: string;
  created_at: string;
};

function getInitials(profile: Profile) {
  if (!profile.display_name) {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function ExplorePage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { q: rawQuery } = await searchParams;
  const query = rawQuery?.trim() || "";

  let students: Profile[] = [];
  let communities: Community[] = [];
  let posts: Post[] = [];

  if (query) {
    const [
      profilesResult,
      communitiesResult,
      postsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, institution, department, avatar_url"
        )
        .or(
          `display_name.ilike.%${query}%,username.ilike.%${query}%,institution.ilike.%${query}%,department.ilike.%${query}%`
        )
        .neq("id", user.id)
        .limit(8),

      supabase
        .from("communities")
        .select(
          "id, name, slug, description, category, privacy, avatar_url"
        )
        .or(
          `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`
        )
        .limit(8),

      supabase
        .from("posts")
        .select(
          "id, author_id, post_type, content, created_at"
        )
        .ilike("content", `%${query}%`)
        .eq("visibility", "public")
        .order("created_at", {
          ascending: false,
        })
        .limit(8),
    ]);

    students = (profilesResult.data ?? []) as Profile[];

    communities = (communitiesResult.data ??
      []) as Community[];

    posts = (postsResult.data ?? []) as Post[];
  } else {
    const [
      recentPostsResult,
      recentProfilesResult,
      recentCommunitiesResult,
    ] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, author_id, post_type, content, created_at"
        )
        .eq("visibility", "public")
        .order("created_at", {
          ascending: false,
        })
        .limit(6),

      supabase
        .from("profiles")
        .select(
          "id, username, display_name, institution, department, avatar_url"
        )
        .neq("id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(6),

      supabase
        .from("communities")
        .select(
          "id, name, slug, description, category, privacy, avatar_url"
        )
        .eq("privacy", "public")
        .order("created_at", {
          ascending: false,
        })
        .limit(6),
    ]);

    students = (recentProfilesResult.data ??
      []) as Profile[];

    communities = (recentCommunitiesResult.data ??
      []) as Community[];

    posts = (recentPostsResult.data ?? []) as Post[];
  }

  /*
   * Fetch author profiles for discovered posts.
   */
  const authorIds = Array.from(
    new Set(posts.map((post) => post.author_id))
  );

  let postAuthors: Profile[] = [];

  if (authorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, institution, department, avatar_url"
      )
      .in("id", authorIds);

    postAuthors = (data ?? []) as Profile[];
  }

  const authorMap = new Map(
    postAuthors.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const totalResults =
    students.length +
    communities.length +
    posts.length;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/home"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dfe6e1] bg-white text-lg text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d]"
              aria-label="Back to home"
            >
              ←
            </Link>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Discover
              </p>

              <h1 className="truncate font-[var(--font-playfair)] text-xl font-semibold sm:text-2xl">
                Explore
              </h1>
            </div>
          </div>

          <Link
            href="/communities"
            className="hidden min-h-10 items-center rounded-full border border-[#d8e0da] bg-white px-4 text-sm font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:inline-flex"
          >
            Communities
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Search hero */}
        <section className="rounded-3xl border border-[#dfe6e1] bg-white p-6 sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
              Knerdly discovery
            </p>

            <h2 className="mt-3 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
              Find people, ideas, and communities.
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#718078] sm:text-base">
              Discover students, academic communities, and
              public conversations across Knerdly.
            </p>
          </div>

          <form
            action="/explore"
            method="get"
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <label
              htmlFor="explore-search"
              className="sr-only"
            >
              Search Knerdly
            </label>

            <div className="relative min-w-0 flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
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
                id="explore-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search students, communities, posts..."
                className="min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-[#f7f8f5] pl-12 pr-4 text-sm text-[#17352d] outline-none transition placeholder:text-[#9aa59f] focus:border-[#17352d] focus:bg-white focus:ring-2 focus:ring-[#17352d]/10"
              />
            </div>

            <button
              type="submit"
              className="min-h-12 rounded-2xl bg-[#17352d] px-7 text-sm font-semibold text-white transition hover:bg-[#285247]"
            >
              Search
            </button>

            {query && (
              <Link
                href="/explore"
                className="flex min-h-12 items-center justify-center rounded-2xl border border-[#d8e1db] bg-white px-5 text-sm font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d]"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        {/* Search results */}
        {query ? (
          <div className="mt-8 space-y-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Search results
              </p>

              <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                Results for “{query}”
              </h2>

              <p className="mt-1 text-sm text-[#718078]">
                {totalResults} result
                {totalResults === 1 ? "" : "s"} across
                Knerdly.
              </p>
            </div>

            {/* Students */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                    People
                  </p>

                  <h3 className="mt-1 font-[var(--font-playfair)] text-xl font-semibold">
                    Students
                  </h3>
                </div>

                <span className="rounded-full bg-[#edf2ee] px-3 py-1 text-xs font-semibold text-[#557067]">
                  {students.length}
                </span>
              </div>

              {students.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {students.map((profile) => {
                    const username =
                      profile.username;

                    if (!username) {
                      return (
                        <div
                          key={profile.id}
                          className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#dfe6e1] bg-white p-4"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(profile)
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#17352d]">
                              {profile.display_name ||
                                "Knerd"}
                            </p>

                            <p className="text-xs text-[#8a9891]">
                              Profile incomplete
                            </p>

                            {(profile.institution ||
                              profile.department) && (
                              <p className="mt-1 truncate text-xs text-[#718078]">
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
                      );
                    }

                    return (
                      <Link
                        key={profile.id}
                        href={`/profile/${encodeURIComponent(
                          username
                        )}`}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#dfe6e1] bg-white p-4 transition hover:border-[#c5d1c9]"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(profile)
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#17352d]">
                            {profile.display_name ||
                              "Knerd"}
                          </p>

                          <p className="truncate text-xs text-[#8a9891]">
                            @{username}
                          </p>

                          {(profile.institution ||
                            profile.department) && (
                            <p className="mt-1 truncate text-xs text-[#718078]">
                              {[
                                profile.institution,
                                profile.department,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No students matched this search." />
              )}
            </section>

            {/* Communities */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                    Spaces
                  </p>

                  <h3 className="mt-1 font-[var(--font-playfair)] text-xl font-semibold">
                    Communities
                  </h3>
                </div>

                <span className="rounded-full bg-[#edf2ee] px-3 py-1 text-xs font-semibold text-[#557067]">
                  {communities.length}
                </span>
              </div>

              {communities.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {communities.map((community) => (
                    <Link
                      key={community.id}
                      href={`/communities/${community.slug}`}
                      className="rounded-2xl border border-[#dfe6e1] bg-white p-5 transition hover:border-[#c5d1c9]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#edf2ee]">
                          {community.avatar_url ? (
                            <img
                              src={community.avatar_url}
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

                        <div className="min-w-0">
                          <h4 className="truncate font-[var(--font-playfair)] text-lg font-semibold">
                            {community.name}
                          </h4>

                          <p className="mt-1 text-xs text-[#8a9891]">
                            {community.category}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#718078]">
                        {community.description ||
                          "A community for students to learn, discuss, and connect."}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState text="No communities matched this search." />
              )}
            </section>

            {/* Posts */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                    Discussions
                  </p>

                  <h3 className="mt-1 font-[var(--font-playfair)] text-xl font-semibold">
                    Public posts
                  </h3>
                </div>

                <span className="rounded-full bg-[#edf2ee] px-3 py-1 text-xs font-semibold text-[#557067]">
                  {posts.length}
                </span>
              </div>

              {posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map((post) => {
                    const author = authorMap.get(
                      post.author_id
                    );

                    const username =
                      author?.username;

                    return (
                      <Link
                        key={post.id}
                        href={`/home#post-${post.id}`}
                        className="block rounded-2xl border border-[#dfe6e1] bg-white p-5 transition hover:border-[#c5d1c9]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white">
                            {author?.avatar_url ? (
                              <img
                                src={author.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : author ? (
                              getInitials(author)
                            ) : (
                              "K"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {author?.display_name ||
                                "Knerd"}
                            </p>

                            <p className="text-xs text-[#8a9891]">
                              {username
                                ? `@${username} · `
                                : ""}
                              {formatDate(
                                post.created_at
                              )}
                            </p>
                          </div>

                          <span className="ml-auto shrink-0 rounded-full bg-[#f0f3ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#557067]">
                            {post.post_type.replace(
                              "_",
                              " "
                            )}
                          </span>
                        </div>

                        <p className="mt-4 line-clamp-4 text-sm leading-7 text-[#566760]">
                          {post.content}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No public posts matched this search." />
              )}
            </section>
          </div>
        ) : (
          /* Default discovery */
          <div className="mt-8 space-y-10">
            {/* Quick discovery */}
            <section>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                  Start exploring
                </p>

                <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                  What are you looking for?
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ExploreCard
                  title="Students"
                  description="Discover students by name, institution, or department."
                  href="/explore?q="
                  icon="people"
                />

                <ExploreCard
                  title="Communities"
                  description="Find spaces built around subjects and shared interests."
                  href="/communities"
                  icon="community"
                />

                <ExploreCard
                  title="Discussions"
                  description="Explore public academic conversations on Knerdly."
                  href="/explore?q=study"
                  icon="discussion"
                />
              </div>
            </section>

            {/* Recent students */}
            <section>
              <SectionHeading
                eyebrow="People"
                title="Students to discover"
                href="/explore?q="
              />

              {students.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {students.map((profile) => {
                    const username =
                      profile.username;

                    if (!username) {
                      return (
                        <div
                          key={profile.id}
                          className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#dfe6e1] bg-white p-4"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(profile)
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {profile.display_name ||
                                "Knerd"}
                            </p>

                            <p className="text-xs text-[#8a9891]">
                              Profile incomplete
                            </p>

                            {(profile.institution ||
                              profile.department) && (
                              <p className="mt-1 truncate text-xs text-[#718078]">
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
                      );
                    }

                    return (
                      <Link
                        key={profile.id}
                        href={`/profile/${encodeURIComponent(
                          username
                        )}`}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#dfe6e1] bg-white p-4 transition hover:border-[#c5d1c9]"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(profile)
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {profile.display_name ||
                              "Knerd"}
                          </p>

                          <p className="truncate text-xs text-[#8a9891]">
                            @{username}
                          </p>

                          {(profile.institution ||
                            profile.department) && (
                            <p className="mt-1 truncate text-xs text-[#718078]">
                              {[
                                profile.institution,
                                profile.department,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No students to discover yet." />
              )}
            </section>

            {/* Recent communities */}
            <section>
              <SectionHeading
                eyebrow="Spaces"
                title="Communities"
                href="/communities"
              />

              {communities.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {communities.map((community) => (
                    <Link
                      key={community.id}
                      href={`/communities/${community.slug}`}
                      className="rounded-2xl border border-[#dfe6e1] bg-white p-5 transition hover:border-[#c5d1c9]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#edf2ee]">
                          {community.avatar_url ? (
                            <img
                              src={community.avatar_url}
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

                        <div className="min-w-0">
                          <h3 className="truncate font-[var(--font-playfair)] text-lg font-semibold">
                            {community.name}
                          </h3>

                          <p className="text-xs text-[#8a9891]">
                            {community.category}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#718078]">
                        {community.description ||
                          "A student community on Knerdly."}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState text="No public communities yet." />
              )}
            </section>

            {/* Recent discussions */}
            <section>
              <SectionHeading
                eyebrow="Discussions"
                title="Recent public conversations"
                href="/home"
              />

              {posts.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {posts.map((post) => {
                    const author = authorMap.get(
                      post.author_id
                    );

                    return (
                      <Link
                        key={post.id}
                        href={`/home#post-${post.id}`}
                        className="rounded-2xl border border-[#dfe6e1] bg-white p-5 transition hover:border-[#c5d1c9]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white">
                            {author?.avatar_url ? (
                              <img
                                src={author.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : author ? (
                              getInitials(author)
                            ) : (
                              "K"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {author?.display_name ||
                                "Knerd"}
                            </p>

                            <p className="text-xs text-[#8a9891]">
                              {formatDate(
                                post.created_at
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#566760]">
                          {post.content}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No public discussions yet." />
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#ccd7d0] bg-white px-5 py-8 text-center">
      <p className="text-sm text-[#718078]">
        {text}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
          {eyebrow}
        </p>

        <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
          {title}
        </h2>
      </div>

      <Link
        href={href}
        className="text-xs font-semibold text-[#557067] transition hover:text-[#17352d]"
      >
        Explore more →
      </Link>
    </div>
  );
}

function ExploreCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: "people" | "community" | "discussion";
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#dfe6e1] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c5d1c9]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2ee] text-[#557067]">
        {icon === "people" && "◉"}
        {icon === "community" && "◈"}
        {icon === "discussion" && "◇"}
      </div>

      <h3 className="mt-4 font-[var(--font-playfair)] text-xl font-semibold group-hover:text-[#285247]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#718078]">
        {description}
      </p>
    </Link>
  );
}