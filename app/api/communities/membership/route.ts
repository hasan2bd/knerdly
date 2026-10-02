import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const communityId = body?.communityId;
    const action = body?.action;

    if (
      typeof communityId !== "string" ||
      !communityId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid community.",
        },
        { status: 400 }
      );
    }

    if (action !== "join" && action !== "leave") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid membership action.",
        },
        { status: 400 }
      );
    }

    const { data: community, error: communityError } =
      await supabase
        .from("communities")
        .select("id, name, privacy, created_by")
        .eq("id", communityId)
        .maybeSingle();

    if (communityError) {
      console.error(
        "Community lookup error:",
        communityError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not find this community.",
        },
        { status: 500 }
      );
    }

    if (!community) {
      return NextResponse.json(
        {
          success: false,
          message: "Community not found.",
        },
        { status: 404 }
      );
    }

    const { data: existingMembership, error: membershipError } =
      await supabase
        .from("community_members")
        .select("id, role")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
      console.error(
        "Membership lookup error:",
        membershipError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not check your membership.",
        },
        { status: 500 }
      );
    }

    if (action === "join") {
      if (existingMembership) {
        return NextResponse.json(
          {
            success: false,
            message: "You are already a member of this community.",
          },
          { status: 409 }
        );
      }

      if (community.privacy !== "public") {
        return NextResponse.json(
          {
            success: false,
            message:
              "This is a private community. You cannot join it directly.",
          },
          { status: 403 }
        );
      }

      const { data: membership, error } =
        await supabase
          .from("community_members")
          .insert({
            community_id: communityId,
            user_id: user.id,
            role: "member",
          })
          .select(
            "id, community_id, user_id, role, joined_at"
          )
          .single();

      if (error) {
        console.error(
          "Community join error:",
          error
        );

        if (error.code === "23505") {
          return NextResponse.json(
            {
              success: false,
              message:
                "You are already a member of this community.",
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message: "Could not join this community.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "joined",
        membership,
      });
    }

    if (!existingMembership) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not a member of this community.",
        },
        { status: 409 }
      );
    }

    if (existingMembership.role === "owner") {
      return NextResponse.json(
        {
          success: false,
          message:
            "The community owner cannot leave the community.",
        },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("id", existingMembership.id)
      .eq("community_id", communityId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Community leave error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not leave this community.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: "left",
    });
  } catch (error) {
    console.error(
      "Community membership API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
