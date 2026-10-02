import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../supabase/server";
import ReelComments from "../../components/reel-comments";
import ReelNavigation from "../../components/reel-navigation";
import ReelReactionButton from "../../components/reel-reaction-button";

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

type ReelPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

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

export default async function ReelPage({
  params,
}: ReelPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: reel, error: reelError } =
    await supabase
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
      .eq("id", id)
      .maybeSingle();

  if (reelError) {
    console.error("Reel load error:", reelError);
    notFound();
  }

  if (!reel) {
    notFound();
  }

  const currentReel = reel as Reel;

  if (
    currentReel.visibility !== "public" &&
    currentReel.user_id !== user.id
  ) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url"
    )
    .eq("id", currentReel.user_id)
    .maybeSingle();

  const creator = profile as Profile | null;

  const username =
    creator?.username || "new-member";

  const displayName =
    creator?.display_name || "Knerd";

  const { data: nearbyReels } = await supabase
    .from("reels")
    .select("id, created_at")
    .eq("visibility", "public")
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  const publicReels = nearbyReels ?? [];

  const currentIndex = publicReels.findIndex(
    (item) => item.id === currentReel.id
  );

  const previousReel =
    currentIndex > 0
      ? publicReels[currentIndex - 1]
      : null;

  const nextReel =
    currentIndex >= 0 &&
    currentIndex < publicReels.length - 1
      ? publicReels[currentIndex + 1]
      : null;

  return (
    <ReelNavigation
      previousReelId={previousReel?.id ?? null}
      nextReelId={nextReel?.id ?? null}
    >
      <main className="min-h-screen bg-[#111614] text-white">
        {/* Header */}
        <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#111614]/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-3 py-3 sm:px-6">
            <Link
              href="/reels"
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Reels
            </Link>

            <Link
              href="/reels/upload"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold text-[#17352d] transition hover:bg-white/90 sm:px-5 sm:text-sm"
            >
              Create Reel
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-3 pb-8 pt-20 sm:px-6">
          <div className="flex flex-col items-center">
            {/* Viewer */}
            <div className="flex w-full items-center justify-center gap-4 lg:gap-8">
              {/* Desktop previous */}
              <div className="hidden w-12 shrink-0 lg:block">
                {previousReel ? (
                  <Link
                    href={`/reels/${previousReel.id}`}
                    aria-label="Previous Reel"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                  >
                    ←
                  </Link>
                ) : null}
              </div>

              {/* Reel */}
              <div className="relative w-full max-w-[430px]">
                <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
                  <div className="relative aspect-[9/16] w-full">
                    <video
                      src={currentReel.video_url}
                      poster={
                        currentReel.thumbnail_url ||
                        undefined
                      }
                      controls
                      autoPlay
                      loop
                      playsInline
                      preload="auto"
                    className="h-full w-full bg-black object-contain"
                    />

                    {/* Bottom gradient */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                    {/* Creator + caption */}
                    <div className="absolute inset-x-0 bottom-0 p-5 pr-20">
                      <Link
                        href={`/profile/${username}`}
                        className="inline-flex max-w-full items-center gap-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white ring-2 ring-white/20">
                          {creator?.avatar_url ? (
                            <img
                              src={creator.avatar_url}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(displayName)
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {displayName}
                          </p>

                          <p className="truncate text-xs text-white/60">
                            @{username}
                          </p>
                        </div>
                      </Link>

                      {currentReel.caption && (
                        <p className="mt-3 max-h-20 overflow-hidden text-sm leading-5 text-white/90">
                          {currentReel.caption}
                        </p>
                      )}

                      <p className="mt-2 text-[10px] text-white/50">
                        {formatDate(
                          currentReel.created_at
                        )}
                      </p>
                    </div>

                    {/* Owner */}
                    {currentReel.user_id === user.id && (
                      <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                        Your Reel
                      </span>
                    )}

                    {/* Mobile swipe hint */}
                    <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-medium text-white/70 backdrop-blur-sm sm:hidden">
                      Swipe to browse
                    </div>

                    {/* Actions */}
                    <div className="absolute bottom-24 right-4 flex flex-col items-center gap-4">
                      <ReelReactionButton
                        reelId={currentReel.id}
                      />

                      <div className="flex flex-col items-center">
                        <a
                          href="#comments"
                          aria-label="View comments"
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-6 w-6"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.9 9.9 0 0 1-4-.8L3 21l1.8-4.1A8.3 8.3 0 0 1 3 11.5 8.5 8.5 0 1 1 21 11.5Z"
                            />
                          </svg>
                        </a>

                        <span className="mt-1 text-xs font-semibold text-white">
                          Comments
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              {/* Desktop next */}
              <div className="hidden w-12 shrink-0 lg:block">
                {nextReel ? (
                  <Link
                    href={`/reels/${nextReel.id}`}
                    aria-label="Next Reel"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                  >
                    →
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Mobile navigation */}
            <div className="mt-4 flex w-full max-w-[430px] items-center gap-3 lg:hidden">
              {previousReel ? (
                <Link
                  href={`/reels/${previousReel.id}`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/80"
                >
                  ← Previous
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              {nextReel ? (
                <Link
                  href={`/reels/${nextReel.id}`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#17352d]"
                >
                  Next →
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>

          {/* Comments */}
          <div
            id="comments"
            className="mx-auto mt-8 w-full max-w-[700px] scroll-mt-24"
          >
            <ReelComments reelId={currentReel.id} />
          </div>
        </div>
      </main>
    </ReelNavigation>
  );
}