# Email Notifications via Supabase + Resend

This setup sends transactional emails when important events occur. The Edge Function keeps your Resend API key secret.

## 1. Set Up Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (e.g. `easyadz.lk`) for sending
3. Create an API key
4. Add to Supabase Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
```

## 2. Deploy the Edge Function

```bash
supabase functions deploy send-email
```

## 3. Configure Database Webhooks

In [Supabase Dashboard](https://supabase.com/dashboard) → **Database** → **Webhooks**:

### Webhook 1: Welcome (new user)

| Field | Value |
|-------|-------|
| Name | Welcome email |
| Table | `auth.users` |
| Events | Insert |
| URL | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email` |
| HTTP Headers | `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` |

> **Note:** If you use Firebase Auth (not Supabase Auth), `auth.users` won't get new rows. Use **Webhook 1b** instead.

### Webhook 1b: Welcome (new profile – Firebase)

| Field | Value |
|-------|-------|
| Name | Welcome email (profiles) |
| Table | `public.profiles` |
| Events | Insert |
| URL | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email` |
| HTTP Headers | `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` |

### Webhook 2: Verified

| Field | Value |
|-------|-------|
| Name | Verification approved |
| Table | `public.profiles` |
| Events | Update |
| URL | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email` |
| HTTP Headers | `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` |

Sends when `is_verified` changes to `true`.

### Webhook 3: New Message

| Field | Value |
|-------|-------|
| Name | New message |
| Table | `public.messages` |
| Events | Insert |
| URL | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email` |
| HTTP Headers | `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` |

## 4. Email Requirements

- **Welcome:** `auth.users` has `email`; `profiles` needs `email` (set on registration)
- **Verified:** `profiles.email` must be set
- **New Message:** Recipient’s profile must have `email`

## 5. Local Testing

```bash
supabase functions serve send-email --env-file .env.local
```

Test with:

```bash
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"type":"INSERT","schema":"public","table":"profiles","record":{"email":"test@example.com"},"old_record":null}'
```
