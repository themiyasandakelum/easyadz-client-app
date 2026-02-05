import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: List all listings for admin moderation. Admin only. */
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
  const sellerId = searchParams.get("seller")?.trim() || searchParams.get("seller_id")?.trim() || null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  try {
    const statusCond = statusFilter === "all" ? sql`` : sql`AND l.status = ${statusFilter}`;
    const sellerCond = sellerId ? sql`AND l.seller_id = ${sellerId}` : sql``;
    const rows = await sql`
      SELECT l.id, l.seller_id, l.category, l.title, l.price, l.location, l.status, l.images, l.created_at,
        p.name as seller_name
      FROM listings l
      JOIN profiles p ON p.id = l.seller_id
      WHERE 1=1 ${statusCond} ${sellerCond}
      ORDER BY l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Admin listings list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch listings." },
      { status: 500 }
    );
  }
}
