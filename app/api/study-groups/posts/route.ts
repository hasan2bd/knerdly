import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

const allowedPostTypes = [
  "discussion",
  "question",
  "announcement",
  "resource",
] as const;

export async function POST(request: Request) {
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

    const groupId =
      typeof body?.groupId === "string"
        ? body.groupId.trim()
        : "";

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

    const postType =
      typeof body?.postType === "string"
        ? body.postType
        : "discussion";

    if (!groupId) {
      return NextResponse.json(
        { error: "A valid study group is required." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "Post content cannot be empty." },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        {
          error:
            "Post content must be 5000 characters or fewer.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedPostTypes.includes(
        postType as (typeof allowedPostTypes)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid post type." },
        { status: 400 }
      );
    }

    const { data: group, error: groupError } =
      await supabase
        .from("study_groups")
        .select("id")
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

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("study_group_members")
      .select("id")
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
        {
          error:
            "You must be a member of this study group to post.",
        },
        { status: 403 }
      );
    }

    const { data: post, error: postError } =
      await supabase
        .from("study_group_posts")
        .insert({
          group_id: groupId,
          author_id: user.id,
          content,
          post_type: postType,
        })
        .select(
          "id, group_id, author_id, content, post_type, created_at"
        )
        .single();

    if (postError) {
      return NextResponse.json(
        { error: postError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        post,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Study group post API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
