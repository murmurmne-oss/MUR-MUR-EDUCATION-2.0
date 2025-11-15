"use client";

import { useEffect, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourseForm } from "@/components/courses/course-form";
import { AccessCodesPanel } from "@/components/courses/access-codes-panel";
import { apiClient, CourseDetails } from "@/lib/api-client";

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams<{ slug: string | string[] }>();
  const slugParam = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!course) return;
    const confirmDelete = window.confirm(
      `Удалить курс «${course.title}»? Это действие необратимо.`,
    );
    if (!confirmDelete) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await apiClient.deleteCourse(course.slug);
      router.push("/courses");
    } catch (deleteErr) {
      console.error("Failed to delete course", deleteErr);
      setDeleteError(
        deleteErr instanceof Error
          ? deleteErr.message
          : "Не удалось удалить курс. Попробуйте позже.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

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
        <>
          {deleteError ? (
            <div className="rounded-3xl bg-brand-orange/10 p-4 text-sm text-brand-orange">
              {deleteError}
            </div>
          ) : null}
          {course ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-2xl border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Удаляем..." : "Удалить курс"}
              </button>
            </div>
          ) : null}
          <CourseForm initialCourse={course} />
          {course ? (
            <AccessCodesPanel courseSlug={course.slug} />
          ) : null}
        </>
      )}
    </div>
  );
}

