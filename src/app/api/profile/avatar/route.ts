import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const AVATAR_BUCKET = "avatars"; // Create in Supabase Dashboard > Storage > New bucket, set public if you want public URLs
const MAX_SIZE_BYTES = 500 * 1024; // 500KB

/** POST: Upload avatar. Body: multipart/form-data with file field "avatar". Returns { avatar_url }. */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase Storage not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 }
    );
  }

  const file = formData.get("avatar");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file. Send form field 'avatar'." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_SIZE_BYTES / 1024}KB. Compress before upload.` },
      { status: 400 }
    );
  }

  const path = `profiles/${userId}/avatar.jpg`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Upload failed." },
        { status: 500 }
      );
    }
    const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return NextResponse.json({ avatar_url: urlData.publicUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
