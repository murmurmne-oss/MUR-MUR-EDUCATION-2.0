"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
  };
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  initStarPayment?: (params: unknown) => Promise<unknown>;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const defaultState = {
  user: null as TelegramWebAppUser | null,
  colorScheme: "light" as "light" | "dark",
  webApp: null as TelegramWebApp | null,
};

function parseHashParamsOrRef() {
  if (typeof window === "undefined") {
    return null;
  }

  const sources: string[] = [];
  const hash = window.location.hash?.replace(/^#/, "");
  if (hash) {
    sources.push(hash);
  }

  const referrer = document.referrer;
  if (referrer && referrer.includes("tgWebAppData")) {
    try {
      const refUrl = new URL(referrer);
      if (refUrl.hash) {
        sources.push(refUrl.hash.replace(/^#/, ""));
      }
    } catch (error) {
      console.warn("Failed to parse referrer", error);
    }
  }

  if (sources.length === 0) {
    return null;
  }

  try {
    return sources
      .map((value) => new URLSearchParams(value))
      .find((params) => params.get("tgWebAppData"));
  } catch (error) {
    console.warn("Failed to parse hash params", error);
    return null;
  }
}

function decodeValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(decoded);
    // Some clients encode the value twice
    if (decoded.includes("%")) {
      decoded = decodeURIComponent(decoded);
    }
  } catch (error) {
    console.warn("Failed to decode value", error);
    return value;
  }

  return decoded;
}

function parseUserFromHash(): TelegramWebAppUser | null {
  const hashParams = parseHashParamsOrRef();
  if (!hashParams) {
    console.log("[useTelegram] hash params empty");
    return null;
  }

  const initData = decodeValue(hashParams.get("tgWebAppData"));
  if (!initData) {
    console.log("[useTelegram] no tgWebAppData in hash");
    return null;
  }

  try {
    const initParams = new URLSearchParams(initData);
    const rawUser = decodeValue(initParams.get("user"));
    if (!rawUser) {
      console.log("[useTelegram] tgWebAppData has no user");
      return null;
    }
    console.log("[useTelegram] parsed user from hash");
    return JSON.parse(rawUser) as TelegramWebAppUser;
  } catch (error) {
    console.warn("Failed to parse user from hash", error);
    return null;
  }
}

function detectColorSchemeFromHash(): "light" | "dark" {
  const hashParams = parseHashParamsOrRef();
  if (hashParams) {
    const themeParams = decodeValue(hashParams.get("tgWebAppThemeParams"));
    if (themeParams) {
      try {
        const decoded = JSON.parse(themeParams) as {
          bg_color?: string;
          secondary_bg_color?: string;
        };
        const color =
          decoded?.bg_color ?? decoded?.secondary_bg_color ?? "#ffffff";
        return isDarkColor(color) ? "dark" : "light";
      } catch (error) {
        console.warn("Failed to parse theme params", error);
      }
    }
  }

  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

function isDarkColor(color: string) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) {
    return false;
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 128;
}

export function useTelegram() {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateFromSources = () => {
      const webApp = window.Telegram?.WebApp ?? null;
      const fallbackUser = parseUserFromHash();
      const fallbackScheme = detectColorSchemeFromHash();

      if (webApp) {
        webApp.ready();
        webApp.expand();

        startTransition(() => {
          setState((prev) => {
            if (
              prev.user === (webApp.initDataUnsafe?.user ?? fallbackUser) &&
              prev.colorScheme === (webApp.colorScheme ?? fallbackScheme) &&
              prev.webApp === webApp
            ) {
              return prev;
            }

            return {
              user: webApp.initDataUnsafe?.user ?? fallbackUser,
              colorScheme: webApp.colorScheme ?? fallbackScheme,
              webApp,
            };
          });
        });
        return;
      }

      if (fallbackUser) {
        startTransition(() => {
          setState((prev) => {
            if (
              prev.user === fallbackUser &&
              prev.colorScheme === fallbackScheme &&
              prev.webApp === null
            ) {
              return prev;
            }

            return {
              user: fallbackUser,
              colorScheme: fallbackScheme,
              webApp: null,
            };
          });
        });
        return;
      }
    };

    updateFromSources();

    const hashListener = () => {
      updateFromSources();
    };

    window.addEventListener("hashchange", hashListener);

    const webAppCheckInterval = window.setInterval(() => {
      if (window.Telegram?.WebApp) {
        updateFromSources();
        window.clearInterval(webAppCheckInterval);
      }
    }, 500);

    return () => {
      window.removeEventListener("hashchange", hashListener);
      window.clearInterval(webAppCheckInterval);
    };
  }, []);

  const greetingName = useMemo(() => {
    if (!state.user) {
      return "Гость";
    }

    return state.user.first_name ?? state.user.username ?? "Гость";
  }, [state.user]);

  return {
    user: state.user,
    greetingName,
    colorScheme: state.colorScheme,
    webApp: state.webApp,
    supportsStarPayment: typeof state.webApp?.initStarPayment === "function",
  };
}

