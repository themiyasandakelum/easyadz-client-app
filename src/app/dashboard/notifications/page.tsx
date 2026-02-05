"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";

interface Notification {
  id: number;
  sender_id: string;
  title: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
  notification_type?: string;
  link?: string | null;
  sender_name: string | null;
  sender_avatar_url: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function DashboardNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchNotifications() {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("Failed to load notifications.");
      return;
    }
    const data = await res.json();
    setNotifications(Array.isArray(data) ? data : []);
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      const token = await getIdToken();
      if (token) {
        await fetch(`/api/notifications/${n.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
      }
    }
    // Use link when available (verification → /dashboard/verification, interest → pending-requests or profile)
    if (n.link) {
      router.push(n.link);
    } else {
      router.push(`/dashboard/profile/${n.sender_id}`);
    }
  }

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
      await fetchNotifications();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardScaffold
      headerContent={
        <h1 className="text-lg font-semibold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </h1>
      }
    >
      <div className="mx-auto max-w-lg min-[600px]:max-w-2xl px-4 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Dashboard
        </Link>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-gray-500">Loading…</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="text-gray-500 text-sm py-8">No notifications yet.</p>
        ) : (
          <ul className="space-y-1">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className="w-full flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-primary-50 hover:border-primary-200"
                >
                  <div className="relative shrink-0">
                    {n.notification_type === "verification" ? (
                      <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-xl" title="Verification">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-600">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 0 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : n.sender_avatar_url ? (
                      <img
                        src={n.sender_avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-lg font-semibold text-primary-700">
                        {n.sender_name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    {!n.is_read && (
                      <span
                        className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {n.title ?? "Notification"}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {n.body ?? ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardScaffold>
  );
}
