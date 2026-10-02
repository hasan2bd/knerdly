import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../supabase/server";

type Video = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  visibility: "public" | "unlisted" | "private";
  duration_seconds: number | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function formatDuration(seconds: number | null) {
  if (
    seconds === null ||
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, "0")}:${remaining
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remaining
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

function getInitials(
  profile?: Profile
) {
  if (!profile?.display_name) {
    return "K";
  }

  return (
    profile.display_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "K"
  );
}

export default async function VideosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: videos, error: videosError } =
    await supabase
      .from("videos")
      .select(
        `
          id,
          user_id,
          title,
          description,
          video_url,
          thumbnail_url,
          category,
          visibility,
          duration_seconds,
          created_at
        `
      )
      .or(
        `visibility.eq.public,user_id.eq.${user.id}`
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

  if (videosError) {
    console.error(
      "Videos load error:",
      videosError
    );
  }

  const videoList =
    (videos ?? []) as Video[];

  const authorIds = Array.from(
    new Set(
      videoList.map(
        (video) => video.user_id
      )
    )
  );

  let profiles: Profile[] = [];

  if (authorIds.length > 0) {
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url"
      )
      .in("id", authorIds);

    if (profileError) {
      console.error(
        "Video profiles load error:",
        profileError
      );
    }

    profiles = profileData ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const categories = Array.from(
    new Set(
      videoList.map(
        (video) => video.category
      )
    )
  );

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/home"
              className="text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
            >
              ← Home
            </Link>

            <div className="hidden h-5 w-px bg-[#d8e1db] sm:block" />

            <h1 className="font-[var(--font-playfair)] text-xl font-semibold sm:text-2xl">
              Videos
            </h1>
          </div>

          <Link
            href="/videos/upload"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] sm:px-5 sm:text-sm"
          >
            Upload video
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* Intro */}
        <section className="mb-8 rounded-3xl border border-[#dfe6e1] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
                Knerdly video library
              </p>

              <h2 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
                Learn through video.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#718078] sm:text-base">
                Explore lectures, tutorials, study
                materials, career guidance, and useful
                ideas shared by the Knerdly community.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-[#f7f8f5] px-5 py-4">
              <p className="text-2xl font-semibold">
                {videoList.length}
              </p>

              <p className="mt-1 text-xs text-[#718078]">
                Available videos
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="mb-7">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <span className="shrink-0 rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white">
                All videos
              </span>

              {categories.map(
                (category) => (
                  <span
                    key={category}
                    className="shrink-0 rounded-full border border-[#dfe6e1] bg-white px-4 py-2 text-xs font-semibold text-[#557067]"
                  >
                    {category}
                  </span>
                )
              )}
            </div>
          </section>
        )}

        {/* Empty state */}
        {videoList.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 10-4.5 3L15 16v-6Z"
                />

                <rect
                  width="18"
                  height="14"
                  x="3"
                  y="5"
                  rx="2"
                />
              </svg>
            </div>

            <h2 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold">
              No videos yet.
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#718078]">
              Be the first to share a useful lecture,
              tutorial, study resource, or idea with
              the Knerdly community.
            </p>

            <Link
              href="/videos/upload"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247]"
            >
              Upload your first video
            </Link>
          </section>
        ) : (
          /* Video grid */
          <section>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {videoList.map((video) => {
                const profile =
                  profileMap.get(
                    video.user_id
                  );

                const duration =
                  formatDuration(
                    video.duration_seconds
                  );

                const username =
                  profile?.username;

                return (
                  <article
                    key={video.id}
                    className="group overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[#c8d4cd]"
                  >
                    {/* Video preview */}
                    <Link
                      href={`/videos/${video.id}`}
                      className="relative block aspect-video overflow-hidden bg-[#17251f]"
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={
                            video.thumbnail_url
                          }
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <video
                          src={
                            video.video_url
                          }
                          preload="metadata"
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#17352d] shadow-lg transition duration-300 group-hover:scale-105">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="ml-1 h-6 w-6"
                            aria-hidden="true"
                          >
                            <path d="M8 5.5v13l10-6.5-10-6.5Z" />
                          </svg>
                        </span>
                      </div>

                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#557067] backdrop-blur-sm">
                        {video.category}
                      </span>

                      {duration && (
                        <span className="absolute bottom-4 right-4 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                          {duration}
                        </span>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="p-5">
                      <Link
                        href={`/videos/${video.id}`}
                        className="block"
                      >
                        <h2 className="line-clamp-2 font-[var(--font-playfair)] text-xl font-semibold leading-tight text-[#17352d] transition group-hover:text-[#285247]">
                          {video.title}
                        </h2>
                      </Link>

                      {video.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#718078]">
                          {video.description}
                        </p>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <Link
                          href={
                            username
                              ? `/profile/${username}`
                              : "#"
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white"
                          aria-label={
                            profile
                              ? `View ${profile.display_name || "Knerd"}'s profile`
                              : "Knerd profile"
                          }
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={
                                profile.avatar_url
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(profile)
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#557067]">
                            {profile?.display_name ||
                              "Knerd member"}
                          </p>

                          <p className="text-[11px] text-[#8a9891]">
                            {formatDate(
                              video.created_at
                            )}
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