import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** GET: Public config (pricing toggles, prices). No auth required. */
export async function GET() {
  if (!sql) {
    return NextResponse.json(
      { enable_ad_pricing: false, price_featured_ad: 0, price_verification_fee: 0 },
      { status: 200 }
    );
  }

  try {
    const rows = await sql`
      SELECT key, value_text, value_numeric, is_enabled
      FROM system_configs
      WHERE key IN ('enable_ad_pricing', 'price_featured_ad', 'price_verification_fee')
    `;
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    const config: Record<string, unknown> = {
      enable_ad_pricing: false,
      price_featured_ad: 0,
      price_verification_fee: 0,
    };
    for (const r of list) {
      const row = r as { key: string; value_numeric: number | null; is_enabled: boolean };
      if (row.key === "enable_ad_pricing") config.enable_ad_pricing = !!row.is_enabled;
      if (row.key === "price_featured_ad") config.price_featured_ad = Number(row.value_numeric ?? 0);
      if (row.key === "price_verification_fee") config.price_verification_fee = Number(row.value_numeric ?? 0);
    }
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { enable_ad_pricing: false, price_featured_ad: 0, price_verification_fee: 0 },
      { status: 200 }
    );
  }
}
