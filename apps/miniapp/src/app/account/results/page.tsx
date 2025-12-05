"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import { apiClient, type UserResultsResponse, type UserResult } from "@/lib/api-client";
import { createTranslator } from "@/lib/i18n";

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

export default function MyResultsPage() {
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
  const preferredLanguage = profile?.languageCode ?? (typeof window !== 'undefined' ? localStorage.getItem('murmur_preferred_language') : null) ?? "sr";
  const { t } = useMemo(
    () => createTranslator(preferredLanguage),
    [preferredLanguage],
  );

  const [results, setResults] = useState<UserResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!resolvedUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    apiClient
      .getUserResults(resolvedUserId)
      .then((data) => {
        if (!active) return;
        setResults(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load results", err);
        setError(
          err instanceof Error
            ? err.message
            : t("Не удалось загрузить результаты. Попробуйте позже."),
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
  }, [resolvedUserId, t]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("Дата неизвестна");
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(preferredLanguage === "sr" ? "sr-RS" : "ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-text-medium"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{t("Мои результаты")}</h1>
            <p className="mt-1 text-sm text-text-light">
              {t("Все результаты прохождения тестов и форм из курсов")}
            </p>
          </div>
        </div>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-4 px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-medium">{t("Загрузка...")}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
            {error}
          </div>
        ) : !results || results.total === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-8 text-center">
            <p className="text-sm text-text-medium">
              {t("У вас пока нет результатов. Пройдите тесты и формы в курсах, чтобы увидеть их здесь.")}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-card px-4 py-3 text-sm">
              <p className="text-text-medium">
                {t("Всего результатов: {total} (тестов: {tests}, форм: {forms})", {
                  total: results.total,
                  tests: results.tests,
                  forms: results.forms,
                })}
              </p>
            </div>

            <div className="space-y-3">
              {results.results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-2xl border border-card bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          result.type === 'test'
                            ? 'bg-brand-pink/10 text-brand-pink'
                            : 'bg-brand-orange/10 text-brand-orange'
                        }`}>
                          {result.type === 'test' ? t("Тест") : t("Форма")}
                        </span>
                        <Link
                          href={`/my-courses/${result.courseSlug}`}
                          className="text-xs text-text-light hover:text-brand-pink underline-offset-2 hover:underline truncate"
                        >
                          {result.courseTitle}
                        </Link>
                      </div>
                      <h3 className="text-sm font-semibold text-text-dark mb-1">
                        {result.type === 'test' ? result.testTitle : result.formTitle}
                      </h3>
                      {result.type === 'test' ? (
                        <p className="text-xs text-text-medium">
                          {t("Результат: {score} из {max} ({percent}%)", {
                            score: result.score ?? 0,
                            max: result.maxScore ?? 0,
                            percent: result.percent,
                          })}
                        </p>
                      ) : result.result ? (
                        <div className="mt-2 rounded-xl bg-surface px-3 py-2">
                          <p className="text-xs font-medium text-text-dark">
                            {result.result.title}
                          </p>
                          {result.result.description && (
                            <p className="text-xs text-text-light mt-1">
                              {result.result.description}
                            </p>
                          )}
                        </div>
                      ) : null}
                      <p className="text-xs text-text-light mt-2">
                        {formatDate(result.completedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

