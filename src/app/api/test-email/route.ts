import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/send-email";

/**
 * Test endpoint to verify email delivery.
 * POST /api/test-email with body: { "email": "your@email.com" }
 * Uses RESEND_API_KEY from .env.local - no Edge Function needed.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const secret = process.env.TEST_EMAIL_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");
  if (!isDev && secret && providedSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON. Send { "email": "your@email.com" }' },
      { status: 400 }
    );
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: 'Missing email. Send { "email": "your@email.com" }' },
      { status: 400 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY not set in .env.local. Add: RESEND_API_KEY=re_your_key",
      },
      { status: 503 }
    );
  }

  const result = await sendWelcomeEmail({ to: email });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Email sent. Check your inbox and resend.com/emails",
  });
}
