"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  apiClient,
  UserEnrollment,
  UserEnrollmentsResponse,
} from "@/lib/api-client";
import { createTranslator } from "@/lib/i18n";

const DEV_USER_ID =
  process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

function buildReminderLabel(
  response: UserEnrollmentsResponse | null,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (!response?.reminder || !response.reminder.isEnabled) {
    return t("Напоминания выключены");
  }

  const frequencyMap: Record<string, string> = {
    NEVER: t("Никогда"),
    DAILY: t("Каждый день"),
    WEEKLY: t("Каждую неделю"),
    MONTHLY: t("Каждый месяц"),
  };

  const timeMap: Record<string, string> = {
    MORNING: t("утром"),
    MIDDAY: t("днём"),
    EVENING: t("вечером"),
  };

  return `${frequencyMap[response.reminder.frequency] ?? response.reminder.frequency} · ${
    timeMap[response.reminder.timeOfDay] ?? response.reminder.timeOfDay
  }`;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const { user } = useTelegram();
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
  // Используем язык из профиля, если есть, иначе из localStorage, иначе 'sr'
  const preferredLanguage = profile?.languageCode ?? (typeof window !== 'undefined' ? localStorage.getItem('murmur_preferred_language') : null) ?? "sr";
  const { t } = useMemo(
    () => createTranslator(preferredLanguage),
    [preferredLanguage],
  );
  const [enrollments, setEnrollments] = useState<UserEnrollment[]>([]);
  const [reminderLabel, setReminderLabel] = useState<string>(() =>
    t("Напоминания"),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!resolvedUserId) {
      setEnrollments([]);
      setIsLoading(false);
      return;
    }
    const targetUserId = resolvedUserId;

    startTransition(() => setIsLoading(true));
    apiClient
      .getUserEnrollments(targetUserId)
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setEnrollments(response.enrollments);
          setReminderLabel(buildReminderLabel(response, t));
          setError(null);
        });
      })
      .catch((enrollmentsError: unknown) => {
        console.error("Failed to load enrollments", enrollmentsError);
        if (!active) return;
        startTransition(() => {
          setError(
            t("Не удалось загрузить ваши курсы. Обновите страницу позже."),
          );
        });
      })
      .finally(() => {
        if (active) {
          startTransition(() => setIsLoading(false));
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedUserId, t]);

  const hasCourses = useMemo(() => enrollments.length > 0, [enrollments]);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">{t("Мои курсы")}</h1>
        <p className="mt-1 text-sm text-text-light">{reminderLabel}</p>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-4 px-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-card"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-card p-6 text-center text-sm text-brand-orange">
            {error}
          </div>
        ) : hasCourses ? (
          enrollments.map((enrollment) => (
            <button
              key={enrollment.id}
              type="button"
              onClick={() =>
                router.push(`/my-courses/${enrollment.course.slug}`)
              }
              className="w-full rounded-3xl bg-white p-5 text-left shadow-sm transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-dark">
                  {enrollment.course.title}
                </h2>
                <span className="text-xs font-medium text-text-light">
                  {t("Прогресс {percent}%", {
                    percent: enrollment.progress.percent,
                  })}
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-card">
                <div
                  className="h-2 rounded-full bg-brand-orange"
                  style={{ width: `${enrollment.progress.percent}%` }}
                />
              </div>
              <div className="mt-4 flex flex-col gap-1 text-xs text-text-light">
                <p>
                  {t("Следующий урок: ")}
                  {enrollment.progress.nextLessonTitle ?? t("Вы всё прошли!")}
                </p>
                <p>
                  {t("Статус доступа: ")}
                  {enrollment.course.isFree ? t("Бесплатно") : t("Оплачено")}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-3xl bg-card p-6 text-center text-sm text-text-medium">
            {t(
              "Еще нет приобретённых курсов. Перейдите в раздел «Все курсы», чтобы начать обучение.",
            )}
          </div>
        )}
      </main>
    </div>
  );
}

