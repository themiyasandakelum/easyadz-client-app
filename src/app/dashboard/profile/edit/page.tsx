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
import { DashboardScaffold } from "../../components/DashboardScaffold";

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

type TabId = "profile" | "work" | "preferences";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "work", label: "Work & Education" },
  { id: "preferences", label: "Preferences" },
];

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-gray-400" aria-hidden>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function ProfileEditPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
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

  const headerContent = (
    <nav className="flex items-center gap-2 text-sm text-gray-500">
      <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
      <span aria-hidden>/</span>
      <Link href="/dashboard/profile/edit" className="font-medium text-gray-900">Edit profile</Link>
    </nav>
  );

  if (loading) {
    return (
      <DashboardScaffold headerContent={headerContent}>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-gray-600 font-medium">Loading…</div>
        </div>
      </DashboardScaffold>
    );
  }

  if (!profile) {
    return (
      <DashboardScaffold headerContent={headerContent}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-gray-600">{error ?? "Profile not found."}</p>
          <Link href="/dashboard" className="text-primary-600 font-medium hover:underline">
            Back to dashboard
          </Link>
        </div>
      </DashboardScaffold>
    );
  }

  const roleText = [jobTitle, profession].filter(Boolean).join(" | ") || "—";

  return (
    <DashboardScaffold headerContent={headerContent}>
      <div className="flex flex-1 flex-col min-h-0 bg-gray-50/50">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {/* Tabs + Save button */}
              <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white rounded-t-lg overflow-x-auto">
                <div className="flex gap-1 min-w-0">
                  {TABS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                        activeTab === id
                          ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="shrink-0 mx-4 my-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
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
              </div>

              {/* Profile header card */}
              <div className="rounded-xl border border-gray-200 bg-gray-100/80 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative shrink-0">
                    <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center overflow-hidden ring-2 ring-white shadow-md">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl font-semibold text-gray-400">
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
                      className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-2 text-white shadow-lg hover:bg-blue-700 disabled:opacity-60 transition"
                      aria-label="Change photo"
                    >
                      {uploadingPhoto ? (
                        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{name || "—"}</h2>
                    <p className="text-sm text-gray-600 mt-0.5">{roleText}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-4 text-sm">
                      <div>
                        <span className="text-gray-500">Profile ID:</span>{" "}
                        <span className="font-medium text-gray-800">{profile.id.slice(0, 8)}…</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>{" "}
                        <span className="font-medium text-gray-800">{phone || "—"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-500">Location:</span>{" "}
                        <span className="font-medium text-gray-800">
                          {[location, regionDistrict, country].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab content */}
              {activeTab === "profile" && (
                <InfoCard title="Personal information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Display name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGender("male")}
                          className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition ${
                            gender === "male"
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <span aria-hidden>👨</span>
                          <span className="font-medium">Male</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender("female")}
                          className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition ${
                            gender === "female"
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <span aria-hidden>👩</span>
                          <span className="font-medium">Female</span>
                        </button>
                      </div>
                    </div>
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select country</option>
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="region_district" className="block text-sm font-medium text-gray-700 mb-1">
                        Region / District
                      </label>
                      <select
                        id="region_district"
                        value={regionDistrict}
                        onChange={(e) => setRegionDistrict(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select region</option>
                        {SRI_LANKA_REGIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700 mb-1">
                        Ethnicity
                      </label>
                      <select
                        id="ethnicity"
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select ethnicity</option>
                        {ETHNICITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="religion" className="block text-sm font-medium text-gray-700 mb-1">
                        Religion
                      </label>
                      <select
                        id="religion"
                        value={religion}
                        onChange={(e) => setReligion(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select religion</option>
                        {RELIGION_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="civil_status" className="block text-sm font-medium text-gray-700 mb-1">
                        Civil status
                      </label>
                      <select
                        id="civil_status"
                        value={civilStatus}
                        onChange={(e) => setCivilStatus(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select status</option>
                        {CIVIL_STATUS_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select language</option>
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="A short intro about you"
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                  </div>
                </InfoCard>
              )}

              {activeTab === "work" && (
                <InfoCard title="Education & work information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
                        Profession category
                      </label>
                      <select
                        id="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select category</option>
                        {PROFESSION_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-1">
                        Job title
                      </label>
                      <input
                        id="job_title"
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder={
                          profession && PROFESSION_CATEGORIES.includes(profession as ProfessionCategory)
                            ? `e.g. ${JOB_TITLE_EXAMPLES[profession as ProfessionCategory][0]}`
                            : "e.g. Software Engineer, Doctor"
                        }
                        list="job_title_suggestions"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                    <div>
                      <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">
                        Education level
                      </label>
                      <select
                        id="education_level"
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select level</option>
                        {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </InfoCard>
              )}

              {activeTab === "preferences" && (
                <InfoCard title="Account & preferences">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                      <div>
                        <p className="font-medium text-gray-800">Blur my photo</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          When on, others see your photo blurred.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={photoBlurred}
                        onClick={() => setPhotoBlurred((v) => !v)}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                          photoBlurred ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                            photoBlurred ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                      <div>
                        <p className="font-medium text-gray-800">Show in Matrimonial search</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Your profile appears in Recommended Matches.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={hasMatrimonialProfile}
                        onClick={() => setHasMatrimonialProfile((v) => !v)}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                          hasMatrimonialProfile ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                            hasMatrimonialProfile ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    <div>
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
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer transition ${
                                checked
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
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
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{cat.icon} {cat.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </InfoCard>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardScaffold>
  );
}
