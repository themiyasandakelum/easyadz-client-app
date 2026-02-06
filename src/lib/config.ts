/** Public app config (pricing toggles, prices). Fetched from /api/config. */
export interface AppConfig {
  enable_ad_pricing: boolean;
  price_featured_ad: number;
  price_verification_fee: number;
}

const DEFAULT_CONFIG: AppConfig = {
  enable_ad_pricing: false,
  price_featured_ad: 0,
  price_verification_fee: 0,
};

let cachedConfig: AppConfig | null = null;
let cacheTime = 0;
const CACHE_MS = 60_000; // 1 minute

/** Fetch public config. Caches for 1 minute. */
export async function fetchAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_MS) {
    return cachedConfig;
  }
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return DEFAULT_CONFIG;
    const data = await res.json();
    cachedConfig = {
      enable_ad_pricing: !!data.enable_ad_pricing,
      price_featured_ad: Number(data.price_featured_ad ?? 0),
      price_verification_fee: Number(data.price_verification_fee ?? 0),
    };
    cacheTime = Date.now();
    return cachedConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Invalidate config cache (e.g. after admin changes). */
export function invalidateConfigCache() {
  cachedConfig = null;
}
