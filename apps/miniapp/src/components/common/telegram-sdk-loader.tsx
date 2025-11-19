"use client";

import { useEffect, useRef } from "react";

const CDN_SRC = "https://telegram.org/js/telegram-web-app.js";
const SDK_SRC =
  process.env.NEXT_PUBLIC_TELEGRAM_SDK_URL?.trim() || CDN_SRC;
const SDK_ATTR = "data-telegram-sdk";
const TELEGRAM_READY_EVENT = "telegram-sdk-ready";
const TELEGRAM_READY_TIMEOUT = 5000;

export function TelegramSdkLoader() {
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dispatchReadyEvent = () => {
      if (hasNotifiedRef.current) {
        return true;
      }

      const webApp = window.Telegram?.WebApp;
      if (!webApp) {
        return false;
      }

      try {
        // Telegram recommends calling ready() as soon as the SDK becomes available.
        webApp.ready?.();
        // Expand to fullscreen
        webApp.expand?.();
        // Disable closing confirmation for better UX
        if (typeof (webApp as any).enableClosingConfirmation === "function") {
          (webApp as any).enableClosingConfirmation(false);
        }
        // Disable vertical swipes to prevent accidental closing
        if (typeof (webApp as any).enableVerticalSwipes === "function") {
          (webApp as any).enableVerticalSwipes(false);
        }
      } catch (readyError) {
        console.warn("[TelegramSdkLoader] failed to call WebApp.ready()", readyError);
      }

      window.dispatchEvent(new Event(TELEGRAM_READY_EVENT));
      hasNotifiedRef.current = true;
      return true;
    };

    if (dispatchReadyEvent()) {
      return;
    }

    const findExistingScript = () =>
      (document.querySelector(`script[${SDK_ATTR}]`) as HTMLScriptElement | null) ??
      (document.querySelector(
        `script[src="${CDN_SRC}"]`,
      ) as HTMLScriptElement | null);

    let script = findExistingScript();
    let cleanupRemovingScript = false;
    let readinessInterval: number | null = null;

    const startReadinessPolling = () => {
      const startedAt = Date.now();
      readinessInterval = window.setInterval(() => {
        if (dispatchReadyEvent()) {
          if (readinessInterval !== null) {
            window.clearInterval(readinessInterval);
            readinessInterval = null;
          }
          return;
        }

        if (Date.now() - startedAt > TELEGRAM_READY_TIMEOUT) {
          console.warn(
            "[TelegramSdkLoader] Telegram SDK loaded but WebApp object is still undefined.",
          );
          if (readinessInterval !== null) {
            window.clearInterval(readinessInterval);
            readinessInterval = null;
          }
        }
      }, 250);
    };

    const handleLoad = () => {
      try {
        console.log("[TelegramSdkLoader] SDK script loaded");
      } catch {
        // no-op: console itself could be undefined in some environments
      }

      if (!dispatchReadyEvent()) {
        startReadinessPolling();
      }
    };

    const handleError = (error: unknown) => {
      console.error("[TelegramSdkLoader] failed to load Telegram SDK", error);
    };

    if (!script) {
      script = document.createElement("script");
      script.src = SDK_SRC;
      script.async = false; // ensure it executes before hydration
      script.setAttribute(SDK_ATTR, "true");
      document.head.appendChild(script);
      cleanupRemovingScript = true;
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    // If script already present but load event already fired, start polling immediately.
    if (
      "readyState" in script &&
      (script as HTMLScriptElement & { readyState?: string }).readyState ===
        "complete"
    ) {
      handleLoad();
    }

    return () => {
      if (readinessInterval !== null) {
        window.clearInterval(readinessInterval);
      }
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
      if (cleanupRemovingScript) {
        script?.remove();
      }
    };
  }, []);

  return null;
}

