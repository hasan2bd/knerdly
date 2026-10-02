"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "../../supabase/client";

export default function NotificationReadSync() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function markNotificationsAsRead() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error(
          "Notification read sync error:",
          error
        );
      }
    }

    markNotificationsAsRead();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return null;
}
