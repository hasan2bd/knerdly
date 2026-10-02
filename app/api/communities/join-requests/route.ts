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
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const communityId =
      typeof body.communityId === "string"
        ? body.communityId.trim()
        : "";

    if (!communityId) {
      return NextResponse.json(
        {
          error: "Community is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Verify the community exists and is private.
     */
    const { data: community, error: communityError } =
      await supabase
        .from("communities")
        .select("id, privacy")
        .eq("id", communityId)
        .maybeSingle();

    if (communityError) {
      return NextResponse.json(
        {
          error: communityError.message,
        },
        { status: 500 }
      );
    }

    if (!community) {
      return NextResponse.json(
        {
          error: "Community not found.",
        },
        { status: 404 }
      );
    }

    if (community.privacy !== "private") {
      return NextResponse.json(
        {
          error:
            "Public communities do not require join requests.",
        },
        { status: 400 }
      );
    }

    /*
     * Check whether the user is already a member.
     */
    const { data: existingMembership } =
      await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingMembership) {
      return NextResponse.json(
        {
          error: "You are already a member of this community.",
        },
        { status: 409 }
      );
    }

    /*
     * Check for an existing pending request.
     */
    const { data: existingRequest } =
      await supabase
        .from("community_join_requests")
        .select("id, status")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingRequest?.status === "pending") {
      return NextResponse.json(
        {
          error: "Your join request is already pending.",
        },
        { status: 409 }
      );
    }

    /*
     * Reuse an old declined/cancelled request.
     */
    if (existingRequest) {
      const { data, error } = await supabase
        .from("community_join_requests")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRequest.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        request: data,
        status: "pending",
      });
    }

    /*
     * Create a new request.
     */
    const { data, error } = await supabase
      .from("community_join_requests")
      .insert({
        community_id: communityId,
        user_id: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data,
      status: "pending",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}


/*
 * Cancel the current user's pending request.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const communityId =
      typeof body.communityId === "string"
        ? body.communityId.trim()
        : "";

    if (!communityId) {
      return NextResponse.json(
        {
          error: "Community is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("community_join_requests")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "No pending join request was found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "cancelled",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}


/*
 * Owner/admin response.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";

    const decision = body.decision;

    if (!requestId) {
      return NextResponse.json(
        {
          error: "Join request is required.",
        },
        { status: 400 }
      );
    }

    if (
      decision !== "approved" &&
      decision !== "declined"
    ) {
      return NextResponse.json(
        {
          error: "Invalid decision.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "respond_to_community_join_request",
      {
        target_request_id: requestId,
        decision,
      }
    );

    if (error) {
      const message =
        error.message ||
        "Unable to process the join request.";

      if (
        message.includes("Only community owners") ||
        message.includes("Only community")
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          { status: 403 }
        );
      }

      if (
        message.includes("not found") ||
        message.includes("already been processed")
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data,
      status: decision,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
