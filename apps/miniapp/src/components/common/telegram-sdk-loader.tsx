"use client";

import { useEffect } from "react";

const SDK_SRC =
  process.env.NEXT_PUBLIC_TELEGRAM_SDK_URL ?? "/telegram-web-app.js";
const SDK_ATTR = "data-telegram-sdk";

export function TelegramSdkLoader() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (document.querySelector(`script[${SDK_ATTR}]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = false;
    script.setAttribute(SDK_ATTR, "true");
    script.onload = () => {
      try {
        console.log("[TelegramSdkLoader] loaded", window.Telegram);
      } catch {
        console.log("[TelegramSdkLoader] loaded");
      }
    };
    script.onerror = (error) => {
      console.error("[TelegramSdkLoader] failed", error);
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

