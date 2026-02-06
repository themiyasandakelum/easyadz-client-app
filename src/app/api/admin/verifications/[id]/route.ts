import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";

/** GET: Fetch single verification by id. Admin only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Verification ID required." },
      { status: 400 }
    );
  }

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const rows = await sql`
      SELECT pv.id, pv.profile_id, pv.id_image_url, pv.selfie_url, pv.status, pv.admin_notes, pv.created_at,
        p.name, p.user_id
      FROM profile_verifications pv
      JOIN profiles p ON p.id = pv.profile_id
      WHERE pv.id = ${id}::uuid
      LIMIT 1
    `;
    const item = Array.isArray(rows) ? rows[0] : rows;
    if (!item) {
      return NextResponse.json({ error: "Verification not found." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err) {
    console.error("Admin verification get error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch." },
      { status: 500 }
    );
  }
}

/** PATCH: Approve, reject, or edit a verification. Admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Verification ID required." },
      { status: 400 }
    );
  }

  let body: { action?: string; admin_notes?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action?.toLowerCase();
  const adminNotes = body.admin_notes ?? undefined;
  const newStatus = body.status?.toLowerCase();

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const verRows = await sql`
      SELECT id, profile_id, status FROM profile_verifications
      WHERE id = ${id}::uuid
      LIMIT 1
    `;
    const ver = Array.isArray(verRows) ? verRows[0] : verRows;
    if (!ver) {
      return NextResponse.json(
        { error: "Verification not found." },
        { status: 404 }
      );
    }

    const currentStatus = (ver as { status: string }).status;
    const profileId = (ver as { profile_id: string }).profile_id;
    const SYSTEM_PROFILE_ID = "00000000-0000-0000-0000-000000000001";

    const createVerificationNotification = async (
      recipientProfileId: string,
      status: "approved" | "rejected",
      adminNotes: string | null
    ) => {
      const isApproved = status === "approved";
      const title = isApproved
        ? "Your profile is verified!"
        : "Verification request rejected";
      const body = isApproved
        ? "Congratulations! Your identity verification has been approved. You now have a verified badge."
        : adminNotes?.trim()
          ? `Your verification was rejected. ${adminNotes} Please upload your documents again and ensure your ID photo and selfie clearly match.`
          : "Your verification was rejected. The documents may not match or the images were unclear. Please upload your ID and selfie again, ensuring they clearly show the same person.";
      await sql!`
        INSERT INTO notifications (user_id, sender_id, title, body, notification_type, link)
        VALUES (${recipientProfileId}::uuid, ${SYSTEM_PROFILE_ID}::uuid, ${title}, ${body}, 'verification', '/dashboard/verification')
      `;
    };

    if (action === "approve" || action === "reject") {
      if (currentStatus !== "pending_admin") {
        return NextResponse.json(
          { error: "Only pending verifications can be approved or rejected." },
          { status: 400 }
        );
      }
      const newStatus = action === "approve" ? "approved" : "rejected";
      if (action === "approve") {
        await sql`SELECT approve_user_verification(${id}::uuid)`;
        if (adminNotes !== undefined) {
          await sql`
            UPDATE profile_verifications
            SET admin_notes = ${adminNotes}
            WHERE id = ${id}::uuid
          `;
        }
      } else {
        await sql`
          UPDATE profile_verifications
          SET status = ${newStatus}, admin_notes = ${adminNotes ?? null}
          WHERE id = ${id}::uuid
        `;
      }
      await createVerificationNotification(profileId, newStatus, adminNotes ?? null);
      return NextResponse.json({
        id,
        status: newStatus,
        profile_id: profileId,
        message: action === "approve" ? "Verification approved." : "Verification rejected.",
      });
    }

    if (newStatus === "approved" || newStatus === "rejected") {
      if (adminNotes !== undefined) {
        await sql`
          UPDATE profile_verifications
          SET status = ${newStatus}, admin_notes = ${adminNotes}
          WHERE id = ${id}::uuid
        `;
      } else {
        await sql`
          UPDATE profile_verifications
          SET status = ${newStatus}
          WHERE id = ${id}::uuid
        `;
      }
      await sql`
        UPDATE profiles
        SET is_verified = ${newStatus === "approved"}
        WHERE id = ${profileId}
      `;
      const verRows2 = await sql`
        SELECT admin_notes FROM profile_verifications WHERE id = ${id}::uuid LIMIT 1
      `;
      const ver2 = Array.isArray(verRows2) ? verRows2[0] : verRows2;
      const notes = ver2 ? (ver2 as { admin_notes: string | null }).admin_notes : null;
      await createVerificationNotification(profileId, newStatus, notes);
      return NextResponse.json({
        id,
        status: newStatus,
        profile_id: profileId,
        message: `Status updated to ${newStatus}.`,
      });
    }

    if (adminNotes !== undefined) {
      await sql`
        UPDATE profile_verifications
        SET admin_notes = ${adminNotes}
        WHERE id = ${id}::uuid
      `;
      return NextResponse.json({
        id,
        status: currentStatus,
        message: "Admin notes updated.",
      });
    }

    return NextResponse.json(
      { error: "Provide action (approve/reject), status (approved/rejected), or admin_notes to update." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Admin verification update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update verification." },
      { status: 500 }
    );
  }
}
