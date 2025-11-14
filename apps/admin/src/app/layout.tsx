import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
