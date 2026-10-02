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

    const postId =
      typeof body === "object" &&
      body !== null &&
      "postId" in body &&
      typeof body.postId === "string"
        ? body.postId.trim()
        : "";

    if (!postId) {
      return NextResponse.json(
        {
          success: false,
          message: "Community post not found.",
        },
        { status: 400 }
      );
    }

    /*
     * Find the post and its community.
     */
    const { data: post, error: postError } =
      await supabase
        .from("community_posts")
        .select(
          `
          id,
          community_id
          `
        )
        .eq("id", postId)
        .maybeSingle();

    if (postError) {
      console.error(
        "Community moderation post lookup error:",
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

    /*
     * Verify that the current user is a
     * community manager.
     */
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
        "Community moderation membership lookup error:",
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

    /*
     * Delete the post.
     *
     * Community post comments and answers use
     * ON DELETE CASCADE, so related records are
     * removed automatically by the database.
     */
    const { error: deleteError } =
      await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);

    if (deleteError) {
      console.error(
        "Community post moderation delete error:",
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
      message: "Community post removed.",
    });
  } catch (error) {
    console.error(
      "Community post moderation DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while removing the community post.",
      },
      { status: 500 }
    );
  }
}
