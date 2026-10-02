import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

const MAX_COMMENT_LENGTH = 2000;

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

    const communityPostId =
      typeof body?.communityPostId === "string"
        ? body.communityPostId
        : "";

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

    const parentId =
      typeof body?.parentId === "string" && body.parentId
        ? body.parentId
        : null;

    if (!communityPostId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid community post.",
        },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, community_id")
      .eq("id", communityPostId)
      .maybeSingle();

    if (postError) {
      console.error(
        "Community post lookup error:",
        postError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not load the community post.",
        },
        { status: 500 }
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

    const { data: membership, error: membershipError } =
      await supabase
        .from("community_members")
        .select("id, role")
        .eq("community_id", post.community_id)
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
          message: "Could not verify community membership.",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be a member of this community to comment.",
        },
        { status: 403 }
      );
    }

    if (parentId) {
      const { data: parentComment, error: parentError } =
        await supabase
          .from("community_post_comments")
          .select("id, community_post_id")
          .eq("id", parentId)
          .maybeSingle();

      if (parentError) {
        console.error(
          "Parent comment lookup error:",
          parentError
        );

        return NextResponse.json(
          {
            success: false,
            message: "Could not verify the reply.",
          },
          { status: 500 }
        );
      }

      if (!parentComment) {
        return NextResponse.json(
          {
            success: false,
            message: "Parent comment not found.",
          },
          { status: 404 }
        );
      }

      if (
        parentComment.community_post_id !==
        communityPostId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You cannot reply to a comment from another post.",
          },
          { status: 400 }
        );
      }
    }

    const { data: comment, error } = await supabase
      .from("community_post_comments")
      .insert({
        community_post_id: communityPostId,
        author_id: user.id,
        parent_id: parentId,
        content,
      })
      .select(
        `
          id,
          community_post_id,
          author_id,
          parent_id,
          content,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Community comment creation error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not create comment.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error(
      "Community comment API error:",
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

export async function PATCH(request: Request) {
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

    const commentId =
      typeof body?.commentId === "string"
        ? body.commentId
        : "";

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

    if (!commentId || !content) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment and content are required.",
        },
        { status: 400 }
      );
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    const { data: existingComment, error: fetchError } =
      await supabase
        .from("community_post_comments")
        .select("id, author_id")
        .eq("id", commentId)
        .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          message: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!existingComment) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found.",
        },
        { status: 404 }
      );
    }

    if (existingComment.author_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only edit your own comment.",
        },
        { status: 403 }
      );
    }

    const { data: comment, error } = await supabase
      .from("community_post_comments")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("author_id", user.id)
      .select(
        `
          id,
          community_post_id,
          author_id,
          parent_id,
          content,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Community comment update error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not update comment.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error(
      "Community comment update API error:",
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

export async function DELETE(request: Request) {
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

    const commentId =
      typeof body?.commentId === "string"
        ? body.commentId
        : "";

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid comment.",
        },
        { status: 400 }
      );
    }

    const { data: existingComment, error: fetchError } =
      await supabase
        .from("community_post_comments")
        .select("id, author_id")
        .eq("id", commentId)
        .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          message: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!existingComment) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found.",
        },
        { status: 404 }
      );
    }

    if (existingComment.author_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only delete your own comment.",
        },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("community_post_comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (error) {
      console.error(
        "Community comment deletion error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not delete comment.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comment deleted.",
    });
  } catch (error) {
    console.error(
      "Community comment deletion API error:",
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
