import { NextRequest, NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

export async function GET(request: NextRequest) {
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

  const reelId = request.nextUrl.searchParams.get("reelId");

  if (!reelId) {
    return NextResponse.json(
      { error: "reelId is required" },
      { status: 400 }
    );
  }

  const { data: reel, error: reelError } = await supabase
    .from("reels")
    .select("id, user_id, visibility")
    .eq("id", reelId)
    .maybeSingle();

  if (reelError) {
    return NextResponse.json(
      { error: reelError.message },
      { status: 500 }
    );
  }

  if (!reel) {
    return NextResponse.json(
      { error: "Reel not found" },
      { status: 404 }
    );
  }

  if (
    reel.visibility !== "public" &&
    reel.user_id !== user.id
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { count, error: countError } = await supabase
    .from("reel_reactions")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("reel_id", reelId)
    .eq("reaction_type", "like");

  if (countError) {
    return NextResponse.json(
      { error: countError.message },
      { status: 500 }
    );
  }

  const { data: currentReaction, error: reactionError } =
    await supabase
      .from("reel_reactions")
      .select("id")
      .eq("reel_id", reelId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (reactionError) {
    return NextResponse.json(
      { error: reactionError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    count: count ?? 0,
    liked: Boolean(currentReaction),
  });
}

export async function POST(request: NextRequest) {
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

  let body: {
    reelId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const reelId = body.reelId;

  if (!reelId) {
    return NextResponse.json(
      { error: "reelId is required" },
      { status: 400 }
    );
  }

  const { data: reel, error: reelError } = await supabase
    .from("reels")
    .select("id, visibility")
    .eq("id", reelId)
    .maybeSingle();

  if (reelError) {
    return NextResponse.json(
      { error: reelError.message },
      { status: 500 }
    );
  }

  if (!reel) {
    return NextResponse.json(
      { error: "Reel not found" },
      { status: 404 }
    );
  }

  if (reel.visibility !== "public") {
    return NextResponse.json(
      { error: "Only public Reels can be liked." },
      { status: 403 }
    );
  }

  const { data: existingReaction, error: existingError } =
    await supabase
      .from("reel_reactions")
      .select("id")
      .eq("reel_id", reelId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (existingReaction) {
    const { error: deleteError } = await supabase
      .from("reel_reactions")
      .delete()
      .eq("id", existingReaction.id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await supabase
      .from("reel_reactions")
      .insert({
        reel_id: reelId,
        user_id: user.id,
        reaction_type: "like",
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }
  }

  const { count, error: countError } = await supabase
    .from("reel_reactions")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("reel_id", reelId)
    .eq("reaction_type", "like");

  if (countError) {
    return NextResponse.json(
      { error: countError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    count: count ?? 0,
    liked: !existingReaction,
  });
}