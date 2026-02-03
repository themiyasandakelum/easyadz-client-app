/**
 * Shared PostgreSQL client. Prefer DATABASE_URL_POOLER (Supabase port 6543) to avoid ETIMEDOUT.
 * IPv4-first DNS helps when direct connection times out on IPv6.
 */
import postgres from "postgres";

// Prefer IPv4 to avoid ETIMEDOUT on networks with broken IPv6
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dns = require("dns");
  if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const connectionString =
  process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;

const sql = connectionString
  ? postgres(connectionString, {
      max: 1,
      connect_timeout: 15,
      prepare: false,
    })
  : null;

export { sql };
