import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { PROFESSION_CATEGORIES } from "@/lib/profession";
import { POST_AD_CATEGORIES } from "@/lib/listings-types";
import { sql } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/send-email";

const VALID_INTEREST_CATEGORIES = POST_AD_CATEGORIES.map((c) => c.value);

/** GET: Check if the authenticated user has a profile in Supabase. Returns 200 + profile or 404. */
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
    const rows = await sql`
      SELECT p.id, p.user_id, p.name, p.dob, p.gender, p.lifestyle_preferences, p.phone, p.bio, p.location, p.avatar_url, p.photo_blurred, p.profession, p.job_title, p.degree, p.family_details, p.country, p.region_district, p.ethnicity, p.religion, p.civil_status, p.education_level, p.language, p.has_matrimonial_profile, p.interesting_categories, p.status, p.role, p.created_at, p.updated_at,
        CASE
          WHEN v.status = 'approved' THEN 'verified'
          WHEN v.status IN ('pending_ai', 'pending_admin') THEN 'pending'
          ELSE 'none'
        END AS verification_status
      FROM profiles p
      LEFT JOIN LATERAL (
        SELECT status FROM profile_verifications
        WHERE profile_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) v ON true
      WHERE p.user_id = ${userId}
      LIMIT 1
    `;
    const profile = Array.isArray(rows) ? rows[0] : rows;
    if (!profile) {
      return NextResponse.json({ error: "No profile found." }, { status: 404 });
    }
    // Ensure interesting_categories is always an array (jsonb can come back as string)
    const p = profile as Record<string, unknown>;
    if (!Array.isArray(p.interesting_categories)) {
      try {
        p.interesting_categories =
          typeof p.interesting_categories === "string"
            ? JSON.parse(p.interesting_categories as string)
            : [];
      } catch {
        p.interesting_categories = [];
      }
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Profile fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}

export interface ProfilePatchBody {
  name?: string;
  phone?: string | null;
  gender?: "male" | "female";
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  photo_blurred?: boolean;
  profession?: string | null;
  job_title?: string | null;
  degree?: string | null;
  family_details?: string | null;
  country?: string | null;
  region_district?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  civil_status?: string | null;
  education_level?: string | null;
  language?: string | null;
  has_matrimonial_profile?: boolean;
  interesting_categories?: string[] | null;
}

/** PATCH: Update profile fields (name, bio, location, avatar_url, photo_blurred). */
export async function PATCH(request: NextRequest) {
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

  let body: ProfilePatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { name, phone, gender, bio, location, avatar_url, photo_blurred, profession, job_title, degree, family_details, country, region_district, ethnicity, religion, civil_status, education_level, language, has_matrimonial_profile, interesting_categories } = body;
  const hasAny =
    name !== undefined ||
    phone !== undefined ||
    gender !== undefined ||
    bio !== undefined ||
    location !== undefined ||
    avatar_url !== undefined ||
    photo_blurred !== undefined ||
    profession !== undefined ||
    job_title !== undefined ||
    degree !== undefined ||
    family_details !== undefined ||
    country !== undefined ||
    region_district !== undefined ||
    ethnicity !== undefined ||
    religion !== undefined ||
    civil_status !== undefined ||
    education_level !== undefined ||
    language !== undefined ||
    has_matrimonial_profile !== undefined ||
    interesting_categories !== undefined;
  if (!hasAny) {
    return NextResponse.json(
      { error: "Provide at least one field to update." },
      { status: 400 }
    );
  }
  if (profession !== undefined && profession !== null && profession !== "" && !PROFESSION_CATEGORIES.includes(profession as (typeof PROFESSION_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: "Invalid profession category." },
      { status: 400 }
    );
  }
  if (job_title !== undefined && job_title !== null && typeof job_title === "string" && job_title.length > 100) {
    return NextResponse.json(
      { error: "Job title must be 100 characters or less." },
      { status: 400 }
    );
  }

  if (degree !== undefined && degree !== null && typeof degree === "string" && degree.length > 200) {
    return NextResponse.json(
      { error: "Degree must be 200 characters or less." },
      { status: 400 }
    );
  }
  if (interesting_categories !== undefined) {
    if (!Array.isArray(interesting_categories)) {
      return NextResponse.json(
        { error: "interesting_categories must be an array." },
        { status: 400 }
      );
    }
    const invalid = interesting_categories.filter((c) => typeof c !== "string" || !VALID_INTEREST_CATEGORIES.includes(c as (typeof VALID_INTEREST_CATEGORIES)[number]));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid categories. Allowed: ${VALID_INTEREST_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
  }

  try {
    const updates: string[] = ["updated_at = now()"];
    const values: unknown[] = [];
    let idx = 1;
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (gender !== undefined) {
      if (gender !== "male" && gender !== "female") {
        return NextResponse.json(
          { error: "gender must be 'male' or 'female'." },
          { status: 400 }
        );
      }
      updates.push(`gender = $${idx++}`);
      values.push(gender);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${idx++}`);
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push(`location = $${idx++}`);
      values.push(location);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(avatar_url);
    }
    if (photo_blurred !== undefined) {
      updates.push(`photo_blurred = $${idx++}`);
      values.push(photo_blurred);
    }
    if (profession !== undefined) {
      updates.push(`profession = $${idx++}`);
      values.push(profession);
    }
    if (job_title !== undefined) {
      updates.push(`job_title = $${idx++}`);
      values.push(job_title);
    }
    if (degree !== undefined) {
      updates.push(`degree = $${idx++}`);
      values.push(degree);
    }
    if (family_details !== undefined) {
      updates.push(`family_details = $${idx++}`);
      values.push(family_details);
    }
    if (country !== undefined) {
      updates.push(`country = $${idx++}`);
      values.push(country);
    }
    if (region_district !== undefined) {
      updates.push(`region_district = $${idx++}`);
      values.push(region_district);
    }
    if (ethnicity !== undefined) {
      updates.push(`ethnicity = $${idx++}`);
      values.push(ethnicity);
    }
    if (religion !== undefined) {
      updates.push(`religion = $${idx++}`);
      values.push(religion);
    }
    if (civil_status !== undefined) {
      updates.push(`civil_status = $${idx++}`);
      values.push(civil_status);
    }
    if (education_level !== undefined) {
      updates.push(`education_level = $${idx++}`);
      values.push(education_level);
    }
    if (language !== undefined) {
      updates.push(`language = $${idx++}`);
      values.push(language);
    }
    if (has_matrimonial_profile !== undefined) {
      updates.push(`has_matrimonial_profile = $${idx++}`);
      values.push(has_matrimonial_profile);
    }
    if (interesting_categories !== undefined) {
      updates.push(`interesting_categories = $${idx++}::jsonb`);
      values.push(JSON.stringify(interesting_categories));
    }
    values.push(userId);
    const rows = await sql.unsafe(
      `UPDATE profiles SET ${updates.join(", ")} WHERE user_id = $${idx} RETURNING id, user_id, name, dob, gender, lifestyle_preferences, phone, bio, location, avatar_url, photo_blurred, profession, job_title, degree, family_details, country, region_district, ethnicity, religion, civil_status, education_level, language, has_matrimonial_profile, interesting_categories, created_at, updated_at`,
      values as (string | number | boolean | null)[]
    );
    const profile = Array.isArray(rows) ? rows[0] : rows;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Profile patch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}

export interface ProfileBody {
  user_id: string;
  name: string;
  dob: string;
  gender?: "male" | "female";
  lifestyle_preferences: string[];
  phone?: string;
  email?: string;
}

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

  let userIdFromToken: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Firebase Admin not configured or token invalid." },
        { status: 501 }
      );
    }
    userIdFromToken = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  let body: ProfileBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { user_id, name, dob, gender, lifestyle_preferences, phone, email } = body;
  if (!user_id || !name || !dob || !Array.isArray(lifestyle_preferences)) {
    return NextResponse.json(
      { error: "user_id, name, dob, and lifestyle_preferences are required." },
      { status: 400 }
    );
  }
  const validGender = gender === "male" || gender === "female" ? gender : "male";
  if (user_id !== userIdFromToken) {
    return NextResponse.json(
      { error: "user_id does not match authenticated user." },
      { status: 403 }
    );
  }

  try {
    const rows = await sql`
      SELECT * FROM insert_profile(
        ${user_id},
        ${name},
        ${dob}::date,
        ${JSON.stringify(lifestyle_preferences)}::jsonb,
        ${validGender}::gender_type,
        ${email?.trim() || null}
      )
    `;
    const profile = Array.isArray(rows) ? rows[0] : rows;

    // Send welcome email: direct Resend (when RESEND_API_KEY in .env.local) or Edge Function
    const recipientEmail = email?.trim();
    if (recipientEmail) {
      if (process.env.RESEND_API_KEY) {
        sendWelcomeEmail({ to: recipientEmail }).then((r) => {
          if (!r.ok) console.error("Welcome email failed:", r.error);
        });
      } else {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
          fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              type: "INSERT",
              table: "profiles",
              schema: "public",
              record: { email: recipientEmail },
              old_record: null,
            }),
          }).catch((err) => console.error("Welcome email trigger failed:", err));
        }
      }
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("Profile insert error:", err);
    const message = err instanceof Error ? err.message : "Database error.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
