import { NextResponse } from "next/server";

import { createClient } from "../../../../../supabase/server";

const MANAGER_ROLES = [
  "owner",
  "admin",
  "moderator",
] as const;

export async function DELETE(
  request: Request
) {
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const answerId =
      typeof body === "object" &&
      body !== null &&
      "answerId" in body &&
      typeof body.answerId === "string"
        ? body.answerId.trim()
        : "";

    if (!answerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Answer not found.",
        },
        { status: 400 }
      );
    }

    const {
      data: answer,
      error: answerError,
    } = await supabase
      .from("community_post_answers")
      .select(
        `
        id,
        community_post_id
        `
      )
      .eq("id", answerId)
      .maybeSingle();

    if (answerError) {
      console.error(
        "Community answer moderation lookup error:",
        answerError
      );

      return NextResponse.json(
        {
          success: false,
          message: answerError.message,
        },
        { status: 400 }
      );
    }

    if (!answer) {
      return NextResponse.json(
        {
          success: false,
          message: "Answer not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: post,
      error: postError,
    } = await supabase
      .from("community_posts")
      .select(
        `
        id,
        community_id
        `
      )
      .eq("id", answer.community_post_id)
      .maybeSingle();

    if (postError) {
      console.error(
        "Community answer moderation post lookup error:",
        postError
      );

      return NextResponse.json(
        {
          success: false,
          message: postError.message,
        },
        { status: 400 }
      );
    }

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          message: "Community post not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("community_members")
      .select(
        `
        id,
        role
        `
      )
      .eq("community_id", post.community_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Community answer moderation membership lookup error:",
        membershipError
      );

      return NextResponse.json(
        {
          success: false,
          message: membershipError.message,
        },
        { status: 400 }
      );
    }

    if (
      !membership ||
      !MANAGER_ROLES.includes(
        membership.role as (typeof MANAGER_ROLES)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to moderate this community.",
        },
        { status: 403 }
      );
    }

    const { error: deleteError } =
      await supabase
        .from("community_post_answers")
        .delete()
        .eq("id", answerId);

    if (deleteError) {
      console.error(
        "Community answer moderation delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          message: deleteError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Community answer removed.",
    });
  } catch (error) {
    console.error(
      "Community answer moderation DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while removing the community answer.",
      },
      { status: 500 }
    );
  }
}
