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

export function useTelegram() {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      return;
    }

    webApp.ready();
    webApp.expand();

    startTransition(() => {
      setState({
        user: webApp.initDataUnsafe?.user ?? null,
        colorScheme: webApp.colorScheme ?? "light",
        webApp,
      });
    });
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

