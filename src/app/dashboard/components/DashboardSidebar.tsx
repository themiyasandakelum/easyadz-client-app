"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/search", label: "Search", icon: "🔍" },
  { href: "/dashboard/messages", label: "Messages", icon: "💬" },
  { href: "/dashboard/premium", label: "Premium", icon: "⭐" },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden min-[600px]:flex w-20 min-[900px]:w-56 flex-col border-r border-primary-100 bg-white/95 backdrop-blur shrink-0"
      aria-label="Dashboard navigation"
    >
      <nav className="flex flex-col gap-1 p-3 min-[900px]:p-4">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition min-[900px]:px-4 ${
                isActive
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-600 hover:bg-primary-50 hover:text-gray-900"
              }`}
            >
              <span className="text-xl min-[900px]:text-lg" aria-hidden>
                {icon}
              </span>
              <span className="hidden min-[900px]:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
