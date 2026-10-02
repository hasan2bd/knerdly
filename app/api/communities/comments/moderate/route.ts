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

    const commentId =
      typeof body === "object" &&
      body !== null &&
      "commentId" in body &&
      typeof body.commentId === "string"
        ? body.commentId.trim()
        : "";

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found.",
        },
        { status: 400 }
      );
    }

    /*
     * Find the comment and the community post
     * it belongs to.
     */
    const {
      data: comment,
      error: commentError,
    } = await supabase
      .from("community_post_comments")
      .select(
        `
        id,
        community_post_id
        `
      )
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      console.error(
        "Community comment moderation lookup error:",
        commentError
      );

      return NextResponse.json(
        {
          success: false,
          message: commentError.message,
        },
        { status: 400 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Find the community through the post.
     */
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
      .eq("id", comment.community_post_id)
      .maybeSingle();

    if (postError) {
      console.error(
        "Community comment moderation post lookup error:",
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
     * Verify community manager role.
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
        "Community comment moderation membership lookup error:",
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
     * Delete the comment.
     *
     * Child replies use ON DELETE CASCADE,
     * so replies belonging to this comment
     * will also be removed automatically.
     */
    const { error: deleteError } =
      await supabase
        .from("community_post_comments")
        .delete()
        .eq("id", commentId);

    if (deleteError) {
      console.error(
        "Community comment moderation delete error:",
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
      message: "Community comment removed.",
    });
  } catch (error) {
    console.error(
      "Community comment moderation DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while removing the community comment.",
      },
      { status: 500 }
    );
  }
}
