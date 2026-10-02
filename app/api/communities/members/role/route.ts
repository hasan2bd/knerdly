import { NextResponse } from "next/server";

import { createClient } from "../../../../../supabase/server";

const ALLOWED_ROLES = ["admin", "moderator", "member"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(value: unknown): value is AllowedRole {
  return (
    typeof value === "string" &&
    ALLOWED_ROLES.includes(value as AllowedRole)
  );
}

export async function PATCH(request: Request) {
  try {
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

    const communityId =
      typeof body.communityId === "string"
        ? body.communityId.trim()
        : "";

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const role = body.role;

    if (!communityId || !userId) {
      return NextResponse.json(
        { error: "Community and user are required." },
        { status: 400 }
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        { error: "Invalid community role." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "update_community_member_role",
      {
        target_community_id: communityId,
        target_user_id: userId,
        new_role: role,
      }
    );

    if (error) {
      const message =
        error.message || "Unable to update member role.";

      if (
        message.includes("Only the community owner") ||
        message.includes("You are not a member")
      ) {
        return NextResponse.json(
          { error: message },
          { status: 403 }
        );
      }

      if (
        message.includes("Community member not found") ||
        message.includes("owner role cannot")
      ) {
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
