"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "./admin-nav";

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 bg-surface/90 pb-4 pt-2 backdrop-blur md:hidden">
      {ADMIN_NAV_ITEMS.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-semibold transition-colors ${
              isActive
                ? "bg-brand-pink text-white"
                : "bg-card text-text-medium hover:text-text-dark"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}



