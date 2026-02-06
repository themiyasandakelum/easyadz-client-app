import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
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
      SELECT id, seller_id, category, title, price, location, description, attributes, images, is_featured, status, created_at
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
    const status = (row as { status?: string }).status;
    if (status !== "approved") {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      let canView = false;
      if (token) {
        try {
          const decoded = await verifyFirebaseToken(token);
          if (decoded) {
            const profileRows = await sql`SELECT id, role FROM profiles WHERE user_id = ${decoded.uid} LIMIT 1`;
            const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
            if (profile) {
              const profileId = (profile as { id: string }).id;
              const role = (profile as { role?: string }).role;
              canView = (row as { seller_id: string }).seller_id === profileId || role === "admin";
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (!canView) {
        return NextResponse.json(
          { error: "Listing not found." },
          { status: 404 }
        );
      }
    }
    const listing = row as {
      id: string;
      seller_id: string;
      category: string;
      title: string;
      price: number | null;
      location: string | null;
      description: string | null;
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

/** PATCH: Update a listing. Auth required; only the seller can update. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: "Authorization required." },
      { status: 401 }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    userId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  const { id: listingId } = await params;
  if (!listingId) {
    return NextResponse.json(
      { error: "Listing id required." },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  try {
    const profileRows = await sql`
      SELECT id FROM profiles WHERE user_id = ${userId} LIMIT 1
    `;
    const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 }
      );
    }
    const sellerId = (profile as { id: string }).id;

    const existingRows = await sql`
      SELECT id, seller_id FROM listings WHERE id = ${listingId} LIMIT 1
    `;
    const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;
    if (!existing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }
    if ((existing as { seller_id: string }).seller_id !== sellerId) {
      return NextResponse.json(
        { error: "You can only edit your own listings." },
        { status: 403 }
      );
    }

    const { category, title, price, description, location, attributes, images, is_featured } = body;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (typeof category === "string" && category.trim()) {
      updates.push(`category = $${idx++}`);
      values.push(category.trim());
    }
    if (typeof title === "string" && title.trim()) {
      updates.push(`title = $${idx++}`);
      values.push(title.trim());
    }
    if (price != null && typeof price === "number" && price >= 0) {
      updates.push(`price = $${idx++}`);
      values.push(price);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(typeof description === "string" ? description.trim() : null);
    }
    if (location !== undefined) {
      updates.push(`location = $${idx++}`);
      values.push(location && typeof location === "string" ? location.trim() || null : null);
    }
    if (attributes !== undefined) {
      updates.push(`attributes = $${idx++}::jsonb`);
      values.push(attributes && typeof attributes === "object" ? JSON.stringify(attributes) : null);
    }
    if (images !== undefined && Array.isArray(images)) {
      updates.push(`images = $${idx++}`);
      values.push(images as unknown);
    }
    if (typeof is_featured === "boolean") {
      updates.push(`is_featured = $${idx++}`);
      values.push(is_featured);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one field to update: category, title, price, description, location, attributes, images, is_featured." },
        { status: 400 }
      );
    }

    values.push(listingId);
    const rows = await sql.unsafe(
      `UPDATE listings SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, seller_id, category, title, price, location, description, attributes, images, is_featured, created_at`,
      values as (string | number | boolean | null)[]
    );
    const updated = Array.isArray(rows) ? rows[0] : rows;
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Listing update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update listing." },
      { status: 500 }
    );
  }
}
