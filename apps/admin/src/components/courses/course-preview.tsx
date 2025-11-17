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
    <div className="sticky top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-text-dark">
        Превью курса
      </h3>
      <div className="space-y-4 text-sm">
        {formState.coverImageUrl && (
          <img
            src={formState.coverImageUrl}
            alt={formState.title || "Превью курса"}
            className="h-32 w-full rounded-xl object-cover"
          />
        )}
        <div>
          <h4 className="font-semibold text-text-dark">
            {formState.title || "Без названия"}
          </h4>
          {formState.shortDescription && (
            <p className="mt-1 text-xs text-text-medium">
              {formState.shortDescription}
            </p>
          )}
        </div>
        <div className="space-y-2 text-xs text-text-medium">
          <div>
            <span className="font-medium">Категория:</span>{" "}
            {formState.category || "—"}
          </div>
          <div>
            <span className="font-medium">Уровень:</span>{" "}
            {formState.level || "—"}
          </div>
          <div>
            <span className="font-medium">Язык:</span>{" "}
            {formState.language || "—"}
          </div>
          <div>
            <span className="font-medium">Модулей:</span> {modules.length}
          </div>
          <div>
            <span className="font-medium">Уроков:</span> {totalLessons}
          </div>
        </div>
        {sortedModules.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-dark">Программа:</p>
            <div className="space-y-1.5">
              {sortedModules.map((module, moduleIndex) => {
                const sortedLessons = [...module.lessons].sort((a, b) => {
                  const orderA = Number(a.order) || 0;
                  const orderB = Number(b.order) || 0;
                  return orderA - orderB;
                });

                return (
                  <div key={module.tempId} className="text-xs">
                    <p className="font-medium text-text-dark">
                      {moduleIndex + 1}. {module.title || "Без названия"}
                    </p>
                    {sortedLessons.length > 0 && (
                      <ul className="ml-3 mt-0.5 space-y-0.5 text-text-medium">
                        {sortedLessons.map((lesson, lessonIndex) => (
                          <li key={lesson.tempId}>
                            • {lesson.title || `Урок ${lessonIndex + 1}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

