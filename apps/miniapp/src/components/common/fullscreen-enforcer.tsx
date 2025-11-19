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

    // Call expand immediately and aggressively
    expandToFullscreen();
    
    // Call expand multiple times immediately (some clients need this)
    for (let i = 0; i < 5; i++) {
      setTimeout(expandToFullscreen, i * 50);
    }

    // Call expand on various events
    const events = ["load", "DOMContentLoaded", "resize", "orientationchange", "focus"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, expandToFullscreen, { passive: true });
    });

    // Call expand with delays
    const timeouts = [50, 100, 200, 300, 500, 1000, 2000, 3000];
    const timeoutIds = timeouts.map((delay) =>
      setTimeout(expandToFullscreen, delay),
    );

    // Also try to expand when WebApp becomes available
    let checkCount = 0;
    const maxChecks = 50; // Check for 5 seconds (50 * 100ms)
    const checkInterval = setInterval(() => {
      checkCount++;
      const webApp = window.Telegram?.WebApp;
      if (webApp) {
        expandToFullscreen();
        // Continue checking for a bit to ensure it stays expanded
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
        }
      } else if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Also listen for viewport changes and expand
    const webApp = window.Telegram?.WebApp;
    if (webApp && typeof (webApp as any).onEvent === "function") {
      (webApp as any).onEvent("viewportChanged", () => {
        setTimeout(expandToFullscreen, 50);
      });
    }

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

