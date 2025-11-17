"use client";

import { usePathname } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { AdminNav } from "@/components/admin/admin-nav";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      window.scrollTo({ top: 0 });
    }
  }, [pathname]);

  if (pathname === "/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
          {children}
        </div>
      </div>
    );
  }

  const isCourseFormPage = pathname?.startsWith("/courses/new") || 
    (pathname?.startsWith("/courses/") && pathname !== "/courses");

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="w-full flex-1 bg-surface px-4 py-6 md:px-8">
        <div className={`mx-auto flex h-full flex-col gap-6 ${isCourseFormPage ? "max-w-none" : "max-w-6xl"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

