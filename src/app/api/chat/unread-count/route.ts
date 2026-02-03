import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: Unread message count for the current user. Auth required. */
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
      return NextResponse.json({ unread: 0 });
    }
    const profileId = (profile as { id: string }).id;

    const countRows = await sql`
      SELECT COUNT(*)::int as unread
      FROM messages m
      JOIN chat_rooms r ON r.id = m.room_id
      WHERE (r.buyer_id = ${profileId} OR r.seller_id = ${profileId})
        AND m.sender_id != ${profileId}
        AND m.is_read = false
    `;
    const row = Array.isArray(countRows) ? countRows[0] : countRows;
    const unread = (row as { unread: number })?.unread ?? 0;
    return NextResponse.json({ unread });
  } catch (err) {
    console.error("Messages unread count error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch count." },
      { status: 500 }
    );
  }
}
