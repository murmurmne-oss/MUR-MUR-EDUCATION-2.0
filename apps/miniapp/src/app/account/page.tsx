"use client";

import { useEffect, useMemo, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import { apiClient } from "@/lib/api-client";
import { createTranslator, type Locale } from "@/lib/i18n";

const FREQUENCY_OPTIONS = [
  { value: "never", labelKey: "Никогда" },
  { value: "daily", labelKey: "Каждый день" },
  { value: "weekly", labelKey: "Каждую неделю" },
  { value: "monthly", labelKey: "Каждый месяц" },
];

const DAYTIME_OPTIONS = [
  { value: "morning", labelKey: "Утро" },
  { value: "midday", labelKey: "День" },
  { value: "evening", labelKey: "Вечер" },
];

const LANGUAGE_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "sr", label: "Srpski (latinica)" },
  { value: "ru", label: "Русский" },
];

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

export default function AccountPage() {
  const { user, greetingName } = useTelegram();
  const [frequency, setFrequency] = useState("daily");
  const [daytime, setDaytime] = useState("morning");
  const [consent, setConsent] = useState(true);
  const [languagePreference, setLanguagePreference] = useState<Locale>("sr");
  const [isLanguageSaving, setIsLanguageSaving] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
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
  const { profile, setProfile } = useUserProfile(resolvedUserId);
  const preferredLanguage = profile?.languageCode ?? "sr";
  const { t } = useMemo(
    () => createTranslator(preferredLanguage),
    [preferredLanguage],
  );
  useEffect(() => {
    setLanguagePreference((profile?.languageCode as Locale) ?? "sr");
  }, [profile?.languageCode]);
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

  const localizedFrequencyOptions = useMemo(
    () =>
      FREQUENCY_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t],
  );

  const localizedDaytimeOptions = useMemo(
    () =>
      DAYTIME_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t],
  );

  const handleLanguageChange = async (value: Locale) => {
    if (!resolvedUserId) {
      return;
    }
    if (value === profile?.languageCode) {
      setLanguagePreference(value);
      return;
    }

    setLanguagePreference(value);
    setIsLanguageSaving(true);
    setLanguageError(null);
    try {
      await apiClient.syncUserProfile({
        id: resolvedUserId,
        languageCode: value,
      });
      setProfile((prev) =>
        prev
          ? { ...prev, languageCode: value }
          : {
              id: resolvedUserId,
              firstName: null,
              lastName: null,
              username: null,
              avatarUrl: null,
              languageCode: value,
            },
      );
    } catch (updateError) {
      console.error("Failed to update language preference", updateError);
      setLanguageError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось обновить язык. Попробуйте позже.",
      );
    } finally {
      setIsLanguageSaving(false);
    }
  };

  const languageSelectionDisabled = isLanguageSaving || !resolvedUserId;

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">{t("Мой профиль")}</h1>
        <p className="mt-1 text-sm text-text-light">
          {t("Управляйте настройками напоминаний и данными аккаунта.")}
        </p>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-4 px-4 pb-24">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-brand-pink">
            Mur Mur Education
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text-dark">
            {displayName || t("Гость")}
          </h2>
          <p className="mt-1 text-sm text-text-medium">
            {t("Ваша персональная зона для обучения и поддержки.")}
          </p>
        </section>

        <section className="space-y-4 rounded-3xl bg-card p-5 text-sm text-text-medium">
          <div>
            <label className="text-xs font-semibold uppercase text-text-light">
              {t("Частота напоминаний")}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {localizedFrequencyOptions.map((option) => (
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
              {t("Время уведомлений")}
            </label>
            <div className="mt-2 flex gap-2">
              {localizedDaytimeOptions.map((option) => (
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
              {t(
                "Согласен(на) на обработку персональных данных в соответствии с политикой Mur Mur Education.",
              )}
            </span>
          </label>

          <div>
            <label className="text-xs font-semibold uppercase text-text-light">
              {t("Язык интерфейса")}
            </label>
            <div className="mt-2 flex gap-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleLanguageChange(option.value)}
                  disabled={languageSelectionDisabled}
                  className={`rounded-2xl px-4 py-2 text-sm transition-colors ${
                    languagePreference === option.value
                      ? "bg-brand-yellow text-white"
                      : "bg-white text-text-medium"
                  } ${
                    languageSelectionDisabled
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-light">
              {t(
                "По умолчанию показываем сербский. Вы можете переключиться на русский в любой момент.",
              )}
            </p>
            {languageError ? (
              <p className="mt-2 text-xs text-brand-orange">{languageError}</p>
            ) : null}
          </div>
        </section>

        <button
          type="button"
          className="rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-95"
        >
          {t("Сохранить изменения")}
        </button>
      </main>
    </div>
  );
}



