"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { VerificationStatus, type VerificationStatusType } from "@/app/components/VerificationStatus";
import { LISTING_CATEGORIES, type ListingCategory } from "@/lib/listings-types";
import { PROFESSION_CATEGORIES } from "@/lib/profession";
import { RELIGION_OPTIONS } from "@/lib/profile-options";

const MAX_AGE = 120;
const MIN_AGE = 18;

type SearchCategory = ListingCategory | "";

interface SearchListing {
  id: string;
  seller_id: string;
  category: string;
  title: string;
  price: number | null;
  location: string | null;
  attributes: Record<string, string> | null;
  images: string[] | null;
  is_featured: boolean;
  created_at: string;
}

interface SearchProfile {
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
  region_district: string | null;
  ethnicity: string | null;
  civil_status: string | null;
  education_level: string | null;
  is_verified?: boolean;
  verification_status?: VerificationStatusType;
}

function getListingSubtitle(listing: SearchListing): string {
  const attrs = listing.attributes ?? {};
  switch (listing.category) {
    case "vehicle":
      return ([attrs.mileage ? `${attrs.mileage} km` : null, attrs.fuel_type].filter(Boolean).join(" • ") || listing.location) ?? "";
    case "property":
      return ([attrs.land_perches ? `${attrs.land_perches} Perches` : null, attrs.type].filter(Boolean).join(" • ") || listing.location) ?? "";
    case "electronic":
      return ([attrs.brand, attrs.model].filter(Boolean).join(" • ") || listing.location) ?? "";
    default:
      return listing.location ?? "";
  }
}

function ListingSearchCard({ listing }: { listing: SearchListing }) {
  const subtitle = getListingSubtitle(listing);
  const imageUrl = listing.images?.[0];
  return (
    <Link
      href={`/dashboard/marketplace/listing/${listing.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl text-gray-300">
            {LISTING_CATEGORIES.find((c) => c.value === listing.category)?.icon ?? "📦"}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
        {subtitle && <p className="text-sm text-gray-600 truncate">{subtitle}</p>}
        {listing.price != null && (
          <p className="text-sm font-medium text-green-700 mt-1">Rs. {Number(listing.price).toLocaleString()}</p>
        )}
        {listing.location && <p className="text-xs text-gray-500 truncate mt-0.5">{listing.location}</p>}
      </div>
    </Link>
  );
}

function ProfileSearchCard({ profile }: { profile: SearchProfile }) {
  const imgUrl = profile.avatar_url;
  const blurred = profile.photo_blurred;
  return (
    <Link
      href={`/dashboard/profile/${profile.id}`}
      className="flex items-center gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            className={`h-14 w-14 rounded-full object-cover ring-2 ring-gray-100 ${blurred ? "blur-sm" : ""}`}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-2xl ring-2 ring-gray-100">
            👤
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
          <VerificationStatus
            status={
              profile.verification_status ??
              (profile.is_verified ? "verified" : "unverified")
            }
          />
        </div>

        {/* Details grid (compact like your reference) */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🎂</span>
            <span className="truncate">{profile.age != null ? `${profile.age} years` : "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🧑</span>
            <span className="truncate">{profile.ethnicity ?? "—"}</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">📍</span>
            <span className="truncate">{profile.location ?? profile.region_district ?? profile.country ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🛐</span>
            <span className="truncate">{profile.religion ?? "—"}</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">💼</span>
            <span className="truncate">{profile.job_title ?? profile.profession ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🎓</span>
            <span className="truncate">{profile.education_level ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        <span className="text-sm font-semibold text-primary-700 hover:text-primary-800">
          More details →
        </span>
      </div>
    </Link>
  );
}

const VALID_SEARCH_CATEGORIES = ["vehicle", "property", "electronic", "matrimonial"] as const;

export default function DashboardSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [category, setCategory] = useState<SearchCategory>("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [religion, setReligion] = useState("");
  const [profession, setProfession] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);

  const [listings, setListings] = useState<SearchListing[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && VALID_SEARCH_CATEGORIES.includes(cat as (typeof VALID_SEARCH_CATEGORIES)[number])) {
      setCategory(cat as SearchCategory);
    } else if (!cat) {
      setCategory("matrimonial");
    }
  }, [searchParams]);

  // Auto-run matrimonial search on load to show latest matching users by default
  const runSearchRef = useRef(runSearch);
  runSearchRef.current = runSearch;
  useEffect(() => {
    if (category === "matrimonial" && !loading && user) {
      runSearchRef.current();
    }
  }, [category, loading, user]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace("/signin");
      setUser(u ? { uid: u.uid } : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function runSearch() {
    if (!category) return;
    setError(null);
    setSearching(true);
    try {
      if (category === "matrimonial") {
        const token = await getIdToken();
        if (!token) throw new Error("Sign in to search matrimonial.");
        const params = new URLSearchParams();
        if (ageMin.trim()) params.set("age_min", ageMin.trim());
        if (ageMax.trim()) params.set("age_max", ageMax.trim());
        if (religion.trim()) params.set("religion", religion.trim());
        if (profession.trim()) params.set("profession", profession.trim());
        if (onlyVerified) params.set("only_verified", "true");
        params.set("limit", "10");
        const res = await fetch(`/api/search/profiles?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Search failed.");
        }
        const data = await res.json();
        setProfiles(Array.isArray(data) ? data : []);
        setListings([]);
      } else {
        const params = new URLSearchParams();
        params.set("category", category);
        if (q.trim()) params.set("q", q.trim());
        if (location.trim()) params.set("location", location.trim());
        if (priceMin.trim()) params.set("price_min", priceMin.trim());
        if (priceMax.trim()) params.set("price_max", priceMax.trim());
        params.set("limit", "50");
        const res = await fetch(`/api/search/listings?${params}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Search failed.");
        }
        const data = await res.json();
        setListings(Array.isArray(data) ? data : []);
        setProfiles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setListings([]);
      setProfiles([]);
    } finally {
      setSearching(false);
    }
  }

  function clearCategory() {
    setCategory("");
    setListings([]);
    setProfiles([]);
    setError(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-600 font-medium">Loading…</div>
      </div>
    );
  }

  return (
    <DashboardScaffold>
      <div className="flex-1 p-4 md:p-6">
            <Link href="/dashboard" className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
              ← Dashboard
            </Link>

            {!category ? (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Search</h1>
                <p className="text-sm text-gray-600 mb-6">
                  Select a category to start. Matrimonial uses profile filters (Age, Religion, Profession). Other categories use listing filters (Price, Location).
                </p>
                <div className="grid grid-cols-2 min-[600px]:grid-cols-4 gap-4" aria-label="Category selector">
                  {LISTING_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value as SearchCategory)}
                      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                        {cat.icon}
                      </span>
                      <span className="font-medium text-gray-800 text-center">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={clearCategory}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    ← Change category
                  </button>
                  <span className="text-gray-500">
                    {LISTING_CATEGORIES.find((c) => c.value === category)?.icon} {LISTING_CATEGORIES.find((c) => c.value === category)?.label}
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
                  {category === "matrimonial" ? (
                    <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[900px]:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Age from</label>
                        <input
                          type="number"
                          min={MIN_AGE}
                          max={MAX_AGE}
                          value={ageMin}
                          onChange={(e) => setAgeMin(e.target.value)}
                          placeholder="e.g. 25"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Age to</label>
                        <input
                          type="number"
                          min={MIN_AGE}
                          max={MAX_AGE}
                          value={ageMax}
                          onChange={(e) => setAgeMax(e.target.value)}
                          placeholder="e.g. 35"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Religion</label>
                        <select
                          value={religion}
                          onChange={(e) => setReligion(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Any</option>
                          {RELIGION_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Profession</label>
                        <select
                          value={profession}
                          onChange={(e) => setProfession(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Any</option>
                          {PROFESSION_CATEGORIES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={onlyVerified}
                            onChange={(e) => setOnlyVerified(e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Verified only</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[900px]:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Search term</label>
                        <input
                          type="search"
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Title or location"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Colombo"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Price min (Rs.)</label>
                        <input
                          type="number"
                          min={0}
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Price max (Rs.)</label>
                        <input
                          type="number"
                          min={0}
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          placeholder="Any"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={runSearch}
                      disabled={searching}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      {searching ? "Searching…" : "Search"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
                )}

                {category === "matrimonial" ? (
                  <section aria-label="Search results">
                    <h2 className="text-sm font-semibold text-gray-800 mb-3">
                      {profiles.length} profile{profiles.length !== 1 ? "s" : ""} found
                    </h2>
                    {profiles.length === 0 && !searching && (
                      <p className="text-gray-500 text-sm py-8">Run a search or adjust filters.</p>
                    )}
                    <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3 gap-4">
                      {profiles.map((profile) => (
                        <ProfileSearchCard key={profile.id} profile={profile} />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section aria-label="Search results">
                    <h2 className="text-sm font-semibold text-gray-800 mb-3">
                      {listings.length} ad{listings.length !== 1 ? "s" : ""} found
                    </h2>
                    {listings.length === 0 && !searching && (
                      <p className="text-gray-500 text-sm py-8">Run a search or adjust filters.</p>
                    )}
                    <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3 gap-4">
                      {listings.map((listing) => (
                        <ListingSearchCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
      </div>
    </DashboardScaffold>
  );
}
