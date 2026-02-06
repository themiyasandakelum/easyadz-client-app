import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: Combined app_settings + system_configs in one request. Admin only. */
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
    const [settingsRows, configRows] = await Promise.all([
      sql`SELECT key, value FROM app_settings ORDER BY key`,
      sql`SELECT key, value_text, value_numeric, is_enabled, description FROM system_configs ORDER BY key`,
    ]);
    const settingsList = Array.isArray(settingsRows) ? settingsRows : [settingsRows].filter(Boolean);
    const configList = Array.isArray(configRows) ? configRows : [configRows].filter(Boolean);
    const settings = Object.fromEntries(
      settingsList.map((r: Record<string, unknown>) => [
        (r as { key: string }).key,
        (r as { value: string }).value,
      ])
    );
    return NextResponse.json({ settings, systemConfig: configList });
  } catch (err) {
    console.error("Admin settings all get error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch settings." },
      { status: 500 }
    );
  }
}
