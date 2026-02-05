// @ts-nocheck
// Supabase Edge Function: send-email (Deno runtime)
// Receives webhook payloads from Database Webhooks and sends emails via Resend.
// Events: Welcome (auth.users INSERT), Verified (profiles.is_verified → true), New Message (messages INSERT)

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM_EMAIL = "EasyAdz <notifications@easyadz.lk>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    let email: string | null = null;
    let subject = "";
    let html = "";

    // 1. Welcome: new row in auth.users (Supabase Auth) OR new profile (Firebase)
    if (payload.type === "INSERT" && payload.record) {
      const r = payload.record as { email?: string };
      if (payload.schema === "auth" && payload.table === "users") {
        email = r.email ?? null;
      } else if (payload.schema === "public" && payload.table === "profiles" && r.email) {
        email = r.email as string;
      }
      if (email) {
        subject = "Welcome to EasyAdz!";
        html = `
          <h2>Welcome to EasyAdz!</h2>
          <p>Start your journey to find your perfect match in Sri Lanka.</p>
          <p>Complete your profile and explore our matrimonial search.</p>
          <p>— The EasyAdz Team</p>
        `;
      }
    }

    // 2. Verified: profiles.is_verified changes to TRUE
    if (payload.schema === "public" && payload.table === "profiles" && payload.type === "UPDATE" && payload.record && payload.old_record) {
      const r = payload.record as { is_verified?: boolean; email?: string };
      const old = payload.old_record as { is_verified?: boolean };
      if (r.is_verified === true && old?.is_verified !== true) {
        email = (r.email as string) ?? null;
        subject = "Your profile is now verified!";
        html = `
          <h2>Congratulations!</h2>
          <p>Your profile has been verified. You now have a verified badge on EasyAdz.</p>
          <p>— The EasyAdz Team</p>
        `;
      }
    }

    // 3. New Message: new row in messages
    if (payload.schema === "public" && payload.table === "messages" && payload.type === "INSERT" && payload.record) {
      const r = payload.record as { room_id?: string; sender_id?: string; content?: string };
      if (r.room_id && r.sender_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const { data: room } = await supabase
          .from("chat_rooms")
          .select("buyer_id, seller_id")
          .eq("id", r.room_id)
          .single();
        if (room) {
          const recipientId = room.buyer_id === r.sender_id ? room.seller_id : room.buyer_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", recipientId)
            .single();
          if (profile?.email) {
            email = profile.email as string;
            const preview = (r.content as string)?.slice(0, 80) ?? "";
            subject = "You have a new message on EasyAdz";
            html = `
              <h2>New message</h2>
              <p>You have a new inquiry about your ad.</p>
              <p><em>${preview}${(r.content as string)?.length > 80 ? "…" : ""}</em></p>
              <p><a href="https://easyadz.lk/dashboard/messages">View in Messages</a></p>
              <p>— The EasyAdz Team</p>
            `;
          }
        }
      }
    }

    if (!email || !subject || !html) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "No email to send for this event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
