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
    const friendshipId = body?.friendshipId;

    if (typeof friendshipId !== "string" || !friendshipId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid friendship.",
        },
        { status: 400 }
      );
    }

    const { data: friendship, error: fetchError } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .eq("id", friendshipId)
      .maybeSingle();

    if (fetchError) {
      console.error("Friendship lookup error:", fetchError);

      return NextResponse.json(
        {
          success: false,
          message: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!friendship) {
      return NextResponse.json(
        {
          success: false,
          message: "Friendship not found.",
        },
        { status: 404 }
      );
    }

    const isParticipant =
      friendship.requester_id === user.id ||
      friendship.addressee_id === user.id;

    if (!isParticipant) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot remove this friendship.",
        },
        { status: 403 }
      );
    }

    if (friendship.status !== "accepted") {
      return NextResponse.json(
        {
          success: false,
          message: "This is not an active friendship.",
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .eq("status", "accepted");

    if (deleteError) {
      console.error("Friendship removal error:", deleteError);

      return NextResponse.json(
        {
          success: false,
          message: deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Friend removed successfully.",
    });
  } catch (error) {
    console.error("Remove friendship API error:", error);

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
