/**
 * Verify Firebase token and ensure user has admin role.
 * Returns { profileId, userId } or null if not admin.
 */
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";

export async function requireAdmin(authHeader: string | null): Promise<
  | { profileId: string; userId: string }
  | { error: string; status: number }
> {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: "Authorization required.", status: 401 };
  }

  let decoded: { uid: string } | null;
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return { error: "Invalid or expired token.", status: 401 };
  }
  if (!decoded) {
    return { error: "Invalid or expired token.", status: 401 };
  }

  if (!sql) {
    return { error: "Database not configured.", status: 503 };
  }

  const rows = await sql`
    SELECT id, role FROM profiles WHERE user_id = ${decoded.uid} LIMIT 1
  `;
  const profile = Array.isArray(rows) ? rows[0] : rows;
  if (!profile) {
    return { error: "Profile not found.", status: 404 };
  }

  const role = (profile as { role: string }).role;
  if (role !== "admin") {
    return { error: "Admin access required.", status: 403 };
  }

  return {
    profileId: (profile as { id: string }).id,
    userId: decoded.uid,
  };
}
