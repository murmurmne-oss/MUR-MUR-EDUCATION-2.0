"use client";

import { useMemo } from "react";
import type { ModuleState } from "./course-form";

type CourseNavigationSidebarProps = {
  modules: ModuleState[];
  onNavigate: (moduleId: string, lessonId?: string) => void;
  collapsedModules: Set<string>;
  onToggleCollapse: (moduleId: string) => void;
};

export function CourseNavigationSidebar({
  modules,
  onNavigate,
  collapsedModules,
  onToggleCollapse,
}: CourseNavigationSidebarProps) {
  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      const orderA = Number(a.order) || 0;
      const orderB = Number(b.order) || 0;
      return orderA - orderB;
    });
  }, [modules]);

  if (modules.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4 text-sm text-text-medium">
        Нет модулей
      </div>
    );
  }

  return (
    <div className="sticky top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-text-dark">
        Навигация по курсу
      </h3>
      <nav className="space-y-2">
        {sortedModules.map((module, moduleIndex) => {
          const isCollapsed = collapsedModules.has(module.tempId);
          const sortedLessons = [...module.lessons].sort((a, b) => {
            const orderA = Number(a.order) || 0;
            const orderB = Number(b.order) || 0;
            return orderA - orderB;
          });

          return (
            <div key={module.tempId} className="space-y-1">
              <button
                type="button"
                onClick={() => onToggleCollapse(module.tempId)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-text-dark hover:bg-surface"
              >
                <span className="text-text-medium">
                  {isCollapsed ? "▶" : "▼"}
                </span>
                <span className="flex-1">
                  Модуль {moduleIndex + 1}
                  {module.title.trim() ? `: ${module.title}` : ""}
                </span>
              </button>
              {!isCollapsed && (
                <div className="ml-4 space-y-0.5">
                  {sortedLessons.map((lesson, lessonIndex) => (
                    <button
                      key={lesson.tempId}
                      type="button"
                      onClick={() => onNavigate(module.tempId, lesson.tempId)}
                      className="block w-full rounded px-2 py-1 text-left text-[11px] text-text-medium hover:bg-surface hover:text-text-dark"
                    >
                      {lesson.title.trim() || `Урок ${lessonIndex + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

