import { NextRequest, NextResponse } from "next/server";
import { LISTING_CATEGORIES } from "@/lib/listings-types";
import { sql } from "@/lib/db";
const VALID_CATEGORIES = LISTING_CATEGORIES.map((c) => c.value);

/** GET: Category-first search for listings (Vehicle, Property, Electronics). Query: category (required), q?, location?, price_min?, price_max?, limit? */
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim() || null;
  const location = searchParams.get("location")?.trim() || null;
  const priceMin = searchParams.get("price_min");
  const priceMax = searchParams.get("price_max");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

  if (!category || !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: "Query parameter 'category' is required and must be one of: " + VALID_CATEGORIES.join(", ") },
      { status: 400 }
    );
  }
  const priceMinNum = priceMin != null && priceMin !== "" ? parseFloat(priceMin) : null;
  const priceMaxNum = priceMax != null && priceMax !== "" ? parseFloat(priceMax) : null;

  try {
    const rows = await sql`
      SELECT * FROM search_listings(
        ${q},
        ${category},
        ${location},
        ${priceMinNum},
        ${priceMaxNum},
        ${limit}
      )
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Search listings error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 500 }
    );
  }
}
