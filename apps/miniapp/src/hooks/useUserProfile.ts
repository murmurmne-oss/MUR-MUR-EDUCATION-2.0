"use client";

import { useEffect, useState } from "react";
import { apiClient, type UserProfile } from "@/lib/api-client";

const LANGUAGE_STORAGE_KEY = "murmur_preferred_language";

export function useUserProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    apiClient
      .getUserProfile(userId)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setError(null);
        // Сохраняем язык в localStorage для быстрого доступа
        if (data?.languageCode) {
          try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, data.languageCode);
          } catch (storageError) {
            console.warn("Failed to save language to localStorage", storageError);
          }
        }
      })
      .catch((profileError: unknown) => {
        console.error("Failed to load user profile", profileError);
        if (!active) return;
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Не удалось загрузить данные пользователя.",
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const updateProfile = (newProfile: UserProfile | null | ((prev: UserProfile | null) => UserProfile | null)) => {
    setProfile((prev) => {
      const updated = typeof newProfile === "function" ? newProfile(prev) : newProfile;
      // Сохраняем язык в localStorage при обновлении
      if (updated?.languageCode) {
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, updated.languageCode);
        } catch (storageError) {
          console.warn("Failed to save language to localStorage", storageError);
        }
      }
      return updated;
    });
  };

  return { profile, isLoading, error, setProfile: updateProfile };
}

// Функция для получения языка из localStorage (fallback)
export function getStoredLanguage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}
