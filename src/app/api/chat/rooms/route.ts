import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: List chat rooms for current user (as buyer or seller). Auth required. */
export async function GET(request: NextRequest) {
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

    const rows = await sql`
      SELECT r.id, r.listing_id, r.last_message, r.updated_at,
             l.title, l.price, l.category, l.images,
             CASE WHEN r.buyer_id = ${profileId} THEN p_seller.name ELSE p_buyer.name END as other_name,
             (SELECT COUNT(*)::int FROM messages m
              WHERE m.room_id = r.id AND m.sender_id != ${profileId} AND m.is_read = false) as unread_count
      FROM chat_rooms r
      JOIN listings l ON l.id = r.listing_id
      LEFT JOIN profiles p_seller ON p_seller.id = r.seller_id
      LEFT JOIN profiles p_buyer ON p_buyer.id = r.buyer_id
      WHERE r.buyer_id = ${profileId} OR r.seller_id = ${profileId}
      ORDER BY r.updated_at DESC
      LIMIT 50
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);

    const rooms = list.map((row) => {
      const r = row as {
        id: string;
        listing_id: string;
        last_message: string | null;
        updated_at: string;
        title: string;
        price: number | null;
        category: string;
        images: string[] | null;
        other_name: string | null;
        unread_count: number;
      };
      return {
        id: r.id,
        listingId: r.listing_id,
        listing: {
          title: r.title,
          price: r.price,
          category: r.category,
          imageUrl: Array.isArray(r.images) ? r.images[0] : null,
        },
        lastMessage: r.last_message,
        updatedAt: r.updated_at,
        otherPartyName: r.other_name ?? "User",
        unreadCount: r.unread_count ?? 0,
      };
    });

    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("Chat rooms list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list chats." },
      { status: 500 }
    );
  }
}
