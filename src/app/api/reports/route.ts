import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** POST: Report an ad. Auth required. Body: { listingId, reason?, details? } */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  let decoded: { uid: string } | null;
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
  if (!decoded) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: { listingId: string; reason?: string; details?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const listingId = body.listingId?.trim();
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  try {
    const profileRows = await sql`
      SELECT id FROM profiles WHERE user_id = ${decoded.uid} LIMIT 1
    `;
    const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    const reporterId = (profile as { id: string }).id;

    const listingRows = await sql`SELECT id FROM listings WHERE id = ${listingId}::uuid LIMIT 1`;
    const listing = Array.isArray(listingRows) ? listingRows[0] : listingRows;
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    await sql`
      INSERT INTO reports (listing_id, reporter_id, reason, details)
      VALUES (${listingId}::uuid, ${reporterId}, ${body.reason ?? "Reported by user"}, ${body.details ?? ""})
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Report create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit report." },
      { status: 500 }
    );
  }
}
