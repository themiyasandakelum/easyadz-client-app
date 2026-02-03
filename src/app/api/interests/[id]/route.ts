import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

const VALID_STATUSES = ["accepted", "rejected"] as const;

/** PATCH: Accept or decline an interest. Only the receiver can update. Auth required. */
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

  const { id: interestId } = await params;
  if (!interestId) {
    return NextResponse.json(
      { error: "Interest id required." },
      { status: 400 }
    );
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const status = body.status;
  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "status must be 'accepted' or 'rejected'." },
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
    const receiverId = (profile as { id: string }).id;

    const updated = await sql`
      UPDATE interests
      SET status = ${status}
      WHERE id = ${interestId} AND receiver_id = ${receiverId} AND status = 'pending'
      RETURNING id, sender_id, receiver_id, status
    `;
    const row = Array.isArray(updated) ? updated[0] : updated;
    if (!row) {
      return NextResponse.json(
        { error: "Interest not found, already responded, or access denied." },
        { status: 404 }
      );
    }

    // Optionally add "Interest Accepted" notification for the sender when accepted
    if (status === "accepted") {
      const receiverNameRows = await sql`
        SELECT name FROM profiles WHERE id = ${receiverId} LIMIT 1
      `;
      const receiverName = (Array.isArray(receiverNameRows) ? receiverNameRows[0] : receiverNameRows)?.name ?? "Someone";
      await sql`
        INSERT INTO notifications (user_id, sender_id, title, body)
        VALUES (${(row as { sender_id: string }).sender_id}, ${receiverId}, 'Interest accepted', ${`${receiverName} accepted your interest! Start chatting.`})
      `;
    }

    return NextResponse.json({ id: row.id, status });
  } catch (err) {
    console.error("Update interest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update interest." },
      { status: 500 }
    );
  }
}
