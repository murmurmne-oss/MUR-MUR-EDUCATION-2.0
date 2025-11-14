import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navigation/bottom-nav";
import dynamic from "next/dynamic";

const TelegramSdkLoader = dynamic(
  () =>
    import("@/components/common/telegram-sdk-loader").then(
      (mod) => mod.TelegramSdkLoader,
    ),
  { ssr: false },
);

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
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
