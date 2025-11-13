"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  apiClient,
  ProgressPayload,
  UserDetail,
  UserEnrollmentsResponse,
} from "@/lib/api-client";

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
) {
  const parts = [firstName, lastName].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );
  if (parts.length > 0) {
    return parts
      .map((part) => part.trim()[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (username && username.trim().length > 0) {
    return username.trim()[0]?.toUpperCase() ?? "U";
  }
  return "U";
}

export default function UserDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const userId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [enrollments, setEnrollments] =
    useState<UserEnrollmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCourse, setPendingCourse] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (!user) {
      return "";
    }
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.username) {
      return `@${user.username}`;
    }
    return user.id;
  }, [user]);

  const initials = useMemo(
    () =>
      getInitials(user?.firstName, user?.lastName, user?.username),
    [user?.firstName, user?.lastName, user?.username],
  );

  useEffect(() => {
    if (!userId) return;
    let active = true;
    startTransition(() => setIsLoading(true));

    Promise.all([apiClient.getUser(userId), apiClient.getUserEnrollments(userId)])
      .then(([userResponse, enrollmentsResponse]) => {
        if (!active) return;
        startTransition(() => {
          setUser(userResponse);
          setEnrollments(enrollmentsResponse);
          setError(null);
        });
      })
      .catch((detailError: unknown) => {
        console.error("Failed to load user detail", detailError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить данные пользователя.");
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
  }, [userId]);

  const refreshEnrollments = async () => {
    if (!userId) return;
    const response = await apiClient.getUserEnrollments(userId);
    setEnrollments(response);
  };

  const handleProgressAction = async (
    courseId: string,
    action: ProgressPayload["action"],
  ) => {
    if (!userId) return;

    setPendingCourse(courseId);
    setFeedback(null);
    try {
      await apiClient.updateProgress(userId, { courseId, action });
      await refreshEnrollments();
      setFeedback(
        action === "complete"
          ? "Прогресс отмечен как завершённый."
          : "Прогресс сброшен.",
      );
    } catch (progressError) {
      console.error("Failed to update progress", progressError);
      setFeedback("Не удалось обновить прогресс.");
    } finally {
      setPendingCourse(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-dark">
            Пользователь
          </h1>
          <p className="text-sm text-text-light">
            Управляйте напоминаниями и прогрессом по курсам.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="rounded-full border border-card px-4 py-2 text-sm font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark"
        >
          Назад к списку
        </button>
      </header>

      {error ? (
        <div className="rounded-3xl bg-card p-4 text-sm text-brand-orange">
          {error}
        </div>
      ) : isLoading || !user || !enrollments ? (
        <div className="h-48 animate-pulse rounded-3xl bg-card" />
      ) : (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-card text-lg font-semibold text-text-medium">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-dark">
                    {displayName}
                  </h2>
                  {user.username && !displayName.startsWith("@") ? (
                    <p className="text-sm text-text-light">@{user.username}</p>
                  ) : null}
                  <p className="text-xs text-text-light">
                    ID: <span className="font-mono">{user.id}</span>
                  </p>
                </div>
              </div>
              <div className="text-xs text-text-light">
                <p>
                  Создан:{" "}
                  {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p>
                  Последний вход:{" "}
                  {user.lastSeenAt
                    ? new Date(user.lastSeenAt).toLocaleString("ru-RU")
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 text-sm text-text-medium md:grid-cols-2">
              <div className="space-y-2">
                <p>
                  Язык Telegram: {user.languageCode?.toUpperCase() ?? "не указан"}
                </p>
                <p>Часовой пояс: {user.timezone ?? "не указан"}</p>
                <p>Статус: {user.isAdmin ? "Администратор" : "Пользователь"}</p>
              </div>
              <div className="space-y-2">
                <p>
                  Напоминания:{" "}
                  {enrollments.reminder?.isEnabled ? "включены" : "выключены"}
                </p>
                {enrollments.reminder?.isEnabled ? (
                  <>
                    <p>Частота: {enrollments.reminder.frequency}</p>
                    <p>Время: {enrollments.reminder.timeOfDay}</p>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
            <h2 className="text-lg font-semibold text-text-dark">
              Курсы пользователя
            </h2>

            {feedback ? (
              <p className="mt-3 rounded-2xl bg-brand-pink/10 px-4 py-2 text-sm text-brand-pink">
                {feedback}
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              {enrollments.enrollments.length === 0 ? (
                <p className="rounded-2xl bg-card px-4 py-3 text-sm text-text-medium">
                  Пользователь ещё не записан на курсы.
                </p>
              ) : (
                enrollments.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="space-y-3 rounded-3xl border border-border/60 bg-surface px-5 py-4"
                  >
                    <div className="flex flex-col gap-1 text-sm text-text-dark md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">
                          {enrollment.course.title}
                        </p>
                        <p className="text-xs text-text-light">
                          Статус доступа: {enrollment.status}
                        </p>
                      </div>
                      <div className="text-xs text-text-light">
                        Прогресс: {enrollment.progress.percent}% (уроков{" "}
                        {enrollment.progress.completedLessons} из{" "}
                        {enrollment.progress.totalLessons})
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs text-text-dark md:grid-cols-3">
                      <div>
                        Следующий урок:{" "}
                        {enrollment.progress.nextLessonTitle ?? "не назначен"}
                      </div>
                      <div>
                        Последний просмотр:{" "}
                        {enrollment.lastViewedAt
                          ? new Date(enrollment.lastViewedAt).toLocaleString(
                              "ru-RU",
                            )
                          : "—"}
                      </div>
                      <div>
                        Доступ с:{" "}
                        {enrollment.activatedAt
                          ? new Date(enrollment.activatedAt).toLocaleString(
                              "ru-RU",
                            )
                          : "—"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          handleProgressAction(enrollment.course.id, "complete")
                        }
                        disabled={pendingCourse === enrollment.course.id}
                        className="rounded-full border border-brand-pink px-4 py-2 font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Отметить как завершённый
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleProgressAction(enrollment.course.id, "reset")
                        }
                        disabled={pendingCourse === enrollment.course.id}
                        className="rounded-full border border-card px-4 py-2 font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Сбросить прогресс
                      </button>
                    </div>
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

