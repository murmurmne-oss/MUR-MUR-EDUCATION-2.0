"use client";

import { useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";

const frequencyOptions = [
  { value: "never", label: "Никогда" },
  { value: "daily", label: "Каждый день" },
  { value: "weekly", label: "Каждую неделю" },
  { value: "monthly", label: "Каждый месяц" },
];

const daytimeOptions = [
  { value: "morning", label: "Утро" },
  { value: "midday", label: "День" },
  { value: "evening", label: "Вечер" },
];

export default function AccountPage() {
  const { greetingName } = useTelegram();
  const [frequency, setFrequency] = useState("daily");
  const [daytime, setDaytime] = useState("morning");
  const [consent, setConsent] = useState(true);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="px-4 pt-6">
        <h1 className="text-2xl font-semibold">Мой профиль</h1>
        <p className="mt-1 text-sm text-text-light">
          Управляйте настройками напоминаний и данными аккаунта.
        </p>
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-4 px-4 pb-24">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-brand-pink">
            Mur Mur Education
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text-dark">
            {greetingName}
          </h2>
          <p className="mt-1 text-sm text-text-medium">
            Ваша персональная зона для обучения и поддержки.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl bg-card p-5 text-sm text-text-medium">
          <div>
            <label className="text-xs font-semibold uppercase text-text-light">
              Частота напоминаний
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {frequencyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequency(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm transition-colors ${
                    frequency === option.value
                      ? "bg-brand-pink text-white"
                      : "bg-white text-text-medium"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-text-light">
              Время уведомлений
            </label>
            <div className="mt-2 flex gap-2">
              {daytimeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDaytime(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm transition-colors ${
                    daytime === option.value
                      ? "bg-brand-orange text-white"
                      : "bg-white text-text-medium"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-brand-yellow"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span className="text-sm leading-snug text-text-medium">
              Согласен(на) на обработку персональных данных в соответствии с
              политикой Mur Mur Education.
            </span>
          </label>
        </section>

        <button
          type="button"
          className="rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-95"
        >
          Сохранить изменения
        </button>
      </main>
    </div>
  );
}



