"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getIdToken } from "@/lib/auth";

interface User {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  status: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "200");
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load users (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function toggleStatus(user: User) {
    const token = await getIdToken();
    if (!token) return;
    const newStatus = user.status === "active" ? "banned" : "active";
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: newStatus } : u
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">User Management</h1>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name, phone, or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    Name
                  </th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    Phone
                  </th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    User ID
                  </th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    Role
                  </th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    Verification
                  </th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    Status
                  </th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30"
                  >
                    <td className="px-3 py-2 text-white font-medium">
                      {user.name || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {user.phone || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-sm font-mono truncate max-w-[180px]">
                      {user.userId}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-600/50 text-slate-400"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.isVerified
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-600/50 text-slate-400"
                        }`}
                      >
                        {user.isVerified ? "Verified" : "Not verified"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/listings?seller=${user.id}`}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          View ads
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleStatus(user)}
                          disabled={togglingId === user.id || user.role === "admin"}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.status === "active"
                              ? "bg-red-600/80 text-white hover:bg-red-600"
                              : "bg-green-600/80 text-white hover:bg-green-600"
                          }`}
                        >
                          {togglingId === user.id
                            ? "..."
                            : user.status === "active"
                              ? "Ban"
                              : "Activate"}
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
    </div>
  );
}
