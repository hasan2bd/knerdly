import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../supabase/server";

type Reel = {
  id: string;
  user_id: string;
  caption: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  visibility: "public" | "unlisted" | "private";
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function ReelsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: reels, error: reelsError } = await supabase
    .from("reels")
    .select(
      `
        id,
        user_id,
        caption,
        video_url,
        thumbnail_url,
        duration_seconds,
        visibility,
        created_at
      `
    )
    .or(`visibility.eq.public,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (reelsError) {
    console.error("Reels load error:", reelsError);
  }

  const reelList = (reels ?? []) as Reel[];

  const creatorIds = Array.from(
    new Set(reelList.map((reel) => reel.user_id))
  );

  let profiles: Profile[] = [];

  if (creatorIds.length > 0) {
    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url"
        )
        .in("id", creatorIds);

    if (profileError) {
      console.error(
        "Reel creator profiles load error:",
        profileError
      );
    }

    profiles = profileData ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/home"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
            >
              <span aria-hidden="true">←</span>
              Back to home
            </Link>

            <div className="mt-2">
              <h1 className="font-[var(--font-playfair)] text-2xl font-semibold tracking-tight sm:text-3xl">
                Reels
              </h1>

              <p className="mt-1 text-sm text-[#718078]">
                Short ideas, quick lessons, and moments worth sharing.
              </p>
            </div>
          </div>

          <Link
            href="/reels/upload"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] sm:px-5 sm:text-sm"
          >
            Create Reel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Intro */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
                Discover
              </p>

              <h2 className="mt-3 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
                Learn something in a minute.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#718078] sm:text-base">
                Explore short-form content from the Knerdly community,
                from study tips and academic ideas to campus moments
                and useful explanations.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-[#f7f8f5] px-5 py-4">
              <p className="text-2xl font-semibold text-[#17352d]">
                {reelList.length}
              </p>

              <p className="mt-1 text-xs text-[#718078]">
                Reels available
              </p>
            </div>
          </div>
        </section>

        {/* Empty state */}
        {reelList.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <rect
                  width="14"
                  height="20"
                  x="5"
                  y="2"
                  rx="2"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m10 8 5 4-5 4V8Z"
                />
              </svg>
            </div>

            <h2 className="mt-6 font-[var(--font-playfair)] text-2xl font-semibold sm:text-3xl">
              No Reels yet.
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#718078]">
              Be one of the first to share a short lesson, study tip,
              idea, or campus moment.
            </p>

            <Link
              href="/reels/upload"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247]"
            >
              Create the first Reel
            </Link>
          </section>
        ) : (
          /* Reel grid */
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                  Reel feed
                </p>

                <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                  Latest Reels
                </h2>
              </div>

              <p className="hidden text-xs text-[#8a9891] sm:block">
                {reelList.length}{" "}
                {reelList.length === 1 ? "reel" : "reels"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {reelList.map((reel) => {
                const profile = profileMap.get(reel.user_id);

                const username =
                  profile?.username || "new-member";

                const displayName =
                  profile?.display_name || "Knerd";

                return (
                  <article
                    key={reel.id}
                    className="group overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white"
                  >
                    {/* Video preview */}
                    <Link
                      href={`/reels/${reel.id}`}
                      className="relative block aspect-[9/16] overflow-hidden bg-[#dfe5df]"
                    >
                      {reel.thumbnail_url ? (
                        <img
                          src={reel.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <video
                          src={reel.video_url}
                          preload="metadata"
                          muted
                          playsInline
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

                      {/* Play button */}
                      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#17352d] shadow-lg">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="ml-0.5 h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.14-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
                        </svg>
                      </div>

                      {reel.duration_seconds !== null && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white">
                          {formatDuration(reel.duration_seconds)}
                        </span>
                      )}
                    </Link>

                    {/* Information */}
                    <div className="p-3.5">
                      <Link
                        href={`/reels/${reel.id}`}
                        className="block"
                      >
                        <p className="line-clamp-3 min-h-[3.75rem] text-sm font-medium leading-5 text-[#17352d] transition group-hover:text-[#285247]">
                          {reel.caption || "Untitled Reel"}
                        </p>
                      </Link>

                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href={`/profile/${username}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-[10px] font-semibold text-white"
                          aria-label={`View ${displayName}'s profile`}
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            displayName
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            href={`/profile/${username}`}
                            className="block truncate text-xs font-semibold text-[#557067] hover:text-[#17352d]"
                          >
                            {displayName}
                          </Link>

                          <p className="truncate text-[10px] text-[#9aa59f]">
                            {formatDate(reel.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}