import { NextResponse } from "next/server";

import { createClient } from "../../../../../supabase/server";

type ReactionBody = {
  studyGroupPostId?: string;
};

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);

  const studyGroupPostId =
    searchParams.get("studyGroupPostId");

  if (!studyGroupPostId) {
    return NextResponse.json(
      {
        error: "studyGroupPostId is required",
      },
      { status: 400 }
    );
  }

  const { count, error: countError } =
    await supabase
      .from("study_group_post_reactions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "study_group_post_id",
        studyGroupPostId
      );

  if (countError) {
    console.error(
      "Study reaction count error:",
      countError
    );

    return NextResponse.json(
      {
        error: countError.message,
      },
      { status: 500 }
    );
  }

  const { data: userReaction, error: userError } =
    await supabase
      .from("study_group_post_reactions")
      .select("id")
      .eq(
        "study_group_post_id",
        studyGroupPostId
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (userError) {
    console.error(
      "Study user reaction error:",
      userError
    );

    return NextResponse.json(
      {
        error: userError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    count: count ?? 0,
    liked: Boolean(userReaction),
  });
}

export async function POST(request: Request) {
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

  let body: ReactionBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const studyGroupPostId =
    body.studyGroupPostId?.trim();

  if (!studyGroupPostId) {
    return NextResponse.json(
      {
        error: "studyGroupPostId is required",
      },
      { status: 400 }
    );
  }

  const { data: post, error: postError } =
    await supabase
      .from("study_group_posts")
      .select("id")
      .eq("id", studyGroupPostId)
      .maybeSingle();

  if (postError) {
    console.error(
      "Study post lookup error:",
      postError
    );

    return NextResponse.json(
      {
        error: postError.message,
      },
      { status: 500 }
    );
  }

  if (!post) {
    return NextResponse.json(
      { error: "Study group post not found" },
      { status: 404 }
    );
  }

  const { data: existingReaction } =
    await supabase
      .from("study_group_post_reactions")
      .select("id")
      .eq(
        "study_group_post_id",
        studyGroupPostId
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingReaction) {
    const { error: deleteError } =
      await supabase
        .from("study_group_post_reactions")
        .delete()
        .eq("id", existingReaction.id)
        .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Study reaction removal error:",
        deleteError
      );

      return NextResponse.json(
        {
          error: deleteError.message,
        },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from("study_group_post_reactions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "study_group_post_id",
        studyGroupPostId
      );

    return NextResponse.json({
      liked: false,
      count: count ?? 0,
    });
  }

  const { error: insertError } =
    await supabase
      .from("study_group_post_reactions")
      .insert({
        study_group_post_id: studyGroupPostId,
        user_id: user.id,
        reaction_type: "like",
      });

  if (insertError) {
    console.error(
      "Study reaction insert error:",
      insertError
    );

    return NextResponse.json(
      {
        error: insertError.message,
      },
      { status: 500 }
    );
  }

  const { count } = await supabase
    .from("study_group_post_reactions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "study_group_post_id",
      studyGroupPostId
    );

  return NextResponse.json({
    liked: true,
    count: count ?? 0,
  });
}