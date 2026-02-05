"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "@/lib/auth";

const SIDEBAR_ITEMS = [
  { href: "/admin/users", label: "User Management", icon: "👥" },
  { href: "/admin/verifications", label: "Verifications", icon: "✓" },
  { href: "/admin/listings", label: "Listing Moderation", icon: "📋" },
  { href: "/admin/reports", label: "Ad Reports", icon: "🚩" },
  { href: "/admin/settings", label: "Pricing Settings", icon: "💰" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setIsAdmin(false);
        router.replace("/admin/signin");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || res.status === 404) {
          setLoading(false);
          setIsAdmin(false);
          router.replace("/admin/signin");
          return;
        }
        const profile = await res.json();
        const role = profile?.role;
        if (role !== "admin") {
          setLoading(false);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Don't apply admin layout to sign-in page
  if (pathname === "/admin/signin") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-300 font-medium">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="text-center text-slate-300">
          <p className="text-lg font-medium mb-2">Admin access required.</p>
          <p className="text-sm text-slate-400 mb-4">
            Your account does not have admin privileges.
          </p>
          <Link
            href="/admin/signin"
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            Sign in as admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-56" : "w-16"
        } bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-200`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <span className="font-bold text-white text-lg">EasyAdz Admin</span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  active
                    ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-slate-700">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <span className="text-xl">🏠</span>
            {sidebarOpen && <span>Back to site</span>}
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/admin/signin");
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
