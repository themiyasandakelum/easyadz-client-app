import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** PATCH: Mark all messages in room (from other party) as read. Auth required. */
export async function PATCH(
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
      SELECT buyer_id, seller_id FROM chat_rooms WHERE id = ${roomId} LIMIT 1
    `;
    const room = Array.isArray(roomRows) ? roomRows[0] : roomRows;
    if (!room) {
      return NextResponse.json(
        { error: "Chat room not found." },
        { status: 404 }
      );
    }

    const r = room as { buyer_id: string; seller_id: string };
    if (r.buyer_id !== profileId && r.seller_id !== profileId) {
      return NextResponse.json(
        { error: "You do not have access to this chat." },
        { status: 403 }
      );
    }

    await sql`
      UPDATE messages
      SET is_read = true
      WHERE room_id = ${roomId}
        AND sender_id != ${profileId}
        AND is_read = false
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mark as read." },
      { status: 500 }
    );
  }
}
