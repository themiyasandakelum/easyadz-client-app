import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, getFirebaseUserEmail } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";
import { sendNewMessageEmail } from "@/lib/send-email";

/** GET: List messages in room. Auth required; user must be participant. */
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

    const messageRows = await sql`
      SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at
      FROM messages m
      WHERE m.room_id = ${roomId}
      ORDER BY m.created_at ASC
    `;
    const list = Array.isArray(messageRows) ? messageRows : [messageRows].filter(Boolean);

    const messages = list.map((row) => {
      const m = row as { id: string; sender_id: string; content: string; is_read: boolean; created_at: string };
      return {
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        isRead: m.is_read,
        createdAt: m.created_at,
        isOwn: m.sender_id === profileId,
      };
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Messages fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch messages." },
      { status: 500 }
    );
  }
}

/** POST: Send a message. Auth required; user must be participant. */
export async function POST(
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

  let body: { content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send { content: string }." },
      { status: 400 }
    );
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json(
      { error: "Message content is required." },
      { status: 400 }
    );
  }

  if (content.length > 4000) {
    return NextResponse.json(
      { error: "Message too long." },
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
    const senderId = (profile as { id: string }).id;

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
    if (r.buyer_id !== senderId && r.seller_id !== senderId) {
      return NextResponse.json(
        { error: "You do not have access to this chat." },
        { status: 403 }
      );
    }

    const insertRows = await sql`
      INSERT INTO messages (room_id, sender_id, content)
      VALUES (${roomId}, ${senderId}, ${content})
      RETURNING id, sender_id, content, is_read, created_at
    `;
    const inserted = Array.isArray(insertRows) ? insertRows[0] : insertRows;
    const m = inserted as { id: string; sender_id: string; content: string; is_read: boolean; created_at: string };

    await sql`
      UPDATE chat_rooms
      SET last_message = ${content}, updated_at = now()
      WHERE id = ${roomId}
    `;

    // Send new message email to recipient (when RESEND_API_KEY is set)
    const recipientId = r.buyer_id === senderId ? r.seller_id : r.buyer_id;
    if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
      console.log("[chat] RESEND_API_KEY not set, skipping new message email");
    }
    if (process.env.RESEND_API_KEY) {
      const recipientRows = await sql`
        SELECT email, user_id FROM profiles WHERE id = ${recipientId} LIMIT 1
      `;
      const recipient = Array.isArray(recipientRows) ? recipientRows[0] : recipientRows;
      let recipientEmail = recipient ? (recipient as { email?: string; user_id?: string }).email : null;
      if (!recipientEmail && recipient) {
        const userId = (recipient as { user_id?: string }).user_id;
        if (userId) recipientEmail = await getFirebaseUserEmail(userId);
      }
      if (process.env.NODE_ENV === "development" && !recipientEmail) {
        console.log("[chat] Recipient has no email (profile or Firebase), skipping. recipientId:", recipientId);
      }
      if (recipientEmail) {
        if (process.env.NODE_ENV === "development") {
          console.log("[chat] Sending new message email to:", recipientEmail);
        }
        const preview = content.slice(0, 80) + (content.length > 80 ? "…" : "");
        sendNewMessageEmail({ to: recipientEmail, preview })
          .then((r) => {
            if (!r.ok) console.error("New message email failed:", r.error);
          })
          .catch((err) => console.error("New message email failed:", err));
      }
    }

    return NextResponse.json(
      {
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        isRead: m.is_read,
        createdAt: m.created_at,
        isOwn: true,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Send message error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send message." },
      { status: 500 }
    );
  }
}
