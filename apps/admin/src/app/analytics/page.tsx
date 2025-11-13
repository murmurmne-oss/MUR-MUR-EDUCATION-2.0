"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  apiClient,
  OverviewMetrics,
  TopCourse,
  ActivityLogItem,
  formatRevenue,
} from "@/lib/api-client";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    startTransition(() => setIsLoading(true));

    Promise.all([
      apiClient.getOverview(),
      apiClient.getTopCourses(),
      apiClient.getActivity(),
    ])
      .then(([overviewResponse, topCoursesResponse, activityResponse]) => {
        if (!active) return;
        startTransition(() => {
          setOverview(overviewResponse);
          setTopCourses(topCoursesResponse);
          setActivity(activityResponse);
          setError(null);
        });
      })
      .catch((analyticsError: unknown) => {
        console.error("Failed to load analytics", analyticsError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить аналитику. Попробуйте позже.");
        });
      })
      .finally(() => {
        if (active) startTransition(() => setIsLoading(false));
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    if (!overview) return [];
    return [
      {
        id: "revenue",
        label: "Выручка",
        value: formatRevenue(overview.revenueCents, "EUR"),
        hint: "Оплаченные курсы",
      },
      {
        id: "active-users",
        label: "Активных студентов",
        value: overview.activeUsers.toString(),
        hint: "Есть доступ к курсам",
      },
      {
        id: "progress",
        label: "Средний прогресс",
        value: `${overview.averageProgressPercent}%`,
        hint: "По всем урокам",
      },
      {
        id: "visits",
        label: "Активность (30 дней)",
        value: overview.visitsLast30Days.toString(),
        hint: "Записанные события",
      },
    ];
  }, [overview]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-dark">Аналитика</h1>
        <p className="text-sm text-text-light">
          Отслеживайте вовлечённость, продажи и ключевые показатели обучения.
        </p>
      </header>

      {error ? (
        <div className="rounded-3xl bg-card p-4 text-sm text-brand-orange">
          {error}
        </div>
      ) : (
        <>
          <section className="grid grid-auto-fit gap-4">
            {isLoading && !overview ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-3xl bg-card"
                />
              ))
            ) : (
              metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-border/40"
                >
                  <p className="text-xs font-semibold uppercase text-text-light">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-text-dark">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs text-text-light">
                    {metric.hint}
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-dark">
                Топ курсов по вовлечённости
              </h2>
              <button className="text-xs font-semibold text-brand-orange">
                Экспорт CSV
              </button>
            </div>
            <div className="mt-4 grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-border/60 pb-3 text-xs font-semibold uppercase text-text-light">
              <span>Курс</span>
              <span>Студенты</span>
              <span>Доход</span>
            </div>
            <div className="divide-y divide-border/60">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-2xl bg-card"
                    />
                  ))
                : topCourses.map((course) => (
                    <div
                      key={course.id}
                      className="grid grid-cols-[2fr_1fr_1fr] gap-4 py-4 text-sm"
                    >
                      <span className="font-medium text-text-dark">
                        {course.title}
                      </span>
                      <span className="text-text-medium">
                        {course.enrollments}
                      </span>
                      <span className="text-text-medium">
                        {formatRevenue(course.revenueCents, "EUR")}
                      </span>
                    </div>
                  ))}
            </div>
          </section>
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-dark">
                Последние события
              </h2>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {isLoading && activity.length === 0
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 animate-pulse rounded-3xl bg-card"
                    />
                  ))
                : activity.length === 0
                  ? (
                  <p className="text-xs text-text-light">
                    Пока нет активности за выбранный период.
                  </p>
                  ) : (
                    activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-1 rounded-3xl bg-surface px-4 py-3 text-sm text-text-dark ring-1 ring-border/40"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-text-dark">
                            {item.action}
                          </span>
                          <span className="text-xs text-text-light">
                            {new Date(item.createdAt).toLocaleString("ru-RU")}
                          </span>
                        </div>
                        <div className="text-xs text-text-light">
                          {item.actor
                            ? `Пользователь: ${item.actor.name}`
                            : "Система"}
                          {item.course
                            ? ` • Курс: ${item.course.title}`
                            : null}
                        </div>
                        {item.metadata ? (
                          <pre className="whitespace-pre-wrap rounded-2xl bg-white px-3 py-2 text-[11px] text-text-light">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))
                  )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

