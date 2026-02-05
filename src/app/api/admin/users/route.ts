import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: List all users (profiles). Admin only. Query: search?, limit? */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);

  try {
    let rows;
    if (search) {
      const pattern = `%${search.replace(/%/g, "\\%")}%`;
      rows = await sql`
        SELECT id, user_id, name, phone, status, role, is_verified, created_at
        FROM profiles
        WHERE name ILIKE ${pattern} OR phone ILIKE ${pattern} OR user_id ILIKE ${pattern}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT id, user_id, name, phone, status, role, is_verified, created_at
        FROM profiles
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    const users = list.map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      phone: r.phone,
      status: r.status,
      role: r.role,
      isVerified: !!r.is_verified,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list users." },
      { status: 500 }
    );
  }
}
