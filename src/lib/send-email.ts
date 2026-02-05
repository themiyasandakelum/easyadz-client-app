import { Resend } from "resend";

const FROM_EMAIL = "EasyAdz <onboarding@resend.dev>"; // Use resend.dev for testing; change to notifications@easyadz.lk when domain verified

export type WelcomeEmailParams = {
  to: string;
};

export type NewMessageEmailParams = {
  to: string;
  preview: string;
};

/**
 * Send welcome email. Uses Resend directly when RESEND_API_KEY is in env (localhost).
 */
export async function sendWelcomeEmail({ to }: WelcomeEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Welcome to EasyAdz!",
      html: `
        <h2>Welcome to EasyAdz!</h2>
        <p>Start your journey to find your perfect match in Sri Lanka.</p>
        <p>Complete your profile and explore our matrimonial search.</p>
        <p>— The EasyAdz Team</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send";
    console.error("sendWelcomeEmail error:", err);
    return { ok: false, error: msg };
  }
}

/**
 * Send new message notification email to the recipient.
 */
export async function sendNewMessageEmail({
  to,
  preview,
}: NewMessageEmailParams): Promise<{ ok: boolean; error?: string }> {
  
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "You have a new message on EasyAdz",
      html: `
        <h2>New message</h2>
        <p>You have a new inquiry about your ad.</p>
        <p><em>${preview}</em></p>
        <p><a href="https://easyadz.lk/dashboard/messages">View in Messages</a></p>
        <p>— The EasyAdz Team</p>
      `,
    });

    if (error) {
      console.error("Resend new message error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send";
    console.error("sendNewMessageEmail error:", err);
    return { ok: false, error: msg };
  }
}
