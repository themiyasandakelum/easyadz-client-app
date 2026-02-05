import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { PROFESSION_CATEGORIES } from "@/lib/profession";
import { RELIGION_OPTIONS } from "@/lib/profile-options";
import { sql } from "@/lib/db";
const VALID_RELIGIONS = [...RELIGION_OPTIONS];
const VALID_PROFESSIONS = [...PROFESSION_CATEGORIES];

/** GET: Matrimonial search (profiles). Auth required. Query: age_min?, age_max?, religion?, profession?, limit? */
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

  let excludeUserId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    excludeUserId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const ageMinParam = searchParams.get("age_min");
  const ageMaxParam = searchParams.get("age_max");
  const religion = searchParams.get("religion")?.trim() || null;
  const profession = searchParams.get("profession")?.trim() || null;
  const limitParam = searchParams.get("limit");
  const limit = Math.min(
    Math.max(1, parseInt(limitParam ?? "10", 10) || 10),
    100
  );

  const onlyVerified = searchParams.get("only_verified") === "true" || searchParams.get("only_verified") === "1";
  const ageMin = ageMinParam != null && ageMinParam !== "" ? parseInt(ageMinParam, 10) : null;
  const ageMax = ageMaxParam != null && ageMaxParam !== "" ? parseInt(ageMaxParam, 10) : null;
  if (ageMin != null && (isNaN(ageMin) || ageMin < 18 || ageMin > 120)) {
    return NextResponse.json(
      { error: "age_min must be between 18 and 120." },
      { status: 400 }
    );
  }
  if (ageMax != null && (isNaN(ageMax) || ageMax < 18 || ageMax > 120)) {
    return NextResponse.json(
      { error: "age_max must be between 18 and 120." },
      { status: 400 }
    );
  }
  if (religion != null && religion !== "" && !VALID_RELIGIONS.includes(religion)) {
    return NextResponse.json(
      { error: "Invalid religion." },
      { status: 400 }
    );
  }
  if (profession != null && profession !== "" && !VALID_PROFESSIONS.includes(profession)) {
    return NextResponse.json(
      { error: "Invalid profession." },
      { status: 400 }
    );
  }

  try {
    // Smart-match: show opposite gender
    let showGender: string | null = null;
    const profileRows = await sql`
      SELECT gender::text FROM profiles WHERE user_id = ${excludeUserId} LIMIT 1
    `;
    const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
    const myGender = (profile as { gender?: string })?.gender;
    if (myGender === "male") showGender = "female";
    else if (myGender === "female") showGender = "male";

    const rows = await sql`
      SELECT * FROM search_profiles(
        ${ageMin},
        ${ageMax},
        ${religion},
        ${profession},
        ${excludeUserId},
        ${showGender},
        ${limit},
        ${onlyVerified}
      )
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
    console.error("Search profiles error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 500 }
    );
  }
}
