import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** GET: Return seller contact (phone, name) for a listing. No auth required. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const { id: listingId } = await params;
  if (!listingId) {
    return NextResponse.json(
      { error: "Listing id required." },
      { status: 400 }
    );
  }

  try {
    const rows = await sql`
      SELECT p.phone, p.name
      FROM listings l
      JOIN profiles p ON p.id = l.seller_id
      WHERE l.id = ${listingId}
      LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }
    const { phone, name } = row as { phone: string | null; name: string };
    return NextResponse.json({
      phone: phone ?? null,
      name: name ?? null,
    });
  } catch (err) {
    console.error("Listing contact fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}
