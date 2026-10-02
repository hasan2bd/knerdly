"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";
import FriendshipActionButtons from "../../components/friendship-action-buttons";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  institution: string | null;
  department: string | null;
  avatar_url: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
};

export default function FriendRequestsPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [incoming, setIncoming] = useState<Friendship[]>(
    []
  );

  const [outgoing, setOutgoing] = useState<Friendship[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadRequests() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          router.push("/login");
        }

        return;
      }

      const { data, error: friendshipError } =
        await supabase
          .from("friendships")
          .select(
            "id, requester_id, addressee_id, status, created_at"
          )
          .or(
            `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
          )
          .eq("status", "pending")
          .order("created_at", {
            ascending: false,
          });

      if (!mounted) {
        return;
      }

      if (friendshipError) {
        setError(friendshipError.message);
        setLoading(false);
        return;
      }

      const friendships =
        (data || []) as Friendship[];

      const otherUserIds = friendships.map(
        (friendship) =>
          friendship.requester_id === user.id
            ? friendship.addressee_id
            : friendship.requester_id
      );

      let profiles: Profile[] = [];

      if (otherUserIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, institution, department, avatar_url"
          )
          .in("id", otherUserIds);

        if (!mounted) {
          return;
        }

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        profiles = profileData || [];
      }

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ])
      );

      const enriched = friendships.map(
        (friendship) => ({
          ...friendship,
          requester:
            profileMap.get(
              friendship.requester_id
            ) || undefined,
          addressee:
            profileMap.get(
              friendship.addressee_id
            ) || undefined,
        })
      );

      setIncoming(
        enriched.filter(
          (friendship) =>
            friendship.addressee_id === user.id
        )
      );

      setOutgoing(
        enriched.filter(
          (friendship) =>
            friendship.requester_id === user.id
        )
      );

      setLoading(false);
    }

    loadRequests();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  function removeRequest(
    friendshipId: string
  ) {
    setIncoming((current) =>
      current.filter(
        (friendship) =>
          friendship.id !== friendshipId
      )
    );

    setOutgoing((current) =>
      current.filter(
        (friendship) =>
          friendship.id !== friendshipId
      )
    );
  }

  function getInitials(profile?: Profile) {
    if (!profile?.display_name) {
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

  function ProfileCard({
    profile,
    type,
    friendshipId,
  }: {
    profile?: Profile;
    type: "incoming" | "outgoing";
    friendshipId: string;
  }) {
    if (!profile) {
      return null;
    }

    const username =
      profile.username || "new-member";

    return (
      <article className="rounded-3xl border border-[#dce4de] bg-white p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <Link
            href={`/profile/${username}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-sm font-semibold text-white sm:h-14 sm:w-14"
            aria-label={`View ${profile.display_name || "Knerd"}'s profile`}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "Knerd"}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(profile)
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${username}`}
              className="block truncate text-sm font-semibold text-[#17352d] hover:text-[#557067]"
            >
              {profile.display_name || "Knerd"}
            </Link>

            <p className="truncate text-xs text-[#8a9892]">
              @{username}
            </p>

            {(profile.institution ||
              profile.department) && (
              <p className="mt-1 truncate text-xs text-[#718079]">
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

        <div className="mt-4 sm:ml-[4.5rem] sm:mt-3">
          <FriendshipActionButtons
            friendshipId={friendshipId}
            mode={type}
            onComplete={() =>
              removeRequest(friendshipId)
            }
          />
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#17352d]">
      {/* Navigation */}
      <header className="sticky top-0 z-20 border-b border-[#dfe5df] bg-[#f7f7f2]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="text-xl font-bold tracking-[-0.04em] sm:text-2xl"
          >
            Knerdly
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/friends"
              className="min-h-10 rounded-full border border-[#d8e0da] bg-white px-3 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] sm:px-4 sm:text-sm"
            >
              Friends
            </Link>

            <Link
              href="/home"
              className="min-h-10 rounded-full bg-[#17352d] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285247] sm:px-4 sm:text-sm"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Page heading */}
        <div className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b08f4c] sm:text-xs">
            Connections
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            Friend requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718079]">
            Manage students who want to connect
            with you and requests you have sent.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-3xl border border-[#dce4de] bg-white p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#edf2eb]" />

            <p className="mt-4 text-sm text-[#718079]">
              Loading requests...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Received */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Received
                  </h2>

                  <p className="mt-0.5 text-xs text-[#8a9892]">
                    People who want to connect
                  </p>
                </div>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#edf2eb] px-2 text-xs font-semibold text-[#557067]">
                  {incoming.length}
                </span>
              </div>

              {incoming.length > 0 ? (
                <div className="space-y-3">
                  {incoming.map(
                    (friendship) => (
                      <ProfileCard
                        key={friendship.id}
                        profile={
                          friendship.requester
                        }
                        type="incoming"
                        friendshipId={
                          friendship.id
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#dce4de] bg-white p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf2eb] text-[#557067]">
                    ✓
                  </div>

                  <h3 className="mt-4 font-semibold">
                    No pending requests
                  </h3>

                  <p className="mt-2 text-sm text-[#7b8983]">
                    New friend requests will
                    appear here.
                  </p>
                </div>
              )}
            </section>

            {/* Sent */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Sent
                  </h2>

                  <p className="mt-0.5 text-xs text-[#8a9892]">
                    Requests you have sent
                  </p>
                </div>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#edf2eb] px-2 text-xs font-semibold text-[#557067]">
                  {outgoing.length}
                </span>
              </div>

              {outgoing.length > 0 ? (
                <div className="space-y-3">
                  {outgoing.map(
                    (friendship) => (
                      <ProfileCard
                        key={friendship.id}
                        profile={
                          friendship.addressee
                        }
                        type="outgoing"
                        friendshipId={
                          friendship.id
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#dce4de] bg-white p-8 text-center">
                  <h3 className="font-semibold">
                    No sent requests
                  </h3>

                  <p className="mt-2 text-sm text-[#7b8983]">
                    Friend requests you send will
                    appear here.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
