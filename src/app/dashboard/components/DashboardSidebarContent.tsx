"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getIdToken } from "@/lib/auth";
import { LISTING_CATEGORIES } from "@/lib/listings-types";

interface MyListing {
  id: string;
  title: string;
  price: number | null;
  category: string;
}

const drawerNavItems = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/verification", label: "Verification", icon: "✓" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "🔔" },
  { href: "/dashboard/pending-requests", label: "Pending Requests", icon: "📩" },
  { href: "/dashboard/ai-matches", label: "AI Matrimonial Matches", icon: "💕" },
  { href: "/dashboard/my-ads", label: "My Active Ads", icon: "📋" },
  { href: "/dashboard/post-ad", label: "Post New Ad", icon: "➕" },
  { href: "/dashboard/saved", label: "Saved/Favorites", icon: "❤️" },
  { href: "/dashboard/search", label: "Matrimonial Search", icon: "💍" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
] as const;

interface DashboardSidebarContentProps {
  userName: string | null;
  userAvatarUrl: string | null;
  verificationStatus?: "verified" | "pending" | "none";
  collapsed?: boolean;
  onClose?: () => void;
  onPinToggle?: () => void;
  onCollapseToggle?: () => void;
  pinned?: boolean;
  fetchListings?: boolean;
}

export function DashboardSidebarContent({
  userName,
  userAvatarUrl,
  verificationStatus = "pending",
  collapsed = false,
  onClose,
  onPinToggle,
  onCollapseToggle,
  pinned = false,
  fetchListings = true,
}: DashboardSidebarContentProps) {
  const pathname = usePathname();
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/interests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && typeof data?.pending_received === "number") {
          setPendingCount(data.pending_received);
        }
      } catch {
        if (!cancelled) setPendingCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!fetchListings) return;
    let cancelled = false;
    (async () => {
      setLoadingListings(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/listings?mine=true&limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setMyListings(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMyListings([]);
      } finally {
        if (!cancelled) setLoadingListings(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchListings]);

  const handleLinkClick = () => onClose?.();

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-gray-200 shrink-0 transition-all duration-200 ${
        collapsed ? "w-16 min-[600px]:w-16" : "w-80 max-w-[85vw] min-[600px]:w-72"
      }`}
      aria-label="Navigation sidebar"
    >
      {/* Header */}
      <div className={`border-b border-gray-100 bg-gradient-to-br from-primary-50 to-white ${collapsed ? "p-2" : "p-4"}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-primary-200 shrink-0"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-200 text-primary-800 font-semibold shrink-0">
              {userName?.charAt(0) ?? "?"}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-gray-900 truncate">{userName ?? "User"}</p>
                {verificationStatus === "verified" && (
                  <span
                    className="shrink-0 flex items-center justify-center rounded-full bg-[#1877F2] text-white w-4 h-4"
                    title="Verified"
                    aria-label="Verified"
                  >
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M20.707 5.293a1 1 0 010 1.414l-11 11a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 15.586 19.293 5.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {verificationStatus === "verified"
                  ? "Verified"
                  : verificationStatus === "pending"
                    ? "Verification pending"
                    : "Complete profile"}
              </p>
              <Link
                href="/dashboard/profile/edit"
                onClick={handleLinkClick}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 mt-1 inline-block"
              >
                Edit profile
              </Link>
            </div>
          )}
        </div>
        {!collapsed && onPinToggle && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onPinToggle}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-700"
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              <span>{pinned ? "📌" : "📍"}</span>
              {pinned ? "Unpin" : "Pin"}
            </button>
          </div>
        )}
      </div>

      {/* Collapse/Expand arrow - when pinned */}
      {pinned && onCollapseToggle && (
        <button
          type="button"
          onClick={onCollapseToggle}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-primary-50 hover:border-primary-200 transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`h-4 w-4 text-gray-600 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-3 relative">
        <ul className="space-y-0.5">
          {drawerNavItems.map(({ href, label, icon }) => {
            const isActive = pathname === href.split("?")[0];
            const showPendingBadge = href === "/dashboard/pending-requests" && pendingCount > 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    collapsed ? "justify-center px-2" : ""
                  } ${
                    isActive
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:bg-primary-50 hover:text-gray-900"
                  }`}
                  title={collapsed ? label : undefined}
                >
                  <span className="relative text-lg shrink-0" aria-hidden>
                    {icon}
                    {showPendingBadge && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1"
                        aria-label={`${pendingCount} pending`}
                      >
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* My Active Ads - hidden when collapsed */}
        {!collapsed && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              My Active Ads
            </h3>
            {loadingListings ? (
              <div className="space-y-2 px-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <>
                <p className="px-3 text-xs text-gray-500">No ads yet.</p>
                <Link
                  href="/dashboard/post-ad"
                  onClick={handleLinkClick}
                  className="mt-2 mx-3 inline-block text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Post your first ad →
                </Link>
              </>
            ) : (
              <ul className="space-y-1">
                {myListings.map((listing) => (
                  <li key={listing.id} className="group">
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-primary-50 transition">
                      <span className="text-base shrink-0" aria-hidden>
                        {LISTING_CATEGORIES.find((c) => c.value === listing.category)?.icon ?? "📦"}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-gray-800">{listing.title}</span>
                      {listing.price != null && (
                        <span className="text-xs font-medium text-primary-600 shrink-0">
                          Rs. {Number(listing.price).toLocaleString()}
                        </span>
                      )}
                      <div className="flex gap-1 shrink-0">
                        <Link
                          href={`/dashboard/marketplace/listing/${listing.id}`}
                          onClick={handleLinkClick}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                          title="View"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/post-ad?edit=${listing.id}`}
                          onClick={handleLinkClick}
                          className="rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100"
                          title="Edit"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
