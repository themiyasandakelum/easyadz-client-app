import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: Count pending interests received by current user. Auth required. */
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
      { error: "Missing or invalid authorization header." },
      { status: 401 }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Firebase Admin not configured or token invalid." },
        { status: 501 }
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
      return NextResponse.json({ pending_received: 0 });
    }
    const profileId = (profile as { id: string }).id;
    const countRows = await sql`
      SELECT COUNT(*)::int as count FROM interests
      WHERE receiver_id = ${profileId} AND status = 'pending'
    `;
    const countRow = Array.isArray(countRows) ? countRows[0] : countRows;
    const pendingReceived = (countRow as { count: number })?.count ?? 0;
    return NextResponse.json({ pending_received: pendingReceived });
  } catch (err) {
    console.error("Interests count error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}

/** POST: Send interest to a profile. Body: { receiver_profile_id: string (uuid) }. Inserts into interests; trigger push to receiver via Firebase later. */
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
      { error: "Missing or invalid authorization header." },
      { status: 401 }
    );
  }

  let senderUserId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Firebase Admin not configured or token invalid." },
        { status: 501 }
      );
    }
    senderUserId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  let body: { receiver_profile_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const receiverProfileId = body.receiver_profile_id;
  if (!receiverProfileId || typeof receiverProfileId !== "string") {
    return NextResponse.json(
      { error: "receiver_profile_id is required." },
      { status: 400 }
    );
  }

  try {
    const senderRows = await sql`
      SELECT id FROM profiles WHERE user_id = ${senderUserId} LIMIT 1
    `;
    const senderProfile = Array.isArray(senderRows) ? senderRows[0] : senderRows;
    if (!senderProfile) {
      return NextResponse.json(
        { error: "Your profile not found. Complete profile first." },
        { status: 404 }
      );
    }
    const senderId = senderProfile.id;

    if (senderId === receiverProfileId) {
      return NextResponse.json(
        { error: "You cannot send interest to yourself." },
        { status: 400 }
      );
    }

    const receiverRows = await sql`
      SELECT id FROM profiles WHERE id = ${receiverProfileId} LIMIT 1
    `;
    const receiverProfile = Array.isArray(receiverRows) ? receiverRows[0] : receiverRows;
    if (!receiverProfile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 }
      );
    }

    const inserted = await sql`
      INSERT INTO interests (sender_id, receiver_id, status)
      VALUES (${senderId}, ${receiverProfileId}, 'pending')
      ON CONFLICT (sender_id, receiver_id) DO NOTHING
      RETURNING id, sender_id, receiver_id, status, created_at
    `;
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!row) {
      return NextResponse.json(
        { message: "Interest already sent.", already_sent: true },
        { status: 200 }
      );
    }

    // Add notification for the receiver
    const senderNameRows = await sql`
      SELECT name FROM profiles WHERE id = ${senderId} LIMIT 1
    `;
    const senderName = (Array.isArray(senderNameRows) ? senderNameRows[0] : senderNameRows)?.name ?? "Someone";
    await sql`
      INSERT INTO notifications (user_id, sender_id, title, body)
      VALUES (${receiverProfileId}, ${senderId}, 'New interest', ${`${senderName} sent you an interest.`})
    `;

    return NextResponse.json(
      { id: row.id, status: row.status, message: "Interest sent." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Send interest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}
