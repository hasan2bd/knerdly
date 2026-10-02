import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../supabase/server";
import NotificationReadSync from "../components/notification-read-sync";
import NotificationFriendRequestActions from "../components/notification-friend-request-actions";

type Notification = {
  id: string;
  actor_id: string | null;
  type:
    | "reaction"
    | "comment"
    | "reply"
    | "friend_request"
    | "friend_accept";
  post_id: string | null;
  comment_id: string | null;
  friendship_id: string | null;
  is_read: boolean;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

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

function formatNotificationDate(
  dateString: string
) {
  const date = new Date(dateString);
  const now = new Date();

  const difference =
    now.getTime() - date.getTime();

  const minutes = Math.floor(
    difference / (1000 * 60)
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getNotificationText(
  type: Notification["type"]
) {
  switch (type) {
    case "reaction":
      return "reacted to your post";

    case "comment":
      return "commented on your post";

    case "reply":
      return "replied to your comment";

    case "friend_request":
      return "sent you a friend request";

    case "friend_accept":
      return "accepted your friend request";

    default:
      return "interacted with you";
  }
}

function getNotificationIcon(
  type: Notification["type"]
) {
  switch (type) {
    case "reaction":
      return "♡";

    case "comment":
      return "C";

    case "reply":
      return "↩";

    case "friend_request":
      return "+";

    case "friend_accept":
      return "✓";

    default:
      return "•";
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notifications } =
    await supabase
      .from("notifications")
      .select(
        `
          id,
          actor_id,
          type,
          post_id,
          comment_id,
          friendship_id,
          is_read,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

  const actorIds = Array.from(
    new Set(
      (notifications || [])
        .map(
          (notification) =>
            notification.actor_id
        )
        .filter(Boolean)
    )
  ) as string[];

  const { data: actorProfiles } =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url"
          )
          .in("id", actorIds)
      : { data: [] };

  const profileMap: Record<
    string,
    Profile
  > = {};

  for (const profile of actorProfiles || []) {
    profileMap[profile.id] = profile;
  }

  const unreadCount =
    (notifications || []).filter(
      (notification) => !notification.is_read
    ).length;

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#17352d]">
      <NotificationReadSync />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#dfe6e1] bg-[#f6f7f4]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/home"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce4de] bg-white text-sm font-bold text-[#17352d] transition active:bg-[#f3f5f2]"
              aria-label="Back to home"
            >
              ←
            </Link>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                Notifications
              </p>

              <p className="text-[11px] text-[#7b8983]">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <form
              action="/api/notifications/read-all"
              method="post"
            >
              <button
                type="submit"
                className="min-h-10 rounded-full px-3 text-[11px] font-semibold text-[#557067] transition hover:bg-white hover:text-[#17352d] active:bg-[#edf2ee]"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Notification list */}
      <div className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
        {(notifications || []).length === 0 ? (
          <div className="rounded-3xl border border-[#dce4de] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2ee] text-xl text-[#557067]">
              ♡
            </div>

            <h1 className="mt-5 text-lg font-semibold text-[#17352d]">
              No notifications yet
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7b8983]">
              When people interact with your
              posts or connect with you, you&apos;ll
              see it here.
            </p>

            <Link
              href="/home"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247]"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#dce4de] bg-white">
            {(notifications || []).map(
              (notification) => {
                const profile =
                  notification.actor_id
                    ? profileMap[
                        notification.actor_id
                      ]
                    : null;

                const displayName =
                  profile?.display_name ||
                  "A Knerd";

                const initials =
                  getInitials(displayName);

                const profileHref =
                  profile?.username
                    ? `/profile/${profile.username}`
                    : "/home";

                const notificationHref =
                  notification.post_id
                    ? `/home#post-${notification.post_id}`
                    : profileHref;

                const isFriendRequest =
                  notification.type ===
                    "friend_request" &&
                  Boolean(
                    notification.friendship_id
                  );

                return (
                  <article
                    key={notification.id}
                    className={`border-b border-[#edf0ed] px-4 py-4 transition last:border-b-0 sm:px-5 ${
                      !notification.is_read
                        ? "bg-[#f7faf7]"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex min-w-0 gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Link
                          href={profileHref}
                          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white"
                          aria-label={`View ${displayName}'s profile`}
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </Link>

                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#edf2ee] text-[10px] font-bold text-[#557067]">
                          {getNotificationIcon(
                            notification.type
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={notificationHref}
                          className="block rounded-xl transition hover:bg-[#f7f9f6]"
                        >
                          <p className="text-sm leading-5 text-[#40534c]">
                            <span className="font-semibold text-[#17352d]">
                              {displayName}
                            </span>{" "}
                            {getNotificationText(
                              notification.type
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-[#9aa59f]">
                            {formatNotificationDate(
                              notification.created_at
                            )}
                          </p>
                        </Link>

                        {/* Friend request actions */}
                        {isFriendRequest && (
                          <NotificationFriendRequestActions
                            friendshipId={
                              notification.friendship_id!
                            }
                          />
                        )}
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div
                          aria-label="Unread notification"
                          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#17352d]"
                        />
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}