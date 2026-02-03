import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: Fetch chat room with listing summary. Auth required; user must be buyer or seller. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
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

  const { roomId } = await params;
  if (!roomId) {
    return NextResponse.json(
      { error: "Room ID required." },
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
    const profileId = (profile as { id: string }).id;

    const roomRows = await sql`
      SELECT r.id, r.listing_id, r.buyer_id, r.seller_id, r.last_message, r.updated_at,
             l.title, l.price, l.category, l.images
      FROM chat_rooms r
      JOIN listings l ON l.id = r.listing_id
      WHERE r.id = ${roomId}
      LIMIT 1
    `;
    const room = Array.isArray(roomRows) ? roomRows[0] : roomRows;
    if (!room) {
      return NextResponse.json(
        { error: "Chat room not found." },
        { status: 404 }
      );
    }

    const r = room as {
      id: string;
      listing_id: string;
      buyer_id: string;
      seller_id: string;
      last_message: string | null;
      updated_at: string;
      title: string;
      price: number | null;
      category: string;
      images: string[] | null;
    };

    if (r.buyer_id !== profileId && r.seller_id !== profileId) {
      return NextResponse.json(
        { error: "You do not have access to this chat." },
        { status: 403 }
      );
    }

    const otherProfileId = r.buyer_id === profileId ? r.seller_id : r.buyer_id;
    const otherProfileRows = await sql`
      SELECT name FROM profiles WHERE id = ${otherProfileId} LIMIT 1
    `;
    const otherProfile = Array.isArray(otherProfileRows) ? otherProfileRows[0] : otherProfileRows;
    const otherName = otherProfile ? (otherProfile as { name: string }).name : "Seller";

    return NextResponse.json({
      id: r.id,
      listingId: r.listing_id,
      listing: {
        title: r.title,
        price: r.price,
        category: r.category,
        imageUrl: Array.isArray(r.images) ? r.images[0] : null,
      },
      otherPartyName: otherName,
      lastMessage: r.last_message,
      updatedAt: r.updated_at,
      isBuyer: r.buyer_id === profileId,
    });
  } catch (err) {
    console.error("Chat room fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch chat." },
      { status: 500 }
    );
  }
}
