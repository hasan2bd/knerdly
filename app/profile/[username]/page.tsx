import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../supabase/server";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function ProfilePage({
  params,
}: ProfilePageProps) {
  const { username } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .single();

  if (error || !profile) {
    notFound();
  }

  const isOwner = user?.id === profile.id;

  const initials =
    profile.display_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name: string) => name[0])
      .join("")
      .toUpperCase() || "K";

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#17352d]">
      {/* Navigation */}
      <header className="sticky top-0 z-20 border-b border-[#dfe5df] bg-[#f7f7f2]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="text-xl font-bold tracking-[-0.04em] sm:text-2xl"
          >
            Knerdly
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/home"
              className="text-sm font-medium text-[#718079] transition hover:text-[#17352d]"
            >
              Home
            </Link>

            <Link
              href="/explore"
              className="text-sm font-medium text-[#718079] transition hover:text-[#17352d]"
            >
              Explore
            </Link>

            <Link
              href="/communities"
              className="text-sm font-medium text-[#718079] transition hover:text-[#17352d]"
            >
              Communities
            </Link>

            <Link
              href="/study"
              className="text-sm font-medium text-[#718079] transition hover:text-[#17352d]"
            >
              Study
            </Link>

            <Link
              href="/messages"
              className="text-sm font-medium text-[#718079] transition hover:text-[#17352d]"
            >
              Messages
            </Link>
          </nav>

          <Link
            href="/home"
            className="rounded-full border border-[#d8e0da] bg-white px-4 py-2 text-sm font-medium text-[#557067] transition hover:border-[#17352d]"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Profile */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Profile header */}
        <section className="overflow-hidden rounded-3xl border border-[#dce4de] bg-white">
          {/* Cover */}
          <div className="relative h-44 overflow-hidden bg-[#17352d] sm:h-56 lg:h-64">
            {profile.cover_url ? (
              <img
                src={profile.cover_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#17352d] via-[#285247] to-[#557067]">
                <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(176,143,76,0.32),transparent_35%)]" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5" />
          </div>

          <div className="px-5 pb-7 sm:px-8">
            {/* Avatar and actions */}
            <div className="flex flex-col gap-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#f7f7f2] bg-[#17352d] text-2xl font-semibold text-white shadow-md ring-1 ring-[#dce4de] sm:h-28 sm:w-28">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={
                      profile.display_name ||
                      "Profile picture"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {isOwner && (
                <Link
                  href="/profile/edit"
                  className="inline-flex min-h-10 items-center justify-center self-start rounded-full border border-[#d8e0da] bg-white px-5 py-2.5 text-sm font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:self-auto"
                >
                  Edit profile
                </Link>
              )}
            </div>

            {/* Identity */}
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                  {profile.display_name || "Knerd"}
                </h1>

                <span className="rounded-full bg-[#edf2eb] px-3 py-1 text-xs font-semibold text-[#557067]">
                  {profile.identity_mode ===
                  "pseudonymous"
                    ? "Pseudonymous"
                    : "Real identity"}
                </span>
              </div>

              <p className="mt-1 text-sm text-[#8a9892]">
                @{profile.username}
              </p>

              {profile.bio && (
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f7069]">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Academic information */}
            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#edf0ed] pt-6">
              {profile.institution && (
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#9aa59f]">
                    Institution
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {profile.institution}
                  </p>
                </div>
              )}

              {profile.department && (
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#9aa59f]">
                    Department
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {profile.department}
                  </p>
                </div>
              )}

              {profile.program && (
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#9aa59f]">
                    Program
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {profile.program}
                  </p>
                </div>
              )}

              {profile.academic_level && (
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#9aa59f]">
                    Level
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {profile.academic_level}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Profile content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main */}
          <section className="rounded-3xl border border-[#dce4de] bg-white p-5 sm:p-8">
            <div className="flex items-center gap-6 overflow-x-auto border-b border-[#dce4de]">
              <button
                type="button"
                className="shrink-0 border-b-2 border-[#17352d] px-1 pb-3 text-sm font-semibold"
              >
                Posts
              </button>

              <button
                type="button"
                className="shrink-0 px-1 pb-3 text-sm font-medium text-[#8a9892]"
              >
                Learning
              </button>

              <button
                type="button"
                className="shrink-0 px-1 pb-3 text-sm font-medium text-[#8a9892]"
              >
                Communities
              </button>
            </div>

            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2eb] text-xl text-[#557067]">
                ✦
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                No posts yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7b8983]">
                {isOwner
                  ? "Share your first thought, study update, or question with the Knerdly community."
                  : "This student has not shared any posts yet."}
              </p>

              {isOwner && (
                <Link
                  href="/home"
                  className="mt-6 inline-flex min-h-10 items-center rounded-full bg-[#17352d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#285247]"
                >
                  Create a post
                </Link>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-[#dce4de] bg-white p-5">
              <h2 className="font-semibold">
                Learning journey
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#7b8983]">
                Study goals, progress, interests,
                and learning activity will appear
                here.
              </p>
            </div>

            <div className="rounded-3xl border border-[#dce4de] bg-white p-5">
              <h2 className="font-semibold">
                Connections
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f3f5f2] p-4">
                  <p className="text-2xl font-semibold">
                    0
                  </p>

                  <p className="mt-1 text-xs text-[#8a9892]">
                    Friends
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f3f5f2] p-4">
                  <p className="text-2xl font-semibold">
                    0
                  </p>

                  <p className="mt-1 text-xs text-[#8a9892]">
                    Communities
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
