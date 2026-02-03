import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

/** Public view of a profile by id. Returns safe fields + match_score. Auth required for match score. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const { id: profileId } = await params;
  if (!profileId) {
    return NextResponse.json({ error: "Profile id required." }, { status: 400 });
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(profileId)) {
    return NextResponse.json(
      { error: "Invalid profile id. Profile not found." },
      { status: 404 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: "Authorization required to view profile." },
      { status: 401 }
    );
  }

  let viewerUserId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    viewerUserId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  try {
    const rows = await sql`
      SELECT id, name, dob, profession, job_title, degree, bio, location, family_details, lifestyle_preferences, avatar_url, photo_blurred, country, region_district, ethnicity, religion, civil_status, education_level, language, created_at
      FROM profiles
      WHERE id = ${profileId}
      LIMIT 1
    `;
    const profile = Array.isArray(rows) ? rows[0] : rows;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // Don't show own profile as "other user" or compute match for self
    const viewerProfileRows = await sql`
      SELECT id, profession, location, lifestyle_preferences
      FROM profiles
      WHERE user_id = ${viewerUserId}
      LIMIT 1
    `;
    const viewerProfile = Array.isArray(viewerProfileRows) ? viewerProfileRows[0] : viewerProfileRows;
    let matchScore: number = 75;
    if (viewerProfile && viewerProfile.id !== profileId) {
      // Simple compatibility: same profession +10, same location +5, lifestyle overlap
      if (viewerProfile.profession && profile.profession && viewerProfile.profession === profile.profession) {
        matchScore += 10;
      }
      if (viewerProfile.location && profile.location && viewerProfile.location === profile.location) {
        matchScore += 5;
      }
      const viewerLifestyle = Array.isArray(viewerProfile.lifestyle_preferences) ? viewerProfile.lifestyle_preferences : [];
      const otherLifestyle = Array.isArray(profile.lifestyle_preferences) ? profile.lifestyle_preferences : [];
      const overlap = viewerLifestyle.filter((x: string) => otherLifestyle.includes(x)).length;
      matchScore = Math.min(99, matchScore + overlap * 2);
    }

    const dob = profile.dob;
    const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    return NextResponse.json({
      ...profile,
      age,
      match_score: matchScore,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}
