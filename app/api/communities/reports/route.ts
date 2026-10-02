import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

const ALLOWED_REASONS = [
  "spam",
  "harassment",
  "misinformation",
  "inappropriate",
  "off_topic",
  "other",
] as const;

type ReportReason =
  (typeof ALLOWED_REASONS)[number];

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

    const communityId =
      typeof body.communityId === "string"
        ? body.communityId.trim()
        : "";

    const postId =
      typeof body.postId === "string"
        ? body.postId.trim()
        : null;

    const commentId =
      typeof body.commentId === "string"
        ? body.commentId.trim()
        : null;

    const answerId =
      typeof body.answerId === "string"
        ? body.answerId.trim()
        : null;

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    const details =
      typeof body.details === "string"
        ? body.details.trim()
        : "";

    if (!communityId) {
      return NextResponse.json(
        {
          success: false,
          message: "Community not found.",
        },
        { status: 400 }
      );
    }

    const targetCount = [
      postId,
      commentId,
      answerId,
    ].filter(Boolean).length;

    if (targetCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A report must target exactly one item.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_REASONS.includes(
        reason as ReportReason
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid report reason.",
        },
        { status: 400 }
      );
    }

    if (details.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Additional details must be 1000 characters or fewer.",
        },
        { status: 400 }
      );
    }

    /*
     * Verify that the reporter is a member
     * of the community.
     */
    const { data: membership } =
      await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be a member of this community to report content.",
        },
        { status: 403 }
      );
    }

    /*
     * Verify the target belongs to the
     * specified community.
     */
    if (postId) {
      const { data: post } =
        await supabase
          .from("community_posts")
          .select("id, community_id")
          .eq("id", postId)
          .maybeSingle();

      if (
        !post ||
        post.community_id !== communityId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected post was not found in this community.",
          },
          { status: 400 }
        );
      }
    }

    if (commentId) {
      const { data: comment } =
        await supabase
          .from("community_post_comments")
          .select(
            `
            id,
            community_post_id
            `
          )
          .eq("id", commentId)
          .maybeSingle();

      if (!comment) {
        return NextResponse.json(
          {
            success: false,
            message: "Comment not found.",
          },
          { status: 400 }
        );
      }

      const { data: post } =
        await supabase
          .from("community_posts")
          .select("id, community_id")
          .eq(
            "id",
            comment.community_post_id
          )
          .maybeSingle();

      if (
        !post ||
        post.community_id !== communityId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected comment was not found in this community.",
          },
          { status: 400 }
        );
      }
    }

    if (answerId) {
      const { data: answer } =
        await supabase
          .from("community_post_answers")
          .select(
            `
            id,
            community_post_id
            `
          )
          .eq("id", answerId)
          .maybeSingle();

      if (!answer) {
        return NextResponse.json(
          {
            success: false,
            message: "Answer not found.",
          },
          { status: 400 }
        );
      }

      const { data: post } =
        await supabase
          .from("community_posts")
          .select("id, community_id")
          .eq(
            "id",
            answer.community_post_id
          )
          .maybeSingle();

      if (
        !post ||
        post.community_id !== communityId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected answer was not found in this community.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Prevent duplicate pending reports
     * from the same user for the same target.
     */
    let existingQuery = supabase
      .from("community_reports")
      .select("id")
      .eq("community_id", communityId)
      .eq("reporter_id", user.id)
      .eq("status", "pending");

    if (postId) {
      existingQuery = existingQuery.eq(
        "post_id",
        postId
      );
    }

    if (commentId) {
      existingQuery = existingQuery.eq(
        "comment_id",
        commentId
      );
    }

    if (answerId) {
      existingQuery = existingQuery.eq(
        "answer_id",
        answerId
      );
    }

    const { data: existingReport } =
      await existingQuery.maybeSingle();

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already reported this item.",
        },
        { status: 409 }
      );
    }

    const { data: report, error } =
      await supabase
        .from("community_reports")
        .insert({
          community_id: communityId,
          reporter_id: user.id,
          post_id: postId,
          comment_id: commentId,
          answer_id: answerId,
          reason,
          details: details || null,
        })
        .select(
          `
          id,
          community_id,
          reporter_id,
          post_id,
          comment_id,
          answer_id,
          reason,
          details,
          status,
          created_at
          `
        )
        .single();

    if (error) {
      console.error(
        "Community report creation error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Something went wrong while submitting your report.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Community reports POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while submitting your report.",
      },
      { status: 500 }
    );
  }
}
