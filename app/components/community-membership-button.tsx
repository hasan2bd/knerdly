"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityMembershipButtonProps = {
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
  privacy: "public" | "private";
};

export default function CommunityMembershipButton({
  communityId,
  isMember: initialIsMember,
  isOwner,
  privacy,
}: CommunityMembershipButtonProps) {
  const router = useRouter();

  const [isMember, setIsMember] =
    useState(initialIsMember);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMembership(
    action: "join" | "leave"
  ) {
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/membership",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not update membership."
        );
        setIsLoading(false);
        return;
      }

      setIsMember(action === "join");
      setIsLoading(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Community membership error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setIsLoading(false);
    }
  }

  if (isOwner) {
    return (
      <div className="text-right">
        <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#dce4de] bg-[#f3f6f3] px-5 text-xs font-semibold text-[#557067]">
          Community owner
        </span>
      </div>
    );
  }

  if (isMember) {
    return (
      <div className="min-w-[150px]">
        <button
          type="button"
          onClick={() => {
            const confirmed = window.confirm(
              "Leave this community?"
            );

            if (confirmed) {
              handleMembership("leave");
            }
          }}
          disabled={isLoading}
          className="min-h-10 w-full rounded-full border border-[#dce4de] bg-white px-5 text-xs font-semibold text-[#557067] transition hover:border-[#b8c6bd] hover:text-[#17352d] active:bg-[#f3f6f3] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Leaving..." : "Leave community"}
        </button>

        {error && (
          <p
            role="alert"
            className="mt-2 text-right text-[10px] leading-4 text-[#a24d42]"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  if (privacy === "private") {
    return (
      <div className="min-w-[150px]">
        <span className="flex min-h-10 items-center justify-center rounded-full border border-[#dce4de] bg-[#f3f6f3] px-5 text-xs font-semibold text-[#718078]">
          Private community
        </span>
      </div>
    );
  }

  return (
    <div className="min-w-[150px]">
      <button
        type="button"
        onClick={() => handleMembership("join")}
        disabled={isLoading}
        className="min-h-10 w-full rounded-full bg-[#17352d] px-5 text-xs font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Joining..." : "Join community"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 text-right text-[10px] leading-4 text-[#a24d42]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
