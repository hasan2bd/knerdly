import { NextResponse } from "next/server";

import { createClient } from "../../../supabase/server";

export async function GET() {
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

    const { data: friendships, error } = await supabase
      .from("friendships")
      .select(
        `
          id,
          requester_id,
          addressee_id,
          status,
          created_at,
          updated_at
        `
      )
      .or(
        `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Friendships loading error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not load friendships.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      friendships: friendships || [],
    });
  } catch (error) {
    console.error(
      "Friendships API error:",
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
