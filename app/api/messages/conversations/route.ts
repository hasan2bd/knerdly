import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

type CreateConversationBody = {
  targetUserId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: CreateConversationBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const targetUserId = body.targetUserId?.trim();

  if (!targetUserId) {
    return NextResponse.json(
      { error: "targetUserId is required" },
      { status: 400 }
    );
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "You cannot message yourself" },
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // Verify target user exists
  // -------------------------------------------------------

  const {
    data: targetUser,
    error: targetUserError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetUserError) {
    console.error(
      "Target user lookup error:",
      targetUserError
    );

    return NextResponse.json(
      { error: targetUserError.message },
      { status: 500 }
    );
  }

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // -------------------------------------------------------
  // Verify friendship
  // -------------------------------------------------------

  const { data: friendship, error: friendshipError } =
    await supabase
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

  if (friendshipError) {
    console.error(
      "Friendship lookup error:",
      friendshipError
    );

    return NextResponse.json(
      { error: friendshipError.message },
      { status: 500 }
    );
  }

  if (!friendship) {
    return NextResponse.json(
      {
        error:
          "You can only message users who are your friends.",
      },
      { status: 403 }
    );
  }

  // -------------------------------------------------------
  // Find existing 1-to-1 conversation
  // -------------------------------------------------------

  const { data: currentMemberships, error: membershipError } =
    await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

  if (membershipError) {
    console.error(
      "Current conversation lookup error:",
      membershipError
    );

    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }

  const currentConversationIds =
    (currentMemberships ?? []).map(
      (membership) => membership.conversation_id
    );

  if (currentConversationIds.length > 0) {
    const {
      data: sharedMemberships,
      error: sharedMembershipError,
    } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", targetUserId)
      .in(
        "conversation_id",
        currentConversationIds
      );

    if (sharedMembershipError) {
      console.error(
        "Shared conversation lookup error:",
        sharedMembershipError
      );

      return NextResponse.json(
        {
          error: sharedMembershipError.message,
        },
        { status: 500 }
      );
    }

    const sharedConversationIds =
      (sharedMemberships ?? []).map(
        (membership) =>
          membership.conversation_id
      );

    if (sharedConversationIds.length > 0) {
      const {
        data: existingConversations,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .select("id, is_group")
        .in("id", sharedConversationIds)
        .eq("is_group", false)
        .order("created_at", {
          ascending: true,
        });

      if (conversationError) {
        console.error(
          "Conversation lookup error:",
          conversationError
        );

        return NextResponse.json(
          {
            error: conversationError.message,
          },
          { status: 500 }
        );
      }

      if (
        existingConversations &&
        existingConversations.length > 0
      ) {
        return NextResponse.json({
          conversationId:
            existingConversations[0].id,
          existing: true,
        });
      }
    }
  }

  // -------------------------------------------------------
  // Create conversation
  // -------------------------------------------------------

  const {
    data: conversation,
    error: conversationCreateError,
  } = await supabase
    .from("conversations")
    .insert({
      created_by: user.id,
      is_group: false,
    })
    .select("id")
    .single();

  if (conversationCreateError) {
    console.error(
      "Conversation creation error:",
      conversationCreateError
    );

    return NextResponse.json(
      {
        error: conversationCreateError.message,
      },
      { status: 500 }
    );
  }

  // -------------------------------------------------------
  // Add both users
  // -------------------------------------------------------

  const { error: membersError } =
    await supabase
      .from("conversation_members")
      .insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
        },
        {
          conversation_id: conversation.id,
          user_id: targetUserId,
        },
      ]);

  if (membersError) {
    console.error(
      "Conversation members creation error:",
      membersError
    );

    await supabase
      .from("conversations")
      .delete()
      .eq("id", conversation.id);

    return NextResponse.json(
      {
        error: membersError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      conversationId: conversation.id,
      existing: false,
    },
    { status: 201 }
  );
}