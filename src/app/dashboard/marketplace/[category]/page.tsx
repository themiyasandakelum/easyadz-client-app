"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardScaffold } from "../../components/DashboardScaffold";
import { LISTING_CATEGORIES } from "@/lib/listings-types";

const VALID_CATEGORIES = LISTING_CATEGORIES.map((c) => c.value);

export default function MarketplaceCategoryPage() {
  const params = useParams();
  const category = params?.category as string;
  const cat = LISTING_CATEGORIES.find((c) => c.value === category);

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Category not found.</p>
          <Link href="/dashboard" className="text-primary-600 font-medium">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardScaffold>
      <div className="mx-auto max-w-2xl px-4 py-6">
            <Link href="/dashboard" className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
              ← Back to dashboard
            </Link>
            <h1 className="text-xl font-bold text-primary-800 mb-2">
              {cat?.icon} {cat?.label}
            </h1>
            <p className="text-sm text-gray-600 mb-6">{cat?.monetization}</p>
            <p className="text-gray-500 text-sm mb-6">
              Listings for this category will appear here. Connect to GET /api/listings?category=... later.
            </p>
            <Link
              href="/dashboard/post-ad"
              className="inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Post an Ad
            </Link>
      </div>
    </DashboardScaffold>
  );
}
