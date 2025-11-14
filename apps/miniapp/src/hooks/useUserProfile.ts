"use client";

import { useEffect, useState } from "react";
import { apiClient, type UserProfile } from "@/lib/api-client";

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

  return { profile, isLoading, error };
}


