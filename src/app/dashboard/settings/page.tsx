"use client";

import Link from "next/link";
import { DashboardScaffold } from "../components/DashboardScaffold";

export default function SettingsPage() {
  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900">Settings</h1>}>
      <div className="mx-auto max-w-lg min-[600px]:max-w-6xl px-4 py-6">
        <div className="space-y-4">
          <Link
            href="/dashboard/profile/edit"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-primary-200 transition"
          >
            <span className="font-medium text-gray-900">Edit Profile</span>
            <span className="text-primary-600">→</span>
          </Link>
          <Link
            href="/dashboard/premium"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-primary-200 transition"
          >
            <span className="font-medium text-gray-900">Premium</span>
            <span className="text-primary-600">→</span>
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="font-medium text-gray-900 mb-1">Notifications</p>
            <p className="text-sm text-gray-500">Manage notification preferences. (Coming soon)</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="font-medium text-gray-900 mb-1">Privacy</p>
            <p className="text-sm text-gray-500">Control your privacy settings. (Coming soon)</p>
          </div>
        </div>
      </div>
    </DashboardScaffold>
  );
}
