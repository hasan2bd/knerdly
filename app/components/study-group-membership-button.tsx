"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StudyGroupMembershipButtonProps = {
  groupId: string;
  isMember: boolean;
  isOwner: boolean;
  privacy: "public" | "private";
};

export default function StudyGroupMembershipButton({
  groupId,
  isMember,
  isOwner,
  privacy,
}: StudyGroupMembershipButtonProps) {
  const router = useRouter();

  const [member, setMember] = useState(isMember);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/study-groups/membership",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to join this study group."
        );
        return;
      }

      setMember(true);
      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/study-groups/membership",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to leave this study group."
        );
        return;
      }

      setMember(false);
      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (isOwner) {
    return (
      <div>
        <div className="flex min-h-11 items-center justify-center rounded-full bg-[#edf2ee] px-5 text-sm font-semibold text-[#557067]">
          Group owner
        </div>
      </div>
    );
  }

  if (privacy === "private" && !member) {
    return (
      <div>
        <div className="flex min-h-11 items-center justify-center rounded-full border border-[#dfe6e1] bg-[#f7f8f5] px-5 text-sm font-semibold text-[#8a9891]">
          Private group
        </div>

        <p className="mt-2 text-center text-xs text-[#8a9891]">
          Private group access will be added later.
        </p>
      </div>
    );
  }

  return (
    <div>
      {member ? (
        <button
          type="button"
          onClick={handleLeave}
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#d8e0da] bg-white px-5 text-sm font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Leaving..." : "Leave group"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#17352d] px-5 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join group"}
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-center text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
