"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  CatalogCategory,
  formatPrice,
} from "@/lib/api-client";

export default function CoursesPage() {
  const router = useRouter();
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
        setSelectedCategory(data[0]?.id ?? null);
        setError(null);
      })
      .catch((catalogError: unknown) => {
        console.error("Failed to load catalog", catalogError);
        if (!active) return;
        setError("Не удалось загрузить курсы. Попробуйте позже.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      catalog.map((category) => ({
        id: category.id,
        label: category.label,
      })),
    [catalog],
  );

  const coursesToShow = useMemo(() => {
    if (!catalog.length) return [];
    if (!selectedCategory) {
      return catalog.flatMap((category) => category.courses);
    }
    return catalog.find((category) => category.id === selectedCategory)
      ?.courses ?? [];
  }, [catalog, selectedCategory]);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Все курсы</h1>
        <p className="mt-1 text-sm text-text-light">
          Откройте курс, чтобы узнать подробности и оформить доступ.
        </p>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-6 px-4 pb-12">
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
                      {course.stats.moduleCount} модулей ·{" "}
                      {course.stats.lessonCount} уроков
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-text-dark">
                      {course.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-orange">
                    {course.isFree
                      ? "Бесплатно"
                      : formatPrice(
                          course.price.amount,
                          course.price.currency,
                        )}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-medium">
                  {course.shortDescription ??
                    "Описание курса появится в ближайшее время."}
                </p>
                <div className="mt-4 text-xs font-medium text-text-light">
                  {course.stats.enrollmentCount} участников уже учатся
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}


