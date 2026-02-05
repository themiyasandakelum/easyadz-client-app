# Supabase + Resend: Email Webhooks Setup

This guide connects Supabase Database Webhooks to the `send-email` Edge Function, which sends transactional emails via Resend.

## Overview

| Event       | Trigger                          | Email Content                                      |
|------------|-----------------------------------|----------------------------------------------------|
| **Welcome** | New row in `profiles` (with email) | "Welcome to EasyAdz! Start your journey..."        |
| **Verified** | `profiles.is_verified` changes to `TRUE` | "Congrats! Your profile is now verified."      |
| **New Message** | New row in `messages`           | "You have a new inquiry about your ad."            |

> **Note:** This app uses Firebase Auth. Welcome emails are triggered when a new profile is created (with email) during registration, not from `auth.users`.

---

## 1. Set Resend API Key (Supabase Secrets)

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

Get your API key from [Resend Dashboard](https://resend.com/api-keys).

---

## 2. Deploy the Edge Function

```bash
supabase functions deploy send-email
```

---

## 3. Configure Database Webhooks

Go to **Supabase Dashboard** → **Database** → **Webhooks** (or **Project Settings** → **Integrations** → **Webhooks**).

Create **3 webhooks** pointing to your Edge Function:

**Edge Function URL:**
```
https://<your-project-ref>.supabase.co/functions/v1/send-email
```

Replace `<your-project-ref>` with your Supabase project reference (e.g. `zalymblgioakdbvuqhkg`).

### Webhook 1: Welcome (profiles INSERT)

| Field   | Value                          |
|---------|--------------------------------|
| Name    | `email-welcome`                |
| Table   | `profiles`                     |
| Events  | `INSERT`                       |
| URL     | `https://<project-ref>.supabase.co/functions/v1/send-email` |
| Method  | `POST`                         |

### Webhook 2: Verified (profiles UPDATE)

| Field   | Value                          |
|---------|--------------------------------|
| Name    | `email-verified`                |
| Table   | `profiles`                     |
| Events  | `UPDATE`                       |
| URL     | `https://<project-ref>.supabase.co/functions/v1/send-email` |
| Method  | `POST`                         |

### Webhook 3: New Message (messages INSERT)

| Field   | Value                          |
|---------|--------------------------------|
| Name    | `email-new-message`             |
| Table   | `messages`                     |
| Events  | `INSERT`                       |
| URL     | `https://<project-ref>.supabase.co/functions/v1/send-email` |
| Method  | `POST`                         |

---

## 4. Verify Email Flow

- **profiles.email** is set when a user registers (via `/api/profile` POST with `email`).
- **profiles.is_verified** is set to `true` when an admin approves verification (via `approve_user_verification` RPC).
- **messages** are created when users send chat messages about listings.

---

## 5. Resend Domain

Ensure your Resend account has a verified domain (e.g. `easyadz.lk`) and the `from` address matches:

```
EasyAdz <notifications@easyadz.lk>
```

---

## Local Development

**Welcome emails work on localhost** with `RESEND_API_KEY` in `.env.local` — no Edge Function deployment needed.

### Setup for localhost

1. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_api_key_here
   ```

2. Restart your dev server (`npm run dev`).

3. **Test via API:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/test-email" -Method POST -ContentType "application/json" -Body '{"email":"your@email.com"}'
   ```

4. **Check Resend Dashboard:** [resend.com/emails](https://resend.com/emails) — sent emails appear here.

5. **Create a new profile** — welcome email is sent automatically when you register with an email.

> **Note:** Uses `onboarding@resend.dev` as sender for testing (no domain verification needed). For production, verify your domain and use `notifications@easyadz.lk`.

### Database Webhooks (optional, for production)

For Verified and New Message emails, configure webhooks in Supabase Dashboard. For local Supabase:

```
http://host.docker.internal:54321/functions/v1/send-email
```
