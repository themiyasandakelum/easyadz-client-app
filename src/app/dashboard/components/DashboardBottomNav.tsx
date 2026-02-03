"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/notifications", label: "Alerts", icon: "🔔" },
  { href: "/dashboard/search", label: "Search", icon: "🔍" },
  { href: "/dashboard/messages", label: "Messages", icon: "💬" },
  { href: "/dashboard/premium", label: "Premium", icon: "⭐" },
] as const;

export function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur safe-area-pb min-[600px]:hidden"
      aria-label="Dashboard navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 text-xs font-medium transition ${
                isActive
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
