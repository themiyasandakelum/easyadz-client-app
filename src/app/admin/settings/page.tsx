"use client";

import { useState, useEffect } from "react";
import { getIdToken } from "@/lib/auth";

const SETTING_KEYS = [
  { key: "featured_ad_price", label: "Featured Ad Price (Rs.)", type: "number" },
  { key: "contact_reveal_credits", label: "Contact Reveal Credits", type: "number" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load settings");
        }
        const data = await res.json();
        setSettings(data.settings ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const body: Record<string, string> = {};
      for (const { key } of SETTING_KEYS) {
        const val = settings[key];
        if (val !== undefined && val !== "") {
          body[key] = String(val);
        }
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Pricing Settings</h1>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center text-slate-400">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Pricing Settings</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-green-400 text-sm">
          Settings saved successfully.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-700 bg-slate-800 p-6 max-w-lg"
      >
        <div className="space-y-4">
          {SETTING_KEYS.map(({ key, label, type }) => (
            <div key={key}>
              <label
                htmlFor={key}
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                {label}
              </label>
              <input
                id={key}
                type={type}
                value={settings[key] ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-6 py-2.5 font-medium text-white hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
