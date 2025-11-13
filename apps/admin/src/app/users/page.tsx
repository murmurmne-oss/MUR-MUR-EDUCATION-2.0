"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  ReminderPayload,
  UserSummary,
} from "@/lib/api-client";

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Каждый день" },
  { value: "WEEKLY", label: "Каждую неделю" },
  { value: "MONTHLY", label: "Каждый месяц" },
  { value: "NEVER", label: "Никогда" },
];

const TIME_OPTIONS = [
  { value: "MORNING", label: "Утром" },
  { value: "MIDDAY", label: "Днём" },
  { value: "EVENING", label: "Вечером" },
];

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
) {
  const nameParts = [firstName, lastName].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );

  if (nameParts.length > 0) {
    return nameParts
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

function getDisplayName(user: UserSummary) {
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
}

type UserRow = UserSummary & {
  isSaving: boolean;
  error?: string | null;
};

function ensureReminder(reminder: UserSummary["reminder"]): ReminderPayload {
  return (
    reminder ?? {
      frequency: "DAILY",
      timeOfDay: "MORNING",
      isEnabled: false,
    }
  );
}

export default function UsersAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    startTransition(() => setIsLoading(true));

    apiClient
      .getUsers()
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setRows(
            response.map((user) => ({
              ...user,
              isSaving: false,
              error: null,
            })),
          );
          setError(null);
        });
      })
      .catch((usersError: unknown) => {
        console.error("Failed to load users", usersError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить пользователей. Попробуйте позже.");
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

  const updateReminder = async (
    userId: string,
    partial: Partial<ReminderPayload>,
  ) => {
    let payload: ReminderPayload | null = null;

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== userId) {
          return row;
        }

        const nextReminder = {
          ...ensureReminder(row.reminder),
          ...partial,
        };
        payload = nextReminder;

        return {
          ...row,
          reminder: nextReminder,
          isSaving: true,
          error: null,
        };
      }),
    );

    if (!payload) {
      return;
    }

    try {
      await apiClient.updateReminder(userId, payload);
      setRows((prev) =>
        prev.map((row) =>
          row.id === userId
            ? {
                ...row,
                isSaving: false,
              }
            : row,
        ),
      );
    } catch (reminderError) {
      console.error("Failed to update reminder", reminderError);
      setRows((prev) =>
        prev.map((row) =>
          row.id === userId
            ? {
                ...row,
                isSaving: false,
                error: "Ошибка при сохранении напоминаний",
              }
            : row,
        ),
      );
    }
  };

  const handleReminderToggle = (userId: string, isEnabled: boolean) => {
    updateReminder(userId, { isEnabled });
  };

  const handleFrequencyChange = (userId: string, frequency: string) => {
    updateReminder(userId, { frequency });
  };

  const handleTimeChange = (userId: string, timeOfDay: string) => {
    updateReminder(userId, { timeOfDay });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-dark">Пользователи</h1>
        <p className="text-sm text-text-light">
          Просматривайте статистику, управляйте напоминаниями и прогрессом.
        </p>
      </header>

      {error ? (
        <section className="rounded-3xl bg-card p-6 text-sm text-brand-orange">
          {error}
        </section>
      ) : (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
          <div className="grid grid-cols-[1.5fr_1fr_0.9fr_1.6fr_0.8fr] gap-4 border-b border-border/60 pb-3 text-xs font-semibold uppercase text-text-light">
            <span>Пользователь</span>
            <span>Telegram ID</span>
            <span>Курсы</span>
            <span>Напоминания</span>
            <span>Действия</span>
          </div>

          <div className="divide-y divide-border/60">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-card"
                  />
                ))
              : rows.map((row) => {
                  const reminder = ensureReminder(row.reminder);
                  const name = getDisplayName(row);
                  const initials = getInitials(
                    row.firstName,
                    row.lastName,
                    row.username,
                  );
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.5fr_1fr_0.9fr_1.6fr_0.8fr] gap-4 py-4 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-card text-sm font-semibold text-text-medium">
                          {row.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.avatarUrl}
                              alt={name}
                              className="size-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                  <p className="font-medium text-text-dark">{name}</p>
                  {row.username && !name.startsWith("@") ? (
                            <p className="text-xs text-text-light">
                              @{row.username}
                            </p>
                          ) : null}
                          <p className="text-xs text-text-light">
                            Статус:{" "}
                            <span
                              className={
                                row.activeCourses > 0
                                  ? "text-brand-pink"
                                  : "text-text-light"
                              }
                            >
                              {row.activeCourses > 0 ? "Активен" : "Неактивен"}
                            </span>
                          </p>
                          {row.error ? (
                            <p className="text-xs text-brand-orange">
                              {row.error}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <span className="text-text-medium">{row.id}</span>
                      <span className="text-text-dark">
                        {row.coursesCount} ({row.activeCourses} активных)
                      </span>

                      <div className="flex flex-col gap-2 text-xs text-text-dark">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={reminder.isEnabled}
                            onChange={(event) =>
                              handleReminderToggle(row.id, event.target.checked)
                            }
                            className="size-4 accent-brand-pink"
                          />
                          Напоминания включены
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={reminder.frequency}
                            onChange={(event) =>
                              handleFrequencyChange(row.id, event.target.value)
                            }
                            className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-pink"
                            disabled={!reminder.isEnabled || row.isSaving}
                          >
                            {FREQUENCY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={reminder.timeOfDay}
                            onChange={(event) =>
                              handleTimeChange(row.id, event.target.value)
                            }
                            className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-pink"
                            disabled={!reminder.isEnabled || row.isSaving}
                          >
                            {TIME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {row.isSaving ? (
                          <span className="text-[11px] text-text-light">
                            Сохраняем изменения...
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => router.push(`/users/${row.id}`)}
                          className="rounded-full border border-brand-pink px-4 py-2 font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
                        >
                          Открыть
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/courses?user=${row.id}`)}
                          className="rounded-full border border-card px-4 py-2 font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark"
                        >
                          Каталог
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>
        </section>
      )}
    </div>
  );
}

