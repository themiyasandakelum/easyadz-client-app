"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "@/lib/auth";
import { DashboardDrawer } from "./DashboardDrawer";
import { DashboardSidebarContent } from "./DashboardSidebarContent";
import { DashboardBottomNav } from "./DashboardBottomNav";
import { VerificationStatus } from "@/app/components/VerificationStatus";

const SIDEBAR_PIN_KEY = "dashboard-sidebar-pinned";
const SIDEBAR_COLLAPSED_KEY = "dashboard-sidebar-collapsed";

interface DashboardScaffoldProps {
  children: React.ReactNode;
  /** Optional custom header content (e.g. page title). Renders next to the menu button. */
  headerContent?: React.ReactNode;
}

function getStoredPin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_PIN_KEY) === "true";
  } catch {
    return false;
  }
}

function getStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function DashboardScaffold({ children, headerContent }: DashboardScaffoldProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"verified" | "pending" | "none">("pending");
  const [loading, setLoading] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [messageUnread, setMessageUnread] = useState(0);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPinned(getStoredPin());
    setCollapsed(getStoredCollapsed());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileDropdownOpen]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    async function fetchCounts(token: string) {
      const [notifRes, msgRes] = await Promise.all([
        fetch("/api/notifications/count", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/chat/unread-count", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotificationUnread(notifData.unread ?? 0);
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessageUnread(msgData.unread ?? 0);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }
      setUserName(user.displayName ?? user.email ?? "You");
      setUserPhotoUrl(user.photoURL ?? null);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          router.replace("/register");
          return;
        }
        if (res.ok) {
          const profile = await res.json();
          if (profile.status === "banned") {
            await signOut();
            router.replace("/suspended");
            return;
          }
          setVerificationStatus(profile.verification_status ?? "pending");
          setProfileAvatarUrl(profile.avatar_url ?? null);
        }
        await fetchCounts(token);
      } catch {
        // keep on dashboard
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    const refetchOnFocus = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const [notifRes, msgRes] = await Promise.all([
          fetch("/api/notifications/count", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/chat/unread-count", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (notifRes.ok) {
          const d = await notifRes.json();
          setNotificationUnread(d.unread ?? 0);
        }
        if (msgRes.ok) {
          const d = await msgRes.json();
          setMessageUnread(d.unread ?? 0);
        }
      } catch {
        // Ignore network errors (offline, failed to fetch, etc.)
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refetchOnFocus();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const id = setInterval(refetchOnFocus, 60000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(id);
    };
  }, []);

  function handlePinToggle() {
    const next = !pinned;
    setPinned(next);
    setDrawerOpen(false);
    try {
      localStorage.setItem(SIDEBAR_PIN_KEY, String(next));
    } catch {
      // ignore
    }
  }

  function handleCollapseToggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // ignore
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/signin");
  }

  const avatarUrl = profileAvatarUrl ?? userPhotoUrl;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
        <div className="text-primary-700 font-medium">Loading…</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Pinned sidebar - only on desktop (min-[600px]) */}
      {pinned && (
        <div className="hidden min-[600px]:block relative">
          <DashboardSidebarContent
            userName={userName}
            userAvatarUrl={avatarUrl}
            verificationStatus={verificationStatus}
            collapsed={collapsed}
            onPinToggle={handlePinToggle}
            onCollapseToggle={handleCollapseToggle}
            pinned={true}
            fetchListings={true}
          />
        </div>
      )}

      {/* Overlay drawer - when not pinned */}
      {!pinned && (
        <DashboardDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userName={userName}
          userAvatarUrl={avatarUrl}
          verificationStatus={verificationStatus}
          onPinToggle={handlePinToggle}
        />
      )}

      <div className="flex flex-1 flex-col min-h-screen pb-20 min-[600px]:pb-0">
        {/* Top Bar: when pinned, hide menu + profile; when not pinned, show full header */}
        <header className="sticky top-0 z-30 border-b border-primary-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-full items-center gap-3 px-2 min-[600px]:px-4 py-3">
            {!pinned && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <Link
              href="/dashboard"
              className="flex items-center shrink-0"
              aria-label="easyadz.lk"
            >
              <img
                src="/easyadz-logo.png"
                alt="easyadz.lk"
                className="h-12 min-[600px]:h-14 w-auto object-contain"
              />
            </Link>

            {headerContent && <div className="flex-1 min-w-0">{headerContent}</div>}

            <Link
              href="/dashboard/search"
              className="ml-auto flex items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 min-w-[88px] text-sm font-medium text-gray-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition shadow-sm shrink-0"
            >
              <svg className="h-5 w-5 shrink-0 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find
            </Link>

            <Link
              href="/dashboard/notifications"
              className="relative flex items-center justify-center h-10 w-10 rounded-full hover:bg-primary-50 transition shrink-0 ml-3"
              aria-label="Notifications"
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notificationUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {notificationUnread > 99 ? "99+" : notificationUnread}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/messages"
              className="relative flex items-center justify-center h-10 w-10 rounded-full hover:bg-primary-50 transition shrink-0 ml-3"
              aria-label={messageUnread > 0 ? `Messages (${messageUnread} unread)` : "Messages"}
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {messageUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {messageUnread > 99 ? "99+" : messageUnread}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/verification"
              className="flex items-center shrink-0 ml-2 min-[600px]:ml-3"
              title={verificationStatus === "verified" ? "Verified" : verificationStatus === "pending" ? "Verification pending" : "Get verified"}
            >
              {verificationStatus === "verified" ? (
                <VerificationStatus isVerified={true} />
              ) : (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    verificationStatus === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {verificationStatus === "pending" ? "⏳ Pending" : "Not verified"}
                </span>
              )}
            </Link>

            <div
              ref={profileDropdownRef}
              className="relative flex items-center shrink-0 ml-3"
            >
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((o) => !o)}
                className="relative flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary-300"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-primary-200 hover:ring-primary-300 transition"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-200 text-primary-800 font-semibold text-sm hover:bg-primary-300 transition">
                    {userName?.charAt(0) ?? "?"}
                  </div>
                )}
                {verificationStatus === "verified" && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-[#1877F2] w-5 h-5 text-white"
                    title="Verified"
                    aria-label="Verified"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M20.707 5.293a1 1 0 010 1.414l-11 11a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 15.586 19.293 5.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {verificationStatus === "pending" && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-500 p-1"
                    title="Verification Pending"
                    aria-label="Verification Pending"
                  >
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white py-2 shadow-lg z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 truncate">{userName}</p>
                    <p className="text-xs text-gray-500">
                      {verificationStatus === "verified"
                        ? "Verified"
                        : verificationStatus === "pending"
                          ? "Verification pending"
                          : "Complete profile"}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/profile/edit"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
                  >
                    Edit profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition text-left"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0">{children}</main>

        <DashboardBottomNav />
      </div>
    </div>
  );
}
