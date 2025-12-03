"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  CatalogCategory,
  formatPrice,
} from "@/lib/api-client";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import { createTranslator } from "@/lib/i18n";

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

export default function CoursesPage() {
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
  const normalizedLanguage = preferredLanguage.toLowerCase().startsWith("ru")
    ? "RU"
    : "SR";
  const { t } = useMemo(
    () => createTranslator(preferredLanguage),
    [preferredLanguage],
  );
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .getCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data);
        setError(null);
      })
      .catch((catalogError: unknown) => {
        console.error("Failed to load catalog", catalogError);
        if (!active) return;
        setError(t("Не удалось загрузить курсы. Попробуйте позже."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const filteredCatalog = useMemo(
    () => {
      // Сначала фильтруем по предпочитаемому языку
      const filtered = catalog
        .map((category) => ({
          ...category,
          courses: category.courses.filter(
            (course) => {
              const courseLang = (course.language ?? "SR").toUpperCase();
              return courseLang === normalizedLanguage;
            },
          ),
        }))
        .filter((category) => category.courses.length > 0);
      
      // Если нет курсов на предпочитаемом языке, показываем сербские (SR)
      if (filtered.length === 0 && normalizedLanguage !== "SR") {
        const fallbackFiltered = catalog
          .map((category) => ({
            ...category,
            courses: category.courses.filter(
              (course) => {
                const courseLang = (course.language ?? "SR").toUpperCase();
                return courseLang === "SR";
              },
            ),
          }))
          .filter((category) => category.courses.length > 0);
        
      // Логирование для диагностики (временно включено для production)
      console.log('[Course filter] Fallback to SR', {
        normalizedLanguage,
        fallbackCourses: fallbackFiltered.length,
      });
        
        return fallbackFiltered;
      }
      
      // Логирование для диагностики (временно включено для production)
      console.log('[Course filter]', {
        totalCategories: catalog.length,
        filteredCategories: filtered.length,
        normalizedLanguage,
        allCourses: catalog.flatMap(c => c.courses).map(c => ({ title: c.title, language: c.language })),
      });
      
      return filtered;
    },
    [catalog, normalizedLanguage],
  );

  useEffect(() => {
    if (!filteredCatalog.length) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory((prev) => {
      if (prev && filteredCatalog.some((category) => category.id === prev)) {
        return prev;
      }
      return filteredCatalog[0]?.id ?? null;
    });
  }, [filteredCatalog]);

  const categories = useMemo(
    () =>
      filteredCatalog.map((category) => ({
        id: category.id,
        label: category.label,
      })),
    [filteredCatalog],
  );

  const coursesToShow = useMemo(() => {
    if (!filteredCatalog.length) return [];
    if (!selectedCategory) {
      return filteredCatalog.flatMap((category) => category.courses);
    }
    return (
      filteredCatalog.find((category) => category.id === selectedCategory)
        ?.courses ?? []
    );
  }, [filteredCatalog, selectedCategory]);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">{t("Все курсы")}</h1>
        <p className="mt-1 text-sm text-text-light">
          {t("Откройте курс, чтобы узнать подробности и оформить доступ.")}
        </p>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-6 px-4 pb-12">
        {categories.length > 0 ? (
          <section className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSelectedCategory((prev) =>
                    prev === category.id ? null : category.id,
                  )
                }
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "border-brand-pink bg-brand-pink text-white"
                    : "border-card bg-white text-text-medium hover:border-brand-pink hover:text-text-dark"
                }`}
              >
                {category.label}
              </button>
            ))}
          </section>
        ) : null}

        {isLoading ? (
          <section className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-card"
              />
            ))}
          </section>
        ) : error ? (
          <section className="rounded-3xl bg-card p-5 text-sm text-brand-orange">
            {error}
          </section>
        ) : filteredCatalog.length === 0 ? (
          <section className="rounded-3xl bg-card p-5 text-sm text-text-medium">
            {t("Скоро появятся курсы на выбранном языке.")}
          </section>
        ) : (
          <section className="space-y-4">
            {coursesToShow.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => router.push(`/courses/${course.slug}`)}
                className="w-full rounded-3xl bg-card p-5 text-left shadow-sm transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-pink">
                      {t("{modules} модулей · {lessons} уроков", {
                        modules: course.stats.moduleCount,
                        lessons: course.stats.lessonCount,
                      })}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-text-dark">
                      {course.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-orange">
                    {course.isFree
                      ? t("Бесплатно")
                      : formatPrice(
                          course.price.amount,
                          course.price.currency,
                        )}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-medium">
                  {course.shortDescription ??
                    t("Описание курса появится в ближайшее время.")}
                </p>
                <div className="mt-4 text-xs font-medium text-text-light">
                  {t("{count} участников уже учатся", {
                    count: course.stats.enrollmentCount,
                  })}
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}



