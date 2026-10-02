import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../supabase/server";

type StudyGroup = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  subject: string | null;
  course_code: string | null;
  privacy: "public" | "private";
  created_at: string;
};

type Membership = {
  group_id: string;
  user_id: string;
  role: "owner" | "moderator" | "member";
};

type MemberCount = {
  group_id: string;
};

export default async function StudyGroupsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: groups, error: groupsError },
    { data: memberships, error: membershipsError },
    { data: memberRows, error: memberRowsError },
  ] = await Promise.all([
    supabase
      .from("study_groups")
      .select(
        `
          id,
          user_id,
          name,
          description,
          subject,
          course_code,
          privacy,
          created_at
        `
      )
      .eq("privacy", "public")
      .order("created_at", { ascending: false }),

    supabase
      .from("study_group_members")
      .select("group_id, user_id, role")
      .eq("user_id", user.id),

    supabase
      .from("study_group_members")
      .select("group_id"),
  ]);

  if (groupsError) {
    console.error("Study groups load error:", groupsError);
  }

  if (membershipsError) {
    console.error(
      "Study group memberships load error:",
      membershipsError
    );
  }

  if (memberRowsError) {
    console.error(
      "Study group member count load error:",
      memberRowsError
    );
  }

  const groupList = (groups ?? []) as StudyGroup[];
  const membershipList = (memberships ?? []) as Membership[];
  const memberList = (memberRows ?? []) as MemberCount[];

  const membershipMap = new Map(
    membershipList.map((membership) => [
      membership.group_id,
      membership,
    ])
  );

  const memberCountMap = new Map<string, number>();

  for (const member of memberList) {
    memberCountMap.set(
      member.group_id,
      (memberCountMap.get(member.group_id) ?? 0) + 1
    );
  }

  const joinedCount = membershipList.length;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link
              href="/study"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
            >
              <span aria-hidden="true">←</span>
              Back to study
            </Link>

            <div className="mt-2">
              <h1 className="font-[var(--font-playfair)] text-2xl font-semibold tracking-tight sm:text-3xl">
                Study Groups
              </h1>

              <p className="mt-1 text-sm text-[#718078]">
                Find students to learn, discuss, and prepare with.
              </p>
            </div>
          </div>

          <Link
            href="/study/groups/create"
            className="hidden min-h-11 shrink-0 items-center justify-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition hover:bg-[#285247] sm:inline-flex"
          >
            Create group
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Mobile create button */}
        <div className="mb-6 sm:hidden">
          <Link
            href="/study/groups/create"
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition active:bg-[#285247]"
          >
            Create study group
          </Link>
        </div>

        {/* Intro */}
        <section className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
                Collaborative learning
              </p>

              <h2 className="mt-3 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
                Study better together.
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#718078] sm:text-base">
                Join students who are studying the same subjects,
                preparing for the same courses, or working toward
                similar academic goals.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-3 sm:gap-4">
              <div className="rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4">
                <p className="text-2xl font-semibold">
                  {groupList.length}
                </p>

                <p className="mt-1 text-xs text-[#718078]">
                  Public groups
                </p>
              </div>

              <div className="rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4">
                <p className="text-2xl font-semibold">
                  {joinedCount}
                </p>

                <p className="mt-1 text-xs text-[#718078]">
                  Joined
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4 sm:col-span-1">
                <p className="text-2xl font-semibold">
                  {memberList.length}
                </p>

                <p className="mt-1 text-xs text-[#718078]">
                  Memberships
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Directory */}
        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Group directory
              </p>

              <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                Discover study groups
              </h2>
            </div>

            <p className="hidden text-xs text-[#718078] sm:block">
              {groupList.length} available
            </p>
          </div>

          {groupList.length === 0 ? (
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  />

                  <circle
                    cx="9"
                    cy="7"
                    r="4"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  />
                </svg>
              </div>

              <h3 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold">
                No study groups yet.
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#718078]">
                Start one for your course, subject, exam preparation,
                or a shared academic interest.
              </p>

              <Link
                href="/study/groups/create"
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247]"
              >
                Create a study group
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {groupList.map((group) => {
                const membership = membershipMap.get(group.id);
                const isMember = Boolean(membership);
                const memberCount =
                  memberCountMap.get(group.id) ?? 0;

                return (
                  <article
                    key={group.id}
                    className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[#c9d4cd]"
                  >
                    {/* Group visual */}
                    <Link
                      href={`/study/groups/${group.id}`}
                      className="block bg-[#17352d] px-5 py-7"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white ring-1 ring-white/15">
                          {group.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85">
                          Public
                        </span>
                      </div>
                    </Link>

                    {/* Group information */}
                    <div className="p-5">
                      <Link
                        href={`/study/groups/${group.id}`}
                        className="block"
                      >
                        <h3 className="font-[var(--font-playfair)] text-xl font-semibold text-[#17352d] hover:text-[#285247]">
                          {group.name}
                        </h3>
                      </Link>

                      {(group.course_code ||
                        group.subject) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.course_code && (
                            <span className="rounded-full bg-[#edf2ee] px-3 py-1 text-[10px] font-semibold text-[#557067]">
                              {group.course_code}
                            </span>
                          )}

                          {group.subject && (
                            <span className="rounded-full border border-[#dfe6e1] px-3 py-1 text-[10px] font-semibold text-[#718078]">
                              {group.subject}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#718078]">
                        {group.description ||
                          "A collaborative space for students to learn, discuss, and prepare together."}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-[#edf0ed] pt-4">
                        <div className="text-xs text-[#718078]">
                          <span className="font-semibold text-[#17352d]">
                            {memberCount}
                          </span>{" "}
                          {memberCount === 1
                            ? "member"
                            : "members"}
                        </div>

                        {isMember ? (
                          <span className="rounded-full bg-[#edf2ee] px-3 py-2 text-xs font-semibold text-[#557067]">
                            {membership?.role === "owner"
                              ? "Owner"
                              : "Joined"}
                          </span>
                        ) : (
                          <Link
                            href={`/study/groups/${group.id}`}
                            className="rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285247]"
                          >
                            View group
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
