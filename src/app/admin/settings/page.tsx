"use client";

import { useState, useEffect, useCallback } from "react";
import { getIdToken } from "@/lib/auth";

const SETTING_KEYS = [
  { key: "featured_ad_price", label: "Featured Ad Price (Rs.)", type: "number" },
  { key: "contact_reveal_credits", label: "Contact Reveal Credits", type: "number" },
];

interface SystemConfigRow {
  key: string;
  value_text: string | null;
  value_numeric: number | null;
  is_enabled: boolean;
  description: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [systemConfig, setSystemConfig] = useState<SystemConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMonetization, setSavingMonetization] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [monetizationSuccess, setMonetizationSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch("/api/admin/settings/all", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load settings");
      }
      const data = await res.json();
      setSettings(data.settings ?? {});
      setSystemConfig(Array.isArray(data.systemConfig) ? data.systemConfig : []);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out. The server may be slow. Please try again."
          : err instanceof Error
            ? err.message
            : "Failed to load settings.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

  async function handleMonetizationSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) return;
    setSavingMonetization(true);
    setError(null);
    setMonetizationSuccess(false);
    try {
      const body: Record<
        string,
        { is_enabled?: boolean; value_numeric?: number }
      > = {};
      for (const row of systemConfig) {
        if (row.key === "enable_ad_pricing") {
          body[row.key] = { is_enabled: row.is_enabled };
        } else if (
          row.key === "price_featured_ad" ||
          row.key === "price_verification_fee"
        ) {
          const num = row.value_numeric ?? 0;
          body[row.key] = { value_numeric: Number(num) };
        }
      }
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save monetization settings");
      }
      setMonetizationSuccess(true);
      setTimeout(() => setMonetizationSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingMonetization(false);
    }
  }

  function getConfigValue(key: string): SystemConfigRow | undefined {
    return systemConfig.find((r) => r.key === key);
  }

  function updateConfig(
    key: string,
    updates: Partial<Pick<SystemConfigRow, "is_enabled" | "value_numeric">>
  ) {
    setSystemConfig((prev) => {
      const found = prev.some((r) => r.key === key);
      if (found) {
        return prev.map((r) => (r.key === key ? { ...r, ...updates } : r));
      }
      return [...prev, { key, value_text: null, value_numeric: null, is_enabled: false, description: null, ...updates }];
    });
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Settings</h1>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center text-slate-400">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Settings</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm flex items-center justify-between gap-4 flex-wrap">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadSettings()}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition"
          >
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-green-400 text-sm">
          Settings saved successfully.
        </div>
      )}

      {/* Monetization: Master switch + prices */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">
          Monetization
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Flip the switch to turn on pricing across the app. No code deploy needed.
        </p>

        {monetizationSuccess && (
          <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-green-400 text-sm">
            Monetization settings saved. All users will see the new prices.
          </div>
        )}

        <form
          onSubmit={handleMonetizationSubmit}
          className="rounded-xl border border-slate-700 bg-slate-800 p-6 max-w-lg"
        >
          <div className="space-y-5">
            {/* Master switch */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Enable Ad Pricing
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  When ON, users see prices for featured ads and verification.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={
                  getConfigValue("enable_ad_pricing")?.is_enabled ?? false
                }
                onClick={() =>
                  updateConfig("enable_ad_pricing", {
                    is_enabled: !(getConfigValue("enable_ad_pricing")?.is_enabled ?? false),
                  })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                  getConfigValue("enable_ad_pricing")?.is_enabled
                    ? "bg-amber-500"
                    : "bg-slate-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                    getConfigValue("enable_ad_pricing")?.is_enabled
                      ? "translate-x-5"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Price inputs */}
            <div>
              <label
                htmlFor="price_featured_ad"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Featured Ad Price (Rs.)
              </label>
              <input
                id="price_featured_ad"
                type="number"
                min="0"
                step="1"
                value={
                  getConfigValue("price_featured_ad")?.value_numeric ?? ""
                }
                onChange={(e) =>
                  updateConfig("price_featured_ad", {
                    value_numeric: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="500"
              />
            </div>
            <div>
              <label
                htmlFor="price_verification_fee"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Verification Fee (Rs.)
              </label>
              <input
                id="price_verification_fee"
                type="number"
                min="0"
                step="1"
                value={
                  getConfigValue("price_verification_fee")?.value_numeric ?? ""
                }
                onChange={(e) =>
                  updateConfig("price_verification_fee", {
                    value_numeric: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="250"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={savingMonetization}
              className="rounded-lg bg-amber-600 px-6 py-2.5 font-medium text-white hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {savingMonetization ? "Saving..." : "Save Monetization"}
            </button>
          </div>
        </form>
      </section>

      {/* Other settings (app_settings) */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          Other Settings
        </h2>
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
      </section>
    </div>
  );
}
