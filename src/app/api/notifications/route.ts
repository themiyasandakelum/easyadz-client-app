import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: List notifications for the current user. Auth required. */
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
    const profileId = (profile as { id: string }).id;

    const rows = await sql`
      SELECT n.id, n.sender_id, n.title, n.body, n.is_read, n.created_at,
             COALESCE(n.notification_type, 'interest') as notification_type,
             n.link,
             p.name as sender_name, p.avatar_url as sender_avatar_url
      FROM notifications n
      LEFT JOIN profiles p ON p.id = n.sender_id
      WHERE n.user_id = ${profileId}
      ORDER BY n.created_at DESC
      LIMIT 100
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Notifications fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}
