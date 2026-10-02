import { NextResponse } from "next/server";

import { createClient } from "../../../supabase/server";

type SendMessageBody = {
  conversationId?: string;
  content?: string;
};

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);

  const conversationId =
    searchParams.get("conversationId");

  // -------------------------------------------------------
  // Load one conversation's messages
  // -------------------------------------------------------

  if (conversationId) {
    const { data: membership, error: membershipError } =
      await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
      console.error(
        "Message membership lookup error:",
        membershipError
      );

      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const { data: messages, error: messagesError } =
      await supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, content, created_at, edited_at, deleted_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", {
          ascending: true,
        });

    if (messagesError) {
      console.error(
        "Messages load error:",
        messagesError
      );

      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages ?? [],
    });
  }

  // -------------------------------------------------------
  // Load conversation list
  // -------------------------------------------------------

  const {
    data: memberships,
    error: membershipsError,
  } = await supabase
    .from("conversation_members")
    .select(
      "conversation_id, user_id, joined_at, last_read_at"
    )
    .eq("user_id", user.id);

  if (membershipsError) {
    console.error(
      "Conversation memberships load error:",
      membershipsError
    );

    return NextResponse.json(
      { error: membershipsError.message },
      { status: 500 }
    );
  }

  const conversationIds =
    (memberships ?? []).map(
      (membership) => membership.conversation_id
    );

  if (conversationIds.length === 0) {
    return NextResponse.json({
      conversations: [],
    });
  }

  const {
    data: conversations,
    error: conversationsError,
  } = await supabase
    .from("conversations")
    .select(
      "id, is_group, created_by, created_at, updated_at"
    )
    .in("id", conversationIds)
    .order("updated_at", {
      ascending: false,
    });

  if (conversationsError) {
    console.error(
      "Conversations load error:",
      conversationsError
    );

    return NextResponse.json(
      { error: conversationsError.message },
      { status: 500 }
    );
  }

  // -------------------------------------------------------
  // Load members
  // -------------------------------------------------------

  const {
    data: members,
    error: membersError,
  } = await supabase
    .from("conversation_members")
    .select(
      "conversation_id, user_id, joined_at, last_read_at"
    )
    .in("conversation_id", conversationIds);

  if (membersError) {
    console.error(
      "Conversation members load error:",
      membersError
    );

    return NextResponse.json(
      { error: membersError.message },
      { status: 500 }
    );
  }

  const memberUserIds = Array.from(
    new Set(
      (members ?? []).map(
        (member) => member.user_id
      )
    )
  );

  // -------------------------------------------------------
  // Load profiles
  // -------------------------------------------------------

  let profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }[] = [];

  if (memberUserIds.length > 0) {
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url"
      )
      .in("id", memberUserIds);

    if (profileError) {
      console.error(
        "Message profile lookup error:",
        profileError
      );

      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    profiles = profileData ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  // -------------------------------------------------------
  // Load latest message for each conversation
  // -------------------------------------------------------

  const { data: latestMessages, error: latestError } =
    await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_id, content, created_at, deleted_at"
      )
      .in("conversation_id", conversationIds)
      .order("created_at", {
        ascending: false,
      });

  if (latestError) {
    console.error(
      "Latest message lookup error:",
      latestError
    );

    return NextResponse.json(
      { error: latestError.message },
      { status: 500 }
    );
  }

  const latestMessageMap = new Map<
    string,
    (typeof latestMessages)[number]
  >();

  for (const message of latestMessages ?? []) {
    if (!latestMessageMap.has(message.conversation_id)) {
      latestMessageMap.set(
        message.conversation_id,
        message
      );
    }
  }

  // -------------------------------------------------------
  // Build conversation response
  // -------------------------------------------------------

  const conversationList = (conversations ?? []).map(
    (conversation) => {
      const conversationMembers =
        (members ?? []).filter(
          (member) =>
            member.conversation_id ===
            conversation.id
        );

      const otherMembers =
        conversationMembers.filter(
          (member) =>
            member.user_id !== user.id
        );

      const otherProfiles = otherMembers
        .map((member) =>
          profileMap.get(member.user_id)
        )
        .filter(Boolean);

      const latestMessage =
        latestMessageMap.get(conversation.id) ??
        null;

      const currentMembership =
        memberships?.find(
          (membership) =>
            membership.conversation_id ===
            conversation.id
        );

      return {
        id: conversation.id,
        is_group: conversation.is_group,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        members: otherProfiles,
        latestMessage,
        lastReadAt:
          currentMembership?.last_read_at ?? null,
      };
    }
  );

  return NextResponse.json({
    conversations: conversationList,
  });
}

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

  let body: SendMessageBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const conversationId =
    body.conversationId?.trim();

  const content = body.content?.trim();

  if (!conversationId) {
    return NextResponse.json(
      {
        error: "conversationId is required",
      },
      { status: 400 }
    );
  }

  if (!content) {
    return NextResponse.json(
      {
        error: "Message cannot be empty",
      },
      { status: 400 }
    );
  }

  if (content.length > 5000) {
    return NextResponse.json(
      {
        error:
          "Message cannot exceed 5000 characters",
      },
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // Verify conversation membership
  // -------------------------------------------------------

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Send message membership error:",
      membershipError
    );

    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }

  if (!membership) {
    return NextResponse.json(
      {
        error:
          "You are not a member of this conversation.",
      },
      { status: 403 }
    );
  }

  // -------------------------------------------------------
  // Insert message
  // -------------------------------------------------------

  const {
    data: message,
    error: messageError,
  } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select(
      "id, conversation_id, sender_id, content, created_at, edited_at, deleted_at"
    )
    .single();

  if (messageError) {
    console.error(
      "Message creation error:",
      messageError
    );

    return NextResponse.json(
      { error: messageError.message },
      { status: 500 }
    );
  }

  // -------------------------------------------------------
  // Update conversation activity
  // -------------------------------------------------------

  const { error: updateError } =
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

  if (updateError) {
    console.error(
      "Conversation timestamp update error:",
      updateError
    );
  }

  return NextResponse.json(
    {
      message,
    },
    { status: 201 }
  );
}