"use client";

import { useEffect, useState, startTransition } from "react";
import { useParams } from "next/navigation";
import { CourseForm } from "@/components/courses/course-form";
import { apiClient, CourseDetails } from "@/lib/api-client";

export default function EditCoursePage() {
  const params = useParams<{ slug: string | string[] }>();
  const slugParam = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!slugParam) return;

    startTransition(() => setIsLoading(true));
    apiClient
      .getCourse(slugParam)
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setCourse(response);
          setError(null);
        });
      })
      .catch((courseError: unknown) => {
        console.error("Failed to load course", courseError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить курс. Попробуйте позже.");
        });
      })
      .finally(() => {
        if (active) startTransition(() => setIsLoading(false));
      });

    return () => {
      active = false;
    };
  }, [slugParam]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-dark">
          Редактирование курса
        </h1>
        <p className="text-sm text-text-light">
          Внесите изменения и сохраните, чтобы обновить курс в каталоге и
          приложения.
        </p>
      </header>

      {error ? (
        <div className="rounded-3xl bg-card p-4 text-sm text-brand-orange">
          {error}
        </div>
      ) : isLoading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-card" />
      ) : (
        <CourseForm initialCourse={course} />
      )}
    </div>
  );
}

