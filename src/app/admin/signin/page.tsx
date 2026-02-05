"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          setAuthChecked(true);
          setError("No profile found. Create an account first.");
          return;
        }
        if (!res.ok) {
          setAuthChecked(true);
          return;
        }
        const profile = await res.json();
        if (profile?.role !== "admin") {
          setError("Admin access required. Your account is not an admin.");
          await import("@/lib/auth").then((m) => m.signOut());
          setAuthChecked(true);
          return;
        }
        router.replace("/admin/users");
      } catch {
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // onAuthStateChanged will run and check admin role
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Google sign-in failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-300 font-medium">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-1">Admin Sign In</h1>
          <p className="text-slate-400 text-sm mb-6">
            Sign in with an admin account to access the dashboard.
          </p>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={hidePassword ? "password" : "text"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 pr-10 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setHidePassword(!hidePassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={hidePassword ? "Show password" : "Hide password"}
                >
                  {hidePassword ? "Show" : "Hide"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 rounded-lg px-3 py-2 border border-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-amber-600 py-3 text-white font-medium hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Signing in…" : "Sign in with email"}
            </button>
          </form>

          <div className="relative my-6">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-600" />
            </span>
            <span className="relative flex justify-center text-xs font-medium text-slate-500 bg-slate-800 px-2">
              Or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 py-3 px-4 font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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

          <p className="mt-6 text-center text-sm text-slate-500">
            <a href="/" className="text-amber-400 hover:text-amber-300">
              ← Back to EasyAdz
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
