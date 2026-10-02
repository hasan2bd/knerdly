import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const groupId = body?.groupId;

  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json(
      { error: "A valid study group is required." },
      { status: 400 }
    );
  }

  const { data: group, error: groupError } =
    await supabase
      .from("study_groups")
      .select("id, privacy")
      .eq("id", groupId)
      .maybeSingle();

  if (groupError) {
    return NextResponse.json(
      { error: groupError.message },
      { status: 500 }
    );
  }

  if (!group) {
    return NextResponse.json(
      { error: "Study group not found." },
      { status: 404 }
    );
  }

  if (group.privacy !== "public") {
    return NextResponse.json(
      {
        error:
          "Private study groups require an invitation.",
      },
      { status: 403 }
    );
  }

  const { data: existingMember } =
    await supabase
      .from("study_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingMember) {
    return NextResponse.json(
      { error: "You are already a member." },
      { status: 409 }
    );
  }

  const { error: insertError } = await supabase
    .from("study_group_members")
    .insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
    });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "You joined the study group.",
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const groupId = body?.groupId;

  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json(
      { error: "A valid study group is required." },
      { status: 400 }
    );
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("study_group_members")
      .select("id, role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this group." },
      { status: 404 }
    );
  }

  if (membership.role === "owner") {
    return NextResponse.json(
      {
        error:
          "The group owner cannot leave the group.",
      },
      { status: 403 }
    );
  }

  const { error: deleteError } = await supabase
    .from("study_group_members")
    .delete()
    .eq("id", membership.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "You left the study group.",
  });
}
