"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  institution: string | null;
  department: string | null;
  avatar_url: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

type Friend = {
  friendshipId: string;
  profile: Profile;
};

export default function FriendsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadFriends() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setLoading(false);
          setError("You must be logged in.");
        }
        return;
      }

      const { data: friendships, error: friendshipError } =
        await supabase
          .from("friendships")
          .select(
            "id, requester_id, addressee_id, status"
          )
          .eq("status", "accepted")
          .or(
            `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
          )
          .order("updated_at", {
            ascending: false,
          });

      if (friendshipError) {
        console.error(
          "Friends loading error:",
          friendshipError
        );

        if (mounted) {
          setError(
            "Could not load your friends. Please try again."
          );
          setLoading(false);
        }

        return;
      }

      const rows = (friendships ?? []) as Friendship[];

      const friendIds = rows.map((friendship) =>
        friendship.requester_id === user.id
          ? friendship.addressee_id
          : friendship.requester_id
      );

      if (friendIds.length === 0) {
        if (mounted) {
          setFriends([]);
          setLoading(false);
        }
        return;
      }

      const { data: profiles, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, username, display_name, bio, institution, department, avatar_url"
          )
          .in("id", friendIds);

      if (profileError) {
        console.error(
          "Friend profiles loading error:",
          profileError
        );

        if (mounted) {
          setError(
            "Could not load your friends' profiles."
          );
          setLoading(false);
        }

        return;
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile as Profile,
        ])
      );

      const friendRows: Friend[] = rows
        .map((friendship) => {
          const friendId =
            friendship.requester_id === user.id
              ? friendship.addressee_id
              : friendship.requester_id;

          const profile = profileMap.get(friendId);

          if (!profile) return null;

          return {
            friendshipId: friendship.id,
            profile,
          };
        })
        .filter(
          (friend): friend is Friend => friend !== null
        );

      if (mounted) {
        setFriends(friendRows);
        setLoading(false);
      }
    }

    loadFriends();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const filteredFriends = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return friends;

    return friends.filter(({ profile }) => {
      const searchableText = [
        profile.display_name,
        profile.username,
        profile.institution,
        profile.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [friends, search]);

  async function removeFriend(friend: Friend) {
    const name =
      friend.profile.display_name ||
      friend.profile.username ||
      "this friend";

    const confirmed = window.confirm(
      `Remove ${name} from your friends?`
    );

    if (!confirmed) return;

    setRemovingId(friend.friendshipId);
    setError("");

    try {
      const response = await fetch(
        "/api/friendships/remove",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            friendshipId: friend.friendshipId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not remove this friend."
        );
        setRemovingId(null);
        return;
      }

      setFriends((current) =>
        current.filter(
          (item) =>
            item.friendshipId !== friend.friendshipId
        )
      );

      setRemovingId(null);
    } catch (error) {
      console.error("Remove friend error:", error);

      setError(
        "Something went wrong. Please try again."
      );
      setRemovingId(null);
    }
  }

  function getInitials(profile: Profile) {
    const name =
      profile.display_name ||
      profile.username ||
      "Student";

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#e4e9e5] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#789087]">
              Knerdly
            </p>

            <h1 className="truncate font-serif text-xl font-semibold sm:text-2xl">
              Friends
            </h1>
          </div>

          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href="/messages"
              className="min-h-10 rounded-full border border-[#dce4de] bg-white px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#aebdb4] hover:text-[#17352d]"
            >
              Messages
            </Link>

            <Link
              href="/friends/requests"
              className="min-h-10 rounded-full border border-[#dce4de] bg-white px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#aebdb4] hover:text-[#17352d]"
            >
              Requests
            </Link>

            <Link
              href="/friends/discover"
              className="min-h-10 rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285247]"
            >
              Discover
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Intro */}
        <section className="mb-6">
          <p className="max-w-2xl text-sm leading-6 text-[#6f8078]">
            Keep track of the people you learn,
            collaborate, and grow with.
          </p>
        </section>

        {/* Search */}
        {friends.length > 0 && (
          <section className="mb-6">
            <label
              htmlFor="friend-search"
              className="sr-only"
            >
              Search friends
            </label>

            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a099]"
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
                id="friend-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search friends..."
                className="min-h-12 w-full rounded-2xl border border-[#dfe6e1] bg-white pl-12 pr-4 text-sm text-[#17352d] outline-none transition placeholder:text-[#9aa7a1] focus:border-[#9aaca3] focus:ring-2 focus:ring-[#17352d]/10"
              />
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-[#ead4d0] bg-[#fff8f6] px-4 py-3 text-sm text-[#a24d42]"
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-3xl border border-[#e4e9e5] bg-white p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-[#e9eeeb]" />

                    <div className="min-w-0 flex-1">
                      <div className="h-4 w-32 rounded bg-[#e9eeeb]" />
                      <div className="mt-2 h-3 w-24 rounded bg-[#edf1ee]" />
                    </div>
                  </div>

                  <div className="mt-5 h-10 rounded-full bg-[#edf1ee]" />
                </div>
              )
            )}
          </div>
        ) : friends.length === 0 ? (
          /* Empty state */
          <section className="rounded-3xl border border-[#e1e7e3] bg-white px-6 py-14 text-center sm:px-10 sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-7 w-7"
              >
                <path
                  strokeLinecap="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                />
                <path
                  strokeLinecap="round"
                  d="M22 21v-2a4 4 0 0 0-3-3.87"
                />
                <path
                  strokeLinecap="round"
                  d="M16 3.13a4 4 0 0 1 0 7.75"
                />
              </svg>
            </div>

            <h2 className="mt-6 font-serif text-2xl font-semibold">
              Build your learning circle
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f8078]">
              Connect with students who share your
              academic interests, ideas, and goals.
            </p>

            <Link
              href="/friends/discover"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#17352d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#285247]"
            >
              Discover students
            </Link>
          </section>
        ) : filteredFriends.length === 0 ? (
          /* No search results */
          <section className="rounded-3xl border border-[#e1e7e3] bg-white px-6 py-14 text-center">
            <h2 className="font-serif text-2xl font-semibold">
              No friends found
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#6f8078]">
              Try a different name, username, institution,
              or department.
            </p>
          </section>
        ) : (
          /* Friends grid */
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm text-[#6f8078]">
                <span className="font-semibold text-[#17352d]">
                  {filteredFriends.length}
                </span>{" "}
                {filteredFriends.length === 1
                  ? "friend"
                  : "friends"}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="min-h-10 rounded-full px-3 text-xs font-semibold text-[#557067] transition hover:bg-[#edf2ee]"
                >
                  Clear search
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFriends.map(
                ({ friendshipId, profile }) => (
                  <article
                    key={friendshipId}
                    className="rounded-3xl border border-[#e1e7e3] bg-white p-5 transition hover:border-[#cbd6cf] hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <Link
                        href={
                          profile.username
                            ? `/profile/${profile.username}`
                            : "#"
                        }
                        className="shrink-0"
                      >
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={
                              profile.display_name ||
                              "Student"
                            }
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8eeea] text-sm font-semibold text-[#557067]">
                            {getInitials(profile)}
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={
                            profile.username
                              ? `/profile/${profile.username}`
                              : "#"
                          }
                          className="block truncate text-base font-semibold text-[#17352d] hover:text-[#285247]"
                        >
                          {profile.display_name ||
                            profile.username ||
                            "Student"}
                        </Link>

                        {profile.username && (
                          <p className="mt-1 truncate text-xs text-[#8a9992]">
                            @{profile.username}
                          </p>
                        )}
                      </div>
                    </div>

                    {(profile.institution ||
                      profile.department ||
                      profile.bio) && (
                      <div className="mt-5 space-y-2">
                        {profile.institution && (
                          <p className="truncate text-xs font-medium text-[#557067]">
                            {profile.institution}
                          </p>
                        )}

                        {profile.department && (
                          <p className="truncate text-xs text-[#7b8b83]">
                            {profile.department}
                          </p>
                        )}

                        {profile.bio && (
                          <p className="line-clamp-2 text-sm leading-5 text-[#6f8078]">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {profile.username && (
                        <Link
                          href={`/profile/${profile.username}`}
                          className="flex min-h-10 items-center justify-center rounded-full border border-[#dce4de] px-3 text-xs font-semibold text-[#557067] transition hover:border-[#aebdb4] hover:text-[#17352d]"
                        >
                          View profile
                        </Link>
                      )}

                      <Link
                        href={`/messages?user=${encodeURIComponent(
                          profile.id
                        )}`}
                        className="flex min-h-10 items-center justify-center rounded-full bg-[#17352d] px-3 text-xs font-semibold text-white transition hover:bg-[#285247]"
                      >
                        Message
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          removeFriend({
                            friendshipId,
                            profile,
                          })
                        }
                        disabled={
                          removingId === friendshipId
                        }
                        className="col-span-2 min-h-10 rounded-full border border-[#ead4d0] px-4 text-xs font-semibold text-[#a24d42] transition hover:bg-[#fff8f6] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === friendshipId
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

