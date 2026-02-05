import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** POST: Approve (dismiss) report. Admin only. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Report ID required." }, { status: 400 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action"); // "approve" | "delete_ad"

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    if (action === "delete_ad") {
      const reportRows = await sql`
        SELECT listing_id FROM reports WHERE id = ${id}::uuid LIMIT 1
      `;
      const report = Array.isArray(reportRows) ? reportRows[0] : reportRows;
      if (!report) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }
      const listingId = (report as { listing_id: string }).listing_id;

      await sql`DELETE FROM listings WHERE id = ${listingId}::uuid`;
      await sql`
        UPDATE reports SET status = 'ad_deleted', reviewed_by = ${auth.profileId}::uuid, reviewed_at = now()
        WHERE id = ${id}::uuid
      `;
      return NextResponse.json({ ok: true, action: "ad_deleted" });
    }

    // Default: approve (dismiss report, keep ad)
    const rows = await sql`
      UPDATE reports SET status = 'approved', reviewed_by = ${auth.profileId}::uuid, reviewed_at = now()
      WHERE id = ${id}::uuid
      RETURNING id, status
    `;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, action: "approved" });
  } catch (err) {
    console.error("Admin report action error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process report." },
      { status: 500 }
    );
  }
}
