"use client";

import classNames from "classnames";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AdminAuthMode } from "@/lib/admin-auth-config";

type LoginFormProps = {
  redirectTo: string;
  modes: AdminAuthMode[];
};

const MODE_COPY: Record<
  AdminAuthMode,
  { label: string; description: string; actionLabel: string }
> = {
  credentials: {
    label: "Логин и пароль",
    description: "Используйте учётную запись администратора.",
    actionLabel: "Войти",
  },
  id: {
    label: "ID администратора",
    description: "Введите заранее добавленный ID.",
    actionLabel: "Подтвердить",
  },
  code: {
    label: "Код доступа",
    description: "Разовый код для экстренного доступа.",
    actionLabel: "Проверить",
  },
};

export default function LoginForm({ redirectTo, modes }: LoginFormProps) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<AdminAuthMode | null>(
    modes[0] ?? null,
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modeDescription = useMemo(() => {
    if (!selectedMode) {
      return "Авторизация не настроена. Обновите переменные окружения.";
    }
    return MODE_COPY[selectedMode]?.description;
  }, [selectedMode]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMode) {
      setError(
        "Нет доступных способов входа. Обратитесь к разработчику для настройки.",
      );
      return;
    }

    setError(null);

    let body: Record<string, string> = { mode: selectedMode };

    if (selectedMode === "credentials") {
      if (!username.trim() || !password) {
        setError("Введите логин и пароль.");
        return;
      }
      body = { ...body, username: username.trim(), password };
    } else if (selectedMode === "id") {
      if (!userId.trim()) {
        setError("Укажите ID администратора.");
        return;
      }
      body = { ...body, userId: userId.trim() };
    } else {
      if (!accessCode) {
        setError("Введите код доступа.");
        return;
      }
      body = { ...body, password: accessCode };
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message =
            typeof data?.message === "string"
              ? data.message
              : "Не удалось выполнить вход.";
          setError(message);
          return;
        }

        router.push(redirectTo);
        router.refresh();
      } catch (loginError) {
        console.error("Failed to sign in", loginError);
        setError("Не удалось выполнить вход. Повторите попытку.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-pink">
          Mur Mur
        </p>
        <h1 className="text-2xl font-semibold text-text-dark">
          Доступ к админ-панели
        </h1>
        <p className="text-sm text-text-light">{modeDescription}</p>
      </div>

      {modes.length > 1 ? (
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-white p-1">
            {modes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedMode(mode)}
                className={classNames(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                  selectedMode === mode
                    ? "bg-brand-pink text-white"
                    : "text-text-dark hover:bg-border/60",
                )}
              >
                {MODE_COPY[mode]?.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {modes.length === 0 ? (
        <p className="rounded-2xl bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Не найдено ни одного разрешённого способа входа. Добавьте значения
          для переменных окружения ADMIN_USERNAME/ADMIN_PASSWORD или
          ADMIN_ALLOWED_IDS и ADMIN_SESSION_SECRET.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {selectedMode === "credentials" ? (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-medium"
                >
                  Логин
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-text-dark outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/30"
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-medium"
                >
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-text-dark outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/30"
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : null}

          {selectedMode === "id" ? (
            <div className="space-y-2">
              <label
                htmlFor="userId"
                className="block text-xs font-semibold uppercase tracking-wide text-text-medium"
              >
                ID администратора
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-text-dark outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/30"
                placeholder="Например, 123456789"
                inputMode="numeric"
              />
            </div>
          ) : null}

          {selectedMode === "code" ? (
            <div className="space-y-2">
              <label
                htmlFor="accessCode"
                className="block text-xs font-semibold uppercase tracking-wide text-text-medium"
              >
                Код доступа
              </label>
              <input
                id="accessCode"
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-text-dark outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/30"
                placeholder="Введите код"
                autoComplete="one-time-code"
              />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-2xl bg-brand-orange/10 px-4 py-2 text-sm text-brand-orange">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending || !selectedMode}
            className="w-full rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-pink/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending
              ? "Проверяем..."
              : MODE_COPY[selectedMode ?? "credentials"]?.actionLabel ??
                "Войти"}
          </button>
        </form>
      )}
    </div>
  );
}
