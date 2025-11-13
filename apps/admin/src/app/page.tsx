"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  ActivityLogItem,
  CourseSummary,
  OverviewMetrics,
  formatRevenue,
} from "@/lib/api-client";

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [recentCourses, setRecentCourses] = useState<CourseSummary[]>([]);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    startTransition(() => setIsLoading(true));

    Promise.all([
      apiClient.getOverview(),
      apiClient.getCourses(),
      apiClient.getActivity(),
    ])
      .then(([overviewResponse, coursesResponse, activityResponse]) => {
        if (!active) return;
        startTransition(() => {
          setOverview(overviewResponse);
          setRecentCourses(coursesResponse.slice(0, 3));
          setActivity(activityResponse);
          setError(null);
        });
      })
      .catch((dashboardError: unknown) => {
        console.error("Failed to load dashboard data", dashboardError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить дашборд. Попробуйте позже.");
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

  const overviewMetrics = useMemo(() => {
    if (!overview) return [];

    return [
      {
        id: "users",
        label: "Активные пользователи",
        value: overview.activeUsers.toLocaleString("ru-RU"),
        description: "Со статусом доступа ACTIVE",
      },
      {
        id: "revenue",
        label: "Доход",
        value: formatRevenue(overview.revenueCents, "EUR"),
        description: "Оплачено через Telegram Stars",
      },
      {
        id: "courses",
        label: "Доступных курсов",
        value: overview.courseCount.toString(),
        description: "Опубликовано в каталоге",
      },
      {
        id: "progress",
        label: "Средний прогресс",
        value: `${overview.averageProgressPercent}%`,
        description: "По всем активным ученикам",
      },
      {
        id: "visits",
        label: "Активность",
        value: overview.visitsLast30Days.toString(),
        description: "Событий за 30 дней",
      },
    ];
  }, [overview]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text-dark">
          Панель управления
        </h1>
        <p className="text-sm text-text-light">
          Следите за динамикой, обновляйте курсы и управляйте доступами в Mur
          Mur Education.
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
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-3xl bg-card"
                />
              ))
            ) : (
              overviewMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-border/40"
                >
                  <p className="text-xs font-medium uppercase text-text-light">
                    {metric.label}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-text-dark">
                      {metric.value}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-light">
                    {metric.description}
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-dark">
                  Последние курсы
                </h2>
                <button
                  className="text-xs font-semibold text-brand-orange"
                  onClick={() => router.push("/courses")}
                >
                  Управлять
                </button>
              </div>
              <div className="mt-4 divide-y divide-border/60">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 animate-pulse rounded-2xl bg-card"
                    />
                  ))
                ) : (
                  recentCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-4 py-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text-dark">
                          {course.title}
                        </p>
                        <p className="text-xs text-text-light">
                          Категория: {course.category}
                        </p>
                      </div>
                      <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-brand-pink">
                        {course._count?.enrollments ?? 0} учеников
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
              <h2 className="text-lg font-semibold text-text-dark">
                Активность
              </h2>
              <div className="mt-4 space-y-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-2xl bg-card"
                    />
                  ))
                ) : (
                  activity.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <p className="text-sm font-medium text-text-dark">
                        {item.action}
                      </p>
                      <p className="text-xs text-text-light">
                        {item.actor ? `Пользователь: ${item.actor.name}` : ""}
                      </p>
                      <p className="text-[11px] text-text-light/80">
                        {new Date(item.createdAt).toLocaleString("ru-RU")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

