import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TelegramSdkLoader } from "@/components/common/telegram-sdk-loader";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mur Mur Education",
  description:
    "Образовательное пространство Mur Mur Education в формате Telegram Mini App.",
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
        <TelegramSdkLoader />
        <div className="flex w-full flex-col pb-24" style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}>
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
