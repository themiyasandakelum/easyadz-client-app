"use client";

import Link from "next/link";
import { DashboardScaffold } from "../components/DashboardScaffold";

export default function SavedPage() {
  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900">Saved / Favorites</h1>}>
      <div className="mx-auto max-w-lg min-[600px]:max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <span className="text-4xl block mb-3" aria-hidden>❤️</span>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Saved items</h2>
          <p className="text-gray-600 mb-4">
            Items you save will appear here. Browse the marketplace to add favorites.
          </p>
          <Link
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </DashboardScaffold>
  );
}
