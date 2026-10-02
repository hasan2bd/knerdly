import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

const ALLOWED_POST_TYPES = [
  "discussion",
  "question",
  "resource",
  "announcement",
];

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

    const postType =
      typeof body?.postType === "string"
        ? body.postType
        : "discussion";

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : null;

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

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

    if (!ALLOWED_POST_TYPES.includes(postType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid community post type.",
        },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "Post content cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Post content cannot exceed 5000 characters.",
        },
        { status: 400 }
      );
    }

    if (postType === "question" && !title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Questions need a short title.",
        },
        { status: 400 }
      );
    }

    if (title && title.length > 160) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Post title cannot exceed 160 characters.",
        },
        { status: 400 }
      );
    }

    const { data: community, error: communityError } =
      await supabase
        .from("communities")
        .select("id, privacy")
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
          message:
            "Could not verify this community.",
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

    const { data: membership, error: membershipError } =
      await supabase
        .from("community_members")
        .select("id, role")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
      console.error(
        "Community membership lookup error:",
        membershipError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not verify your community membership.",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be a member of this community to post.",
        },
        { status: 403 }
      );
    }

    /*
     * Regular members should not create announcements.
     * Announcement permissions will later be handled
     * by community owners, admins, and moderators.
     */
    if (
      postType === "announcement" &&
      !["owner", "admin", "moderator"].includes(
        membership.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only community moderators can create announcements.",
        },
        { status: 403 }
      );
    }

    const { data: post, error } = await supabase
      .from("community_posts")
      .insert({
        community_id: communityId,
        author_id: user.id,
        post_type: postType,
        title: title || null,
        content,
      })
      .select(
        `
          id,
          community_id,
          author_id,
          post_type,
          title,
          content,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Community post creation error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not create the community post.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error(
      "Community post API error:",
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
