import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

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
    const addresseeId = body?.addresseeId;

    if (typeof addresseeId !== "string" || !addresseeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid student.",
        },
        { status: 400 }
      );
    }

    if (addresseeId === user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot send a friend request to yourself.",
        },
        { status: 400 }
      );
    }

    const { data: friendship, error } = await supabase.rpc(
      "send_friend_request",
      {
        target_user: addresseeId,
      }
    );

    if (error) {
      console.error("Friend request RPC error:", error);

      const message = error.message || "Could not send friend request.";

      if (message.includes("Not authenticated")) {
        return NextResponse.json(
          {
            success: false,
            message: "You must be logged in.",
          },
          { status: 401 }
        );
      }

      if (message.includes("Student not found")) {
        return NextResponse.json(
          {
            success: false,
            message: "Student not found.",
          },
          { status: 404 }
        );
      }

      if (message.includes("already friends")) {
        return NextResponse.json(
          {
            success: false,
            message: "You are already friends.",
          },
          { status: 409 }
        );
      }

      if (message.includes("already sent")) {
        return NextResponse.json(
          {
            success: false,
            message: "Friend request already sent.",
          },
          { status: 409 }
        );
      }

      if (message.includes("already sent you")) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This student has already sent you a friend request.",
          },
          { status: 409 }
        );
      }

      if (message.includes("yourself")) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You cannot send a friend request to yourself.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      friendship,
    });
  } catch (error) {
    console.error("Friend request API error:", error);

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
