import { NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

type RespondAction =
  | "accept"
  | "decline"
  | "cancel";

export async function POST(
  request: Request
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "You must be logged in.",
      },
      {
        status: 401,
      }
    );
  }

  let body: {
    friendshipId?: string;
    action?: RespondAction;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  const friendshipId = body.friendshipId;
  const action = body.action;

  if (!friendshipId) {
    return NextResponse.json(
      {
        message: "Friendship ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action !== "accept" &&
    action !== "decline" &&
    action !== "cancel"
  ) {
    return NextResponse.json(
      {
        message: "Invalid friendship action.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: friendship,
    error: friendshipFetchError,
  } = await supabase
    .from("friendships")
    .select(
      `
        id,
        requester_id,
        addressee_id,
        status
      `
    )
    .eq("id", friendshipId)
    .maybeSingle();

  if (friendshipFetchError) {
    console.error(
      "Friendship fetch error:",
      friendshipFetchError
    );

    return NextResponse.json(
      {
        message:
          "Unable to load the friend request.",
      },
      {
        status: 500,
      }
    );
  }

  if (!friendship) {
    return NextResponse.json(
      {
        message: "Friend request not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (friendship.status !== "pending") {
    return NextResponse.json(
      {
        message:
          "This friend request is no longer pending.",
      },
      {
        status: 409,
      }
    );
  }

  const isRequester =
    friendship.requester_id === user.id;

  const isAddressee =
    friendship.addressee_id === user.id;

  if (!isRequester && !isAddressee) {
    return NextResponse.json(
      {
        message:
          "You are not allowed to update this friend request.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    (action === "accept" ||
      action === "decline") &&
    !isAddressee
  ) {
    return NextResponse.json(
      {
        message:
          "Only the recipient can accept or decline this request.",
      },
      {
        status: 403,
      }
    );
  }

  if (action === "cancel" && !isRequester) {
    return NextResponse.json(
      {
        message:
          "Only the requester can cancel this request.",
      },
      {
        status: 403,
      }
    );
  }

  const nextStatus =
    action === "accept"
      ? "accepted"
      : action === "decline"
        ? "declined"
        : "cancelled";

  const {
    error: updateError,
  } = await supabase
    .from("friendships")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId);

  if (updateError) {
    console.error(
      "Friendship update error:",
      updateError
    );

    return NextResponse.json(
      {
        message:
          "Unable to update the friend request.",
      },
      {
        status: 500,
      }
    );
  }

  /*
   * Remove the original friend-request notification.
   *
   * We only target:
   * - this friendship
   * - the original friend_request notification
   *
   * This intentionally does not remove other notification
   * types, such as a future friend_accept notification.
   *
   * The notifications DELETE RLS policy ensures that only
   * the current user's own notification can be deleted.
   */
  const {
    error: notificationDeleteError,
  } = await supabase
    .from("notifications")
    .delete()
    .eq("friendship_id", friendshipId)
    .eq("type", "friend_request");

  if (notificationDeleteError) {
    console.error(
      "Friend request notification delete error:",
      notificationDeleteError
    );

    return NextResponse.json(
      {
        message:
          "Friend request was updated, but the notification could not be removed.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    friendshipId,
    status: nextStatus,
  });
}