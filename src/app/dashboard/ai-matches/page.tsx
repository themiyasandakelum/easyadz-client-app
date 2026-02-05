"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { MatrimonialProfileCard } from "@/app/components/MatrimonialProfileCard";

interface AIMatch {
  id: string;
  name: string;
  age: number | null;
  profession: string | null;
  job_title: string | null;
  location: string | null;
  avatar_url: string | null;
  photo_blurred?: boolean;
  religion: string | null;
  country: string | null;
  region_district?: string | null;
  ethnicity?: string | null;
  education_level?: string | null;
  compatibility: number;
}

function AIMatchCard({ match }: { match: AIMatch }) {
  return (
    <MatrimonialProfileCard
      id={match.id}
      name={match.name}
      age={match.age}
      profession={match.profession}
      job_title={match.job_title}
      location={match.location}
      country={match.country}
      region_district={match.region_district}
      ethnicity={match.ethnicity}
      religion={match.religion}
      education_level={match.education_level}
      avatar_url={match.avatar_url}
      photo_blurred={match.photo_blurred}
      compatibility={match.compatibility}
    />
  );
}

export default function DashboardAIMatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMatches() {
    const token = await getIdToken();
    if (!token) return;
    setError(null);
    try {
      const res = await fetch("/api/ai-matches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? data.message ?? "Failed to load AI matches.");
        setMatches([]);
        return;
      }
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setMessage(data.message ?? null);
    } catch {
      setError("Failed to load AI matches.");
      setMatches([]);
    }
  }

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }
      await fetchMatches();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <DashboardScaffold
      headerContent={
        <h1 className="text-lg font-semibold text-gray-900">AI Matrimonial Matches</h1>
      }
    >
      <div className="mx-auto max-w-lg min-[600px]:max-w-4xl px-4 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Dashboard
        </Link>

        <p className="text-sm text-gray-600 mb-6">
          Matches based on your bio and preferences. Add more details to your profile for better results.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-gray-500">Finding your matches…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-amber-800 font-medium">{error}</p>
            <Link
              href="/dashboard/profile/edit"
              className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Edit your profile →
            </Link>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-primary-100 bg-white p-8 text-center">
            <p className="text-gray-700 font-medium">
              {message ?? "Update your bio to get better AI matches!"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Add a bio, lifestyle preferences, and profession to your profile for personalized matches.
            </p>
            <Link
              href="/dashboard/profile/edit"
              className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Edit profile
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700">
                {matches.length} match{matches.length !== 1 ? "es" : ""} found
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  fetchMatches().finally(() => setLoading(false));
                }}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-3">
              {matches.map((match) => (
                <AIMatchCard key={match.id} match={match} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardScaffold>
  );
}
