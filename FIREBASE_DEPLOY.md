# Firebase Hosting Setup

## 1. Link your Firebase project

Replace `YOUR_FIREBASE_PROJECT_ID` in `.firebaserc` with your actual Firebase project ID (from Firebase Console).

Or run:
```bash
firebase use your-project-id
```

## 2. Important: This is a Next.js app with API routes

**Firebase Hosting** (traditional) only serves **static files**. Your app has:
- API routes (`/api/*`)
- Server-side rendering
- Dynamic routes

So **Firebase Hosting with the `out` folder will NOT work** for this app.

## 3. Recommended: Deploy to Vercel

For Next.js with API routes, use **Vercel**:
1. Push code to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add env vars (Firebase, Supabase, etc.)
4. Deploy

## 4. Alternative: Firebase App Hosting

Firebase has **App Hosting** for Next.js (beta). To use it:
```bash
firebase init apphosting
```
Follow the prompts to connect your GitHub repo.
