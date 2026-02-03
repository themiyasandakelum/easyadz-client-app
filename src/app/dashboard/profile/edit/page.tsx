"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { compressImageFile } from "@/lib/compress-image";
import { PROFESSION_CATEGORIES, JOB_TITLE_EXAMPLES, type ProfessionCategory } from "@/lib/profession";
import {
  COUNTRY_OPTIONS,
  SRI_LANKA_REGIONS,
  ETHNICITY_OPTIONS,
  RELIGION_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/profile-options";
import { POST_AD_CATEGORIES } from "@/lib/listings-types";

interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  dob: string;
  gender?: "male" | "female";
  lifestyle_preferences: string[];
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  photo_blurred?: boolean;
  has_matrimonial_profile?: boolean;
  profession?: string | null;
  job_title?: string | null;
  degree?: string | null;
  family_details?: string | null;
  country?: string | null;
  region_district?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  civil_status?: string | null;
  education_level?: string | null;
  language?: string | null;
  interesting_categories?: string[] | null;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [profession, setProfession] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("");
  const [degree, setDegree] = useState("");
  const [familyDetails, setFamilyDetails] = useState("");
  const [country, setCountry] = useState("");
  const [regionDistrict, setRegionDistrict] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [religion, setReligion] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [language, setLanguage] = useState("");
  const [photoBlurred, setPhotoBlurred] = useState(false);
  const [hasMatrimonialProfile, setHasMatrimonialProfile] = useState(false);
  const [interestingCategories, setInterestingCategories] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const token = await user.getIdToken();
      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          router.replace("/register");
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const data: ProfileData = await res.json();
        setProfile(data);
        setName(data.name ?? "");
        setGender(data.gender === "female" ? "female" : "male");
        setPhone(data.phone ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setProfession(data.profession ?? "");
        setJobTitle(data.job_title ?? "");
        setDegree(data.degree ?? "");
        setFamilyDetails(data.family_details ?? "");
        setCountry(data.country ?? "");
        setRegionDistrict(data.region_district ?? "");
        setEthnicity(data.ethnicity ?? "");
        setReligion(data.religion ?? "");
        setCivilStatus(data.civil_status ?? "");
        setEducationLevel(data.education_level ?? "");
        setLanguage(data.language ?? "");
        setPhotoBlurred(data.photo_blurred ?? false);
        setHasMatrimonialProfile(data.has_matrimonial_profile ?? false);
        setInterestingCategories(
          (() => {
            const v = data.interesting_categories;
            if (Array.isArray(v)) return v;
            if (typeof v === "string") {
              try {
                const parsed = JSON.parse(v);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return [];
          })()
        );
        setAvatarUrl(data.avatar_url ?? null);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    e.target.value = "";
    setError(null);
    setUploadingPhoto(true);
    try {
      const blob = await compressImageFile(file);
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const { avatar_url } = await res.json();
      setAvatarUrl(avatar_url);
      // Optionally PATCH profile with new avatar_url so DB is in sync
      const patchRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url }),
      });
      if (patchRes.ok) setProfile((p) => (p ? { ...p, avatar_url } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          gender,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          profession: profession.trim() || null,
          job_title: jobTitle.trim() || null,
          degree: degree.trim() || null,
          family_details: familyDetails.trim() || null,
          country: country.trim() || null,
          region_district: regionDistrict.trim() || null,
          ethnicity: ethnicity.trim() || null,
          religion: religion.trim() || null,
          civil_status: civilStatus.trim() || null,
          education_level: educationLevel.trim() || null,
          language: language.trim() || null,
          photo_blurred: photoBlurred,
          has_matrimonial_profile: hasMatrimonialProfile,
          interesting_categories: interestingCategories,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
        <div className="text-primary-700 font-medium">Loading…</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
        <p className="text-red-600">{error ?? "Profile not found."}</p>
        <Link href="/dashboard" className="ml-4 text-primary-600">Back to dashboard</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white px-4 py-8 pb-24">
      <div className="mx-auto max-w-lg">
        <Link href="/dashboard" className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-xl font-bold text-primary-800 mb-6">Edit profile</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar + Change Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-28 w-28 rounded-full bg-primary-200 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-semibold text-primary-600">
                    {name.charAt(0) || "?"}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 rounded-full bg-primary-600 p-2 text-white shadow hover:bg-primary-700 disabled:opacity-60"
                aria-label="Change photo"
              >
                {uploadingPhoto ? (
                  <span className="block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {uploadingPhoto ? "Uploading…" : "Tap to change photo. Compressed for fast upload."}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition ${
                  gender === "male"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:bg-primary-50/50"
                }`}
              >
                <span className="text-2xl" aria-hidden>👨</span>
                <span className="font-semibold">Men</span>
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition ${
                  gender === "female"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:bg-primary-50/50"
                }`}
              >
                <span className="text-2xl" aria-hidden>👩</span>
                <span className="font-semibold">Women</span>
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 077 123 4567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Shown to buyers when they view your ads.</p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short intro about you"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Colombo, Sri Lanka"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Region / District */}
          <div>
            <label htmlFor="region_district" className="block text-sm font-medium text-gray-700 mb-1">
              Region / District
            </label>
            <select
              id="region_district"
              value={regionDistrict}
              onChange={(e) => setRegionDistrict(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select region</option>
              {SRI_LANKA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Ethnicity */}
          <div>
            <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700 mb-1">
              Ethnicity
            </label>
            <select
              id="ethnicity"
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select ethnicity</option>
              {ETHNICITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Religion */}
          <div>
            <label htmlFor="religion" className="block text-sm font-medium text-gray-700 mb-1">
              Religion
            </label>
            <select
              id="religion"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select religion</option>
              {RELIGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Civil Status */}
          <div>
            <label htmlFor="civil_status" className="block text-sm font-medium text-gray-700 mb-1">
              Civil status
            </label>
            <select
              id="civil_status"
              value={civilStatus}
              onChange={(e) => setCivilStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select status</option>
              {CIVIL_STATUS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Profession Category */}
          <div>
            <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
              Profession category
            </label>
            <select
              id="profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select category</option>
              {PROFESSION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Job Title */}
          <div>
            <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-1">
              Specific job title
            </label>
            <input
              id="job_title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={
                profession && PROFESSION_CATEGORIES.includes(profession as ProfessionCategory)
                  ? `e.g. ${JOB_TITLE_EXAMPLES[profession as ProfessionCategory][0]}`
                  : "e.g. Software Engineer, Doctor (MBBS), School Teacher"
              }
              list="job_title_suggestions"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
            <datalist id="job_title_suggestions">
              {profession && PROFESSION_CATEGORIES.includes(profession as ProfessionCategory)
                ? JOB_TITLE_EXAMPLES[profession as ProfessionCategory].map((example) => (
                    <option key={example} value={example} />
                  ))
                : PROFESSION_CATEGORIES.flatMap((cat) =>
                    JOB_TITLE_EXAMPLES[cat].map((example) => (
                      <option key={`${cat}-${example}`} value={example} />
                    ))
                  )}
            </datalist>
          </div>

          {/* Education Level */}
          <div>
            <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">
              Education level
            </label>
            <select
              id="education_level"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select level</option>
              {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Degree */}
          <div>
            <label htmlFor="degree" className="block text-sm font-medium text-gray-700 mb-1">
              Degree / Qualification
            </label>
            <input
              id="degree"
              type="text"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="e.g. BSc, MBBS, CA, CIMA"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Select language</option>
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Family Details */}
          <div>
            <label htmlFor="family_details" className="block text-sm font-medium text-gray-700 mb-1">
              Family details
            </label>
            <textarea
              id="family_details"
              value={familyDetails}
              onChange={(e) => setFamilyDetails(e.target.value)}
              placeholder="Optional: family background, siblings, etc."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          {/* Privacy: Blur my photo */}
          <div className="rounded-xl border border-primary-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-800">Blur my photo</p>
                <p className="text-xs text-gray-500">
                  When on, others see your photo blurred. Unblur can be a Premium feature.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={photoBlurred}
                onClick={() => setPhotoBlurred((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  photoBlurred ? "bg-primary-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                    photoBlurred ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>
          </div>

          {/* Matrimonial: Show my profile in Matches */}
          <div className="rounded-xl border border-primary-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-800">Show my profile in Matrimonial</p>
                <p className="text-xs text-gray-500">
                  When on, your profile appears in Recommended Matches on the Marketplace. Manage only here, not via Post Ad.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hasMatrimonialProfile}
                onClick={() => setHasMatrimonialProfile((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  hasMatrimonialProfile ? "bg-primary-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                    hasMatrimonialProfile ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>
          </div>

          {/* Interesting categories: for Ads for you on dashboard */}
          <div className="rounded-xl border border-primary-100 bg-white p-4">
            <p className="font-medium text-gray-800 mb-2">Interesting categories</p>
            <p className="text-xs text-gray-500 mb-3">
              Select marketplace categories to see relevant ads on your dashboard.
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
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary-600 py-3 text-white font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
