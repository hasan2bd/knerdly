import { NextResponse } from "next/server";

import { createClient } from "../../../../../supabase/server";

const allowedStatuses = [
  "reviewed",
  "dismissed",
  "action_taken",
] as const;

type ReportStatus =
  (typeof allowedStatuses)[number];

export async function PATCH(
  request: Request
) {
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

    const reportId =
      typeof body.reportId === "string"
        ? body.reportId.trim()
        : "";

    const status =
      typeof body.status === "string"
        ? body.status.trim()
        : "";

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          message: "Report not found.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedStatuses.includes(
        status as ReportStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid report status.",
        },
        { status: 400 }
      );
    }

    /*
     * Load the report.
     */
    const {
      data: report,
      error: reportError,
    } = await supabase
      .from("community_reports")
      .select(
        `
        id,
        community_id,
        status
        `
      )
      .eq("id", reportId)
      .maybeSingle();

    if (reportError) {
      console.error(
        "Load community report error:",
        reportError
      );

      return NextResponse.json(
        {
          success: false,
          message: reportError.message,
        },
        { status: 400 }
      );
    }

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          message: "Report not found.",
        },
        { status: 404 }
      );
    }

    if (report.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This report has already been reviewed.",
        },
        { status: 409 }
      );
    }

    /*
     * Verify that the current user is a
     * community owner, admin, or moderator.
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("community_members")
      .select("role")
      .eq(
        "community_id",
        report.community_id
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Community report membership error:",
        membershipError
      );

      return NextResponse.json(
        {
          success: false,
          message: membershipError.message,
        },
        { status: 400 }
      );
    }

    const isManager =
      membership?.role === "owner" ||
      membership?.role === "admin" ||
      membership?.role === "moderator";

    if (!isManager) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only community managers can review reports.",
        },
        { status: 403 }
      );
    }

    /*
     * Update report.
     */
    const {
      data: updatedReport,
      error: updateError,
    } = await supabase
      .from("community_reports")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .eq("status", "pending")
      .select(
        `
        id,
        community_id,
        reporter_id,
        post_id,
        comment_id,
        answer_id,
        reason,
        details,
        status,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
        `
      )
      .single();

    if (updateError) {
      console.error(
        "Update community report error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      report: updatedReport,
    });
  } catch (error) {
    console.error(
      "Community report status PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while updating the report.",
      },
      { status: 500 }
    );
  }
}
