"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getIdToken } from "@/lib/auth";

interface Report {
  id: string;
  listingId: string;
  reason: string | null;
  details: string | null;
  status: string;
  createdAt: string;
  listing: {
    title: string;
    category: string;
    price: number | null;
    imageUrl: string | null;
  };
  reporterName: string;
  sellerName: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "ad_deleted", label: "Ad Deleted" },
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load reports (${res.status})`);
      }
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleAction(reportId: string, action: "approve" | "delete_ad") {
    const token = await getIdToken();
    if (!token) return;
    setActingId(reportId);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/${reportId}?action=${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to process report");
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process report.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Ad Moderation</h1>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center text-slate-400">
          Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center text-slate-400">
          No reports found.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex flex-col sm:flex-row gap-4"
            >
              <div className="shrink-0">
                {report.listing.imageUrl ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-700">
                    <img
                      src={report.listing.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-slate-700 flex items-center justify-center text-slate-500 text-2xl">
                    📷
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">
                  {report.listing.title}
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  {report.listing.category}
                  {report.listing.price != null &&
                    ` • Rs. ${Number(report.listing.price).toLocaleString()}`}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Seller: {report.sellerName} • Reported by: {report.reporterName}
                </p>
                {report.reason && (
                  <p className="text-amber-400/90 text-sm mt-1">
                    Reason: {report.reason}
                  </p>
                )}
                {report.details && (
                  <p className="text-slate-400 text-sm mt-0.5">
                    {report.details}
                  </p>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0 items-start">
                <Link
                  href={`/dashboard/marketplace/listing/${report.listingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  View Ad
                </Link>
                {statusFilter === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAction(report.id, "approve")}
                      disabled={actingId === report.id}
                      className="rounded-lg bg-green-600/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition"
                    >
                      {actingId === report.id ? "..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(report.id, "delete_ad")}
                      disabled={actingId === report.id}
                      className="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition"
                    >
                      {actingId === report.id ? "..." : "Delete Ad"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
