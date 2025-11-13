"use client";

import { CourseForm } from "@/components/courses/course-form";

export default function CreateCoursePage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-dark">
          Новый курс
        </h1>
        <p className="text-sm text-text-light">
          Заполните информацию, чтобы добавить курс в каталог.
        </p>
      </header>
      <CourseForm />
    </div>
  );
}


