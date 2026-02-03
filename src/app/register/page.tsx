"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { POST_AD_CATEGORIES } from "@/lib/listings-types";

const LIFESTYLE_OPTIONS = [
  "Non-vegetarian",
  "Vegetarian",
  "Vegan",
  "Fitness enthusiast",
  "Yoga & meditation",
  "Travel lover",
  "Homebody",
  "Social & outgoing",
  "Book lover",
  "Music lover",
  "Sports fan",
  "Spiritual",
  "Career focused",
  "Family oriented",
  "Pet lover",
];

type RegisterMode = "full" | "complete";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<RegisterMode>("full");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [selectedLifestyle, setSelectedLifestyle] = useState<string[]>([]);
  const [interestingCategories, setInterestingCategories] = useState<string[]>([]);
  const [hidePassword, setHidePassword] = useState(true);
  const maxDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMode("full");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          router.replace("/dashboard");
          return;
        }
        if (res.status === 404) {
          setMode("complete");
          setName(user.displayName ?? "");
          setEmail(user.email ?? "");
        }
      } catch {
        setMode("full");
      }
    });
    return () => unsubscribe();
  }, [router]);

  function toggleLifestyle(preference: string) {
    setSelectedLifestyle((prev) =>
      prev.includes(preference)
        ? prev.filter((p) => p !== preference)
        : [...prev, preference]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (mode === "full" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!dob) {
      setError("Date of birth is required.");
      return;
    }
    if (!gender) {
      setError("Please select your gender.");
      return;
    }
    if (selectedLifestyle.length === 0) {
      setError("Please select at least one lifestyle preference.");
      return;
    }

    setIsLoading(true);
    try {
      let userId: string;
      let idToken: string;

      if (mode === "complete") {
        const auth = getFirebaseAuth();
        const user = auth?.currentUser;
        if (!user) throw new Error("Not signed in.");
        userId = user.uid;
        idToken = await user.getIdToken();
      } else {
        const credential = await signUpWithEmail({
          email: email.trim(),
          password,
          displayName: name.trim(),
        });
        userId = credential.user.uid;
        idToken = await credential.user.getIdToken();
      }

      const dobStr = new Date(dob).toISOString().split("T")[0];
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          dob: dobStr,
          gender,
          lifestyle_preferences: selectedLifestyle,
          phone: phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save profile.");
      }

      if (interestingCategories.length > 0) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ interesting_categories: interestingCategories }),
        });
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will run; if no profile, mode becomes 'complete' and name/email pre-fill
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Google sign-up failed."
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-primary-100 bg-white shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-primary-800 mb-1">
            {mode === "complete" ? "Complete your profile" : "Create your matrimonial profile"}
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            {mode === "complete"
              ? "You signed up with Google. Add a few details to finish."
              : "Join thousands finding their perfect match in Sri Lanka."}
          </p>

          {mode === "full" && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mb-5"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {googleLoading ? "Signing up…" : "Sign up with Google"}
              </button>
              <div className="relative mb-5">
                <span className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </span>
                <span className="relative flex justify-center text-xs font-medium text-gray-500 bg-white px-2">
                  Or continue with email
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                readOnly={mode === "complete"}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none ${mode === "complete" ? "bg-gray-50 text-gray-600" : ""}`}
              />
              {mode === "complete" && (
                <p className="text-xs text-gray-500 mt-1">From your Google account</p>
              )}
            </div>

            {mode === "full" && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={hidePassword ? "password" : "text"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
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
            )}

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                max={maxDate}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 7X XXX XXXX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>

            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Gender <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Required for matching. Select one to continue.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-6 transition ${
                    gender === "male"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:bg-primary-50/50"
                  }`}
                >
                  <span className="text-3xl" aria-hidden>👨</span>
                  <span className="font-semibold">Men</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-6 transition ${
                    gender === "female"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:bg-primary-50/50"
                  }`}
                >
                  <span className="text-3xl" aria-hidden>👩</span>
                  <span className="font-semibold">Women</span>
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Lifestyle preferences
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                Select all that apply. Click to add or remove.
              </p>
              <div className="flex flex-wrap gap-2">
                {LIFESTYLE_OPTIONS.map((option) => {
                  const selected = selectedLifestyle.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleLifestyle(option)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        selected
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {selectedLifestyle.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedLifestyle.length} selected
                </p>
              )}
            </section>

            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Interesting categories <span className="text-gray-400">(optional)</span>
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                Select marketplace categories for personalized ads on your dashboard.
              </p>
              <div className="flex flex-wrap gap-2">
                {POST_AD_CATEGORIES.map((cat) => {
                  const checked = interestingCategories.includes(cat.value);
                  return (
                    <label
                      key={cat.value}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
                        checked ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:bg-gray-50"
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
                      <span className="text-sm font-medium text-gray-800">{cat.icon} {cat.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !gender}
              className="w-full rounded-lg bg-primary-600 py-3 text-white font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Saving…" : mode === "complete" ? "Complete profile" : "Continue"}
            </button>
          </form>

          {mode === "full" && (
            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/signin" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
