"use client";

import { useEffect, useMemo, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import { apiClient } from "@/lib/api-client";

const frequencyOptions = [
  { value: "never", label: "Никогда" },
  { value: "daily", label: "Каждый день" },
  { value: "weekly", label: "Каждую неделю" },
  { value: "monthly", label: "Каждый месяц" },
];

const daytimeOptions = [
  { value: "morning", label: "Утро" },
  { value: "midday", label: "День" },
  { value: "evening", label: "Вечер" },
];

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

export default function AccountPage() {
  const { user, greetingName } = useTelegram();
  const [frequency, setFrequency] = useState("daily");
  const [daytime, setDaytime] = useState("morning");
  const [consent, setConsent] = useState(true);
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    apiClient
      .syncUserProfile({
        id: user.id.toString(),
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        username: user.username ?? null,
        avatarUrl: user.photo_url ?? null,
        languageCode: user.language_code ?? null,
      })
      .catch((syncError) => {
        console.error("Failed to sync user profile", syncError);
      });
  }, [
    user?.id,
    user?.first_name,
    user?.last_name,
    user?.username,
    user?.photo_url,
    user?.language_code,
  ]);

  const resolvedUserId = useMemo(() => {
    if (user?.id && Number.isFinite(Number(user.id))) {
      return user.id.toString();
    }

    if (process.env.NODE_ENV !== "production") {
      return DEV_USER_ID;
    }

    return null;
  }, [user?.id]);
  const { profile } = useUserProfile(resolvedUserId);
  const displayName = useMemo(() => {
    if (profile?.firstName || profile?.lastName) {
      return [profile?.firstName, profile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    if (profile?.username) {
      return profile.username;
    }
    return greetingName;
  }, [profile?.firstName, profile?.lastName, profile?.username, greetingName]);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Мой профиль</h1>
        <p className="mt-1 text-sm text-text-light">
          Управляйте настройками напоминаний и данными аккаунта.
        </p>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-4 px-4 pb-24">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-brand-pink">
            Mur Mur Education
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text-dark">
            {displayName || "Гость"}
          </h2>
          <p className="mt-1 text-sm text-text-medium">
            Ваша персональная зона для обучения и поддержки.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl bg-card p-5 text-sm text-text-medium">
          <div>
            <label className="text-xs font-semibold uppercase text-text-light">
              Частота напоминаний
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {frequencyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequency(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm transition-colors ${
                    frequency === option.value
                      ? "bg-brand-pink text-white"
                      : "bg-white text-text-medium"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-text-light">
              Время уведомлений
            </label>
            <div className="mt-2 flex gap-2">
              {daytimeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDaytime(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm transition-colors ${
                    daytime === option.value
                      ? "bg-brand-orange text-white"
                      : "bg-white text-text-medium"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-brand-yellow"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span className="text-sm leading-snug text-text-medium">
              Согласен(на) на обработку персональных данных в соответствии с
              политикой Mur Mur Education.
            </span>
          </label>
        </section>

        <button
          type="button"
          className="rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-95"
        >
          Сохранить изменения
        </button>
      </main>
    </div>
  );
}



