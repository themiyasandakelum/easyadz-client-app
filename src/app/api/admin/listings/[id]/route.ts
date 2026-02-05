import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: Fetch single listing for admin. Admin only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Listing ID required." },
      { status: 400 }
    );
  }

  try {
    const rows = await sql`
      SELECT l.id, l.seller_id, l.category, l.title, l.price, l.location, l.description, l.attributes, l.images, l.status, l.created_at,
        p.name as seller_name
      FROM listings l
      JOIN profiles p ON p.id = l.seller_id
      WHERE l.id = ${id}::uuid
      LIMIT 1
    `;
    const item = Array.isArray(rows) ? rows[0] : rows;
    if (!item) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err) {
    console.error("Admin listing get error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch." },
      { status: 500 }
    );
  }
}

/** PATCH: Approve or reject a listing. Admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Listing ID required." },
      { status: 400 }
    );
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action?.toLowerCase();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  try {
    const rows = await sql`
      UPDATE listings
      SET status = ${newStatus}
      WHERE id = ${id}::uuid
      RETURNING id, status, title
    `;
    const updated = Array.isArray(rows) ? rows[0] : rows;
    if (!updated) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json({
      id,
      status: newStatus,
      message: action === "approve" ? "Listing approved." : "Listing rejected.",
    });
  } catch (err) {
    console.error("Admin listing update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update listing." },
      { status: 500 }
    );
  }
}
