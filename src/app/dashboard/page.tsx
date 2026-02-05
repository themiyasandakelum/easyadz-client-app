"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { DashboardScaffold } from "./components/DashboardScaffold";
import { LISTING_CATEGORIES } from "@/lib/listings-types";
import { getRecentViews, type RecentViewItem } from "@/lib/recent-views";

interface DashboardListing {
  id: string;
  category: string;
  title: string;
  price: number | null;
  location: string | null;
  images: string[] | null;
}

export default function DashboardPage() {
  const [hasMatrimonialProfile, setHasMatrimonialProfile] = useState(false);
  const [interestingCategories, setInterestingCategories] = useState<string[]>([]);
  const [interestListings, setInterestListings] = useState<DashboardListing[]>([]);
  const [recentViews, setRecentViews] = useState<RecentViewItem[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecentViews(getRecentViews());
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") setRecentViews(getRecentViews());
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setHasMatrimonialProfile(profile.has_matrimonial_profile ?? false);
          setCurrentProfileId(profile.id ?? null);
          const cats = Array.isArray(profile.interesting_categories) ? profile.interesting_categories : [];
          setInterestingCategories(cats);
        }
        if (token) {
          const intRes = await fetch("/api/interests", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (intRes.ok) {
            const intData = await intRes.json();
            setPendingRequests(intData.pending_received ?? 0);
          }
        }
      } catch {
        // keep on dashboard
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = interestingCategories.length > 0
        ? `/api/listings?categories=${interestingCategories.join(",")}&limit=10`
        : `/api/listings?limit=10`;
      try {
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setInterestListings(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setInterestListings([]);
      }
    })();
    return () => { cancelled = true; };
  }, [interestingCategories]);

  return (
    <DashboardScaffold>
      <div className="w-full max-w-full px-2 min-[600px]:px-3 py-3 min-[600px]:py-4 min-h-[calc(100vh-4rem)] flex flex-col gap-4 min-[600px]:gap-5">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-primary-700 font-medium text-lg">Loading…</div>
            </div>
          ) : (
            <>
          {/* General Categories: responsive GridView - larger tiles */}
          <section aria-label="Browse by category" className="flex-shrink-0">
            <h2 className="mb-3 text-base min-[600px]:text-lg font-semibold text-gray-800">Browse by Category</h2>
            <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[768px]:grid-cols-4 gap-4 min-[600px]:gap-5">
              {LISTING_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={cat.value === "matrimonial" ? "/dashboard/search?category=matrimonial" : `/dashboard/marketplace?category=${cat.value}`}
                  className="flex flex-col items-center gap-2 rounded-xl border border-primary-100 bg-white p-4 min-[600px]:p-5 shadow-sm transition hover:bg-primary-50 hover:border-primary-200 hover:shadow-md"
                >
                  <span className="text-3xl min-[600px]:text-4xl" aria-hidden>{cat.icon}</span>
                  <span className="text-base min-[600px]:text-lg font-semibold text-gray-800">{cat.label}</span>
                  <span className="text-xs min-[600px]:text-sm text-gray-500 text-center">{cat.monetization}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/post-ad"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-base font-medium text-white hover:bg-primary-700"
              >
                Post an Ad
              </Link>
              <Link
                href="/dashboard/marketplace"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-5 py-3 text-base font-medium text-primary-700 hover:bg-primary-50"
              >
                See all in Marketplace →
              </Link>
            </div>
          </section>

          {/* Stats Row - only for Matrimonial (before Recently viewed) */}
          {hasMatrimonialProfile && (
            <section aria-label="Your matrimonial stats" className="flex-shrink-0">
              <div className="grid gap-4 min-[600px]:gap-5 grid-cols-3">
                <Link
                  href="/dashboard/pending-requests"
                  className="rounded-xl border border-primary-100 bg-white p-4 min-[600px]:p-5 shadow-sm transition hover:bg-primary-50"
                >
                  <p className="text-2xl min-[600px]:text-3xl font-bold text-primary-700">{pendingRequests}</p>
                  <p className="text-sm font-medium text-gray-600 mt-1">Pending requests</p>
                </Link>
                <div className="rounded-xl border border-primary-100 bg-white p-4 min-[600px]:p-5 shadow-sm">
                  <p className="text-2xl min-[600px]:text-3xl font-bold text-primary-700">{recentViews.filter((v) => v.type === "profile" && v.id !== currentProfileId).length}</p>
                  <p className="text-sm font-medium text-gray-600 mt-1">Recent views</p>
                </div>
                <div className="rounded-xl border border-primary-100 bg-white p-4 min-[600px]:p-5 shadow-sm">
                  <p className="text-2xl min-[600px]:text-3xl font-bold text-primary-700">—</p>
                  <p className="text-sm font-medium text-gray-600 mt-1">Match score</p>
                </div>
              </div>
            </section>
          )}

          {/* Recent Views - all categories (listings + profiles for everyone). Exclude own profile. */}
          {recentViews.filter((v) => !(v.type === "profile" && v.id === currentProfileId)).length > 0 && (
            <section aria-label="Recently viewed" className="flex-shrink-0">
              <h2 className="mb-3 text-base min-[600px]:text-lg font-semibold text-gray-800">Recently viewed</h2>
              <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[700px]:grid-cols-4 min-[900px]:grid-cols-6 gap-3">
                {recentViews
                  .filter((v) => !(v.type === "profile" && v.id === currentProfileId))
                  .map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="flex flex-col overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl text-gray-300">
                          {item.type === "listing" ? "📦" : "👤"}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="font-medium text-gray-900 truncate text-sm">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-600 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Ads from interesting categories */}
          <section aria-label="Ads for you" className="flex-shrink-0">
            <h2 className="mb-3 text-base min-[600px]:text-lg font-semibold text-gray-800">
              Ads for you
              {interestingCategories.length > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({LISTING_CATEGORIES.filter((c) => interestingCategories.includes(c.value)).map((c) => c.label).join(", ")})
                </span>
              )}
            </h2>
            {interestListings.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                {interestingCategories.length === 0 ? (
                  <>
                    <Link href="/dashboard/profile/edit" className="text-primary-600 hover:text-primary-700 font-medium">
                      Add interesting categories
                    </Link>
                    {" "}in your profile for personalized ads.
                  </>
                ) : (
                  "No ads in your categories yet. Browse the Marketplace."
                )}
              </p>
            ) : (
              <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[700px]:grid-cols-4 gap-3">
                {interestListings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/dashboard/marketplace/listing/${listing.id}`}
                    className="flex flex-col overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                      {(() => {
                        const raw = listing.images;
                        let imgs: string[] = [];
                        if (Array.isArray(raw)) imgs = raw.filter((x): x is string => typeof x === "string").slice(0, 4);
                        else if (typeof raw === "string") {
                          try {
                            const p = JSON.parse(raw);
                            imgs = Array.isArray(p) ? p.filter((x: unknown): x is string => typeof x === "string").slice(0, 4) : [];
                          } catch {
                            imgs = [];
                          }
                        }
                        if (imgs.length >= 2) {
                          return (
                            <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
                              {imgs.map((url, i) => (
                                <img key={i} src={url} alt="" className="h-full w-full object-cover" />
                              ))}
                            </div>
                          );
                        }
                        if (imgs.length === 1) {
                          return <img src={imgs[0]} alt="" className="h-full w-full object-cover" />;
                        }
                        return (
                          <span className="text-2xl text-gray-300">
                            {LISTING_CATEGORIES.find((c) => c.value === listing.category)?.icon ?? "📦"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-2">
                      <p className="font-medium text-gray-900 truncate text-sm">{listing.title}</p>
                      {listing.price != null && (
                        <p className="text-xs text-primary-600 font-medium">Rs. {Number(listing.price).toLocaleString()}</p>
                      )}
                      {listing.location && <p className="text-xs text-gray-500 truncate">{listing.location}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/marketplace"
              className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all in Marketplace →
            </Link>
          </section>

            </>
          )}
      </div>
    </DashboardScaffold>
  );
}
