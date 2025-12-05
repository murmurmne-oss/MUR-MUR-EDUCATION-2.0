"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  apiClient,
  CatalogCategory,
  formatPrice,
  normalizeImageUrl,
} from "@/lib/api-client";
import { createTranslator } from "@/lib/i18n";

const CARD_COLORS = ["bg-brand-pink", "bg-brand-orange", "bg-brand-yellow"];
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

function pickCardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

export default function HomePage() {
  const router = useRouter();
  const { user, greetingName } = useTelegram();
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Синхронизация профиля - не блокирует UI, выполняется в фоне
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Используем requestIdleCallback для синхронизации профиля в фоне
    const syncProfile = () => {
      apiClient
        .syncUserProfile({
          id: user.id.toString(),
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          username: user.username ?? null,
          avatarUrl: user.photo_url ?? null,
        })
        .catch((syncError) => {
          console.error("Failed to sync user profile", syncError);
        });
    };

    // Если браузер поддерживает requestIdleCallback, используем его
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = requestIdleCallback(syncProfile, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      // Fallback: выполняем с небольшой задержкой
      const timeoutId = setTimeout(syncProfile, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    user?.id,
    user?.first_name,
    user?.last_name,
    user?.username,
    user?.photo_url,
  ]);

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
  const displayName = useMemo(() => {
    if (profile?.firstName || profile?.lastName) {
      return [profile?.firstName, profile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    if (profile?.username) {
      return profile.username;
    }
    return greetingName;
  }, [profile?.firstName, profile?.lastName, profile?.username, greetingName]);

  useEffect(() => {
    let active = true;
    let hasCachedData = false;
    
    // Пытаемся загрузить каталог из кэша для мгновенного отображения
    if (typeof window !== 'undefined') {
      const cachedCatalog = sessionStorage.getItem('catalog_cache');
      
      if (cachedCatalog) {
        try {
          const parsed = JSON.parse(cachedCatalog);
          const cacheTime = parsed.timestamp;
          const now = Date.now();
          // Используем кэш, если он не старше 5 минут
          if (now - cacheTime < 5 * 60 * 1000 && parsed.data) {
            hasCachedData = true;
            startTransition(() => {
              setCatalog(parsed.data);
              setIsLoading(false);
            });
          }
        } catch (e) {
          // Игнорируем ошибки парсинга кэша
        }
      }
    }
    
    // Если нет кэша, показываем загрузку
    if (!hasCachedData) {
      startTransition(() => setIsLoading(true));
    }
    
    // Загружаем свежие данные в фоне (даже если есть кэш)
    apiClient
      .getCatalog()
      .then((response) => {
        if (!active) return;
        
        // Сохраняем в кэш
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('catalog_cache', JSON.stringify({
              data: response,
              timestamp: Date.now(),
            }));
          } catch (e) {
            // Игнорируем ошибки сохранения кэша
          }
        }
        
        startTransition(() => {
          setCatalog(response);
          setError(null);
          setIsLoading(false);
        });
      })
      .catch((catalogError: unknown) => {
        console.error("Failed to load catalog", catalogError);
        if (!active) return;
        // Если была ошибка, но есть кэш, не показываем ошибку
        if (!hasCachedData) {
          startTransition(() => {
            setError(t("Не удалось загрузить каталог. Попробуйте обновить."));
            setIsLoading(false);
          });
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  // На главной странице показываем все курсы без фильтрации по языку
  const filteredCatalog = useMemo(
    () => catalog,
    [catalog],
  );


  const popularCourses = useMemo(() => {
    const allCourses = filteredCatalog.flatMap((category) => category.courses);
    return allCourses.slice(0, 6);
  }, [filteredCatalog]);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="relative flex h-[280px] items-center justify-center overflow-hidden bg-brand-pink px-4">
        <div className="absolute inset-0 flex justify-center opacity-100">
          <Image
            src="https://i.postimg.cc/tgtc7FJZ/Neutral-Black-And-White-Minimalist-Aesthetic-Modern-Simple-Laser-Hair-Removal-Instagram-Post.png"
            alt="Mur Mur flower"
            fill
            className="pointer-events-none object-contain"
            priority
          />
        </div>

        <div className="relative z-10 w-full max-w-xs text-center text-text-dark">
          <h1 className="text-3xl font-semibold leading-tight">
            {t("Hello, {name}!", { name: displayName || t("Гость") })}
          </h1>
          <p className="mt-1 text-sm text-text-medium">
            {t("Welcome to Sexual Wellness world MUR MUR")}
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-4 pb-10 pt-6">
        <div
          className="relative -ml-4 w-[70%] rounded-r-[50px] bg-brand-pink px-8 py-3 text-left text-white shadow-md"
        >
          <span className="block text-2xl font-bold leading-tight">
            {t("New")}
          </span>
          <span className="block text-2xl font-bold leading-tight">
            {t("To discover")}
          </span>
        </div>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-text-dark">
              {t("Популярные курсы")}
            </h2>
          <Link
            href="/courses"
            prefetch={true}
            className="text-xs font-medium text-brand-orange underline-offset-4 hover:underline"
          >
            {t("Смотреть все")}
          </Link>
          </div>
          {isLoading ? (
            <div className="-mx-4 flex gap-4 overflow-x-auto pb-2 pl-4 pr-4 no-scrollbar">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[200px] w-[200px] shrink-0 animate-pulse rounded-[28px] bg-card"
                />
              ))}
            </div>
          ) : (
            <div className="-mx-4 flex gap-4 overflow-x-auto pb-2 pl-4 pr-4 no-scrollbar">
              {popularCourses.map((course, index) => (
                <button
                  type="button"
                  key={course.id}
                  onClick={() => router.push(`/courses/${course.slug}`)}
                  className={`relative flex h-[200px] w-[200px] shrink-0 flex-col overflow-hidden rounded-[28px] ${pickCardColor(index)} text-left shadow-lg transition-transform active:scale-95`}
                >
                  <div className="relative flex h-[65%] items-center justify-center">
                    {course.coverImageUrl ? (
                      <Image
                        src={normalizeImageUrl(course.coverImageUrl)}
                        alt={course.title}
                        width={140}
                        height={140}
                        className="object-cover"
                        unoptimized={course.coverImageUrl?.includes('api.murmurmne.com')}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-text-dark/70">
                      {t("Без изображения")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-start gap-1 px-3 pb-4 pt-1 text-text-dark">
                    <p className="overflow-hidden text-base font-semibold leading-tight text-ellipsis whitespace-nowrap">
                      {course.title}
                    </p>
                    <p className="overflow-hidden text-xs leading-snug opacity-80 text-ellipsis whitespace-nowrap">
                    {course.shortDescription ?? t("Описание скоро появится")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Декоративный блок "Our shop" */}
        <div
          className="relative -ml-4 w-[70%] rounded-r-[50px] bg-brand-pink px-8 py-3 text-left text-white shadow-md"
        >
          <span className="block text-2xl font-bold leading-tight">
            {t("Our shop")}
          </span>
        </div>

        {/* Блок с изображением и кнопкой */}
        <section className="relative -mx-4 overflow-hidden rounded-2xl">
          <div className="relative h-[180px] w-full">
            {/* Изображение фона */}
            <Image
              src="https://i.postimg.cc/tgtc7FJZ/Neutral-Black-And-White-Minimalist-Aesthetic-Modern-Simple-Laser-Hair-Removal-Instagram-Post.png"
              alt="Shop"
              fill
              className="object-cover"
              unoptimized
            />
            {/* Кнопка поверх изображения */}
            <div className="absolute inset-0 flex items-center justify-center">
              <a
                href="https://murmurmne.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-95 shadow-lg"
              >
                {t("Go to shop")}
              </a>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl bg-card px-4 py-3 text-center text-sm text-brand-orange">
            {error}
          </p>
        ) : (
          <p className="text-center text-sm text-text-light">
          {t("Исследуйте наши курсы и начните обучение уже сегодня!")}
          </p>
        )}
      </main>
    </div>
  );
}

