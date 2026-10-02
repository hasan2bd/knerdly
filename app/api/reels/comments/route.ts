import { NextRequest, NextResponse } from "next/server";

import { createClient } from "../../../../supabase/server";

const MAX_COMMENT_LENGTH = 2000;

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

  const { data: comments, error: commentsError } =
    await supabase
      .from("reel_comments")
      .select(
        `
          id,
          reel_id,
          author_id,
          parent_id,
          content,
          created_at,
          updated_at
        `
      )
      .eq("reel_id", reelId)
      .order("created_at", { ascending: true });

  if (commentsError) {
    return NextResponse.json(
      { error: commentsError.message },
      { status: 500 }
    );
  }

  const authorIds = Array.from(
    new Set(
      (comments ?? []).map(
        (comment) => comment.author_id
      )
    )
  );

  let profiles: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }> = [];

  if (authorIds.length > 0) {
    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url"
        )
        .in("id", authorIds);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    profiles = profileData ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const enrichedComments = (comments ?? []).map(
    (comment) => ({
      ...comment,
      author: profileMap.get(comment.author_id) ?? null,
    })
  );

  return NextResponse.json({
    comments: enrichedComments,
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
    content?: string;
    parentId?: string | null;
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
  const content = body.content?.trim() || "";
  const parentId = body.parentId || null;

  if (!reelId) {
    return NextResponse.json(
      { error: "reelId is required" },
      { status: 400 }
    );
  }

  if (!content) {
    return NextResponse.json(
      { error: "Comment cannot be empty." },
      { status: 400 }
    );
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      {
        error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`,
      },
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

  if (reel.visibility !== "public") {
    return NextResponse.json(
      { error: "Only public Reels can receive comments." },
      { status: 403 }
    );
  }

  if (parentId) {
    const { data: parentComment, error: parentError } =
      await supabase
        .from("reel_comments")
        .select("id, reel_id")
        .eq("id", parentId)
        .maybeSingle();

    if (parentError) {
      return NextResponse.json(
        { error: parentError.message },
        { status: 500 }
      );
    }

    if (!parentComment) {
      return NextResponse.json(
        { error: "Parent comment not found." },
        { status: 404 }
      );
    }

    if (parentComment.reel_id !== reelId) {
      return NextResponse.json(
        { error: "Invalid parent comment." },
        { status: 400 }
      );
    }
  }

  const { data: comment, error: insertError } =
    await supabase
      .from("reel_comments")
      .insert({
        reel_id: reelId,
        author_id: user.id,
        parent_id: parentId,
        content,
      })
      .select(
        `
          id,
          reel_id,
          author_id,
          parent_id,
          content,
          created_at,
          updated_at
        `
      )
      .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { comment },
    { status: 201 }
  );
}