"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  apiClient,
  type RedeemCourseCodePayload,
  type CourseDetails,
} from "@/lib/api-client";
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

const MANAGER_CHAT_URL =
  process.env.NEXT_PUBLIC_MANAGER_CHAT_URL ?? "https://t.me/mur_mur_manager_bot";

export default function AccountPage() {
  const router = useRouter();
  const { user, greetingName, webApp } = useTelegram();
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
  // Используем язык из профиля, если есть, иначе из localStorage, иначе 'sr'
  const preferredLanguage = profile?.languageCode ?? (typeof window !== 'undefined' ? localStorage.getItem('murmur_preferred_language') : null) ?? "sr";
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
      // Сохраняем язык в localStorage сразу
      try {
        localStorage.setItem('murmur_preferred_language', value);
      } catch (storageError) {
        console.warn("Failed to save language to localStorage", storageError);
      }
      
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
      // Обновляем страницу для применения нового языка
      router.refresh();
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

  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isContactingManager, setIsContactingManager] = useState(false);

  const handleContactManager = () => {
    if (!MANAGER_CHAT_URL) {
      return;
    }
    setIsContactingManager(true);
    try {
      if (webApp?.openTelegramLink) {
        webApp.openTelegramLink(MANAGER_CHAT_URL);
      } else if (typeof window !== "undefined") {
        window.open(MANAGER_CHAT_URL, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsContactingManager(false);
    }
  };

  const handleOpenRedeemModal = () => {
    setRedeemCode("");
    setRedeemError(null);
    setRedeemSuccess(null);
    setIsRedeemModalOpen(true);
  };

  const handleCloseRedeemModal = () => {
    if (isRedeeming) return;
    setIsRedeemModalOpen(false);
  };

  const handleRedeemSubmit = async () => {
    if (!resolvedUserId) return;
    const normalized = redeemCode.trim();
    if (!normalized) {
      setRedeemError(t("Введите код доступа"));
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const payload: RedeemCourseCodePayload = {
        courseSlug: "", // не используется в новом endpoint
        code: normalized,
        userId: resolvedUserId,
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        username: user?.username ?? null,
        languageCode: profile?.languageCode ?? "sr",
        avatarUrl: user?.photo_url ?? null,
      };

      const result = await apiClient.redeemCodeByCode(payload);
      setRedeemSuccess(
        t("Код активирован! Мы добавили курс в раздел «Мои курсы»."),
      );
      setTimeout(() => {
        setIsRedeemModalOpen(false);
        router.push("/my-courses");
      }, 1200);
    } catch (error) {
      setRedeemError(
        error instanceof Error
          ? error.message
          : t("Не удалось активировать код. Попробуйте ещё раз."),
      );
    } finally {
      setIsRedeeming(false);
    }
  };

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

        <section className="space-y-3 rounded-3xl bg-white p-5 text-sm text-text-medium shadow-sm">
          <h2 className="text-lg font-semibold text-text-dark">
            {t("Поддержка и доступ")}
          </h2>
          <p className="text-xs text-text-light">
            {t(
              "Если у вас есть вопросы или код доступа к курсу, воспользуйтесь кнопками ниже.",
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleContactManager}
              disabled={isContactingManager}
              className="flex-1 rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isContactingManager
                ? t("Открываем чат...")
                : t("Написать менеджеру")}
            </button>
            <button
              type="button"
              onClick={handleOpenRedeemModal}
              className="flex-1 rounded-full border border-brand-pink px-4 py-3 text-sm font-semibold text-brand-pink transition-transform active:scale-95"
            >
              {t("Активировать код доступа")}
            </button>
          </div>
        </section>

        {isRedeemModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-light">
                    {t("Код доступа")}
                  </p>
                  <h3 className="text-lg font-semibold text-text-dark">
                    {t("Активировать код доступа")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRedeemModal}
                  className="text-xs font-semibold text-brand-orange underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isRedeeming}
                >
                  {t("Закрыть")}
                </button>
              </div>
              <p className="mt-2 text-sm text-text-light">
                {t("Введите код, который прислал менеджер после оплаты.")}
              </p>
              <input
                type="text"
                value={redeemCode}
                onChange={(event) => setRedeemCode(event.target.value)}
                placeholder={t("Код доступа из сообщения менеджера")}
                className="mt-4 w-full rounded-2xl border border-border px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                disabled={isRedeeming}
              />
              {redeemError ? (
                <p className="mt-3 rounded-2xl bg-brand-orange/10 px-3 py-2 text-xs text-brand-orange">
                  {redeemError}
                </p>
              ) : null}
              {redeemSuccess ? (
                <p className="mt-3 rounded-2xl bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
                  {redeemSuccess}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRedeemSubmit}
                  disabled={isRedeeming}
                  className="flex-1 rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRedeeming ? t("Активируем...") : t("Активировать")}
                </button>
                <button
                  type="button"
                  onClick={handleCloseRedeemModal}
                  disabled={isRedeeming}
                  className="flex-1 rounded-full border border-border px-4 py-3 text-sm font-semibold text-text-dark transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("Отмена")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}



