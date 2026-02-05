import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sql } from "@/lib/db";
const LISTINGS_BUCKET = "listings";
const MAX_FILES = 6;

/** POST: Upload listing images. Auth required; listing must belong to current user. Multipart: files under "images" or "image_0","image_1",... Saves to /listings/{id}/img_1.jpg and updates listing.images. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase Storage not configured." },
      { status: 503 }
    );
  }
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const { id: listingId } = await params;
  if (!listingId) {
    return NextResponse.json(
      { error: "Listing id required." },
      { status: 400 }
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 }
    );
  }

  const files: File[] = [];
  const multi = formData.getAll("images");
  if (multi.length > 0) {
    multi.forEach((f) => {
      if (f instanceof File) files.push(f);
    });
  } else {
    for (let i = 0; i < MAX_FILES; i++) {
      const f = formData.get(`image_${i}`);
      if (f instanceof File) files.push(f);
    }
  }
  const toUpload = files.slice(0, MAX_FILES);
  let existingUrls: string[] = [];
  const existingParam = formData.get("existing_urls");
  if (existingParam && typeof existingParam === "string") {
    try {
      const parsed = JSON.parse(existingParam);
      existingUrls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
    } catch {
      /* ignore */
    }
  }
  if (toUpload.length === 0 && existingUrls.length === 0) {
    return NextResponse.json(
      { error: "No image files sent. Use field 'images' or 'image_0', 'image_1', ... Or provide existing_urls for edit." },
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
    const sellerId = profile.id;

    const listingRows = await sql`
      SELECT id, seller_id FROM listings WHERE id = ${listingId} LIMIT 1
    `;
    const listing = Array.isArray(listingRows) ? listingRows[0] : listingRows;
    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }
    if ((listing as { seller_id: string }).seller_id !== sellerId) {
      return NextResponse.json(
        { error: "You can only upload images to your own listing." },
        { status: 403 }
      );
    }

    const newUrls: string[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const path = `${listingId}/img_${i + 1}.${safeExt}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(LISTINGS_BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (uploadError) {
        console.error("Listing image upload error:", uploadError);
        return NextResponse.json(
          { error: uploadError.message || "Upload failed." },
          { status: 500 }
        );
      }
      const { data: urlData } = supabase.storage.from(LISTINGS_BUCKET).getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    const urls = [...existingUrls, ...newUrls];
    await sql`
      UPDATE listings SET images = ${urls}
      WHERE id = ${listingId}
    `;

    return NextResponse.json({ images: urls });
  } catch (err) {
    console.error("Listing images upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
