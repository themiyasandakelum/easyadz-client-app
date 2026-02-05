"use client";

import { useState, useEffect, useCallback } from "react";
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
  status?: string;
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

  const fetchListings = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/listings?mine=true&limit=50&_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    const onFocus = () => fetchListings();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchListings]);

  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900">My Active Ads</h1>}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-gray-600">
            Manage your listings. Bump up or edit to get more visibility.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setLoading(true); fetchListings(); }}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
            <Link
              href="/dashboard/post-ad"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Post New Ad
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 border-b border-gray-100 last:border-0" />
              ))}
            </div>
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
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/marketplace/listing/${listing.id}`} className="block">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {listing.images?.[0] ? (
                            <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xl text-gray-300">
                              {LISTING_CATEGORIES.find((c) => c.value === listing.category)?.icon ?? "📦"}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/marketplace/listing/${listing.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600 truncate max-w-[200px] block"
                      >
                        {listing.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          listing.status === "approved"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : listing.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {listing.status === "approved" ? "Approved" : listing.status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        {LISTING_CATEGORIES.find((c) => c.value === listing.category)?.icon}
                        <span className="capitalize">{listing.category}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {listing.price != null ? (
                        <span className="font-medium text-green-700">Rs. {Number(listing.price).toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 truncate max-w-[180px] block" title={getListingSubtitle(listing) || listing.location || ""}>
                        {getListingSubtitle(listing) || listing.location || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/post-ad?edit=${listing.id}`}
                          className="rounded-lg border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                          title="Bump Up (coming soon)"
                        >
                          Bump Up
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardScaffold>
  );
}
