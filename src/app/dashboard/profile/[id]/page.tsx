"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../../components/DashboardScaffold";
import { addRecentView } from "@/lib/recent-views";

interface PublicProfile {
  id: string;
  name: string;
  dob: string;
  age: number | null;
  profession: string | null;
  job_title: string | null;
  degree: string | null;
  bio: string | null;
  location: string | null;
  family_details: string | null;
  lifestyle_preferences: string[];
  avatar_url: string | null;
  photo_blurred: boolean;
  match_score: number;
  country?: string | null;
  region_district?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  civil_status?: string | null;
  education_level?: string | null;
  language?: string | null;
}

export default function OtherUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const isPremium = false; // TODO: from subscription/auth

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth || !profileId) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }
      const token = await user.getIdToken();
      try {
        const res = await fetch(`/api/profiles/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          setError("Profile not found.");
          setProfile(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const data: PublicProfile = await res.json();
        setProfile(data);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [profileId, router]);

  useEffect(() => {
    if (profile && profileId) {
      const subtitle =
        profile.age != null
          ? `${profile.age} yrs`
          : profile.profession ?? profile.location ?? undefined;
      addRecentView({
        type: "profile",
        id: profileId,
        title: profile.name,
        image: profile.avatar_url,
        subtitle,
        href: `/dashboard/profile/${profileId}`,
      });
    }
  }, [profile, profileId]);

  async function handleSendInterest() {
    if (!profileId || interestSent) return;
    setSendingInterest(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiver_profile_id: profileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 || data.already_sent) {
        setInterestSent(true);
      } else {
        setError(data.error ?? "Failed to send interest.");
      }
    } catch {
      setError("Failed to send interest.");
    } finally {
      setSendingInterest(false);
    }
  }

  function handleShortlist() {
    setShortlisted((v) => !v);
    // TODO: POST /api/shortlists when table exists
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-primary-700 font-medium">Loading…</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary-50 to-white px-4">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard" className="text-primary-600 font-medium">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  const showBlur = !isPremium || profile.photo_blurred;
  const lifestylePrefs = Array.isArray(profile.lifestyle_preferences) ? profile.lifestyle_preferences : [];

  return (
    <DashboardScaffold>
      <div className="flex flex-1 flex-col mx-auto max-w-2xl px-4 py-6 pb-32 min-[600px]:pb-8">
            <Link
              href="/dashboard"
              className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              ← Back to dashboard
            </Link>

            {/* Top: Profile image + Compatibility Score badge */}
            <section className="relative mb-6">
              <div className="relative aspect-[4/3] max-h-80 w-full overflow-hidden rounded-2xl bg-primary-100">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className={`h-full w-full object-cover ${showBlur ? "blur-xl scale-110" : ""}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-primary-400">
                    {profile.name.charAt(0)}
                  </div>
                )}
                {showBlur && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 backdrop-blur-sm rounded-2xl">
                    <p className="text-center text-white font-medium">Photo hidden for privacy</p>
                    {!isPremium && (
                      <Link
                        href="/dashboard/premium"
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        Upgrade to see photo
                      </Link>
                    )}
                  </div>
                )}
                <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 px-3 py-1.5 shadow-md">
                  <span className="text-sm font-semibold text-primary-700">
                    {profile.match_score}% Match
                  </span>
                </div>
              </div>
            </section>

            {/* Name + age + location */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              {(profile.age != null || profile.location) && (
                <p className="text-gray-600 text-sm mt-1">
                  {[profile.age != null ? `${profile.age} yrs` : null, profile.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            {/* Middle: Professional & Education card */}
            <section className="mb-6 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">Professional & Education</h2>
              <dl className="space-y-2 text-sm">
                {profile.profession && (
                  <div>
                    <dt className="text-gray-500">Profession</dt>
                    <dd className="font-medium text-gray-900">{profile.profession}</dd>
                  </div>
                )}
                {profile.job_title && (
                  <div>
                    <dt className="text-gray-500">Job title</dt>
                    <dd className="font-medium text-gray-900">{profile.job_title}</dd>
                  </div>
                )}
                {profile.degree && (
                  <div>
                    <dt className="text-gray-500">Degree</dt>
                    <dd className="font-medium text-gray-900">{profile.degree}</dd>
                  </div>
                )}
                {!profile.profession && !profile.job_title && !profile.degree && (
                  <p className="text-gray-500 text-sm">Not specified</p>
                )}
              </dl>
            </section>

            {/* Details: Country, Region, Ethnicity, Religion, Civil status, Education, Language */}
            {(profile.country || profile.region_district || profile.ethnicity || profile.religion || profile.civil_status || profile.education_level || profile.language) && (
              <section className="mb-6 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Details</h2>
                <dl className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {profile.country && (
                    <div>
                      <dt className="text-gray-500">Country</dt>
                      <dd className="font-medium text-gray-900">{profile.country}</dd>
                    </div>
                  )}
                  {profile.region_district && (
                    <div>
                      <dt className="text-gray-500">Region / District</dt>
                      <dd className="font-medium text-gray-900">{profile.region_district}</dd>
                    </div>
                  )}
                  {profile.ethnicity && (
                    <div>
                      <dt className="text-gray-500">Ethnicity</dt>
                      <dd className="font-medium text-gray-900">{profile.ethnicity}</dd>
                    </div>
                  )}
                  {profile.religion && (
                    <div>
                      <dt className="text-gray-500">Religion</dt>
                      <dd className="font-medium text-gray-900">{profile.religion}</dd>
                    </div>
                  )}
                  {profile.civil_status && (
                    <div>
                      <dt className="text-gray-500">Civil status</dt>
                      <dd className="font-medium text-gray-900">{profile.civil_status}</dd>
                    </div>
                  )}
                  {profile.education_level && (
                    <div>
                      <dt className="text-gray-500">Education level</dt>
                      <dd className="font-medium text-gray-900">{profile.education_level}</dd>
                    </div>
                  )}
                  {profile.language && (
                    <div>
                      <dt className="text-gray-500">Language</dt>
                      <dd className="font-medium text-gray-900">{profile.language}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Content: About, Family, Lifestyle */}
            {profile.bio && (
              <section className="mb-6 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">About me</h2>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{profile.bio}</p>
              </section>
            )}

            {profile.family_details && (
              <section className="mb-6 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">Family details</h2>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{profile.family_details}</p>
              </section>
            )}

            {lifestylePrefs.length > 0 && (
              <section className="mb-6 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">Lifestyle</h2>
                <div className="flex flex-wrap gap-2">
                  {lifestylePrefs.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 min-[600px]:relative min-[600px]:mt-8 min-[600px]:rounded-2xl min-[600px]:border min-[600px]:border-primary-100 min-[600px]:shadow-sm">
              <button
                type="button"
                onClick={handleShortlist}
                className={`rounded-full p-3 transition ${
                  shortlisted ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                title={shortlisted ? "Shortlisted" : "Shortlist"}
              >
                <span className="text-xl">{shortlisted ? "⭐" : "☆"}</span>
              </button>
              <button
                type="button"
                onClick={handleSendInterest}
                disabled={sendingInterest || interestSent}
                className="flex-1 rounded-xl bg-primary-600 py-3 text-white font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {sendingInterest
                  ? "Sending…"
                  : interestSent
                    ? "Interest sent"
                    : "Send Interest"}
              </button>
            </div>
      </div>
    </DashboardScaffold>
  );
}
