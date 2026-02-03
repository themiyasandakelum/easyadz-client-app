"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { LISTING_CATEGORIES } from "@/lib/listings-types";

interface MyListing {
  id: string;
  title: string;
  price: number | null;
  category: string;
  location: string | null;
  images: string[] | null;
  attributes?: Record<string, string>;
}

function getListingSubtitle(listing: MyListing): string {
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

export default function MyAdsPage() {
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/listings?mine=true&limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setListings(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900">My Active Ads</h1>}>
      <div className="mx-auto max-w-lg min-[600px]:max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Manage your listings. Bump up or edit to get more visibility.
          </p>
          <Link
            href="/dashboard/post-ad"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Post New Ad
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[600px]:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white h-48 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <span className="text-4xl block mb-3" aria-hidden>📋</span>
            <p className="text-gray-600 mb-4">You haven&apos;t posted any ads yet.</p>
            <Link
              href="/dashboard/post-ad"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Post your first ad
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[600px]:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <Link
                  href={`/dashboard/marketplace/listing/${listing.id}`}
                  className="flex flex-col flex-1"
                >
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl text-gray-300">
                        {LISTING_CATEGORIES.find((c) => c.value === listing.category)?.icon ?? "📦"}
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{getListingSubtitle(listing)}</p>
                    {listing.price != null && (
                      <p className="text-sm font-medium text-green-700 mt-1">Rs. {Number(listing.price).toLocaleString()}</p>
                    )}
                  </div>
                </Link>
                <div className="flex gap-2 p-3 border-t border-gray-100">
                  <Link
                    href={`/dashboard/marketplace/listing/${listing.id}`}
                    className="flex-1 text-center rounded-lg border border-primary-200 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    title="Bump Up (coming soon)"
                  >
                    Bump Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardScaffold>
  );
}
