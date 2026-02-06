"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { getIdToken } from "@/lib/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LISTING_CATEGORIES } from "@/lib/listings-types";

interface ListingItem {
  id: string;
  seller_id: string;
  category: string;
  title: string;
  price: number | null;
  location: string | null;
  status: string;
  images: string[] | null;
  created_at: string;
  seller_name: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    approved: "bg-green-500/20 text-green-400 border-green-500/40",
    rejected: "bg-red-500/20 text-red-400 border-red-500/40",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-slate-500/20 text-slate-400"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface ListingDetail {
  id: string;
  title: string;
  category: string;
  price: number | null;
  location: string | null;
  description: string | null;
  attributes: Record<string, string> | null;
  images: string[] | string | null;
  status: string;
  seller_name: string;
  created_at: string;
}

function AdminListingsContent() {
  const searchParams = useSearchParams();
  const sellerFilter = useMemo(() => searchParams.get("seller") || null, [searchParams]);
  const [items, setItems] = useState<ListingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ListingDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Please sign in.");
        return;
      }
      const params = new URLSearchParams({ status: statusFilter });
      if (sellerFilter) params.set("seller", sellerFilter);
      const res = await fetch(`/api/admin/listings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load listings.");
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: action === "approve" ? "approved" : "rejected" } : i
          )
        );
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Action failed.");
      }
    } catch {
      alert("Action failed.");
    } finally {
      setActioning(null);
    }
  }

  async function handleView(id: string) {
    setViewLoading(true);
    setViewing(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/listings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        let images: string[] = [];
        if (data.images) {
          if (Array.isArray(data.images)) images = data.images;
          else if (typeof data.images === "string") {
            try {
              const p = JSON.parse(data.images);
              images = Array.isArray(p) ? p : [];
            } catch {
              images = [];
            }
          }
        }
        let attributes: Record<string, string> | null = null;
        if (data.attributes) {
          if (typeof data.attributes === "object" && data.attributes !== null) attributes = data.attributes;
          else if (typeof data.attributes === "string") {
            try {
              const a = JSON.parse(data.attributes);
              attributes = typeof a === "object" && a !== null ? a : null;
            } catch {
              attributes = null;
            }
          }
        }
        setViewing({ ...data, images, attributes });
      }
    } catch {
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-slate-400">Loading listings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Listing Moderation</h1>
          {sellerFilter && (
            <p className="mt-1 text-sm text-slate-400">
              Filtered by seller: {items[0]?.seller_name ?? "—"}
              <Link
                href="/admin/listings"
                className="ml-2 text-amber-400 hover:text-amber-300"
              >
                Clear filter
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                statusFilter === opt.value
                  ? "bg-amber-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {items.length === 0 && !error && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center text-slate-400">
          No listings found.
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Ad</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Title</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Category</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Price</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Seller</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">Created</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-700/50 hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-2">
                      <div className="h-10 w-14 overflow-hidden rounded-lg bg-slate-700">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-lg text-slate-500">
                            {LISTING_CATEGORIES.find((c) => c.value === item.category)?.icon ?? "📦"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <p className="max-w-[200px] truncate font-medium text-white">{item.title}</p>
                      {item.location && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.location}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-slate-400 capitalize">{item.category}</span>
                    </td>
                    <td className="px-3 py-2">
                      {item.price != null ? (
                        <span className="text-sm font-medium text-green-400">
                          Rs. {Number(item.price).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-400">{item.seller_name}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(item.id)}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          View
                        </button>
                        <Link
                          href={`/dashboard/marketplace/listing/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                          title={item.status === "pending" ? "Preview how this ad will appear to users" : "Open listing page"}
                        >
                          {item.status === "pending" ? "Preview" : "Open"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, "approve")}
                          disabled={actioning === item.id || item.status === "approved"}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                            item.status === "approved"
                              ? "bg-slate-600 text-slate-400 cursor-default"
                              : "bg-green-600 text-white hover:bg-green-500"
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, "reject")}
                          disabled={actioning === item.id || item.status === "rejected"}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                            item.status === "rejected"
                              ? "bg-slate-600 text-slate-400 cursor-default"
                              : "bg-red-600 text-white hover:bg-red-500"
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View modal for checking pending ads */}
      {(viewing || viewLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => !viewLoading && setViewing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {viewLoading ? (
              <div className="py-12 text-center text-slate-400">Loading...</div>
            ) : viewing ? (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{viewing.title}</h2>
                    {viewing.status === "pending" && (
                      <p className="mt-1 text-sm text-amber-400">Review for moderation — check content before approving</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewing(null)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    {viewing.images && Array.isArray(viewing.images) && viewing.images.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {viewing.images.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-32 w-40 shrink-0 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-32 w-40 items-center justify-center rounded-lg bg-slate-700 text-4xl text-slate-500">
                        {LISTING_CATEGORIES.find((c) => c.value === viewing.category)?.icon ?? "📦"}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">Category:</span>
                    <span className="text-slate-300 capitalize">{viewing.category}</span>
                    <span className="text-slate-500">Price:</span>
                    <span className="text-green-400">
                      {viewing.price != null ? `Rs. ${Number(viewing.price).toLocaleString()}` : "—"}
                    </span>
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-300">{viewing.location || "—"}</span>
                    <span className="text-slate-500">Seller:</span>
                    <span className="text-slate-300">{viewing.seller_name}</span>
                    <span className="text-slate-500">Status:</span>
                    <StatusBadge status={viewing.status} />
                  </div>
                  {viewing.description && (
                    <div>
                      <p className="text-slate-500 text-sm">Description</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-300">{viewing.description}</p>
                    </div>
                  )}
                  {viewing.attributes && Object.keys(viewing.attributes).length > 0 && (
                    <div>
                      <p className="text-slate-500 text-sm">Details</p>
                      <p className="mt-1 text-slate-300">
                        {Object.entries(viewing.attributes)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" • ")}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                      {viewing.status === "pending" && (
                        <Link
                          href={`/dashboard/marketplace/listing/${viewing.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          Preview as user
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          handleAction(viewing.id, "approve");
                          setViewing(null);
                        }}
                        disabled={actioning === viewing.id || viewing.status === "approved"}
                        className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                          viewing.status === "approved"
                            ? "bg-slate-600 text-slate-400 cursor-default"
                            : "bg-green-600 text-white hover:bg-green-500"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleAction(viewing.id, "reject");
                          setViewing(null);
                        }}
                        disabled={actioning === viewing.id || viewing.status === "rejected"}
                        className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                          viewing.status === "rejected"
                            ? "bg-slate-600 text-slate-400 cursor-default"
                            : "bg-red-600 text-white hover:bg-red-500"
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="text-slate-300 font-medium">Loading…</div></div>}>
      <AdminListingsContent />
    </Suspense>
  );
}
