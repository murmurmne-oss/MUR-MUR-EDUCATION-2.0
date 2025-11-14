"use client";

"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  apiClient,
  CatalogCategory,
  formatPrice,
} from "@/lib/api-client";

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
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    apiClient
      .syncUserProfile({
        id: user.id.toString(),
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        username: user.username ?? null,
        avatarUrl: user.photo_url ?? null,
        languageCode: user.language_code ?? null,
      })
      .catch((syncError) => {
        console.error("Failed to sync user profile", syncError);
      });
  }, [
    user?.id,
    user?.first_name,
    user?.last_name,
    user?.username,
    user?.photo_url,
    user?.language_code,
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
    startTransition(() => setIsLoading(true));
    apiClient
      .getCatalog()
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setCatalog(response);
          setError(null);
        });
      })
      .catch((catalogError: unknown) => {
        console.error("Failed to load catalog", catalogError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить каталог. Попробуйте обновить.");
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

  const featuredCourse = useMemo(() => {
    if (!catalog.length) return null;
    return catalog[0]?.courses[0] ?? null;
  }, [catalog]);

  const popularCourses = useMemo(() => {
    const allCourses = catalog.flatMap((category) => category.courses);
    return allCourses.slice(0, 6);
  }, [catalog]);

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
            Hello, {displayName || "Гость"}!
          </h1>
          <p className="mt-1 text-sm text-text-medium">
            Welcome to Sexual Wellness world MUR MUR
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-4 pb-10 pt-6">
        {featuredCourse ? (
          <button
            type="button"
            className="group relative w-full overflow-hidden rounded-3xl shadow-lg transition-transform active:scale-95"
            onClick={() => router.push(`/courses/${featuredCourse.slug}`)}
          >
            <div className="relative h-60 w-full">
              {featuredCourse.coverImageUrl ? (
                <Image
                  src={featuredCourse.coverImageUrl}
                  alt={featuredCourse.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-card text-text-medium">
                  Нет изображения
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="inline-block max-w-[90%] rounded-2xl bg-brand-pink/95 px-4 py-3 text-left text-white shadow-md shadow-brand-pink/40 backdrop-blur">
                <p className="text-xs font-medium opacity-90">
                  Курс который проходит прямо сейчас
                </p>
                <p className="text-sm font-semibold">{featuredCourse.title}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/90">
                  {featuredCourse.isFree
                    ? "Бесплатно"
                    : formatPrice(
                        featuredCourse.price.amount,
                        featuredCourse.price.currency,
                      )}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <div className="h-48 animate-pulse rounded-3xl bg-card" />
        )}

        <button
          type="button"
          onClick={() => router.push("/courses")}
          className="w-fit max-w-[240px] rounded-r-[50px] bg-brand-pink px-8 py-3 text-left text-white shadow-md transition-transform active:scale-95"
        >
          <span className="block text-2xl font-bold leading-tight">New</span>
          <span className="block text-2xl font-bold leading-tight">
            To discover
          </span>
        </button>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-text-dark">
              Популярные курсы
            </h2>
            <button
              type="button"
              onClick={() => router.push("/courses")}
              className="text-xs font-medium text-brand-orange underline-offset-4 hover:underline"
            >
              Смотреть все
            </button>
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
                        src={course.coverImageUrl}
                        alt={course.title}
                        width={140}
                        height={140}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-text-dark/70">
                        Без изображения
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-start gap-1 px-3 pb-4 pt-1 text-text-dark">
                    <p className="overflow-hidden text-base font-semibold leading-tight text-ellipsis whitespace-nowrap">
                      {course.title}
                    </p>
                    <p className="overflow-hidden text-xs leading-snug opacity-80 text-ellipsis whitespace-nowrap">
                      {course.shortDescription ?? "Описание скоро появится"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {error ? (
          <p className="rounded-2xl bg-card px-4 py-3 text-center text-sm text-brand-orange">
            {error}
          </p>
        ) : (
          <p className="text-center text-sm text-text-light">
            Исследуйте наши курсы и начните обучение уже сегодня!
          </p>
        )}
      </main>
    </div>
  );
}

