import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: Full system config. Admin only. */
export async function GET(request: NextRequest) {
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

  try {
    const rows = await sql`
      SELECT key, value_text, value_numeric, is_enabled, description
      FROM system_configs
      ORDER BY key
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Admin config get error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch config." },
      { status: 500 }
    );
  }
}

/** PATCH: Update system config. Admin only. Body: { key: { is_enabled?, value_numeric?, value_text? } } */
export async function PATCH(request: NextRequest) {
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

  let body: Record<string, { is_enabled?: boolean; value_numeric?: number; value_text?: string }>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object." }, { status: 400 });
  }

  try {
    for (const [key, val] of Object.entries(body)) {
      if (!val || typeof val !== "object") continue;
      const updates: string[] = ["updated_at = now()"];
      const values: unknown[] = [];
      let idx = 1;
      if (typeof val.is_enabled === "boolean") {
        updates.push(`is_enabled = $${idx++}`);
        values.push(val.is_enabled);
      }
      if (val.value_numeric !== undefined) {
        updates.push(`value_numeric = $${idx++}`);
        values.push(val.value_numeric);
      }
      if (val.value_text !== undefined) {
        updates.push(`value_text = $${idx++}`);
        values.push(val.value_text);
      }
      if (updates.length > 1) {
        values.push(key);
        await sql.unsafe(
          `UPDATE system_configs SET ${updates.join(", ")} WHERE key = $${idx}`,
          values as (string | number | boolean)[]
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin config update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update config." },
      { status: 500 }
    );
  }
}
