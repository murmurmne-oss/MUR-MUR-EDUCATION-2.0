"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { BarChart3, BookOpen, Home, LogOut, Users } from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  {
    href: "/",
    label: "Обзор",
    icon: Home,
  },
  {
    href: "/courses",
    label: "Курсы",
    icon: BookOpen,
  },
  {
    href: "/users",
    label: "Пользователи",
    icon: Users,
  },
  {
    href: "/analytics",
    label: "Аналитика",
    icon: BarChart3,
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        router.push("/login");
        router.refresh();
      }
    });
  };

  return (
    <aside className="flex min-h-screen w-[240px] flex-col border-r border-border bg-white/95 px-6 py-8 shadow-sm">
      <div className="mb-10 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-pink">
          Mur Mur
        </p>
        <h1 className="text-lg font-semibold text-text-dark">
          Admin Console
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/"
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-pink text-white shadow-sm"
                  : "text-text-medium hover:bg-card hover:text-text-dark"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-12 rounded-2xl bg-card px-4 py-3 text-xs text-text-light">
        Управляйте курсами, пользователями и аналитикой в режиме реального
        времени.
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-text-medium transition hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={16} />
        <span>{isPending ? "Выходим..." : "Выйти"}</span>
      </button>
    </aside>
  );
}

