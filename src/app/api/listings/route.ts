import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { LISTING_CATEGORIES } from "@/lib/listings-types";
import { sql } from "@/lib/db";

const VALID_CATEGORIES = LISTING_CATEGORIES.map((c) => c.value);

/** GET: List listings. Query: category?, location?, featured?, limit?, offset?, mine? (auth required). */
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const categoriesParam = searchParams.get("categories");
  const location = searchParams.get("location");
  const featured = searchParams.get("featured");
  const mine = searchParams.get("mine") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  let sellerId: string | null = null;
  if (mine) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Authorization required for mine=true." }, { status: 401 });
    }
    try {
      const { verifyFirebaseToken } = await import("@/lib/firebase-admin");
      const decoded = await verifyFirebaseToken(token);
      if (!decoded) return NextResponse.json({ error: "Invalid token." }, { status: 401 });
      const profileRows = await sql`SELECT id FROM profiles WHERE user_id = ${decoded.uid} LIMIT 1`;
      const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
      if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      sellerId = (profile as { id: string }).id;
    } catch {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }
  }

  const categoriesList =
    categoriesParam?.trim()
      ? categoriesParam.split(",").map((c) => c.trim()).filter((c) => VALID_CATEGORIES.includes(c))
      : [];

  try {
    const rows = await sql`
      SELECT id, seller_id, category, title, price, location, description, attributes, images, is_featured, created_at
      FROM listings
      WHERE 1=1
      ${sellerId ? sql`AND seller_id = ${sellerId}` : sql``}
      ${category && VALID_CATEGORIES.includes(category) ? sql`AND category = ${category}` : sql``}
      ${categoriesList.length > 0 ? sql`AND category = ANY(${categoriesList})` : sql``}
      ${location?.trim() ? sql`AND location ILIKE ${"%" + location.trim() + "%"}` : sql``}
      ${featured === "true" ? sql`AND is_featured = true` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return NextResponse.json(list);
  } catch (err) {
    console.error("List listings error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}

export interface CreateListingBody {
  category: string;
  title: string;
  price: number;
  description: string;
  location?: string | null;
  attributes?: Record<string, unknown> | null;
  images?: string[] | null;
  is_featured?: boolean;
}

/** POST: Create a listing. Auth required; seller_id = current user's profile id. */
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

  let body: CreateListingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { category, title, price, description, location, attributes, images, is_featured } = body;
  if (!category || !title?.trim()) {
    return NextResponse.json(
      { error: "Category and title are required." },
      { status: 400 }
    );
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }
  if (price == null || typeof price !== "number" || price < 0) {
    return NextResponse.json(
      { error: "Price is required and must be 0 or greater." },
      { status: 400 }
    );
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "Description is required." },
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
        { error: "Profile not found. Complete your profile first." },
        { status: 404 }
      );
    }
    const sellerId = profile.id;

    const rows = await sql`
      INSERT INTO listings (seller_id, category, title, price, description, location, attributes, images, is_featured)
      VALUES (
        ${sellerId},
        ${category},
        ${title.trim()},
        ${price},
        ${description.trim()},
        ${location?.trim() ?? null},
        ${attributes ? JSON.stringify(attributes) : null},
        ${images?.length ? images : []},
        ${is_featured ?? false}
      )
      RETURNING id, seller_id, category, title, price, description, location, attributes, images, is_featured, created_at
    `;
    const listing = Array.isArray(rows) ? rows[0] : rows;
    return NextResponse.json(listing, { status: 201 });
  } catch (err) {
    console.error("Create listing error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error." },
      { status: 500 }
    );
  }
}
