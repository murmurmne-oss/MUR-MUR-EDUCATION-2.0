"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, CourseSummary, formatRevenue } from "@/lib/api-client";

export default function CoursesAdminPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    startTransition(() => setIsLoading(true));

    apiClient
      .getCourses()
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setCourses(response);
          setError(null);
        });
      })
      .catch((coursesError: unknown) => {
        console.error("Failed to load courses", coursesError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить курсы. Попробуйте позже.");
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
  }, []);

  const sortedCourses = useMemo(
    () =>
      [...courses].sort(
        (a, b) =>
          (b._count?.enrollments ?? 0) - (a._count?.enrollments ?? 0),
      ),
    [courses],
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-dark">Курсы</h1>
          <p className="text-sm text-text-light">
            Управляйте программами, обновляйте содержание и статусы курсов.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
          onClick={() => router.push("/courses/new")}
        >
          Создать курс
        </button>
      </header>

      {error ? (
        <section className="rounded-3xl bg-card p-6 text-sm text-brand-orange">
          {error}
        </section>
      ) : (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border/60 pb-3 text-xs font-semibold uppercase text-text-light">
            <span>Название</span>
            <span>Цена</span>
            <span>Категория</span>
            <span>Ученики</span>
          </div>

          <div className="divide-y divide-border/60">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-card"
                  />
                ))
              : sortedCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => router.push(`/courses/${course.slug}`)}
                    className="grid w-full grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-4 text-left text-sm transition-colors hover:bg-card/60"
                  >
                    <span className="font-medium text-text-dark">
                      {course.title}
                    </span>
                    <span className="text-text-medium">
                      {course.isFree
                        ? "Бесплатно"
                        : formatRevenue(course.priceAmount, course.priceCurrency)}
                    </span>
                    <span className="text-text-medium">{course.category}</span>
                    <span className="text-text-dark">
                      {course._count?.enrollments ?? 0}
                    </span>
                  </button>
                ))}
          </div>
        </section>
      )}
    </div>
  );
}

