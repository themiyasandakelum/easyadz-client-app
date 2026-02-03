"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";

interface PendingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_name: string | null;
  sender_avatar_url: string | null;
  sender_profession: string | null;
  sender_location: string | null;
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

export default function DashboardPendingRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<{ id: string; direction: "accept" | "decline" } | null>(null);

  const ANIM_DURATION = 300;

  const fetchRequests = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch("/api/interests/pending", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("Failed to load pending requests.");
      return;
    }
    const data = await res.json();
    setRequests(Array.isArray(data) ? data : []);
    setError(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  async function handleAccept(req: PendingRequest) {
    setActingId(req.id);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/interests/${req.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "accepted" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to accept");
      setExitingId({ id: req.id, direction: "accept" });
      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        setExitingId(null);
        setActingId(null);
      }, ANIM_DURATION);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept.");
      setActingId(null);
    }
  }

  async function handleDecline(req: PendingRequest) {
    setActingId(req.id);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/interests/${req.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "rejected" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to decline");
      setExitingId({ id: req.id, direction: "decline" });
      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        setExitingId(null);
        setActingId(null);
      }, ANIM_DURATION);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to decline.");
      setActingId(null);
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
      await fetchRequests();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchRequests]);

  return (
    <DashboardScaffold
      headerContent={
        <h1 className="text-lg font-semibold text-gray-900">Pending requests</h1>
      }
    >
      <div className="mx-auto max-w-lg min-[600px]:max-w-2xl px-4 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Dashboard
        </Link>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            People who sent you an interest. Accept or decline.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60 transition"
            aria-label="Refresh list"
          >
            <svg
              className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-gray-500">Loading…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-primary-100 bg-white p-8 text-center">
            <p className="text-gray-500 text-sm">No pending requests.</p>
            <Link
              href="/dashboard/search"
              className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Find matches →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3 overflow-hidden">
            {requests.map((req) => {
              const isExiting = exitingId?.id === req.id;
              const slideClass =
                isExiting && exitingId?.direction === "accept"
                  ? "translate-x-full opacity-0"
                  : isExiting && exitingId?.direction === "decline"
                    ? "-translate-x-full opacity-0"
                    : "translate-x-0 opacity-100";
              return (
              <li
                key={req.id}
                className={`flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out ${slideClass}`}
              >
                <Link
                  href={`/dashboard/profile/${req.sender_id}`}
                  className="shrink-0"
                >
                  {req.sender_avatar_url ? (
                    <img
                      src={req.sender_avatar_url}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center text-xl font-semibold text-primary-700">
                      {req.sender_name?.charAt(0) ?? "?"}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/profile/${req.sender_id}`}
                    className="font-medium text-gray-900 hover:text-primary-600 truncate block"
                  >
                    {req.sender_name ?? "Unknown"}
                  </Link>
                  {req.sender_profession && (
                    <p className="text-sm text-gray-600 truncate">
                      {req.sender_profession}
                    </p>
                  )}
                  {req.sender_location && (
                    <p className="text-xs text-gray-500 truncate">
                      {req.sender_location}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTimeAgo(req.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAccept(req)}
                    disabled={actingId === req.id}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition"
                  >
                    {actingId === req.id ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(req)}
                    disabled={actingId === req.id}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition"
                  >
                    {actingId === req.id ? "…" : "Decline"}
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </DashboardScaffold>
  );
}
