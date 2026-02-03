import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** GET: List profiles that have opted into matrimonial (for Recommended Matches). Auth required. Excludes current user. */
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

  let currentUserId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    currentUserId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 20);

  try {
    const rows = await sql`
      SELECT p.id, p.name, p.dob, p.profession, p.location, p.avatar_url, p.photo_blurred
      FROM profiles p
      WHERE p.has_matrimonial_profile = true
        AND p.user_id != ${currentUserId}
      ORDER BY p.updated_at DESC
      LIMIT ${limit}
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    const withAge = list.map((row: { dob?: string; [k: string]: unknown }) => {
      const dob = row.dob;
      const age =
        dob != null
          ? Math.floor(
              (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;
      const { dob: _d, ...rest } = row;
      return { ...rest, age };
    });
    return NextResponse.json(withAge);
  } catch (err) {
    console.error("List profiles error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}
