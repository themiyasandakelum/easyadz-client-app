import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0] as App;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  if (!projectId || !clientEmail || !privateKey) return null;
  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string } | null> {
  const app = getAdminApp();
  if (!app) return null;
  const decoded = await getAuth(app).verifyIdToken(idToken);
  return { uid: decoded.uid };
}
