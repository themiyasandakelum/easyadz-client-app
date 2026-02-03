import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** POST: Find or create chat room for listing. Returns { roomId, listing }.
 * For matrimonial category: requires interest status = 'accepted' before creating. */
export async function POST(request: NextRequest) {
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

  let body: { listingId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send { listingId: string }." },
      { status: 400 }
    );
  }

  const { listingId } = body;
  if (!listingId?.trim()) {
    return NextResponse.json(
      { error: "listingId is required." },
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
        { error: "Profile not found. Complete your profile first." },
        { status: 404 }
      );
    }
    const buyerId = (profile as { id: string }).id;

    const listingRows = await sql`
      SELECT id, seller_id, category, title, price
      FROM listings
      WHERE id = ${listingId}
      LIMIT 1
    `;
    const listing = Array.isArray(listingRows) ? listingRows[0] : listingRows;
    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    const sellerId = (listing as { seller_id: string }).seller_id;
    const category = (listing as { category: string }).category;

    if (buyerId === sellerId) {
      return NextResponse.json(
        { error: "You cannot message yourself." },
        { status: 400 }
      );
    }

    if (category === "matrimonial") {
      const interestRows = await sql`
        SELECT status FROM interests
        WHERE sender_id = ${buyerId} AND receiver_id = ${sellerId}
        LIMIT 1
      `;
      const interest = Array.isArray(interestRows) ? interestRows[0] : interestRows;
      const status = interest ? (interest as { status: string }).status : null;
      if (status !== "accepted") {
        return NextResponse.json(
          {
            error: "Your interest must be accepted before you can message.",
            requiresInterest: true,
          },
          { status: 403 }
        );
      }
    }

    const existingRows = await sql`
      SELECT id FROM chat_rooms
      WHERE listing_id = ${listingId}
        AND buyer_id = ${buyerId}
        AND seller_id = ${sellerId}
      LIMIT 1
    `;
    const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;

    if (existing) {
      const roomId = (existing as { id: string }).id;
      return NextResponse.json({
        roomId,
        listing: {
          id: (listing as { id: string }).id,
          title: (listing as { title: string }).title,
          price: (listing as { price: number | null }).price,
          category,
        },
      });
    }

    const insertRows = await sql`
      INSERT INTO chat_rooms (listing_id, buyer_id, seller_id)
      VALUES (${listingId}, ${buyerId}, ${sellerId})
      RETURNING id
    `;
    const inserted = Array.isArray(insertRows) ? insertRows[0] : insertRows;
    const roomId = (inserted as { id: string }).id;

    return NextResponse.json(
      {
        roomId,
        listing: {
          id: (listing as { id: string }).id,
          title: (listing as { title: string }).title,
          price: (listing as { price: number | null }).price,
          category,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Chat initiate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initiate chat." },
      { status: 500 }
    );
  }
}
