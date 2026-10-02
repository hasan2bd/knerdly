
import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

const MAX_CONTENT_LENGTH = 2000;

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
          message: "You must be logged in to answer.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const communityPostId =
      typeof body.communityPostId === "string"
        ? body.communityPostId.trim()
        : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    if (!communityPostId) {
      return NextResponse.json(
        {
          success: false,
          message: "Question not found.",
        },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "Please write an answer.",
        },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Your answer must be ${MAX_CONTENT_LENGTH} characters or fewer.`,
        },
        { status: 400 }
      );
    }

    const { data: question, error: questionError } =
      await supabase
        .from("community_posts")
        .select(
          `
            id,
            community_id,
            post_type
          `
        )
        .eq("id", communityPostId)
        .maybeSingle();

    if (questionError) {
      console.error(
        "Question lookup error:",
        questionError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not verify the question.",
        },
        { status: 500 }
      );
    }

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message: "Question not found.",
        },
        { status: 404 }
      );
    }

    if (question.post_type !== "question") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Answers can only be posted to community questions.",
        },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("community_members")
        .select("id, role")
        .eq("community_id", question.community_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
      console.error(
        "Answer membership lookup error:",
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
            "You must be a member of this community to answer.",
        },
        { status: 403 }
      );
    }

    const { data: answer, error: insertError } =
      await supabase
        .from("community_post_answers")
        .insert({
          community_post_id: communityPostId,
          author_id: user.id,
          content,
        })
        .select(
          `
            id,
            community_post_id,
            author_id,
            content,
            is_accepted,
            created_at,
            updated_at
          `
        )
        .single();

    if (insertError) {
      console.error(
        "Answer creation error:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not publish your answer.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error(
      "Community answer POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while publishing your answer.",
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

    const answerId =
      typeof body.answerId === "string"
        ? body.answerId.trim()
        : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
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

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "Please write an answer.",
        },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Your answer must be ${MAX_CONTENT_LENGTH} characters or fewer.`,
        },
        { status: 400 }
      );
    }

    const { data: existingAnswer, error: answerError } =
      await supabase
        .from("community_post_answers")
        .select(
          `
            id,
            community_post_id,
            author_id
          `
        )
        .eq("id", answerId)
        .maybeSingle();

    if (answerError) {
      console.error(
        "Answer lookup error:",
        answerError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not verify the answer.",
        },
        { status: 500 }
      );
    }

    if (!existingAnswer) {
      return NextResponse.json(
        {
          success: false,
          message: "Answer not found.",
        },
        { status: 404 }
      );
    }

    if (existingAnswer.author_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You can only edit your own answers.",
        },
        { status: 403 }
      );
    }

    const { data: answer, error: updateError } =
      await supabase
        .from("community_post_answers")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", answerId)
        .select(
          `
            id,
            community_post_id,
            author_id,
            content,
            is_accepted,
            created_at,
            updated_at
          `
        )
        .single();

    if (updateError) {
      console.error(
        "Answer update error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not update your answer.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error(
      "Community answer PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while updating your answer.",
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

    const answerId =
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

    const { data: existingAnswer, error: answerError } =
      await supabase
        .from("community_post_answers")
        .select(
          `
            id,
            author_id
          `
        )
        .eq("id", answerId)
        .maybeSingle();

    if (answerError) {
      console.error(
        "Answer deletion lookup error:",
        answerError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not verify the answer.",
        },
        { status: 500 }
      );
    }

    if (!existingAnswer) {
      return NextResponse.json(
        {
          success: false,
          message: "Answer not found.",
        },
        { status: 404 }
      );
    }

    if (existingAnswer.author_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You can only delete your own answers.",
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
        "Answer deletion error:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not delete your answer.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Community answer DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while deleting the answer.",
      },
      { status: 500 }
    );
  }
}
