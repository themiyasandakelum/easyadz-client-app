import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: List reported ads (pending by default). Admin only. Query: status? */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  try {
    const rows = await sql`
      SELECT r.id, r.listing_id, r.reason, r.details, r.status, r.created_at,
             l.title, l.category, l.price, l.images, l.seller_id,
             p_reporter.name as reporter_name,
             p_seller.name as seller_name
      FROM reports r
      JOIN listings l ON l.id = r.listing_id
      JOIN profiles p_reporter ON p_reporter.id = r.reporter_id
      JOIN profiles p_seller ON p_seller.id = l.seller_id
      WHERE r.status = ${status}
      ORDER BY r.created_at DESC
      LIMIT 100
    `;

    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    const reports = list.map((row: Record<string, unknown>) => ({
      id: row.id,
      listingId: row.listing_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      listing: {
        title: row.title,
        category: row.category,
        price: row.price,
        imageUrl: Array.isArray(row.images) ? (row.images as string[])[0] : null,
      },
      reporterName: row.reporter_name,
      sellerName: row.seller_name,
    }));

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("Admin reports list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list reports." },
      { status: 500 }
    );
  }
}
