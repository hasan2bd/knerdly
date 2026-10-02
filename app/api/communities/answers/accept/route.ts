import { NextResponse } from "next/server";

import { createClient } from "../../../../../supabase/server";

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

    const { data: answer, error } =
      await supabase.rpc(
        "accept_community_answer",
        {
          target_answer_id: answerId,
        }
      );

    if (error) {
      console.error(
        "Accept answer error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error(
      "Community answer accept POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while accepting the answer.",
      },
      { status: 500 }
    );
  }
}
