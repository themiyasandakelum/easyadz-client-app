import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: List verifications with status 'pending_admin'. Admin only. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "all";

  try {
    const rows =
      statusFilter === "all"
        ? await sql`
      SELECT pv.id, pv.profile_id, pv.id_image_url, pv.selfie_url, pv.status, pv.admin_notes, pv.created_at,
        p.name, p.user_id
      FROM profile_verifications pv
      JOIN profiles p ON p.id = pv.profile_id
      ORDER BY pv.created_at DESC
    `
        : await sql`
      SELECT pv.id, pv.profile_id, pv.id_image_url, pv.selfie_url, pv.status, pv.admin_notes, pv.created_at,
        p.name, p.user_id
      FROM profile_verifications pv
      JOIN profiles p ON p.id = pv.profile_id
      WHERE pv.status = ${statusFilter}
      ORDER BY pv.created_at DESC
    `;
    const list = Array.isArray(rows) ? rows : [rows];
    return NextResponse.json(list);
  } catch (err) {
    console.error("Admin verifications list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch verifications." },
      { status: 500 }
    );
  }
}
