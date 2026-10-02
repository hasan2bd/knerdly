import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../supabase/server";
import StudyGroupPostComposer from "../../../components/study-group-post-composer";
import StudyGroupPostList from "../../../components/study-group-post-list";

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

type Member = {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "moderator" | "member";
  joined_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudyGroupDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: studyGroup,
    error: groupError,
  } = await supabase
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
    .eq("id", id)
    .maybeSingle();

  if (groupError) {
    console.error(
      "Study group load error:",
      groupError
    );
  }

  if (!studyGroup) {
    notFound();
  }

  const group = studyGroup as StudyGroup;

  const {
    data: members,
    error: membersError,
  } = await supabase
    .from("study_group_members")
    .select(
      `
        id,
        group_id,
        user_id,
        role,
        joined_at
      `
    )
    .eq("group_id", group.id)
    .order("joined_at", {
      ascending: true,
    });

  if (membersError) {
    console.error(
      "Study group members load error:",
      membersError
    );
  }

  const memberList = (members || []) as Member[];

  const memberIds = memberList.map(
    (member) => member.user_id
  );

  let profiles: Profile[] = [];

  if (memberIds.length > 0) {
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url"
      )
      .in("id", memberIds);

    if (profileError) {
      console.error(
        "Study group profiles load error:",
        profileError
      );
    }

    profiles = (profileData || []) as Profile[];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const currentMembership = memberList.find(
    (member) => member.user_id === user.id
  );

  const isMember = Boolean(currentMembership);
  const isOwner =
    currentMembership?.role === "owner";

  const ownerProfile = profileMap.get(group.user_id);

  const createdDate = new Intl.DateTimeFormat(
    "en",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(group.created_at));

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/study/groups"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8e0da] bg-white px-4 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:text-sm"
          >
            <span aria-hidden="true">
              ←
            </span>
            Study Groups
          </Link>

          <Link
            href="/study"
            className="rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285247] sm:text-sm"
          >
            Study
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white">
          <div className="bg-[#17352d] px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  {group.subject && (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d8b978]">
                      {group.subject}
                    </span>
                  )}

                  {group.course_code && (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                      {group.course_code}
                    </span>
                  )}

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                    {group.privacy === "private"
                      ? "Private"
                      : "Public"}
                  </span>
                </div>

                <h1 className="mt-4 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  {group.name}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                  {group.description ||
                    "A collaborative space for students to learn, discuss, and share ideas."}
                </p>
              </div>

              <div className="shrink-0">
                <p className="text-xs text-white/50">
                  Created {createdDate}
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {memberList.length}{" "}
                  {memberList.length === 1
                    ? "member"
                    : "members"}
                </p>
              </div>
            </div>
          </div>

          {/* Group information */}
          <div className="grid gap-4 border-t border-[#dfe6e1] p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                Subject
              </p>

              <p className="mt-1 text-sm font-semibold text-[#17352d]">
                {group.subject || "General"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                Course
              </p>

              <p className="mt-1 text-sm font-semibold text-[#17352d]">
                {group.course_code ||
                  "No course code"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                Owner
              </p>

              <p className="mt-1 text-sm font-semibold text-[#17352d]">
                {ownerProfile?.display_name ||
                  "Knerd"}
              </p>
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Discussion */}
          <section>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Group discussion
              </p>

              <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold sm:text-3xl">
                Discussions
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#718078]">
                Ask questions, share ideas, post resources,
                and learn together.
              </p>
            </div>

            {isMember ? (
              <>
                <StudyGroupPostComposer
                  groupId={group.id}
                />

                <div className="mt-6">
                  <StudyGroupPostList
                    groupId={group.id}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white px-6 py-12 text-center">
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
                  Join the group to participate
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718078]">
                  Become a member to start discussions,
                  ask questions, and share useful resources.
                </p>

                <Link
                  href="/study/groups"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247]"
                >
                  Back to study groups
                </Link>
              </div>
            )}
          </section>

          {/* Members sidebar */}
          <aside>
            <div className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                    People
                  </p>

                  <h2 className="mt-1 font-[var(--font-playfair)] text-xl font-semibold">
                    Members
                  </h2>
                </div>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#edf2ee] px-2 text-xs font-semibold text-[#557067]">
                  {memberList.length}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {memberList.map((member) => {
                  const profile =
                    profileMap.get(
                      member.user_id
                    );

                  const username =
                    profile?.username ||
                    "new-member";

                  return (
                    <Link
                      key={member.id}
                      href={`/profile/${username}`}
                      className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[#f7f8f5]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={
                              profile.display_name ||
                              "Knerd"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          profile?.display_name
                            ?.split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(
                              (name) =>
                                name[0]
                            )
                            .join("")
                            .toUpperCase() ||
                          "K"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#17352d]">
                          {profile?.display_name ||
                            "Knerd"}
                        </p>

                        <p className="truncate text-xs text-[#8a9891]">
                          {member.role === "owner"
                            ? "Owner"
                            : member.role ===
                                "moderator"
                              ? "Moderator"
                              : "Member"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {memberList.length === 0 && (
                <p className="mt-5 text-sm text-[#718078]">
                  No members yet.
                </p>
              )}
            </div>

            {isOwner && (
              <div className="mt-4 rounded-3xl border border-[#dfe6e1] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                  Group management
                </p>

                <p className="mt-2 text-sm leading-6 text-[#718078]">
                  You are the owner of this study group.
                  Management tools can be added here later.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
