import { NextResponse } from "next/server";

import { createClient } from "../../../supabase/server";

export async function GET(
  request: Request
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const videoId =
      searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    const {
      data: reactions,
      error,
    } = await supabase
      .from("video_reactions")
      .select(
        "id, user_id, reaction_type, created_at"
      )
      .eq("video_id", videoId);

    if (error) {
      console.error(
        "Video reactions GET error:",
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const reactionList =
      reactions ?? [];

    return NextResponse.json({
      count: reactionList.length,
      reacted: reactionList.some(
        (reaction) =>
          reaction.user_id === user.id
      ),
    });
  } catch (error) {
    console.error(
      "Video reactions GET exception:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load video reactions.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const videoId =
      typeof body.videoId === "string"
        ? body.videoId.trim()
        : "";

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("video_reactions")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existing) {
      const { error: deleteError } =
        await supabase
          .from("video_reactions")
          .delete()
          .eq("id", existing.id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      const { count } = await supabase
        .from("video_reactions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("video_id", videoId);

      return NextResponse.json({
        reacted: false,
        count: count ?? 0,
      });
    }

    const {
      error: insertError,
    } = await supabase
      .from("video_reactions")
      .insert({
        video_id: videoId,
        user_id: user.id,
        reaction_type: "like",
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from("video_reactions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("video_id", videoId);

    return NextResponse.json({
      reacted: true,
      count: count ?? 0,
    });
  } catch (error) {
    console.error(
      "Video reactions POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update video reaction.",
      },
      { status: 500 }
    );
  }
}