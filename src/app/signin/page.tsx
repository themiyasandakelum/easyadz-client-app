"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/auth";
import { POST_AD_CATEGORIES } from "@/lib/listings-types";
import { AuthTopBar } from "../components/AuthTopBar";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [assignMatrimonial, setAssignMatrimonial] = useState(false);
  const [interestingCategories, setInterestingCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingPreferencesRef = useRef(false);

  // When user signs in, check profile and redirect (skip if we're saving preferences from email form)
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthChecked(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecked(true);
        return;
      }
      if (pendingPreferencesRef.current) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          router.replace("/register");
          return;
        }
        if (res.ok) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        setAuthChecked(true);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    setIsLoading(true);
    try {
      const credential = await signInWithEmail(email.trim(), password);
      const user = credential?.user;
      if (!user) return;
      pendingPreferencesRef.current = true;
      const token = await user.getIdToken();
      const getRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (getRes.status === 404) {
        pendingPreferencesRef.current = false;
        router.replace("/register");
        return;
      }
      if (getRes.ok && (assignMatrimonial || interestingCategories.length > 0)) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            has_matrimonial_profile: assignMatrimonial,
            interesting_categories: interestingCategories,
          }),
        });
      }
      pendingPreferencesRef.current = false;
      router.replace("/dashboard");
      return;
    } catch (err: unknown) {
      pendingPreferencesRef.current = false;
      const message =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code === "auth/user-not-found"
            ? "No account with this email."
            : (err as { code: string }).code === "auth/wrong-password"
              ? "Wrong password."
              : (err as { message?: string }).message ?? "Sign-in failed."
          : "Sign-in failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will run and redirect
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Google sign-in failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
        <div className="text-primary-700 font-medium">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      <AuthTopBar />
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-0 px-2 sm:px-3 py-6 lg:py-8">
        <div className="w-full max-w-[1400px] flex flex-col lg:flex-row rounded-2xl border border-primary-100 bg-white shadow-xl overflow-hidden min-h-[520px] lg:min-h-[560px]">
        <div className="w-full lg:w-[560px] lg:min-w-[500px] shrink-0 p-8 sm:p-10 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            Sign in
          </h1>
          <p className="text-gray-600 mb-6">
            Use your account to continue. New? Create a profile instead.
          </p>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={hidePassword ? "password" : "text"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setHidePassword(!hidePassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={hidePassword ? "Show password" : "Hide password"}
                >
                  {hidePassword ? "👁" : "👁‍🗨"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Preferences: Assign Matrimonial + Interesting categories (same as Edit profile) */}
            <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">Preferences (optional)</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignMatrimonial}
                  onChange={(e) => setAssignMatrimonial(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Show my profile in Matrimonial</span>
              </label>
              <div>
                <p className="text-xs text-gray-600 mb-2">Interesting categories (ads for you)</p>
                <div className="flex flex-wrap gap-2">
                  {POST_AD_CATEGORIES.map((cat) => {
                    const checked = interestingCategories.includes(cat.value);
                    return (
                      <label
                        key={cat.value}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 cursor-pointer text-sm transition ${
                          checked ? "border-primary-500 bg-primary-100" : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setInterestingCategories((prev) =>
                              prev.includes(cat.value)
                                ? prev.filter((c) => c !== cat.value)
                                : [...prev, cat.value]
                            );
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{cat.icon} {cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary-600 py-3.5 text-white font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Signing in…" : "Sign in with email"}
            </button>
          </form>

          <div className="relative my-6">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </span>
            <span className="relative flex justify-center text-xs font-medium text-gray-500 bg-white px-2">
              Or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 bg-white py-3.5 px-4 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Create profile
            </Link>
          </p>

          <p className="mt-4 text-center">
            <Link
              href="/admin/signin"
              className="text-sm text-gray-500 hover:text-primary-600 transition"
            >
              Admin login
            </Link>
          </p>
        </div>
        <div className="w-full lg:flex-1 min-w-[360px] relative min-h-[320px] lg:min-h-[520px]">
          <img
            src="/signin-hero.png"
            alt="easyadz.lk - Your Advertising Partner"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>
        </div>
      </div>
    </main>
  );
}
