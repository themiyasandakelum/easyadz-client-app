import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** PATCH: Update user status (active/banned). Admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User ID required." }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const status = body.status?.toLowerCase();
  if (status !== "active" && status !== "banned") {
    return NextResponse.json(
      { error: "status must be 'active' or 'banned'." },
      { status: 400 }
    );
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const rows = await sql`
      UPDATE profiles SET status = ${status} WHERE id = ${id}::uuid
      RETURNING id, status
    `;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ id: (row as { id: string }).id, status });
  } catch (err) {
    console.error("Admin user update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user." },
      { status: 500 }
    );
  }
}
