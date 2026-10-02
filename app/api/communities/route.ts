import { NextResponse } from "next/server";

import { createClient } from "../../../supabase/server";

const ALLOWED_CATEGORIES = [
  "General",
  "University",
  "Department",
  "Subject",
  "Study Group",
  "Technology",
  "Literature",
  "Business",
  "Career",
  "Language",
];

const ALLOWED_PRIVACY = ["public", "private"];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : null;

    const category =
      typeof body?.category === "string"
        ? body.category
        : "General";

    const privacy =
      typeof body?.privacy === "string"
        ? body.privacy
        : "public";

    if (name.length < 3 || name.length > 80) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Community name must be between 3 and 80 characters.",
        },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Community description cannot exceed 500 characters.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid community category.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_PRIVACY.includes(privacy)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid community privacy.",
        },
        { status: 400 }
      );
    }

    const baseSlug = createSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Community name must contain letters or numbers.",
        },
        { status: 400 }
      );
    }

    let slug = baseSlug;

    const { data: existingCommunity } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingCommunity) {
      slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const { data: community, error } = await supabase
      .from("communities")
      .insert({
        name,
        slug,
        description: description || null,
        category,
        privacy,
        created_by: user.id,
      })
      .select(
        `
          id,
          name,
          slug,
          description,
          category,
          privacy,
          cover_image_url,
          avatar_url,
          created_by,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error("Community creation error:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            message:
              "A community with this name is already being created. Please try again.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Could not create community.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      community,
    });
  } catch (error) {
    console.error("Community API error:", error);

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
