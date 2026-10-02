"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../supabase/client";

type ReactionType =
  | "helpful"
  | "insightful"
  | "appreciate";

type Reaction = {
  user_id: string;
  reaction_type: ReactionType;
};

type PostReactionsProps = {
  postId: string;
  reactions: Reaction[];
};

const reactionOptions: {
  type: ReactionType;
  label: string;
}[] = [
  {
    type: "helpful",
    label: "Helpful",
  },
  {
    type: "insightful",
    label: "Insightful",
  },
  {
    type: "appreciate",
    label: "Appreciate",
  },
];

export default function PostReactions({
  postId,
  reactions,
}: PostReactionsProps) {
  const supabase = useMemo(() => createClient(), []);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [currentReactionOverride, setCurrentReactionOverride] =
    useState<ReactionType | null | undefined>(undefined);

  const [countChanges, setCountChanges] = useState<
    Partial<Record<ReactionType, number>>
  >({});

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && mounted) {
        setCurrentUserId(user.id);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const derivedReactionData = useMemo(() => {
    const nextCounts = {
      helpful: 0,
      insightful: 0,
      appreciate: 0,
    };

    let userReaction: ReactionType | null = null;

    for (const reaction of reactions) {
      if (reaction.reaction_type in nextCounts) {
        nextCounts[reaction.reaction_type] += 1;
      }

      if (
        currentUserId &&
        reaction.user_id === currentUserId
      ) {
        userReaction = reaction.reaction_type;
      }
    }

    return {
      counts: nextCounts,
      userReaction,
    };
  }, [reactions, currentUserId]);

  const currentReaction =
    currentReactionOverride !== undefined
      ? currentReactionOverride
      : derivedReactionData.userReaction;

  const counts = useMemo(
    () => ({
      helpful:
        derivedReactionData.counts.helpful +
        (countChanges.helpful ?? 0),
      insightful:
        derivedReactionData.counts.insightful +
        (countChanges.insightful ?? 0),
      appreciate:
        derivedReactionData.counts.appreciate +
        (countChanges.appreciate ?? 0),
    }),
    [derivedReactionData, countChanges]
  );

  async function handleReaction(
    reactionType: ReactionType
  ) {
    if (!currentUserId || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      if (currentReaction === reactionType) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);

        if (error) {
          throw error;
        }

        setCurrentReactionOverride(null);

        setCountChanges((previous) => ({
          ...previous,
          [reactionType]:
            (previous[reactionType] ?? 0) - 1,
        }));
      } else if (currentReaction) {
        const previousReaction = currentReaction;

        const { error } = await supabase
          .from("reactions")
          .update({
            reaction_type: reactionType,
          })
          .eq("post_id", postId)
          .eq("user_id", currentUserId);

        if (error) {
          throw error;
        }

        setCountChanges((previous) => ({
          ...previous,
          [previousReaction]:
            (previous[previousReaction] ?? 0) - 1,
          [reactionType]:
            (previous[reactionType] ?? 0) + 1,
        }));

        setCurrentReactionOverride(reactionType);
      } else {
        const { error } = await supabase
          .from("reactions")
          .insert({
            post_id: postId,
            user_id: currentUserId,
            reaction_type: reactionType,
          });

        if (error) {
          throw error;
        }

        setCountChanges((previous) => ({
          ...previous,
          [reactionType]:
            (previous[reactionType] ?? 0) + 1,
        }));

        setCurrentReactionOverride(reactionType);
      }
    } catch (error) {
      console.error("Reaction error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#edf0ed] pt-4">
      {reactionOptions.map((reaction) => {
        const isActive =
          currentReaction === reaction.type;

        return (
          <button
            key={reaction.type}
            type="button"
            onClick={() =>
              handleReaction(reaction.type)
            }
            disabled={!currentUserId || isLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              isActive
                ? "bg-[#17352d] text-white"
                : "text-[#557067] hover:bg-[#f3f5f2]"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {reaction.label}

            {counts[reaction.type] > 0 && (
              <span className="ml-1.5">
                {counts[reaction.type]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
