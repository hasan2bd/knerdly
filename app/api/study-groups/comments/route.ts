import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

export async function GET(request: Request) {
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

    const { searchParams } =
      new URL(request.url);

    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "A valid post is required." },
        { status: 400 }
      );
    }

    const {
      data: comments,
      error: commentsError,
    } = await supabase
      .from("study_group_post_comments")
      .select(
        "id, post_id, author_id, content, created_at"
      )
      .eq("post_id", postId)
      .order("created_at", {
        ascending: true,
      });

    if (commentsError) {
      return NextResponse.json(
        { error: commentsError.message },
        { status: 500 }
      );
    }

    const authorIds = Array.from(
      new Set(
        (comments || []).map(
          (comment) => comment.author_id
        )
      )
    );

    let profiles: {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }[] = [];

    if (authorIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url"
        )
        .in("id", authorIds);

      if (profileError) {
        return NextResponse.json(
          { error: profileError.message },
          { status: 500 }
        );
      }

      profiles = profileData || [];
    }

    return NextResponse.json({
      comments: comments || [],
      profiles,
    });
  } catch (error) {
    console.error(
      "Study group comments GET error:",
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

    const postId =
      typeof body?.postId === "string"
        ? body.postId.trim()
        : "";

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

    if (!postId) {
      return NextResponse.json(
        { error: "A valid post is required." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Comment content cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        {
          error:
            "Comment must be 2000 characters or fewer.",
        },
        { status: 400 }
      );
    }

    const {
      data: post,
      error: postError,
    } = await supabase
      .from("study_group_posts")
      .select("id, group_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return NextResponse.json(
        { error: postError.message },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: "Study group post not found." },
        { status: 404 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("study_group_members")
      .select("id")
      .eq("group_id", post.group_id)
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
            "You must be a member of this study group to comment.",
        },
        { status: 403 }
      );
    }

    const {
      data: comment,
      error: commentError,
    } = await supabase
      .from("study_group_post_comments")
      .insert({
        post_id: postId,
        author_id: user.id,
        content,
      })
      .select(
        "id, post_id, author_id, content, created_at"
      )
      .single();

    if (commentError) {
      return NextResponse.json(
        { error: commentError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Study group comments POST error:",
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
