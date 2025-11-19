"use client";

import { useEffect } from "react";

/**
 * Component that enforces fullscreen mode for Telegram WebApp
 * by calling expand() multiple times and on various events
 */
export function FullscreenEnforcer() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const expandToFullscreen = () => {
      const webApp = window.Telegram?.WebApp;
      if (webApp && typeof webApp.expand === "function") {
        try {
          console.log("[FullscreenEnforcer] Calling expand()");
          webApp.expand();
          
          // Check if we're in fullscreen mode after a short delay
          setTimeout(() => {
            const isExpanded = (webApp as any).isExpanded;
            const version = (webApp as any).version;
            console.log("[FullscreenEnforcer] WebApp version:", version, "isExpanded:", isExpanded);
          }, 200);
        } catch (e) {
          console.warn("[FullscreenEnforcer] expand() failed:", e);
        }
      } else {
        console.log("[FullscreenEnforcer] WebApp not available or expand() not found");
      }
    };

    // Call expand immediately
    expandToFullscreen();

    // Call expand on various events
    const events = ["load", "DOMContentLoaded", "resize", "orientationchange"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, expandToFullscreen);
    });

    // Call expand with delays
    const timeouts = [100, 300, 500, 1000, 2000];
    const timeoutIds = timeouts.map((delay) =>
      setTimeout(expandToFullscreen, delay),
    );

    // Also try to expand when WebApp becomes available
    const checkInterval = setInterval(() => {
      const webApp = window.Telegram?.WebApp;
      if (webApp) {
        expandToFullscreen();
        // Stop checking after WebApp is found
        clearInterval(checkInterval);
      }
    }, 100);

    // Cleanup after 5 seconds
    const cleanupTimeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, expandToFullscreen);
      });
      timeoutIds.forEach((id) => clearTimeout(id));
      clearInterval(checkInterval);
      clearTimeout(cleanupTimeout);
    };
  }, []);

  return null;
}

