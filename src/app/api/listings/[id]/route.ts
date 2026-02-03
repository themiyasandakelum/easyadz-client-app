import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** GET: Fetch a single listing by ID. No auth required. */
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
      SELECT id, seller_id, category, title, price, location, description, attributes, images, is_featured, created_at
      FROM listings
      WHERE id = ${listingId}
      LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }
    const listing = row as {
      id: string;
      seller_id: string;
      category: string;
      title: string;
      price: number | null;
      location: string | null;
      attributes: unknown;
      images: string[] | string | null;
      is_featured: boolean;
      created_at: string;
    };
    let images: string[] = [];
    if (listing.images) {
      if (Array.isArray(listing.images)) {
        images = listing.images;
      } else if (typeof listing.images === "string") {
        try {
          const parsed = JSON.parse(listing.images);
          images = Array.isArray(parsed) ? parsed : [];
        } catch {
          images = [];
        }
      }
    }
    return NextResponse.json({
      ...listing,
      images,
    });
  } catch (err) {
    console.error("Listing fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}
