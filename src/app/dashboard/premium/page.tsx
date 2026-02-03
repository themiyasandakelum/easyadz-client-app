"use client";

import Link from "next/link";
import { DashboardScaffold } from "../components/DashboardScaffold";

export default function DashboardPremiumPage() {
  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900">Premium</h1>}>
      <div className="mx-auto max-w-lg min-[600px]:max-w-6xl px-4 py-8">
        <p className="text-gray-600 text-sm mb-6">
          Premium features and plans will go here.
        </p>
        <Link href="/dashboard" className="text-primary-600 font-medium text-sm">
          ← Back to dashboard
        </Link>
      </div>
    </DashboardScaffold>
  );
}
