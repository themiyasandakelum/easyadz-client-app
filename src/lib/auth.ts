"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export async function signUpWithEmail(data: SignUpData): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not available");
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );
  if (data.displayName && credential.user) {
    await updateProfile(credential.user, { displayName: data.displayName });
  }
  return credential;
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not available");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not available");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await firebaseSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
