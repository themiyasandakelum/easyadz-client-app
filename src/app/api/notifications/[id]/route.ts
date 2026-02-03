import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** PATCH: Mark a notification as read. Auth required. */
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

  const { id: notificationId } = await params;
  const idNum = parseInt(notificationId, 10);
  if (isNaN(idNum) || idNum < 1) {
    return NextResponse.json(
      { error: "Invalid notification id." },
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

    const updated = await sql`
      UPDATE notifications
      SET is_read = true
      WHERE id = ${idNum} AND user_id = ${profileId}
      RETURNING id, is_read
    `;
    const row = Array.isArray(updated) ? updated[0] : updated;
    if (!row) {
      return NextResponse.json(
        { error: "Notification not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json({ id: row.id, is_read: true });
  } catch (err) {
    console.error("Mark notification read error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update notification." },
      { status: 500 }
    );
  }
}
