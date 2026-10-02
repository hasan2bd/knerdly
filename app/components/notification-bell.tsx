"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../supabase/client";

export default function NotificationBell() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [unreadCount, setUnreadCount] =
    useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUnreadCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (!error && mounted) {
        setUnreadCount(count || 0);
      }
    }

    async function subscribeToNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        return;
      }

      loadUnreadCount();

      const channel = supabase
        .channel(
          `knerdly-notifications-${user.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

      return channel;
    }

    let channel:
      | ReturnType<typeof supabase.channel>
      | undefined;

    subscribeToNotifications().then(
      (createdChannel) => {
        channel = createdChannel;
      }
    );

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const badgeText =
    unreadCount > 99
      ? "99+"
      : unreadCount.toString();

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dce4de] bg-white text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] active:bg-[#f3f5f2]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
        />

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 21h4"
        />
      </svg>

      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#17352d] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#f6f7f4]"
        >
          {badgeText}
        </span>
      )}
    </Link>
  );
}
