"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { LISTING_CATEGORIES, type ListingCategory } from "@/lib/listings-types";

interface UserProfile {
  id: string;
  has_matrimonial_profile?: boolean;
}

interface RecommendedProfile {
  id: string;
  name: string;
  age: number | null;
  profession: string | null;
  location: string | null;
  avatar_url: string | null;
  photo_blurred?: boolean;
}

const VALID_CATEGORIES = LISTING_CATEGORIES.map((c) => c.value);

interface Listing {
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

function getListingSubtitle(listing: Listing): string {
  const attrs = listing.attributes ?? {};
  switch (listing.category) {
    case "vehicle":
      return ([attrs.mileage ? `${attrs.mileage} km` : null, attrs.fuel_type].filter(Boolean).join(" • ") || listing.location) ?? "";
    case "property":
      return ([attrs.land_perches ? `${attrs.land_perches} Perches` : null, attrs.type].filter(Boolean).join(" • ") || listing.location) ?? "";
    case "matrimonial":
      return ([attrs.profession, attrs.age ? `${attrs.age} yrs` : null].filter(Boolean).join(" • ") || listing.location) ?? "";
    case "electronic":
      return ([attrs.brand, attrs.model].filter(Boolean).join(" • ") || listing.location) ?? "";
    default:
      return listing.location ?? "";
  }
}

function UnifiedListingCard({ listing }: { listing: Listing }) {
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

function RecommendedMatchCard({ profile }: { profile: RecommendedProfile }) {
  const imgUrl = profile.avatar_url;
  const blurred = profile.photo_blurred;

  return (
    <Link
      href={`/dashboard/profile/${profile.id}`}
      className="flex w-40 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            className={`h-full w-full object-cover ${blurred ? "blur-md" : ""}`}
          />
        ) : (
          <span className="text-4xl text-gray-300">👤</span>
        )}
      </div>
      <div className="p-2">
        <p className="font-medium text-gray-900 truncate text-sm">{profile.name}</p>
        {(profile.age != null || profile.profession) && (
          <p className="text-xs text-gray-600 truncate">
            {[profile.age != null ? `${profile.age} yrs` : null, profile.profession].filter(Boolean).join(" • ")}
          </p>
        )}
        {profile.location && <p className="text-xs text-gray-500 truncate mt-0.5">{profile.location}</p>}
      </div>
    </Link>
  );
}

export default function MarketplaceDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = useMemo(() => {
    const c = searchParams.get("category");
    return c && VALID_CATEGORIES.includes(c) ? (c as ListingCategory) : "";
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | "">(categoryFromUrl);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recommendedMatches, setRecommendedMatches] = useState<RecommendedProfile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [freshListings, setFreshListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFresh, setLoadingFresh] = useState(true);

  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        setLoading(false);
        return;
      }
      const token = await getIdToken();
      if (token) {
        try {
          const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data: UserProfile = await res.json();
            setUserProfile(data);
            if (data.has_matrimonial_profile) {
              setLoadingMatches(true);
              const listRes = await fetch("/api/profiles?limit=10", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (listRes.ok) {
                const list = await listRes.json();
                setRecommendedMatches(Array.isArray(list) ? list : []);
              }
            }
          }
        } catch {
          // ignore
        } finally {
          setLoadingMatches(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFresh(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.set("category", selectedCategory);
        if (locationFilter.trim()) params.set("location", locationFilter.trim());
        params.set("limit", "24");
        const res = await fetch(`/api/listings?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFreshListings(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setLoadingFresh(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCategory, locationFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/listings?featured=true&limit=10");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFeaturedListings(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFeaturedListings([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredFresh = searchQuery.trim()
    ? freshListings.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          (l.location?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      )
    : freshListings;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-primary-700 font-medium">Loading…</div>
      </div>
    );
  }

  return (
    <DashboardScaffold>
      <div className="flex-1 px-4 py-4">
            <Link href="/dashboard" className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
              ← Dashboard
            </Link>

            {/* Header: Search + Location filter */}
            <header className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ads..."
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="min-w-[140px]">
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Location"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            </header>

            {/* Category Grid: circular icons */}
            <section className="mb-6" aria-label="Categories">
              <h2 className="sr-only">Categories</h2>
              <div className="grid grid-cols-4 gap-4">
                {LISTING_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat.value ? "" : (cat.value as ListingCategory))}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
                      selectedCategory === cat.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 bg-white hover:border-primary-200"
                    }`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                      {cat.icon}
                    </span>
                    <span className="text-xs font-medium text-gray-800 text-center leading-tight">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Dynamic: Matrimonial — Recommended Matches or Create Profile banner */}
            {userProfile?.has_matrimonial_profile ? (
              <section className="mb-6" aria-label="Recommended Matches">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Recommended Matches</h2>
                {loadingMatches ? (
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-40 shrink-0 rounded-xl border border-gray-200 bg-white h-52 animate-pulse" />
                    ))}
                  </div>
                ) : recommendedMatches.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">No matches yet. Check back later or refine your search.</p>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
                    {recommendedMatches.map((profile) => (
                      <RecommendedMatchCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="mb-6" aria-label="Create Matrimonial Profile">
                <Link
                  href="/dashboard/profile/edit"
                  className="block rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-amber-50/50 p-6 text-center shadow-sm transition hover:border-primary-300 hover:shadow-md"
                >
                  <span className="text-4xl mb-3 block" aria-hidden>💍</span>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Find your Life Partner</h2>
                  <p className="text-sm text-gray-600 mb-4">Create a Matrimonial Profile to appear in matches and connect with others.</p>
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                    Create Matrimonial Profile
                  </span>
                </Link>
              </section>
            )}

            {/* Featured Section: horizontal carousel */}
            {featuredListings.length > 0 && (
              <section className="mb-6" aria-label="Featured ads">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Featured</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
                  {featuredListings.map((listing) => (
                    <div key={listing.id} className="w-48 shrink-0">
                      <UnifiedListingCard listing={listing} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Fresh for You: grid of listings */}
            <section className="mb-6" aria-label="Fresh for you">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">
                {selectedCategory
                  ? `${LISTING_CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? selectedCategory}`
                  : "Fresh for You"}
              </h2>
              {loadingFresh ? (
                <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[600px]:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white h-48 animate-pulse" />
                  ))}
                </div>
              ) : filteredFresh.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No ads yet. Be the first to post!</p>
              ) : (
                <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[600px]:grid-cols-3 gap-4">
                  {filteredFresh.map((listing) => (
                    <UnifiedListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </section>
      </div>
      {/* Post Ad FAB */}
      <Link
        href="/dashboard/post-ad"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-white font-medium shadow-lg hover:bg-primary-700 min-[600px]:bottom-6 min-[600px]:right-6"
        aria-label="Post an ad"
      >
        <span aria-hidden>+</span>
        Post Ad
      </Link>
    </DashboardScaffold>
  );
}
