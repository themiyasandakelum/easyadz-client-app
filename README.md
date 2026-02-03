# Matrimonial Next.js App

Next.js registration flow for the Matrimonial app: Firebase Auth signup + PostgreSQL profile insert via the `postgres` package.

## Features

- **Registration page**: Name, DOB, optional phone, and **Lifestyle Preferences** (chip selection).
- **Firebase Auth**: Email/password signup; ID token sent to the API for verification.
- **PostgreSQL**: Profile saved via the `insert_profile` function using the [postgres](https://github.com/porsager/postgres) package (works with Supabase or any Postgres).

## Setup

1. **Install dependencies**

   ```bash
   cd matrimonial-next && npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and fill in:

   - **Firebase (client)**: From [Firebase Console](https://console.firebase.google.com) → Project settings → Your apps.
   - **Firebase Admin**: Project settings → Service accounts → Generate new private key. Set `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY` (private key as a single line with `\n` for newlines).
   - **PostgreSQL**: Supabase → Settings → Database → Connection string (URI), or any `postgres://...` URL. Use this as `DATABASE_URL`.

3. **Database schema**

   Ensure your PostgreSQL database has the `profiles` table and `insert_profile` function. You can use the migration in the sibling Angular app:

   - `matrimonial-app/supabase/migrations/001_create_profiles.sql`

   Run that SQL in Supabase SQL Editor (or your Postgres client). The `insert_profile` function does not include `phone`; the registration form accepts phone but it is not persisted until you extend the function or add a direct INSERT.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), then go to **Create profile** → `/register`.

## Architecture (from your notes)

- **Auth**: Firebase Auth (email/password here; Mobile OTP can be added for Sri Lanka).
- **Database**: Supabase (managed PostgreSQL) or any Postgres; this app uses the `postgres` package to call `insert_profile`.
- **Matching**: When a user completes their profile, a Firebase Cloud Function can trigger a Python matching script; the script reads from PostgreSQL and can send FCM push notifications with top matches.
- **Media**: Firebase Storage for NIC photos and profile pictures (not implemented in this repo).

## Project structure

- `src/app/register/page.tsx` – Registration form (Name, DOB, Lifestyle chips).
- `src/app/api/profile/route.ts` – POST handler: verifies Firebase token, calls `insert_profile` via `postgres`.
- `src/lib/firebase.ts` – Client Firebase config.
- `src/lib/firebase-admin.ts` – Server Firebase Admin (token verification).
- `src/lib/auth.ts` – Client signup helper.
