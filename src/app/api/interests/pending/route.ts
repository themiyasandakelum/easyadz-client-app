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
             p.profession::text as sender_profession, p.job_title as sender_job_title,
             p.location as sender_location, p.country as sender_country,
             p.region_district as sender_region_district, p.dob as sender_dob,
             p.ethnicity as sender_ethnicity, p.religion as sender_religion,
             p.education_level as sender_education_level, p.is_verified as sender_is_verified,
             CASE
               WHEN v.status = 'approved' THEN 'verified'
               WHEN v.status IN ('pending_ai', 'pending_admin') THEN 'pending'
               ELSE 'unverified'
             END AS sender_verification_status
      FROM interests i
      JOIN profiles p ON p.id = i.sender_id
      LEFT JOIN LATERAL (
        SELECT status FROM profile_verifications
        WHERE profile_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) v ON true
      WHERE i.receiver_id = ${receiverId} AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    const withAge = list.map((row: { sender_dob?: string; [k: string]: unknown }) => {
      const dob = row.sender_dob;
      const sender_age =
        dob != null
          ? Math.floor(
              (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;
      const { sender_dob: _d, ...rest } = row;
      return { ...rest, sender_age };
    });
    return NextResponse.json(withAge);
  } catch (err) {
    console.error("Pending interests error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch pending requests." },
      { status: 500 }
    );
  }
}
