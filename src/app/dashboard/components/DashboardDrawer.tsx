"use client";

import { DashboardSidebarContent } from "./DashboardSidebarContent";

interface DashboardDrawerProps {
  open: boolean;
  onClose: () => void;
  userName: string | null;
  userAvatarUrl: string | null;
  verificationStatus?: "verified" | "pending" | "none";
  pinned?: boolean;
  onPinToggle?: () => void;
}

export function DashboardDrawer({
  open,
  onClose,
  userName,
  userAvatarUrl,
  verificationStatus = "pending",
  pinned = false,
  onPinToggle,
}: DashboardDrawerProps) {
  if (!open || pinned) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 min-[600px]:bg-black/10"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl border-r border-gray-200">
        <DashboardSidebarContent
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          verificationStatus={verificationStatus}
          onClose={onClose}
          onPinToggle={onPinToggle}
          pinned={false}
          fetchListings={true}
        />
      </div>
    </>
  );
}
