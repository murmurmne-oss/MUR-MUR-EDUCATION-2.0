"use client";

import { useMemo } from "react";
import type { FormState, ModuleState } from "./course-form";

type CoursePreviewProps = {
  formState: FormState;
  modules: ModuleState[];
};

export function CoursePreview({ formState, modules }: CoursePreviewProps) {
  const totalLessons = useMemo(() => {
    return modules.reduce((sum, module) => sum + module.lessons.length, 0);
  }, [modules]);

  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      const orderA = Number(a.order) || 0;
      const orderB = Number(b.order) || 0;
      return orderA - orderB;
    });
  }, [modules]);

  return (
    <div className="flex h-full flex-col">
      {/* Мобильный телефон - шире */}
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="relative h-[720px] w-[380px] rounded-[3.5rem] border-[14px] border-gray-800 bg-gray-900 p-3 shadow-2xl">
          {/* Вырез для камеры */}
          <div className="absolute left-1/2 top-0 h-9 w-48 -translate-x-1/2 rounded-b-3xl bg-gray-900"></div>
          
          {/* Экран */}
          <div className="h-full w-full overflow-y-auto rounded-[2.75rem] bg-background">
            <div className="flex min-h-full flex-col bg-background text-text-dark">
              {/* Header */}
              <header className="space-y-2 px-4 pt-6">
                <div className="h-3 w-16 rounded-full bg-card"></div>
                <h1 className="text-xl font-semibold line-clamp-2">
                  {formState.title || "Без названия"}
                </h1>
                <p className="text-xs text-text-light">
                  {formState.category || "Категория"}
                </p>
                <p className="text-[10px] text-text-light/70">
                  {modules.length} модулей · {totalLessons} уроков
                </p>
              </header>

              {/* Main content */}
              <main className="mt-4 flex flex-1 flex-col gap-4 px-4 pb-6">
                {/* Cover image */}
                {formState.coverImageUrl && (
                  <div className="relative h-32 w-full overflow-hidden rounded-2xl">
                    <img
                      src={formState.coverImageUrl}
                      alt={formState.title || "Превью курса"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                <section className="rounded-2xl bg-card p-3 text-[10px] text-text-medium shadow-sm">
                  <h2 className="text-xs font-semibold text-text-dark">О курсе</h2>
                  <p className="mt-2 leading-relaxed text-text-medium line-clamp-3">
                    {formState.description || formState.shortDescription || 
                      "Описание появится в ближайшее время."}
                  </p>
                </section>

                {/* Program */}
                {sortedModules.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-xs font-semibold text-text-dark">Программа</h2>
                    <ul className="space-y-2">
                      {sortedModules.slice(0, 3).map((module, moduleIndex) => {
                        const sortedLessons = [...module.lessons].sort((a, b) => {
                          const orderA = Number(a.order) || 0;
                          const orderB = Number(b.order) || 0;
                          return orderA - orderB;
                        });

                        return (
                          <li
                            key={module.tempId}
                            className="space-y-2 rounded-xl border border-card bg-white px-3 py-2 text-[10px] text-text-medium"
                          >
                            <div>
                              <p className="font-medium text-text-dark">
                                {module.title || `Модуль ${moduleIndex + 1}`}
                              </p>
                              <p className="text-[9px] text-text-light">
                                {sortedLessons.length} уроков
                              </p>
                            </div>
                            {sortedLessons.length > 0 && (
                              <div className="space-y-1">
                                {sortedLessons.slice(0, 2).map((lesson) => (
                                  <div
                                    key={lesson.tempId}
                                    className="rounded-lg bg-surface px-2 py-1.5 text-[9px]"
                                  >
                                    <p className="font-medium text-text-dark">
                                      {lesson.title || "Урок"}
                                    </p>
                                  </div>
                                ))}
                                {sortedLessons.length > 2 && (
                                  <p className="text-[9px] text-text-light">
                                    +{sortedLessons.length - 2} уроков
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                      {sortedModules.length > 3 && (
                        <li className="text-center text-[9px] text-text-light">
                          +{sortedModules.length - 3} модулей
                        </li>
                      )}
                    </ul>
                  </section>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

