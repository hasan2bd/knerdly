import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../supabase/server";
import VideoComments from "../../components/video-comments";
import VideoReactionButton from "../../components/video-reaction-button";

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
  institution: string | null;
  department: string | null;
  avatar_url: string | null;
};

function formatDuration(
  seconds: number | null
) {
  if (
    seconds === null ||
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  const total = Math.max(
    0,
    Math.round(seconds)
  );

  const hours = Math.floor(
    total / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

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
  return new Intl.DateTimeFormat(
    "en",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(date));
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

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const {
    data: video,
    error: videoError,
  } = await supabase
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
    .eq("id", id)
    .maybeSingle();

  if (videoError) {
    console.error(
      "Video load error:",
      videoError
    );
  }

  if (!video) {
    notFound();
  }

  const currentVideo =
    video as Video;

  if (
    currentVideo.visibility !==
      "public" &&
    currentVideo.user_id !== user.id
  ) {
    notFound();
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, institution, department, avatar_url"
    )
    .eq("id", currentVideo.user_id)
    .maybeSingle();

  const creator =
    (profile as Profile | null) ??
    undefined;

  const {
    data: relatedVideos,
  } = await supabase
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
    .eq("visibility", "public")
    .neq("id", currentVideo.id)
    .eq(
      "category",
      currentVideo.category
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(6);

  const relatedList =
    (relatedVideos ?? []) as Video[];

  const authorIds = Array.from(
    new Set(
      relatedList.map(
        (item) => item.user_id
      )
    )
  );

  let relatedProfiles: Profile[] =
    [];

  if (authorIds.length > 0) {
    const {
      data: profileData,
    } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, institution, department, avatar_url"
      )
      .in("id", authorIds);

    relatedProfiles =
      profileData ?? [];
  }

  const profileMap = new Map(
    relatedProfiles.map((item) => [
      item.id,
      item,
    ])
  );

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/videos"
            className="text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
          >
            ← Videos
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/home"
              className="hidden rounded-full border border-[#d8e1db] bg-white px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:inline-flex"
            >
              Home
            </Link>

            <Link
              href="/videos/upload"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247] sm:px-5 sm:text-sm"
            >
              Upload video
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-black">
              <video
                controls
                playsInline
                preload="metadata"
                poster={
                  currentVideo.thumbnail_url ||
                  undefined
                }
                className="aspect-video w-full bg-black"
              >
                <source
                  src={currentVideo.video_url}
                />

                Your browser does not support
                HTML5 video playback.
              </video>
            </div>

            <div className="mt-6 rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#edf2ee] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#557067]">
                  {currentVideo.category}
                </span>

                {currentVideo.visibility !==
                  "public" && (
                  <span className="rounded-full bg-[#f3eee2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6b2e]">
                    {currentVideo.visibility}
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-[var(--font-playfair)] text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {currentVideo.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8a9891]">
                <span>
                  {formatDate(
                    currentVideo.created_at
                  )}
                </span>

                {formatDuration(
                  currentVideo.duration_seconds
                ) && (
                  <>
                    <span aria-hidden="true">
                      ·
                    </span>

                    <span>
                      {formatDuration(
                        currentVideo.duration_seconds
                      )}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-5 border-t border-[#edf0ed] pt-5">
                <VideoReactionButton
                  videoId={currentVideo.id}
                />
              </div>

              {currentVideo.description && (
                <div className="mt-6 border-t border-[#edf0ed] pt-6">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[#5f7068]">
                    {currentVideo.description}
                  </p>
                </div>
              )}
            </div>

            <section className="mt-5 rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Published by
              </p>

              <div className="mt-4 flex items-center gap-4">
                {creator?.username ? (
                  <Link
                    href={`/profile/${creator.username}`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white"
                  >
                    {creator.avatar_url ? (
                      <img
                        src={
                          creator.avatar_url
                        }
                        alt={
                          creator.display_name ||
                          "Knerd member"
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(creator)
                    )}
                  </Link>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white">
                    {getInitials(creator)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#17352d]">
                    {creator?.display_name ||
                      "Knerd member"}
                  </p>

                  {creator && (
                    <p className="mt-1 truncate text-xs text-[#718078]">
                      {[
                        creator.institution,
                        creator.department,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        "Knerd community member"}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <VideoComments
              videoId={currentVideo.id}
            />
          </section>

          <aside>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                More to explore
              </p>

              <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                Related videos
              </h2>
            </div>

            {relatedList.length > 0 ? (
              <div className="space-y-4">
                {relatedList.map(
                  (related) => {
                    const author =
                      profileMap.get(
                        related.user_id
                      );

                    const duration =
                      formatDuration(
                        related.duration_seconds
                      );

                    return (
                      <Link
                        key={related.id}
                        href={`/videos/${related.id}`}
                        className="group flex gap-3 rounded-2xl border border-[#dfe6e1] bg-white p-3 transition hover:border-[#c8d4cd]"
                      >
                        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-[#17251f]">
                          {related.thumbnail_url ? (
                            <img
                              src={
                                related.thumbnail_url
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <video
                              src={
                                related.video_url
                              }
                              preload="metadata"
                              muted
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          )}

                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#17352d]">
                              ▶
                            </span>
                          </span>

                          {duration && (
                            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                              {duration}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 py-0.5">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#17352d] transition group-hover:text-[#557067]">
                            {related.title}
                          </h3>

                          <p className="mt-1 truncate text-[11px] text-[#8a9891]">
                            {author?.display_name ||
                              "Knerd member"}
                          </p>

                          <p className="mt-1 text-[10px] text-[#a0aaa5]">
                            {formatDate(
                              related.created_at
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white p-7 text-center">
                <p className="text-sm text-[#718078]">
                  No related videos yet.
                </p>

                <Link
                  href="/videos"
                  className="mt-4 inline-flex text-xs font-semibold text-[#557067] hover:text-[#17352d]"
                >
                  Browse all videos →
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}