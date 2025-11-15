"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import type {
  CourseAccessCode,
  CreateAccessCodePayload,
} from "@/lib/api-client";
import { apiClient } from "@/lib/api-client";

type AccessCodesPanelProps = {
  courseSlug: string;
};

export function AccessCodesPanel({ courseSlug }: AccessCodesPanelProps) {
  const [codes, setCodes] = useState<CourseAccessCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [note, setNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const hasSlug = courseSlug && courseSlug.length > 0;

  const fetchCodes = useCallback(async () => {
    if (!hasSlug) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await apiClient.getCourseAccessCodes(courseSlug);
      setCodes(list);
    } catch (loadError) {
      console.error("[admin] failed to load access codes", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить коды доступа.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [courseSlug, hasSlug]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    if (!hasSlug || isCreating) return;
    setIsCreating(true);
    setLastGenerated(null);
    setError(null);

    const payload: CreateAccessCodePayload = {
      note: note.trim() ? note.trim() : undefined,
      createdBy: createdBy.trim() ? createdBy.trim() : undefined,
    };

    try {
      const record = await apiClient.createCourseAccessCode(
        courseSlug,
        payload,
      );
      setCodes((prev) => [record, ...prev]);
      setLastGenerated(record.code);
      if (record.code) {
        try {
          await navigator.clipboard.writeText(record.code);
          setCopyFeedback(`Код ${record.code} скопирован.`);
        } catch {
          setCopyFeedback(null);
        }
      }
      setNote("");
    } catch (createError) {
      console.error("[admin] failed to create code", createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать код доступа.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback(`Код ${code} скопирован в буфер обмена.`);
    } catch (copyError) {
      console.warn("Clipboard error", copyError);
      setCopyFeedback("Скопируйте код вручную: " + code);
    }
  };

  const statusMeta = useMemo(
    () =>
      ({
        AVAILABLE: {
          label: "Свободен",
          className: "bg-emerald-100 text-emerald-700",
        },
        REDEEMED: {
          label: "Активирован",
          className: "bg-brand-pink/10 text-brand-pink",
        },
        REVOKED: {
          label: "Аннулирован",
          className: "bg-slate-200 text-slate-600",
        },
      }) as const,
    [],
  );
  type StatusKey = keyof typeof statusMeta;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-dark">
            Коды доступа
          </h2>
          <p className="text-sm text-text-light">
            Генерируйте индивидуальные коды для офлайн-продаж. После оплаты
            отправьте код клиенту, он активирует его в мини-приложении.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchCodes}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text-dark hover:border-brand-pink hover:text-brand-pink"
        >
          Обновить список
        </button>
      </div>

      {!hasSlug ? (
        <p className="mt-6 rounded-2xl bg-card px-4 py-3 text-sm text-brand-orange">
          Сохраните курс, чтобы генерировать коды доступа.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          {error}
        </p>
      ) : null}

      {copyFeedback ? (
        <p className="mt-4 rounded-2xl bg-brand-pink/10 px-4 py-3 text-xs text-brand-pink">
          {copyFeedback}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border/60 p-4">
          <h3 className="text-lg font-semibold text-text-dark">
            Создать новый код
          </h3>
          <label className="block text-sm font-medium text-text-dark">
            Комментарий (необязательно)
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Например: 'Иван, пакет PRO'"
              className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
          </label>
          <label className="block text-sm font-medium text-text-dark">
            Кто выдал (необязательно)
            <input
              type="text"
              value={createdBy}
              onChange={(event) => setCreatedBy(event.target.value)}
              placeholder="Имя менеджера"
              className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
          </label>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!hasSlug || isCreating}
            className="w-full rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Создаём..." : "Сгенерировать код"}
          </button>

          {lastGenerated ? (
            <div className="rounded-2xl bg-brand-pink/10 px-4 py-3 text-center text-sm text-brand-pink">
              Новый код:{" "}
              <button
                type="button"
                className="font-semibold underline-offset-4 hover:underline"
                onClick={() => handleCopy(lastGenerated)}
              >
                {lastGenerated}
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/60 p-4">
          <h3 className="text-lg font-semibold text-text-dark">
            Последние коды
          </h3>
          {isLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-14 animate-pulse rounded-2xl bg-card"
                />
              ))}
            </div>
          ) : codes.length === 0 ? (
            <p className="mt-4 text-sm text-text-light">
              Пока нет созданных кодов. Создайте первый код для клиента.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {codes.map((item) => {
                const statusKey = (item.status as StatusKey) ?? "AVAILABLE";
                const status = statusMeta[statusKey] ?? {
                  label: item.status,
                  className: "bg-border text-text-dark",
                };
                return (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.code)}
                        className="font-semibold text-text-dark underline-offset-4 hover:underline"
                      >
                        {item.code}
                      </button>
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-light">
                      Создан:{" "}
                      {new Date(item.createdAt).toLocaleString("ru-RU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {item.createdBy ? ` · ${item.createdBy}` : null}
                    </p>
                    {item.note ? (
                      <p className="text-xs text-text-dark">
                        Комментарий: {item.note}
                      </p>
                    ) : null}
                    {item.activatedAt ? (
                      <p className="text-xs text-text-dark">
                        Активирован:{" "}
                        {new Date(item.activatedAt).toLocaleString("ru-RU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {item.activatedBy
                          ? ` · ${
                              item.activatedBy.username
                                ? `@${item.activatedBy.username}`
                                : [
                                    item.activatedBy.firstName,
                                    item.activatedBy.lastName,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")
                            }`
                          : null}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

