"use client";

import { useState, useEffect, useCallback } from "react";
import { getIdToken } from "@/lib/auth";

interface VerificationItem {
  id: string;
  profile_id: string;
  id_image_url: string | null;
  selfie_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  name: string;
  user_id: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending_admin", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_admin: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    approved: "bg-green-500/20 text-green-400 border-green-500/40",
    rejected: "bg-red-500/20 text-red-400 border-red-500/40",
    pending_ai: "bg-slate-500/20 text-slate-400 border-slate-500/40",
  };
  const label =
    status === "pending_admin"
      ? "Pending"
      : status === "pending_ai"
        ? "Pending AI"
        : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-slate-500/20 text-slate-400"
      }`}
    >
      {label}
    </span>
  );
}

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<VerificationItem | null>(null);
  const [editing, setEditing] = useState<VerificationItem | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"approved" | "rejected">("approved");

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Please sign in.");
        return;
      }
      const params = new URLSearchParams({ status: statusFilter });
      const res = await fetch(`/api/admin/verifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load verifications.");
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load verifications.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          admin_notes: notes[id] || items.find((i) => i.id === id)?.admin_notes || undefined,
        }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setNotes((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
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

  async function handleSaveEdit() {
    if (!editing) return;
    setActioning(editing.id);
    try {
      const token = await getIdToken();
      if (!token) return;
      const body: { admin_notes?: string; status?: string } = {};
      if (editNotes !== (editing.admin_notes ?? "")) body.admin_notes = editNotes || undefined;
      const canChangeStatus =
        editing.status === "approved" ||
        editing.status === "rejected" ||
        editing.status === "pending_admin";
      if (canChangeStatus && editStatus !== editing.status) {
        body.status = editStatus;
      }
      if (Object.keys(body).length === 0) {
        setEditing(null);
        return;
      }
      const res = await fetch(`/api/admin/verifications/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setItems((prev) =>
          prev.map((i) =>
            i.id === editing.id
              ? {
                  ...i,
                  admin_notes: body.admin_notes !== undefined ? (body.admin_notes ?? null) : i.admin_notes,
                  status: body.status ?? i.status,
                }
              : i
          )
        );
        setEditing(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to update.");
      }
    } catch {
      alert("Failed to update.");
    } finally {
      setActioning(null);
    }
  }

  function openEdit(item: VerificationItem) {
    setEditing(item);
    setEditNotes(item.admin_notes ?? "");
    setEditStatus(
      item.status === "approved" || item.status === "rejected"
        ? item.status
        : "approved"
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-slate-400">Loading verifications...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Verification List</h1>
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
          No verifications found.
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-300">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-300 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-700/50 hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        Profile: {item.profile_id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(item)}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          Edit
                        </button>
                        {item.status === "pending_admin" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAction(item.id, "approve")}
                              disabled={actioning === item.id}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(item.id, "reject")}
                              disabled={actioning === item.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{viewing.name}</h2>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Profile ID: {viewing.profile_id} · Submitted:{" "}
              {new Date(viewing.created_at).toLocaleString()}
            </p>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-400">ID Photo</p>
                {viewing.id_image_url ? (
                  <a
                    href={viewing.id_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-600"
                  >
                    <img
                      src={viewing.id_image_url}
                      alt="ID"
                      className="h-48 w-full object-contain bg-slate-900"
                    />
                  </a>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-slate-500">
                    No image
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-400">Selfie</p>
                {viewing.selfie_url ? (
                  <a
                    href={viewing.selfie_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-600"
                  >
                    <img
                      src={viewing.selfie_url}
                      alt="Selfie"
                      className="h-48 w-full object-contain bg-slate-900"
                    />
                  </a>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-slate-500">
                    No image
                  </div>
                )}
              </div>
            </div>
            {viewing.admin_notes && (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-400">Admin notes</p>
                <p className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                  {viewing.admin_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-white">
              Edit · {editing.name}
            </h2>

            {(editing.status === "approved" ||
              editing.status === "rejected" ||
              editing.status === "pending_admin") && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-400">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as "approved" | "rejected")
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-400">
                Admin notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add or update notes..."
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={actioning === editing.id}
                className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {actioning === editing.id ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending: notes for approve/reject */}
      {items.some((i) => i.status === "pending_admin") && (
        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-400">
            Admin notes for pending items
          </p>
          <p className="text-xs text-slate-500">
            Use the Edit button to add notes before approving or rejecting. Notes are
            optional for approval; recommended for rejection.
          </p>
        </div>
      )}
    </div>
  );
}
