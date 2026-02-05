import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: List app settings. Admin only. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const rows = await sql`SELECT key, value, updated_at FROM app_settings ORDER BY key`;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    const settings = Object.fromEntries(
      list.map((r: Record<string, unknown>) => [(r as { key: string }).key, (r as { value: string }).value])
    );
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Admin settings get error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

/** PATCH: Update app settings. Admin only. Body: { key: value, ... } */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object." }, { status: 400 });
  }

  try {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string") continue;
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (${key}, ${value}, now())
        ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = now()
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin settings update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update settings." },
      { status: 500 }
    );
  }
}
