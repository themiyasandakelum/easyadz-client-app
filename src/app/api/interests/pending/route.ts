import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: Pending interests received by current user, with sender profile. Auth required. */
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
      return NextResponse.json([]);
    }
    const receiverId = (profile as { id: string }).id;

    const rows = await sql`
      SELECT i.id, i.sender_id, i.receiver_id, i.status, i.created_at,
             p.name as sender_name, p.avatar_url as sender_avatar_url,
             p.profession::text as sender_profession, p.location as sender_location
      FROM interests i
      JOIN profiles p ON p.id = i.sender_id
      WHERE i.receiver_id = ${receiverId} AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Pending interests error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch pending requests." },
      { status: 500 }
    );
  }
}
