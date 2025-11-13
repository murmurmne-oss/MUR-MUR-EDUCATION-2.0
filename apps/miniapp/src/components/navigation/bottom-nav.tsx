'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Home,
  Library,
  UserRound,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/courses",
    label: "Courses",
    icon: BookOpenText,
  },
  {
    href: "/my-courses",
    label: "My courses",
    icon: Library,
  },
      {
        href: "/account",
        label: "Account",
        icon: UserRound,
      },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl border border-transparent border-t-card bg-background/95 px-6 py-3 shadow-[0_-10px_40px_-24px_rgba(31,41,55,0.35)] backdrop-blur">
      <ul className="flex items-center justify-between gap-4 text-xs font-medium">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === href
              : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-full px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-brand-orange text-background"
                    : "text-text-light hover:bg-card hover:text-text-dark"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.4 : 2}
                  className="shrink-0"
                />
                    <span className="whitespace-nowrap text-[11px] leading-none">
                      {label}
                    </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

