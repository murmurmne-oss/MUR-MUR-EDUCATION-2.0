"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, CourseSummary, formatRevenue } from "@/lib/api-client";

export default function CoursesAdminPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicatingCourseId, setDuplicatingCourseId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    startTransition(() => setIsLoading(true));

    apiClient
      .getCourses()
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setCourses(response);
          setError(null);
        });
      })
      .catch((coursesError: unknown) => {
        console.error("Failed to load courses", coursesError);
        if (!active) return;
        startTransition(() => {
          setError("Не удалось загрузить курсы. Попробуйте позже.");
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

  const sortedCourses = useMemo(
    () =>
      [...courses].sort(
        (a, b) =>
          (b._count?.enrollments ?? 0) - (a._count?.enrollments ?? 0),
      ),
    [courses],
  );

  const handleDuplicateCourse = async (course: CourseSummary, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем переход на страницу курса
    setDuplicatingCourseId(course.id);
    setError(null);

    try {
      // Загружаем детали курса
      const courseDetails = await apiClient.getCourse(course.slug);

      // Создаем новое название и slug
      const newTitle = `${courseDetails.title} (копия)`;
      const newSlug = `${courseDetails.slug}-copy-${Date.now()}`;

      // Создаем payload для нового курса
      const duplicatePayload = {
        title: newTitle,
        slug: newSlug,
        shortDescription: courseDetails.shortDescription,
        description: courseDetails.description,
        coverImageUrl: courseDetails.coverImageUrl,
        promoVideoUrl: courseDetails.promoVideoUrl,
        category: courseDetails.category,
        language: courseDetails.language,
        level: courseDetails.level,
        priceAmount: courseDetails.priceAmount,
        priceCurrency: courseDetails.priceCurrency,
        isFree: courseDetails.isFree,
        isPublished: false, // Новый курс не опубликован по умолчанию
        modules: courseDetails.modules?.map((module) => ({
          title: module.title,
          description: module.description,
          order: module.order,
          lessons: module.lessons?.map((lesson) => ({
            title: lesson.title,
            summary: lesson.summary,
            content: lesson.content,
            contentType: lesson.contentType,
            videoUrl: lesson.videoUrl,
            durationMinutes: lesson.durationMinutes,
            order: lesson.order,
            isPreview: lesson.isPreview,
          })),
        })),
        tests: courseDetails.tests?.map((test) => ({
          title: test.title,
          description: test.description,
          questions: test.questions,
          unlockModuleId: test.unlockModuleId,
          unlockLessonId: test.unlockLessonId,
        })),
        forms: courseDetails.forms?.map((form) => ({
          title: form.title,
          description: form.description,
          questions: form.questions,
          results: form.results,
          unlockModuleId: form.unlockModuleId,
          unlockLessonId: form.unlockLessonId,
        })),
      };

      // Создаем новый курс
      const newCourse = await apiClient.createCourse(duplicatePayload);

      // Обновляем список курсов
      const updatedCourses = await apiClient.getCourses();
      setCourses(updatedCourses);

      // Перенаправляем на страницу редактирования нового курса
      router.push(`/courses/${newCourse.slug}`);
    } catch (duplicateError) {
      console.error("Failed to duplicate course", duplicateError);
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Не удалось дублировать курс. Попробуйте позже.",
      );
    } finally {
      setDuplicatingCourseId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-dark">Курсы</h1>
          <p className="text-sm text-text-light">
            Управляйте программами, обновляйте содержание и статусы курсов.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
          onClick={() => router.push("/courses/new")}
        >
          Создать курс
        </button>
      </header>

      {error ? (
        <section className="rounded-3xl bg-card p-6 text-sm text-brand-orange">
          {error}
        </section>
      ) : (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border/60 pb-3 text-xs font-semibold uppercase text-text-light">
            <span>Название</span>
            <span>Цена</span>
            <span>Категория</span>
            <span>Ученики</span>
            <span></span>
          </div>

          <div className="divide-y divide-border/60">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-card"
                  />
                ))
              : sortedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center py-4"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/courses/${course.slug}`)}
                      className="text-left text-sm transition-colors hover:bg-card/60 rounded px-2 py-1 -mx-2 -my-1"
                    >
                      <span className="font-medium text-text-dark">
                        {course.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/courses/${course.slug}`)}
                      className="text-left text-sm transition-colors hover:bg-card/60 rounded px-2 py-1 -mx-2 -my-1"
                    >
                      <span className="text-text-medium">
                        {course.isFree
                          ? "Бесплатно"
                          : formatRevenue(course.priceAmount, course.priceCurrency)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/courses/${course.slug}`)}
                      className="text-left text-sm transition-colors hover:bg-card/60 rounded px-2 py-1 -mx-2 -my-1"
                    >
                      <span className="text-text-medium">{course.category}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/courses/${course.slug}`)}
                      className="text-left text-sm transition-colors hover:bg-card/60 rounded px-2 py-1 -mx-2 -my-1"
                    >
                      <span className="text-text-dark">
                        {course._count?.enrollments ?? 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDuplicateCourse(course, e)}
                      disabled={duplicatingCourseId === course.id}
                      className="rounded-full border border-brand-pink px-3 py-1 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Дублировать курс"
                    >
                      {duplicatingCourseId === course.id ? "..." : "Дублировать"}
                    </button>
                  </div>
                ))}
          </div>
        </section>
      )}
    </div>
  );
}

