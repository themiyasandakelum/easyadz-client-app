import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sql } from "@/lib/db";

const VERIFICATION_BUCKET = "verifications";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image

/** GET: Current verification status for the authenticated user. */
export async function GET(request: NextRequest) {
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

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
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
    const verRows = await sql`
      SELECT id, status, created_at
      FROM profile_verifications
      WHERE profile_id = ${profileId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const ver = Array.isArray(verRows) ? verRows[0] : verRows;
    if (!ver) {
      return NextResponse.json({
        status: "none",
        verification_status: "none",
        message: "No verification submitted yet.",
      });
    }

    const v = ver as { status: string };
    const verification_status =
      v.status === "approved"
        ? "verified"
        : v.status === "pending_admin" || v.status === "pending_ai"
          ? "pending"
          : "none";

    return NextResponse.json({
      id: (ver as { id: string }).id,
      status: v.status,
      verification_status,
      created_at: (ver as { created_at: string }).created_at,
    });
  } catch (err) {
    console.error("Verification status fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}

/** POST: Upload ID photo + selfie, submit for manual admin review. */
export async function POST(request: NextRequest) {
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Supabase Storage not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 }
    );
  }

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 }
    );
  }

  const idFile = formData.get("id_image");
  const selfieFile = formData.get("selfie");
  if (!idFile || !(idFile instanceof File) || !selfieFile || !(selfieFile instanceof File)) {
    return NextResponse.json(
      { error: "Both 'id_image' and 'selfie' files are required." },
      { status: 400 }
    );
  }

  if (idFile.size > MAX_SIZE_BYTES || selfieFile.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `Each file must be under ${MAX_SIZE_BYTES / 1024 / 1024}MB.`,
      },
      { status: 400 }
    );
  }

  const idBuffer = Buffer.from(await idFile.arrayBuffer());
  const selfieBuffer = Buffer.from(await selfieFile.arrayBuffer());

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
    const timestamp = Date.now();
    const idPath = `profiles/${profileId}/id_${timestamp}.jpg`;
    const selfiePath = `profiles/${profileId}/selfie_${timestamp}.jpg`;

    const [idUpload, selfieUpload] = await Promise.all([
      supabase.storage.from(VERIFICATION_BUCKET).upload(idPath, idBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      }),
      supabase.storage.from(VERIFICATION_BUCKET).upload(selfiePath, selfieBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      }),
    ]);

    if (idUpload.error || selfieUpload.error) {
      console.error("Verification upload error:", idUpload.error, selfieUpload.error);
      return NextResponse.json(
        {
          error:
            idUpload.error?.message || selfieUpload.error?.message || "Upload failed.",
        },
        { status: 500 }
      );
    }

    const { data: idUrlData } = supabase.storage
      .from(VERIFICATION_BUCKET)
      .getPublicUrl(idPath);
    const { data: selfieUrlData } = supabase.storage
      .from(VERIFICATION_BUCKET)
      .getPublicUrl(selfiePath);

    const idImageUrl = idUrlData.publicUrl;
    const selfieUrl = selfieUrlData.publicUrl;

    await sql`
      INSERT INTO profile_verifications (
        profile_id, id_image_url, selfie_url, status
      )
      VALUES (
        ${profileId}::uuid,
        ${idImageUrl},
        ${selfieUrl},
        'pending_admin'
      )
    `;

    return NextResponse.json({
      success: true,
      status: "pending_admin",
      verification_status: "pending",
      message: "Verification submitted. An admin will review shortly.",
    });
  } catch (err) {
    console.error("Verification error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Verification failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
