import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AdminNav } from "@/components/admin/admin-nav";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mur Mur Admin",
  description:
    "Административная панель Mur Mur Education для управления курсами и пользователями.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${montserrat.variable} antialiased bg-surface text-text-medium`}
      >
        <div className="flex min-h-screen">
          <AdminNav />
          <main className="w-full flex-1 bg-surface px-4 py-6 md:px-8">
            <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
