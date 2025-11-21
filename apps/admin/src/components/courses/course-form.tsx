"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  CourseDetails,
  CourseModulePayload,
  CoursePayload,
  CourseTestPayload,
  LessonPayload,
} from "@/lib/api-client";
import {
  LessonContentBlockState,
  LessonContentEditor,
  LessonContentMode,
  LessonSectionItemState,
} from "./lesson-content-editor";
import { CourseNavigationSidebar } from "./course-navigation-sidebar";
import { CoursePreview } from "./course-preview";
import { ImageUploadField } from "./image-upload-field";

const CATEGORY_OPTIONS = [
  { value: "EROS_EVERY_DAY", label: "Eros & every day" },
  { value: "MEN_WOMEN", label: "Men & Women" },
  { value: "PSYCHOSEXUALITY", label: "Psychosexuality" },
];

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR — Евро" },
  { value: "TELEGRAM_STAR", label: "TELEGRAM_STAR — Telegram Stars" },
];

const LANGUAGE_OPTIONS = [
  { value: "SR", label: "Srpski (latinica)" },
  { value: "RU", label: "Русский" },
];

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionKind; label: string }> = [
  { value: "single", label: "Один ответ" },
  { value: "multiple", label: "Несколько ответов" },
  { value: "open", label: "Свободный ответ" },
];

type CourseFormProps = {
  initialCourse?: CourseDetails | null;
};

export type FormState = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  coverImageUrl: string;
  promoVideoUrl: string;
  category: string;
  language: string;
  level: string;
  priceValue: string;
  priceCurrency: string;
  isFree: boolean;
  isPublished: boolean;
};

export type LessonState = {
  tempId: string;
  sourceId: string | null;
  title: string;
  summary: string;
  order: string;
  durationMinutes: string;
  contentType: string;
  isPreview: boolean;
  contentText: string;
  contentMode: LessonContentMode;
  contentBlocks: LessonContentBlockState[];
  videoUrl: string;
  forms: CourseFormState[]; // Формы, принадлежащие этому уроку
};

export type ModuleState = {
  tempId: string;
  sourceId: string | null;
  title: string;
  description: string;
  order: string;
  lessons: LessonState[];
};

type TestOptionState = {
  tempId: string;
  text: string;
  isCorrect: boolean;
};

type QuestionKind = "single" | "multiple" | "open";

type TestQuestionState = {
  tempId: string;
  prompt: string;
  explanation: string;
  type: QuestionKind;
  options: TestOptionState[];
  correctAnswer: string;
};

type TestState = {
  tempId: string;
  title: string;
  description: string;
  questions: TestQuestionState[];
  rawJson: string;
  unlockModuleId: string | null;
  unlockLessonId: string | null;
};

type FormOptionState = {
  tempId: string;
  text: string;
  category: string; // A, B, C и т.д.
};

type FormQuestionState = {
  tempId: string;
  text: string;
  options: FormOptionState[];
};

type FormResultState = {
  tempId: string;
  id: string;
  condition: string; // "more_A", "more_B", "equal_A_B" и т.д.
  title: string;
  description: string;
};

type CourseFormState = {
  tempId: string;
  title: string;
  description: string;
  questions: FormQuestionState[];
  results: FormResultState[];
  unlockModuleId: string | null;
  unlockLessonId: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function createTempId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createLessonState(partial?: Partial<LessonState>): LessonState {
  return {
    tempId: partial?.tempId ?? createTempId("lesson"),
    sourceId: partial?.sourceId ?? null,
    title: partial?.title ?? "",
    summary: partial?.summary ?? "",
    order: partial?.order ?? "1",
    durationMinutes: partial?.durationMinutes ?? "",
    contentType: partial?.contentType ?? "TEXT",
    isPreview: partial?.isPreview ?? false,
    contentText: partial?.contentText ?? "",
    contentMode: partial?.contentMode ?? "rich",
    contentBlocks: partial?.contentBlocks ?? [],
    videoUrl: partial?.videoUrl ?? "",
    forms: partial?.forms ?? [],
  };
}

function createContentBlockState(
  type: LessonContentBlockState["type"],
  partial?: Partial<LessonContentBlockState>,
): LessonContentBlockState {
  const baseId = partial?.id ?? createTempId("block");

  if (type === "image") {
    const imagePartial = partial as
      | Extract<LessonContentBlockState, { type: "image" }>
      | undefined;

    return {
      id: baseId,
      type: "image",
      url: imagePartial?.url ?? "",
      caption: imagePartial?.caption ?? "",
      align: imagePartial?.align ?? "center",
      width: imagePartial?.width ?? "auto",
    };
  }

  if (type === "heading") {
    const headingPartial = partial as
      | Extract<LessonContentBlockState, { type: "heading" }>
      | undefined;

    return {
      id: baseId,
      type: "heading",
      text: headingPartial?.text ?? "",
      level: headingPartial?.level ?? 2,
      align: headingPartial?.align ?? "left",
    };
  }

  if (type === "video") {
    const videoPartial = partial as
      | Extract<LessonContentBlockState, { type: "video" }>
      | undefined;

    return {
      id: baseId,
      type: "video",
      url: videoPartial?.url ?? "",
      caption: videoPartial?.caption ?? "",
      autoplay: videoPartial?.autoplay ?? false,
      coverImageUrl: videoPartial?.coverImageUrl ?? "",
    };
  }

  if (type === "audio") {
    const audioPartial = partial as
      | Extract<LessonContentBlockState, { type: "audio" }>
      | undefined;

    return {
      id: baseId,
      type: "audio",
      url: audioPartial?.url ?? "",
      caption: audioPartial?.caption ?? "",
    };
  }

  if (type === "section") {
    const sectionPartial = partial as
      | Extract<LessonContentBlockState, { type: "section" }>
      | undefined;
    const items = (sectionPartial?.items ?? []).map((item) => ({
      id: item.id ?? createTempId("section-item"),
      text: item.text ?? "",
    }));

    return {
      id: baseId,
      type: "section",
      title: sectionPartial?.title ?? "",
      description: sectionPartial?.description ?? "",
      items: items.length > 0
        ? items
        : [{ id: createTempId("section-item"), text: "" }],
    };
  }

  const paragraphPartial = partial as
    | Extract<LessonContentBlockState, { type: "paragraph" }>
    | undefined;

  return {
    id: baseId,
    type: "paragraph",
    text: paragraphPartial?.text ?? "",
    fontFamily: paragraphPartial?.fontFamily ?? "sans",
    fontSize: paragraphPartial?.fontSize ?? "md",
    fontWeight: paragraphPartial?.fontWeight ?? "regular",
    align: paragraphPartial?.align ?? "left",
  };
}

function parseLessonContentToState(
  content: unknown,
): {
  mode: LessonContentMode;
  text: string;
  blocks: LessonContentBlockState[];
} {
  if (!content) {
    return { mode: "simple", text: "", blocks: [] };
  }

  if (typeof content === "string") {
    return { mode: "simple", text: content, blocks: [] };
  }

  if (
    typeof content === "object" &&
    content !== null &&
    "text" in content &&
    typeof (content as { text?: unknown }).text === "string"
  ) {
    return {
      mode: "simple",
      text: (content as { text: string }).text,
      blocks: [],
    };
  }

  if (
    typeof content === "object" &&
    content !== null &&
    "blocks" in content &&
    Array.isArray((content as { blocks?: unknown }).blocks)
  ) {
    const parsedBlocks = ((content as { blocks?: unknown[] }).blocks ?? [])
      .map((block) => {
        if (!block || typeof block !== "object") {
          return null;
        }

        const rawBlock = block as Record<string, unknown>;
        const type = rawBlock.type;

        if (type === "image") {
          const url =
            typeof rawBlock.url === "string" ? rawBlock.url.trim() : "";
          if (!url) return null;
          return createContentBlockState("image", {
            url,
            caption:
              typeof rawBlock.caption === "string"
                ? rawBlock.caption
                : "",
            align:
              rawBlock.align === "left" ||
              rawBlock.align === "center" ||
              rawBlock.align === "right"
                ? (rawBlock.align as "left" | "center" | "right")
                : "center",
            width: rawBlock.width === "full" ? "full" : "auto",
          });
        }

        if (type === "heading") {
          const text =
            typeof rawBlock.text === "string" ? rawBlock.text.trim() : "";
          if (!text) return null;
          const level = [1, 2, 3].includes(rawBlock.level as number)
            ? (rawBlock.level as 1 | 2 | 3)
            : 2;
          return createContentBlockState("heading", {
            text,
            level,
            align:
              rawBlock.align === "center" ||
              rawBlock.align === "right"
                ? (rawBlock.align as "center" | "right")
                : "left",
          });
        }

        if (type === "video") {
          const url =
            typeof rawBlock.url === "string" ? rawBlock.url.trim() : "";
          if (!url) return null;
          return createContentBlockState("video", {
            url,
            caption:
              typeof rawBlock.caption === "string"
                ? rawBlock.caption
                : "",
            autoplay: rawBlock.autoplay === true,
            coverImageUrl:
              typeof rawBlock.coverImageUrl === "string"
                ? rawBlock.coverImageUrl.trim()
                : "",
          });
        }

        if (type === "audio") {
          const url =
            typeof rawBlock.url === "string" ? rawBlock.url.trim() : "";
          if (!url) return null;
          return createContentBlockState("audio", {
            url,
            caption:
              typeof rawBlock.caption === "string"
                ? rawBlock.caption
                : "",
          });
        }

        if (type === "section") {
          const rawItems = Array.isArray(rawBlock.items)
            ? (rawBlock.items as unknown[])
            : [];
          const items = rawItems
            .map((item) => {
              if (typeof item === "string") {
                const text = item.trim();
                return text.length > 0
                  ? { id: createTempId("section-item"), text }
                  : null;
              }
              if (item && typeof item === "object") {
                const rawText =
                  typeof (item as { text?: unknown }).text === "string"
                    ? (item as { text?: string }).text
                    : undefined;
                const text = rawText?.trim() ?? "";
                if (!text) {
                  return null;
                }
                const id =
                  typeof (item as { id?: unknown }).id === "string"
                    ? ((item as { id: string }).id || createTempId("section-item"))
                    : createTempId("section-item");
                return { id, text };
              }
              return null;
            })
            .filter((entry): entry is LessonSectionItemState => entry !== null);

          return createContentBlockState("section", {
            title:
              typeof rawBlock.title === "string"
                ? rawBlock.title.trim()
                : "",
            description:
              typeof rawBlock.description === "string"
                ? rawBlock.description.trim()
                : "",
            items,
          });
        }

        const text =
          typeof rawBlock.text === "string" ? rawBlock.text.trim() : "";
        if (!text) return null;
        return createContentBlockState("paragraph", {
          text,
          fontFamily:
            rawBlock.fontFamily === "serif" ||
            rawBlock.fontFamily === "mono" ||
            rawBlock.fontFamily === "display" ||
            rawBlock.fontFamily === "handwriting"
              ? (rawBlock.fontFamily as
                  | "serif"
                  | "mono"
                  | "display"
                  | "handwriting")
              : "sans",
          fontSize:
            rawBlock.fontSize === "sm" ||
            rawBlock.fontSize === "lg" ||
            rawBlock.fontSize === "xl" ||
            rawBlock.fontSize === "2xl"
              ? (rawBlock.fontSize as "sm" | "lg" | "xl" | "2xl")
              : "md",
          fontWeight:
            rawBlock.fontWeight === "medium" || rawBlock.fontWeight === "bold"
              ? (rawBlock.fontWeight as "medium" | "bold")
              : "regular",
          align:
            rawBlock.align === "center" || rawBlock.align === "right"
              ? (rawBlock.align as "center" | "right")
              : "left",
        });
      })
      .filter((block): block is LessonContentBlockState => block !== null);

    return {
      mode: parsedBlocks.length > 0 ? "rich" : "simple",
      text: "",
      blocks: parsedBlocks,
    };
  }

  try {
    return {
      mode: "simple",
      text: JSON.stringify(content, null, 2),
      blocks: [],
    };
  } catch (error) {
    console.warn("Failed to parse lesson content", error);
    return { mode: "simple", text: "", blocks: [] };
  }
}

function parseTestQuestionsToState(
  questions: unknown,
): TestQuestionState[] {
  if (!Array.isArray(questions)) {
    return [];
  }

  const parsed: TestQuestionState[] = [];

  for (const rawQuestion of questions as unknown[]) {
    if (!rawQuestion || typeof rawQuestion !== "object") {
      continue;
    }

    const questionRecord = rawQuestion as Record<string, unknown>;
    const basePrompt =
      typeof questionRecord.prompt === "string"
        ? questionRecord.prompt.trim()
        : typeof questionRecord.question === "string"
          ? questionRecord.question.trim()
          : "";

    if (basePrompt.length === 0) {
      continue;
    }

    const explanation =
      typeof questionRecord.explanation === "string"
        ? questionRecord.explanation
        : "";

    const rawType =
      typeof questionRecord.type === "string"
        ? questionRecord.type.toLowerCase()
        : undefined;

    let type: QuestionKind;
    if (rawType === "multiple" || rawType === "open" || rawType === "single") {
      type = rawType;
    } else {
      type = questionRecord.allowMultiple === true ? "multiple" : "single";
    }

    let optionStates: TestOptionState[] = [];
    const rawOptions = questionRecord.options;

    if (Array.isArray(rawOptions)) {
      if (rawOptions.every((option) => typeof option === "object" && option !== null)) {
        const optionRecords = rawOptions as Array<Record<string, unknown>>;
        optionStates = optionRecords
          .map((option) => {
            const text =
              typeof option.text === "string"
                ? option.text.trim()
                : typeof option.value === "string"
                  ? option.value.trim()
                  : "";

            if (text.length === 0) {
              return null;
            }

            return createTestOptionState({
              tempId: createTempId("option"),
              text,
              isCorrect: option.isCorrect === true,
            });
          })
          .filter((option): option is TestOptionState => option !== null);

        const correctMarked = optionRecords.filter(
          (option) => option.isCorrect === true,
        ).length;
        if (type !== "open" && correctMarked > 1) {
          type = "multiple";
        }
      }
    }

    if (optionStates.length === 0 && type !== "open") {
      const answersRaw = questionRecord.answer;
      const correctIndexes = new Set<number>();

      if (typeof answersRaw === "number" && Number.isFinite(answersRaw)) {
        correctIndexes.add(answersRaw);
      } else if (Array.isArray(answersRaw)) {
        for (const value of answersRaw) {
          if (typeof value === "number" && Number.isFinite(value)) {
            correctIndexes.add(value);
          }
        }
      }

      if (correctIndexes.size > 1) {
        type = "multiple";
      }

      const legacyOptions = Array.isArray(rawOptions)
        ? (rawOptions as unknown[])
        : [];

      optionStates = legacyOptions
        .map((option, index) => {
          const text =
            typeof option === "string"
              ? option.trim()
              : typeof option === "number" || typeof option === "boolean"
                ? String(option)
                : "";
          if (text.length === 0) {
            return null;
          }
          return createTestOptionState({
            tempId: createTempId("option"),
            text,
            isCorrect: correctIndexes.has(index),
          });
        })
        .filter((option): option is TestOptionState => option !== null);
    }

    if (type === "open") {
      optionStates = [];
    } else if (optionStates.length === 0) {
      optionStates = [createTestOptionState(), createTestOptionState()];
    }

    let correctAnswer =
      typeof questionRecord.correctAnswer === "string"
        ? questionRecord.correctAnswer.trim()
        : "";

    if (type === "open" && correctAnswer.length === 0) {
      if (typeof questionRecord.answer === "string") {
        correctAnswer = questionRecord.answer.trim();
      }
    }

    parsed.push(
      createTestQuestionState({
        tempId: createTempId("question"),
        prompt: basePrompt,
        explanation,
        type,
        options: optionStates,
        correctAnswer,
      }),
    );
  }

  return parsed;
}

type PreparedTestQuestion = {
  type: QuestionKind;
  prompt: string;
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  explanation?: string;
  correctAnswer?: string;
};

function sanitizeTestQuestions(
  questions: TestQuestionState[],
  options?: { strict?: boolean; testTitle?: string },
): PreparedTestQuestion[] {
  const strict = options?.strict ?? false;
  const testTitle = options?.testTitle ?? "Тест";

  return questions.map((question, index) => {
    const prompt =
      question.prompt.trim().length > 0
        ? question.prompt.trim()
        : `Вопрос ${index + 1}`;

    const explanation = question.explanation.trim();

    if (question.type === "open") {
      const answer = question.correctAnswer.trim();

      if (strict && answer.length === 0) {
        throw new Error(
          `Тест "${testTitle}": в вопросе "${prompt}" заполните ожидаемый ответ для открытого вопроса.`,
        );
      }

      return {
        type: "open",
        prompt,
        ...(explanation.length > 0 ? { explanation } : {}),
        ...(answer.length > 0 ? { correctAnswer: answer } : {}),
      };
    }

    let trimmedOptions = question.options
      .map((option) => ({
        text: option.text.trim(),
        isCorrect: option.isCorrect,
      }))
      .filter((option) => option.text.length > 0);

    if (trimmedOptions.length === 0) {
      trimmedOptions = [
        { text: "Вариант 1", isCorrect: true },
        { text: "Вариант 2", isCorrect: false },
      ];
    }

    let correctCount = trimmedOptions.filter((option) => option.isCorrect).length;

    if (strict) {
      if (trimmedOptions.length < 2) {
        throw new Error(
          `Тест "${testTitle}": в вопросе "${prompt}" необходимо минимум два варианта ответа.`,
        );
      }

      if (correctCount === 0) {
        throw new Error(
          `Тест "${testTitle}": в вопросе "${prompt}" отметьте хотя бы один правильный ответ.`,
        );
      }

      if (question.type === "single" && correctCount > 1) {
        throw new Error(
          `Тест "${testTitle}": в вопросе "${prompt}" выбрано несколько правильных ответов. Выберите тип "Несколько" или оставьте один ответ.`,
        );
      }
    }

    if (question.type === "single") {
      if (correctCount === 0 && trimmedOptions.length > 0) {
        trimmedOptions = trimmedOptions.map((option, idx) => ({
          ...option,
          isCorrect: idx === 0,
        }));
        correctCount = 1;
      } else if (correctCount > 1) {
        const firstCorrectIndex = trimmedOptions.findIndex((option) => option.isCorrect);
        trimmedOptions = trimmedOptions.map((option, idx) => ({
          ...option,
          isCorrect: idx === firstCorrectIndex,
        }));
        correctCount = 1;
      }
    }

    if (question.type === "multiple") {
      if (correctCount === 0 && trimmedOptions.length > 0) {
        trimmedOptions = trimmedOptions.map((option, idx) => ({
          ...option,
          isCorrect: idx === 0,
        }));
        correctCount = 1;
      }
    }

    const finalType: QuestionKind =
      question.type === "multiple" || correctCount > 1 ? "multiple" : "single";

    return {
      type: finalType,
      prompt,
      options: trimmedOptions,
      ...(explanation.length > 0 ? { explanation } : {}),
    };
  });
}

function serializeTestQuestions(
  questions: TestQuestionState[],
): PreparedTestQuestion[] {
  try {
    return sanitizeTestQuestions(questions, { strict: false });
  } catch {
    return [];
  }
}

function prepareQuestionsForPayload(
  questions: TestQuestionState[],
  testTitle: string,
): PreparedTestQuestion[] {
  return sanitizeTestQuestions(questions, { strict: true, testTitle });
}
function createModuleState(partial?: Partial<ModuleState>): ModuleState {
  return {
    tempId: partial?.tempId ?? createTempId("module"),
    sourceId: partial?.sourceId ?? null,
    title: partial?.title ?? "",
    description: partial?.description ?? "",
    order: partial?.order ?? "1",
    lessons: partial?.lessons ?? [createLessonState()],
  };
}

function createTestState(partial?: Partial<TestState>): TestState {
  const questions =
    partial?.questions ?? [createTestQuestionState()];
  return {
    tempId: partial?.tempId ?? createTempId("test"),
    title: partial?.title ?? "",
    description: partial?.description ?? "",
    questions,
    rawJson:
      partial?.rawJson ??
      JSON.stringify(serializeTestQuestions(questions), null, 2),
    unlockModuleId: partial?.unlockModuleId ?? null,
    unlockLessonId: partial?.unlockLessonId ?? null,
  };
}

function createTestQuestionState(
  partial?: Partial<TestQuestionState>,
): TestQuestionState {
  const baseOptions =
    partial?.options && partial.options.length > 0
      ? partial.options
      : [
          createTestOptionState({
            text: 'Вариант 1',
            isCorrect: true,
          }),
          createTestOptionState({
            text: 'Вариант 2',
            isCorrect: false,
          }),
        ];

  return {
    tempId: partial?.tempId ?? createTempId('question'),
    prompt: partial?.prompt ?? '',
    explanation: partial?.explanation ?? '',
    type: partial?.type ?? 'single',
    options: baseOptions,
    correctAnswer: partial?.correctAnswer ?? '',
  };
}

function createTestOptionState(
  partial?: Partial<TestOptionState>,
): TestOptionState {
  return {
    tempId: partial?.tempId ?? createTempId("option"),
    text: partial?.text ?? "",
    isCorrect: partial?.isCorrect ?? false,
  };
}

function mapCourseToModules(course?: CourseDetails | null): ModuleState[] {
  if (!course || !course.modules) {
    return [];
  }

  return course.modules.map((module) =>
    createModuleState({
      tempId: createTempId("module"),
      sourceId: module.id,
      title: module.title,
      description: module.description ?? "",
      order: module.order.toString(),
      lessons:
        module.lessons.map((lesson) => {
          const parsed = parseLessonContentToState(lesson.content);
          // Найти формы, принадлежащие этому уроку
          const lessonForms = course?.forms?.filter((form) => form.lessonId === lesson.id) ?? [];
          return createLessonState({
            tempId: createTempId("lesson"),
            sourceId: lesson.id,
            title: lesson.title,
            summary: lesson.summary ?? "",
            order: lesson.order.toString(),
            durationMinutes: lesson.durationMinutes?.toString() ?? "",
            contentType: lesson.contentType,
            isPreview: lesson.isPreview,
            contentText: parsed.text,
            contentMode: parsed.mode,
            contentBlocks: parsed.blocks,
            videoUrl: lesson.videoUrl ?? "",
            forms: lessonForms.length > 0 ? mapCourseToForms({ forms: lessonForms } as CourseDetails) : [],
          });
        }) ?? [],
    }),
  );
}

function mapCourseToTests(course?: CourseDetails | null): TestState[] {
  if (!course || !course.tests) {
    return [];
  }

  return course.tests.map((test) =>
    createTestState({
      tempId: createTempId("test"),
      title: test.title,
      description: test.description ?? "",
      questions: (() => {
        const parsed = parseTestQuestionsToState(test.questions);
        return parsed.length > 0 ? parsed : [createTestQuestionState()];
      })(),
      rawJson:
        test.questions !== undefined && test.questions !== null
          ? JSON.stringify(test.questions, null, 2)
          : "[]",
      unlockModuleId: test.unlockModuleId ?? null,
      unlockLessonId: test.unlockLessonId ?? null,
    }),
  );
}

function createFormState(partial?: Partial<CourseFormState>): CourseFormState {
  const questions = partial?.questions ?? [createFormQuestionState()];
  const results = partial?.results ?? [createFormResultState()];
  return {
    tempId: partial?.tempId ?? createTempId("form"),
    title: partial?.title ?? "",
    description: partial?.description ?? "",
    questions,
    results,
    unlockModuleId: partial?.unlockModuleId ?? null,
    unlockLessonId: partial?.unlockLessonId ?? null,
  };
}

function createFormQuestionState(
  partial?: Partial<FormQuestionState>,
): FormQuestionState {
  const baseOptions =
    partial?.options && partial.options.length > 0
      ? partial.options
      : [
          createFormOptionState({
            text: "Вариант 1",
            category: "A",
          }),
          createFormOptionState({
            text: "Вариант 2",
            category: "B",
          }),
        ];

  return {
    tempId: partial?.tempId ?? createTempId("form-question"),
    text: partial?.text ?? "",
    options: baseOptions,
  };
}

function createFormOptionState(
  partial?: Partial<FormOptionState>,
): FormOptionState {
  return {
    tempId: partial?.tempId ?? createTempId("form-option"),
    text: partial?.text ?? "",
    category: partial?.category ?? "A",
  };
}

function createFormResultState(
  partial?: Partial<FormResultState>,
): FormResultState {
  return {
    tempId: partial?.tempId ?? createTempId("form-result"),
    id: partial?.id ?? createTempId("result"),
    condition: partial?.condition ?? "more_A",
    title: partial?.title ?? "",
    description: partial?.description ?? "",
  };
}

function serializeFormQuestions(questions: FormQuestionState[]): unknown[] {
  return questions.map((question) => ({
    id: question.tempId,
    text: question.text,
    options: question.options.map((option) => ({
      id: option.tempId,
      text: option.text,
      category: option.category,
    })),
  }));
}

function serializeFormResults(results: FormResultState[]): unknown[] {
  return results.map((result) => ({
    id: result.id,
    condition: result.condition,
    title: result.title,
    description: result.description,
  }));
}

function parseFormQuestionsToState(questions: unknown): FormQuestionState[] {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map((q) => {
    if (!q || typeof q !== "object") {
      return createFormQuestionState();
    }

    const question = q as Record<string, unknown>;
    const options = Array.isArray(question.options)
      ? question.options.map((opt) => {
          if (!opt || typeof opt !== "object") {
            return createFormOptionState();
          }
          const option = opt as Record<string, unknown>;
          return createFormOptionState({
            text: typeof option.text === "string" ? option.text : "",
            category: typeof option.category === "string" ? option.category : "A",
          });
        })
      : [];

    return createFormQuestionState({
      text: typeof question.text === "string" ? question.text : "",
      options: options.length > 0 ? options : undefined,
    });
  });
}

function parseFormResultsToState(results: unknown): FormResultState[] {
  if (!Array.isArray(results)) {
    return [createFormResultState()];
  }

  if (results.length === 0) {
    return [createFormResultState()];
  }

  return results.map((r) => {
    if (!r || typeof r !== "object") {
      return createFormResultState();
    }

    const result = r as Record<string, unknown>;
    return createFormResultState({
      id: typeof result.id === "string" ? result.id : createTempId("result"),
      condition: typeof result.condition === "string" ? result.condition : "more_A",
      title: typeof result.title === "string" ? result.title : "",
      description: typeof result.description === "string" ? result.description : "",
    });
  });
}

function mapCourseToForms(course?: CourseDetails | null): CourseFormState[] {
  if (!course || !course.forms) {
    return [];
  }

  return course.forms.map((form) =>
    createFormState({
      tempId: createTempId("form"),
      title: form.title,
      description: form.description ?? "",
      questions: (() => {
        const parsed = parseFormQuestionsToState(form.questions);
        return parsed.length > 0 ? parsed : [createFormQuestionState()];
      })(),
      results: (() => {
        const parsed = parseFormResultsToState(form.results);
        return parsed.length > 0 ? parsed : [createFormResultState()];
      })(),
      unlockModuleId: form.unlockModuleId ?? null,
      unlockLessonId: form.unlockLessonId ?? null,
    }),
  );
}

export function CourseForm({ initialCourse }: CourseFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(() => ({
    title: initialCourse?.title ?? "",
    slug: initialCourse?.slug ?? "",
    shortDescription: initialCourse?.shortDescription ?? "",
    description: initialCourse?.description ?? "",
    coverImageUrl: initialCourse?.coverImageUrl ?? "",
    promoVideoUrl: initialCourse?.promoVideoUrl ?? "",
    category: initialCourse?.category ?? CATEGORY_OPTIONS[0]?.value ?? "",
    language: initialCourse?.language ?? LANGUAGE_OPTIONS[0]?.value ?? "SR",
    level: initialCourse?.level ?? LEVEL_OPTIONS[0]?.value ?? "BEGINNER",
    priceValue:
      initialCourse && !initialCourse.isFree
        ? initialCourse.priceCurrency === "TELEGRAM_STAR"
          ? initialCourse.priceAmount.toString()
          : (initialCourse.priceAmount / 100).toString()
        : "",
    priceCurrency: initialCourse?.priceCurrency ?? "EUR",
    isFree: initialCourse?.isFree ?? false,
    isPublished: initialCourse?.isPublished ?? true,
  }));
  const [modules, setModules] = useState<ModuleState[]>(
    mapCourseToModules(initialCourse),
  );
  const [tests, setTests] = useState<TestState[]>(
    mapCourseToTests(initialCourse),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(
    new Set(),
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (initialCourse) {
      setFormState({
        title: initialCourse.title,
        slug: initialCourse.slug,
        shortDescription: initialCourse.shortDescription ?? "",
        description: initialCourse.description ?? "",
        coverImageUrl: initialCourse.coverImageUrl ?? "",
        promoVideoUrl: initialCourse.promoVideoUrl ?? "",
        category: initialCourse.category,
      language: initialCourse.language,
        level: initialCourse.level,
        priceValue: initialCourse.isFree
          ? ""
          : initialCourse.priceCurrency === "TELEGRAM_STAR"
            ? initialCourse.priceAmount.toString()
            : (initialCourse.priceAmount / 100).toString(),
        priceCurrency: initialCourse.priceCurrency ?? "EUR",
        isFree: initialCourse.isFree,
        isPublished: initialCourse.isPublished,
      });
      setModules(mapCourseToModules(initialCourse));
      setTests(mapCourseToTests(initialCourse));
    }
  }, [initialCourse]);

  const isNewCourse = useMemo(() => !initialCourse, [initialCourse]);

  const unlockModuleOptions = useMemo(() => {
    if (!initialCourse) {
      return [] as Array<{
        id: string;
        label: string;
        lessons: Array<{ id: string; label: string }>;
      }>;
    }

    return initialCourse.modules.map((module, index) => {
      const label = module.title?.trim().length
        ? module.title
        : `Модуль ${module.order ?? index + 1}`;
      const lessons = module.lessons.map((lesson, lessonIndex) => ({
        id: lesson.id,
        label: lesson.title?.trim().length
          ? lesson.title
          : `Урок ${lesson.order ?? lessonIndex + 1}`,
      }));
      return { id: module.id, label, lessons };
    });
  }, [initialCourse]);

  const unlockLessonOptions = useMemo(() => {
    return unlockModuleOptions.flatMap((module) =>
      module.lessons.map((lesson) => ({
        id: lesson.id,
        label: lesson.label,
        moduleLabel: module.label,
      })),
    );
  }, [unlockModuleOptions]);

  const handleFormChange = <Field extends keyof FormState>(
    field: Field,
    value: FormState[Field],
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateSlug = () => {
    if (formState.title.length === 0) return;
    const newSlug = slugify(formState.title);
    setFormState((prev) => ({
      ...prev,
      slug: newSlug,
    }));
  };

  const handleAddModule = () => {
    setModules((prev) => [
      ...prev,
      createModuleState({
        order: (prev.length + 1).toString(),
      }),
    ]);
  };

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleRemoveModule = (moduleId: string) => {
    setModules((prev) => prev.filter((module) => module.tempId !== moduleId));
  };

  const handleModuleChange = (
    moduleId: string,
    field: keyof ModuleState,
    value: string,
  ) => {
    setModules((prev) =>
      prev.map((module) =>
        module.tempId === moduleId
          ? {
              ...module,
              [field]: value,
            }
          : module,
      ),
    );
  };

  const handleAddLesson = (moduleId: string) => {
    setModules((prev) =>
      prev.map((module) =>
        module.tempId === moduleId
          ? {
              ...module,
              lessons: [
                ...module.lessons,
                createLessonState({
                  order: (module.lessons.length + 1).toString(),
                }),
              ],
            }
          : module,
      ),
    );
  };

  const handleRemoveLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((module) =>
        module.tempId === moduleId
          ? {
              ...module,
              lessons: module.lessons.filter(
                (lesson) => lesson.tempId !== lessonId,
              ),
            }
          : module,
      ),
    );
  };

  const handleLessonChange = (
    moduleId: string,
    lessonId: string,
    field: keyof LessonState,
    value: string | boolean,
  ) => {
    updateLessonState(moduleId, lessonId, (lesson) => {
      const nextLesson = {
        ...lesson,
        [field]: value,
      };

      if (field === "videoUrl" && typeof value === "string") {
        const trimmed = value.trim();
        nextLesson.contentType = trimmed.length > 0 ? "VIDEO" : "TEXT";
        nextLesson.videoUrl = trimmed;
      }

      return nextLesson;
    });
  };

  const updateLessonState = (
    moduleId: string,
    lessonId: string,
    updater: (lesson: LessonState) => LessonState,
  ) => {
    setModules((prev) =>
      prev.map((module) =>
        module.tempId === moduleId
          ? {
              ...module,
              lessons: module.lessons.map((lesson) =>
                lesson.tempId === lessonId ? updater(lesson) : lesson,
              ),
            }
          : module,
      ),
    );
  };

  const handleLessonContentModeChange = (
    moduleId: string,
    lessonId: string,
    mode: LessonContentMode,
  ) => {
    updateLessonState(moduleId, lessonId, (lesson) => {
      if (lesson.contentMode === mode) {
        return lesson;
      }

      if (mode === "rich") {
        const existingBlocks =
          lesson.contentBlocks.length > 0
            ? lesson.contentBlocks
            : lesson.contentText.trim().length > 0
              ? [
                  createContentBlockState("paragraph", {
                    text: lesson.contentText.trim(),
                  }),
                ]
              : [createContentBlockState("paragraph")];

        return {
          ...lesson,
          contentMode: "rich",
          contentBlocks: existingBlocks,
        };
      }

      const aggregatedText =
        lesson.contentBlocks
          .map((block) => {
            if (block.type === "paragraph" || block.type === "heading") {
              return block.text.trim();
            }
            if (block.type === "image") {
              return block.caption?.trim() ?? "";
            }
            return "";
          })
          .filter((value) => value.length > 0)
          .join("\n\n") || lesson.contentText;

      return {
        ...lesson,
        contentMode: "simple",
        contentText: aggregatedText,
      };
    });
  };

  const handleLessonAddContentBlock = (
    moduleId: string,
    lessonId: string,
    type: LessonContentBlockState["type"],
  ): string => {
    const newBlock = createContentBlockState(type);
    updateLessonState(moduleId, lessonId, (lesson) => ({
      ...lesson,
      contentBlocks: [...lesson.contentBlocks, newBlock],
    }));
    return newBlock.id;
  };

  const handleLessonUpdateContentBlock = (
    moduleId: string,
    lessonId: string,
    blockId: string,
    patch: Partial<Omit<LessonContentBlockState, "type">>,
  ) => {
    updateLessonState(moduleId, lessonId, (lesson) => ({
      ...lesson,
      contentBlocks: lesson.contentBlocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...patch,
            }
          : block,
      ),
    }));
  };

  const handleLessonRemoveContentBlock = (
    moduleId: string,
    lessonId: string,
    blockId: string,
  ) => {
    updateLessonState(moduleId, lessonId, (lesson) => ({
      ...lesson,
      contentBlocks: lesson.contentBlocks.filter(
        (block) => block.id !== blockId,
      ),
    }));
  };

  const handleAddTest = () => {
    setTests((prev) => [
      ...prev,
      createTestState({
        title: `Тест ${prev.length + 1}`,
      }),
    ]);
  };

  const updateTestState = (
    testId: string,
    updater: (test: TestState) => TestState,
    options?: { syncJson?: boolean },
  ) => {
    const syncJson = options?.syncJson ?? true;
    setTests((prev) =>
      prev.map((test) => {
        if (test.tempId !== testId) {
          return test;
        }
        const updated = updater(test);
        if (!syncJson) {
          return updated;
        }
        return {
          ...updated,
          rawJson: JSON.stringify(
            serializeTestQuestions(updated.questions),
            null,
            2,
          ),
        };
      }),
    );
  };

  const handleRemoveTest = (testId: string) => {
    setTests((prev) => prev.filter((test) => test.tempId !== testId));
  };

  const handleTestChange = (testId: string, field: keyof TestState, value: string) => {
    updateTestState(
      testId,
      (test) => ({
        ...test,
        [field]: value,
      }),
      { syncJson: false },
    );
  };

  const handleAddTestQuestion = (testId: string) => {
    updateTestState(testId, (test) => ({
      ...test,
      questions: [
        ...test.questions,
        createTestQuestionState({
          prompt: `Вопрос ${test.questions.length + 1}`,
        }),
      ],
    }));
  };

  const handleRemoveTestQuestion = (testId: string, questionId: string) => {
    updateTestState(testId, (test) => {
      const filtered = test.questions.filter(
        (question) => question.tempId !== questionId,
      );
      return {
        ...test,
        questions: filtered.length > 0 ? filtered : [createTestQuestionState()],
      };
    });
  };

  const handleTestQuestionChange = (
    testId: string,
    questionId: string,
    field: keyof TestQuestionState,
    value: string | boolean,
  ) => {
    updateTestState(testId, (test) => ({
      ...test,
      questions: test.questions.map((question) => {
        if (question.tempId !== questionId) {
          return question;
        }

        if (field === "type") {
          const nextType = value as QuestionKind;
          if (nextType === "open") {
            return {
              ...question,
              type: nextType,
              options: [],
              correctAnswer: "",
            };
          }

          const ensuredOptions =
            question.options.length > 0
              ? question.options
              : [
                  createTestOptionState({
                    text: "Вариант 1",
                    isCorrect: true,
                  }),
                  createTestOptionState({ text: "Вариант 2", isCorrect: false }),
                ];

          return {
            ...question,
            type: nextType,
            options: ensuredOptions,
          };
        }

        if (field === "correctAnswer") {
          return {
            ...question,
            correctAnswer: typeof value === "string" ? value : question.correctAnswer,
          };
        }

        if (field === "prompt" || field === "explanation") {
          return {
            ...question,
            [field]: typeof value === "string" ? value : question[field],
          };
        }

        return question;
      }),
    }));
  };

  const handleAddTestOption = (testId: string, questionId: string) => {
    updateTestState(testId, (test) => ({
      ...test,
      questions: test.questions.map((question) =>
        question.tempId === questionId
          ? {
              ...question,
              options: [
                ...question.options,
                createTestOptionState({
                  text: `Вариант ${question.options.length + 1}`,
                }),
              ],
            }
          : question,
      ),
    }));
  };

  const handleTestOptionChange = (
    testId: string,
    questionId: string,
    optionId: string,
    field: keyof TestOptionState,
    value: string | boolean,
  ) => {
    updateTestState(testId, (test) => ({
      ...test,
      questions: test.questions.map((question) =>
        question.tempId === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.tempId === optionId
                  ? {
                      ...option,
                      [field]: value,
                    }
                  : option,
              ),
            }
          : question,
      ),
    }));
  };

  const handleToggleOptionCorrect = (
    testId: string,
    questionId: string,
    optionId: string,
  ) => {
    updateTestState(testId, (test) => ({
      ...test,
      questions: test.questions.map((question) => {
        if (question.tempId !== questionId) {
          return question;
        }

        const option = question.options.find(
          (item) => item.tempId === optionId,
        );
        if (!option) {
          return question;
        }

        const isCurrentlyCorrect = option.isCorrect;

        if (question.type === 'multiple') {
          return {
            ...question,
            options: question.options.map((item) =>
              item.tempId === optionId
                ? { ...item, isCorrect: !isCurrentlyCorrect }
                : item,
            ),
          };
        }

        return {
          ...question,
          options: question.options.map((item) => ({
            ...item,
            isCorrect:
              item.tempId === optionId ? !isCurrentlyCorrect : false,
          })),
        };
      }),
    }));
  };

  const handleRemoveTestOption = (
    testId: string,
    questionId: string,
    optionId: string,
  ) => {
    updateTestState(testId, (test) => ({
      ...test,
      questions: test.questions.map((question) => {
        if (question.tempId !== questionId) {
          return question;
        }
        if (question.options.length <= 2) {
          return question;
        }
        return {
          ...question,
          options: question.options.filter(
            (option) => option.tempId !== optionId,
          ),
        };
      }),
    }));
  };

  const handleTestRawJsonChange = (testId: string, value: string) => {
    updateTestState(
      testId,
      (test) => ({
        ...test,
        rawJson: value,
      }),
      { syncJson: false },
    );
  };

  const handleTestImportFromJson = (testId: string) => {
    const target = tests.find((test) => test.tempId === testId);
    if (!target) {
      return;
    }

    try {
      const parsed = JSON.parse(target.rawJson);
      const questions = parseTestQuestionsToState(parsed);

      if (questions.length === 0) {
        throw new Error("JSON не содержит валидных вопросов.");
      }

      updateTestState(
        testId,
        (test) => ({
          ...test,
          questions,
        }),
        { syncJson: true },
      );
      setError(null);
    } catch (jsonError) {
      console.error("Failed to import test questions", jsonError);
      setError(
        jsonError instanceof Error
          ? `Ошибка импорта теста: ${jsonError.message}`
          : "Не удалось импортировать JSON вопросов.",
      );
    }
  };

  const handleTestSyncJson = (testId: string) => {
    updateTestState(testId, (test) => ({
      ...test,
      rawJson: JSON.stringify(
        serializeTestQuestions(test.questions),
        null,
        2,
      ),
    }));
  };

  const handleLessonUploadImage = useCallback(
    (file: File) => apiClient.uploadImage(file),
    [],
  );

  const buildLessonPayload = (lesson: LessonState): LessonPayload => {
    const duration = lesson.durationMinutes.trim();
    const order = Number(lesson.order);
    if (Number.isNaN(order)) {
      throw new Error("Введите корректный порядок урока.");
    }

    let content: unknown = null;

    if (lesson.contentMode === "rich") {
      const blocks = lesson.contentBlocks
        .map((block) => {
          if (block.type === "paragraph") {
            const text = block.text.trim();
            if (!text) return null;
            return {
              type: "paragraph",
              text,
              fontFamily: block.fontFamily,
              fontSize: block.fontSize,
              fontWeight: block.fontWeight,
              align: block.align,
            };
          }

          if (block.type === "heading") {
            const text = block.text.trim();
            if (!text) return null;
            return {
              type: "heading" as const,
              text,
              level: block.level,
              align: block.align,
            };
          }

          if (block.type === "image") {
            const url = block.url.trim();
            if (!url) return null;
            return {
              type: "image" as const,
              url,
              caption: block.caption?.trim()?.length
                ? block.caption.trim()
                : undefined,
              align: block.align,
              width: block.width,
            };
          }

          if (block.type === "video") {
            const url = block.url.trim();
            if (!url) return null;
            const caption = block.caption?.trim();
            const coverImageUrl = block.coverImageUrl?.trim();
            return {
              type: "video" as const,
              url,
              caption: caption && caption.length > 0 ? caption : undefined,
              autoplay: !!block.autoplay,
              coverImageUrl:
                coverImageUrl && coverImageUrl.length > 0 ? coverImageUrl : undefined,
            };
          }

          if (block.type === "audio") {
            const url = block.url.trim();
            if (!url) return null;
            const caption = block.caption?.trim();
            return {
              type: "audio" as const,
              url,
              caption: caption && caption.length > 0 ? caption : undefined,
            };
          }

          if (block.type === "section") {
            const title = block.title?.trim() ?? "";
            const description = block.description?.trim() ?? "";
            const items = block.items
              .map((item) => item.text?.trim() ?? "")
              .filter((text) => text.length > 0)
              .map((text) => ({ text }));

            if (title.length === 0 && items.length === 0) {
              return null;
            }

            return {
              type: "section" as const,
              title: title.length > 0 ? title : undefined,
              description: description.length > 0 ? description : undefined,
              items,
            };
          }

          return null;
        })
        .filter((block): block is Exclude<typeof block, null> => block !== null);

      if (blocks.length > 0) {
        content = {
          format: "blocks",
          version: 1,
          blocks,
        };
      } else {
        content = null;
      }
    } else if (lesson.contentText.trim().length > 0) {
      content = {
        text: lesson.contentText.trim(),
      };
    }

    return {
      id: lesson.sourceId ?? undefined,
      title: lesson.title,
      summary: lesson.summary || null,
      content,
      contentType: lesson.contentType,
      videoUrl: lesson.videoUrl.trim().length > 0 ? lesson.videoUrl.trim() : null,
      durationMinutes:
        duration.length === 0 ? null : Math.round(Number(duration)),
      order,
      isPreview: lesson.isPreview,
    };
  };

  const buildModulePayload = (module: ModuleState): CourseModulePayload => {
    const order = Number(module.order);
    if (Number.isNaN(order)) {
      throw new Error("Введите корректный порядок модуля.");
    }

    return {
      id: module.sourceId ?? undefined,
      title: module.title,
      description: module.description || null,
      order,
      lessons: module.lessons.map(buildLessonPayload),
    };
  };

  const buildTestPayload = (test: TestState): CourseTestPayload => {
    const preparedQuestions = prepareQuestionsForPayload(
      test.questions,
      test.title || "Без названия",
    );

    return {
      title: test.title,
      description: test.description || null,
      questions: preparedQuestions,
      unlockModuleId: test.unlockModuleId ?? null,
      unlockLessonId: test.unlockLessonId ?? null,
    };
  };

  const buildPayload = (): CoursePayload => {
    let priceAmount = 0;

    if (!formState.isFree) {
      const rawValue = formState.priceValue.trim();

      if (rawValue.length === 0) {
        throw new Error("Введите корректную стоимость курса.");
      }

      if (formState.priceCurrency === "TELEGRAM_STAR") {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
          throw new Error("Введите корректную стоимость курса.");
        }
        priceAmount = Math.max(0, Math.round(parsed));
      } else {
        const parsed = parseFloat(rawValue.replace(",", "."));
        if (!Number.isFinite(parsed)) {
          throw new Error("Введите корректную стоимость курса.");
        }
        priceAmount = Math.round(parsed * 100);
      }
    }

    if (!Number.isFinite(priceAmount) || Number.isNaN(priceAmount)) {
      throw new Error("Введите корректную стоимость курса.");
    }

    const modulesPayload =
      modules.length === 0 ? undefined : modules.map(buildModulePayload);
    const testsPayload =
      tests.length === 0 ? undefined : tests.map(buildTestPayload);

    return {
      title: formState.title,
      slug: formState.slug,
      shortDescription: formState.shortDescription || null,
      description: formState.description || null,
      coverImageUrl: formState.coverImageUrl || null,
      promoVideoUrl: formState.promoVideoUrl || null,
      category: formState.category,
      level: formState.level,
      priceAmount,
      priceCurrency: formState.isFree ? "EUR" : formState.priceCurrency,
      isFree: formState.isFree,
      isPublished: formState.isPublished,
      language: formState.language,
      modules: modulesPayload,
      tests: testsPayload,
      forms: (() => {
        // Собрать все формы из всех уроков
        const lessonForms: Array<{ form: CourseFormState; lessonId: string }> = [];
        modules.forEach((module) => {
          module.lessons.forEach((lesson) => {
            lesson.forms.forEach((form) => {
              lessonForms.push({ form, lessonId: lesson.sourceId ?? lesson.tempId });
            });
          });
        });
        // Преобразовать в payload
        return lessonForms.map(({ form, lessonId }) => ({
          title: form.title,
          description: form.description || null,
          questions: serializeFormQuestions(form.questions),
          results: serializeFormResults(form.results),
          lessonId: lessonId || null,
          unlockModuleId: form.unlockModuleId || null,
          unlockLessonId: form.unlockLessonId || null,
        }));
      })(),
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = buildPayload();
      const result = isNewCourse
        ? await apiClient.createCourse(payload)
        : await apiClient.updateCourse(initialCourse!.slug, payload);

      router.push(`/courses/${result.slug}`);
    } catch (submitError) {
      console.error("Failed to submit course form", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось сохранить курс.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestUnlockModuleChange = (
    testId: string,
    value: string,
  ) => {
    const normalized = value.trim().length > 0 ? value : null;
    setTests((prev) =>
      prev.map((test) =>
        test.tempId === testId
          ? {
              ...test,
              unlockModuleId: normalized,
              unlockLessonId: normalized ? null : test.unlockLessonId,
            }
          : test,
      ),
    );
  };

  const handleTestUnlockLessonChange = (
    testId: string,
    value: string,
  ) => {
    const normalized = value.trim().length > 0 ? value : null;
    setTests((prev) =>
      prev.map((test) =>
        test.tempId === testId
          ? {
              ...test,
              unlockLessonId: normalized,
              unlockModuleId: normalized ? null : test.unlockModuleId,
            }
          : test,
      ),
    );
  };

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Подсветка элемента
      element.classList.add("ring-2", "ring-brand-pink");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-brand-pink");
      }, 2000);
    }
  };

  const handleNavigate = (moduleId: string, lessonId?: string) => {
    const elementId = lessonId ? `lesson-${lessonId}` : `module-${moduleId}`;
    scrollToElement(elementId);
  };

  return (
    <div className="relative">
      {/* Сайдбар навигации - прижат к левому краю (после AdminNav 240px) */}
      <div className="fixed left-[240px] top-0 z-10 hidden h-screen w-64 overflow-y-auto border-r border-border bg-white p-4 shadow-sm lg:block">
        <CourseNavigationSidebar
          modules={modules}
          onNavigate={handleNavigate}
          collapsedModules={collapsedModules}
          onToggleCollapse={toggleModuleCollapse}
        />
      </div>

      {/* Кнопка для открытия превью - справа */}
      <button
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        className="fixed right-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-l-2xl border-l border-t border-b border-border bg-white px-2 py-12 shadow-lg transition-all hover:scale-105 hover:shadow-xl lg:flex flex-col items-center gap-2 group"
        title="Открыть превью курса"
      >
        <span className="text-[10px] font-semibold text-text-dark [writing-mode:vertical-rl] group-hover:text-brand-pink transition-colors">
          Превью
        </span>
        <span className="text-lg text-text-medium group-hover:text-brand-pink transition-colors">◀</span>
      </button>

      {/* Выдвижное превью курса */}
      {isPreviewOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setIsPreviewOpen(false)}
          />
          {/* Drawer */}
          <div
            className={`fixed right-0 top-0 z-30 h-screen w-full max-w-3xl overflow-y-auto border-l border-border bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
              isPreviewOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-text-dark">
                Превью курса
              </h3>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full p-2 text-text-medium hover:bg-surface hover:text-text-dark"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CoursePreview formState={formState} modules={modules} />
            </div>
          </div>
        </>
      )}

      {/* Основная форма - расширенная центральная часть */}
      <div className="lg:ml-64">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/40"
        >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Название
          <input
            type="text"
            value={formState.title}
            onChange={(event) =>
              handleFormChange("title", event.target.value)
            }
            required
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Slug
          <div className="flex gap-2">
            <input
              type="text"
              value={formState.slug}
              onChange={(event) =>
                handleFormChange("slug", event.target.value)
              }
              required
              className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
            <button
              type="button"
              className="rounded-2xl border border-brand-pink px-3 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
              onClick={handleGenerateSlug}
            >
              Сгенерировать
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Категория
          <select
            value={formState.category}
            onChange={(event) =>
              handleFormChange("category", event.target.value)
            }
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Язык курса
          <select
            value={formState.language}
            onChange={(event) =>
              handleFormChange("language", event.target.value)
            }
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Уровень
          <select
            value={formState.level}
            onChange={(event) =>
              handleFormChange("level", event.target.value)
            }
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark md:col-span-2">
          Короткое описание
          <textarea
            value={formState.shortDescription}
            onChange={(event) =>
              handleFormChange("shortDescription", event.target.value)
            }
            rows={3}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark md:col-span-2">
          Описание
          <textarea
            value={formState.description}
            onChange={(event) =>
              handleFormChange("description", event.target.value)
            }
            rows={5}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm text-text-dark">
          <ImageUploadField
            value={formState.coverImageUrl}
            onChange={(url) => handleFormChange("coverImageUrl", url)}
            label="Обложка курса"
            placeholder="https://... или загрузите файл"
          />
        </div>

        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Промо видео (опционально)
          <input
            type="url"
            value={formState.promoVideoUrl}
            onChange={(event) =>
              handleFormChange("promoVideoUrl", event.target.value)
            }
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-dark">Программа</h2>
          <button
            type="button"
            onClick={handleAddModule}
            className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
          >
            Добавить модуль
          </button>
        </div>

        {modules.length === 0 ? (
          <p className="rounded-2xl bg-card px-4 py-3 text-sm text-text-medium">
            Пока нет модулей. Добавьте первый модуль, чтобы начать наполнять
            курс.
          </p>
        ) : (
          modules.map((module, moduleIndex) => (
            <div
              id={`module-${module.tempId}`}
              key={module.tempId}
              className="space-y-4 rounded-3xl border border-border/60 bg-surface px-5 py-4 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleModuleCollapse(module.tempId)}
                    className="text-text-medium hover:text-text-dark"
                  >
                    {collapsedModules.has(module.tempId) ? "▶" : "▼"}
                  </button>
                  <p className="text-sm font-semibold text-text-dark">
                    Модуль {moduleIndex + 1}
                    {module.title.trim() ? `: ${module.title}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveModule(module.tempId)}
                  className="text-xs font-semibold text-brand-orange underline-offset-4 hover:underline"
                >
                  Удалить
                </button>
              </div>

              {!collapsedModules.has(module.tempId) && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-xs text-text-dark">
                      Название модуля
                      <input
                        type="text"
                        value={module.title}
                        onChange={(event) =>
                          handleModuleChange(module.tempId, "title", event.target.value)
                        }
                        required
                        className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-text-dark">
                      Порядок
                      <input
                        type="number"
                        value={module.order}
                        onChange={(event) =>
                          handleModuleChange(module.tempId, "order", event.target.value)
                        }
                        className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                      />
                    </label>
                    <label className="md:col-span-2 flex flex-col gap-2 text-xs text-text-dark">
                      Описание
                      <textarea
                        value={module.description}
                        onChange={(event) =>
                          handleModuleChange(
                            module.tempId,
                            "description",
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-dark">
                        Уроки
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddLesson(module.tempId)}
                        className="text-xs font-semibold text-brand-pink underline-offset-4 hover:underline"
                      >
                        Добавить урок
                      </button>
                    </div>

                    {module.lessons.length === 0 ? (
                      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-text-medium">
                        В модуле нет уроков, добавьте первый.
                      </p>
                    ) : (
                      module.lessons.map((lesson, lessonIndex) => (
                    <div
                      id={`lesson-${lesson.tempId}`}
                      key={lesson.tempId}
                      className="space-y-3 rounded-2xl border border-border/60 bg-white px-4 py-3 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-dark">
                          Урок {lessonIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveLesson(module.tempId, lesson.tempId)
                          }
                          className="text-brand-orange underline-offset-4 hover:underline"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-text-dark">
                          Название урока
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(event) =>
                              handleLessonChange(
                                module.tempId,
                                lesson.tempId,
                                "title",
                                event.target.value,
                              )
                            }
                            required
                            className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-text-dark">
                          Порядок
                          <input
                            type="number"
                            value={lesson.order}
                            onChange={(event) =>
                              handleLessonChange(
                                module.tempId,
                                lesson.tempId,
                                "order",
                                event.target.value,
                              )
                            }
                            className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-text-dark md:col-span-2">
                          Краткое описание
                          <textarea
                            value={lesson.summary}
                            onChange={(event) =>
                              handleLessonChange(
                                module.tempId,
                                lesson.tempId,
                                "summary",
                                event.target.value,
                              )
                            }
                            rows={2}
                            className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                          />
                        </label>
                      </div>

                      {/* Ссылка на видео - компактная строка над контентом */}
                      <label className="flex flex-col gap-1 text-xs text-text-dark">
                        <span className="text-[11px] font-medium text-text-light">
                          Ссылка на видео (если урок — видео):
                        </span>
                        <input
                          type="url"
                          value={lesson.videoUrl}
                          onChange={(event) =>
                            handleLessonChange(
                              module.tempId,
                              lesson.tempId,
                              "videoUrl",
                              event.target.value,
                            )
                          }
                          placeholder="https://..."
                          className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text-dark outline-none focus:border-brand-pink"
                        />
                      </label>

                      {/* Раздел контента - на всю ширину */}
                      <div className="w-full">
                        <LessonContentEditor
                          mode={lesson.contentMode}
                          onModeChange={(mode) =>
                            handleLessonContentModeChange(
                              module.tempId,
                              lesson.tempId,
                              mode,
                            )
                          }
                          simpleText={lesson.contentText}
                          onSimpleTextChange={(value) =>
                            handleLessonChange(
                              module.tempId,
                              lesson.tempId,
                              "contentText",
                              value,
                            )
                          }
                          blocks={lesson.contentBlocks}
                          onAddBlock={(type) =>
                            handleLessonAddContentBlock(
                              module.tempId,
                              lesson.tempId,
                              type,
                            )
                          }
                          onUpdateBlock={(blockId, patch) =>
                            handleLessonUpdateContentBlock(
                              module.tempId,
                              lesson.tempId,
                              blockId,
                              patch,
                            )
                          }
                          onRemoveBlock={(blockId) =>
                            handleLessonRemoveContentBlock(
                              module.tempId,
                              lesson.tempId,
                              blockId,
                            )
                          }
                          onUploadImage={handleLessonUploadImage}
                        />
                      </div>

                      {/* Длительность и превью - в отдельном grid */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-text-dark">
                          Длительность (мин)
                          <input
                            type="number"
                            min="0"
                            value={lesson.durationMinutes}
                            onChange={(event) =>
                              handleLessonChange(
                                module.tempId,
                                lesson.tempId,
                                "durationMinutes",
                                event.target.value,
                              )
                            }
                            className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-text-dark">
                          <input
                            type="checkbox"
                            checked={lesson.isPreview}
                            onChange={(event) =>
                              handleLessonChange(
                                module.tempId,
                                lesson.tempId,
                                "isPreview",
                                event.target.checked,
                              )
                            }
                            className="size-4 accent-brand-pink"
                          />
                          Доступен в качестве превью
                        </label>
                      </div>

                      {/* Формы урока */}
                      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-text-dark">Формы</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setModules((prev) =>
                                prev.map((m) =>
                                  m.tempId === module.tempId
                                    ? {
                                        ...m,
                                        lessons: m.lessons.map((l) =>
                                          l.tempId === lesson.tempId
                                            ? {
                                                ...l,
                                                forms: [...l.forms, createFormState()],
                                              }
                                            : l,
                                        ),
                                      }
                                    : m,
                                ),
                              );
                            }}
                            className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text-medium transition-colors hover:bg-white"
                          >
                            + Добавить форму
                          </button>
                        </div>

                        {lesson.forms.length === 0 ? (
                          <p className="text-xs text-text-medium">
                            Пока нет форм. Добавьте форму для опроса с результатами.
                          </p>
                        ) : (
                          lesson.forms.map((form) => (
                            <div
                              key={form.tempId}
                              className="flex flex-col gap-3 rounded-xl border border-border/40 bg-white p-3"
                            >
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="flex flex-col gap-1 text-xs text-text-dark">
                                  <span className="text-[11px] font-medium text-text-light">
                                    Название формы
                                  </span>
                                  <input
                                    type="text"
                                    value={form.title}
                                    onChange={(event) =>
                                      setModules((prev) =>
                                        prev.map((m) =>
                                          m.tempId === module.tempId
                                            ? {
                                                ...m,
                                                lessons: m.lessons.map((l) =>
                                                  l.tempId === lesson.tempId
                                                    ? {
                                                        ...l,
                                                        forms: l.forms.map((f) =>
                                                          f.tempId === form.tempId
                                                            ? { ...f, title: event.target.value }
                                                            : f,
                                                        ),
                                                      }
                                                    : l,
                                                ),
                                              }
                                            : m,
                                        ),
                                      )
                                    }
                                    placeholder="Название формы"
                                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text-dark outline-none focus:border-brand-pink"
                                  />
                                </label>
                                <label className="flex flex-col gap-1 text-xs text-text-dark">
                                  <span className="text-[11px] font-medium text-text-light">
                                    Описание (опционально)
                                  </span>
                                  <input
                                    type="text"
                                    value={form.description}
                                    onChange={(event) =>
                                      setModules((prev) =>
                                        prev.map((m) =>
                                          m.tempId === module.tempId
                                            ? {
                                                ...m,
                                                lessons: m.lessons.map((l) =>
                                                  l.tempId === lesson.tempId
                                                    ? {
                                                        ...l,
                                                        forms: l.forms.map((f) =>
                                                          f.tempId === form.tempId
                                                            ? { ...f, description: event.target.value }
                                                            : f,
                                                        ),
                                                      }
                                                    : l,
                                                ),
                                              }
                                            : m,
                                        ),
                                      )
                                    }
                                    placeholder="Описание формы"
                                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text-dark outline-none focus:border-brand-pink"
                                  />
                                </label>
                              </div>

                              {/* Вопросы формы */}
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-text-dark">Вопросы</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModules((prev) =>
                                        prev.map((m) =>
                                          m.tempId === module.tempId
                                            ? {
                                                ...m,
                                                lessons: m.lessons.map((l) =>
                                                  l.tempId === lesson.tempId
                                                    ? {
                                                        ...l,
                                                        forms: l.forms.map((f) =>
                                                          f.tempId === form.tempId
                                                            ? {
                                                                ...f,
                                                                questions: [
                                                                  ...f.questions,
                                                                  createFormQuestionState(),
                                                                ],
                                                              }
                                                            : f,
                                                        ),
                                                      }
                                                    : l,
                                                ),
                                              }
                                            : m,
                                        ),
                                      )
                                    }
                                    className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-medium transition-colors hover:bg-surface"
                                  >
                                    + Вопрос
                                  </button>
                                </div>

                                {form.questions.map((question, questionIndex) => (
                                  <div
                                    key={question.tempId}
                                    className="rounded-lg border border-border/40 bg-surface p-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 space-y-2">
                                        <label className="flex flex-col gap-1 text-xs text-text-dark">
                                          <span className="text-[11px] font-medium text-text-light">
                                            Вопрос {questionIndex + 1}
                                          </span>
                                          <input
                                            type="text"
                                            value={question.text}
                                            onChange={(event) =>
                                              setModules((prev) =>
                                                prev.map((m) =>
                                                  m.tempId === module.tempId
                                                    ? {
                                                        ...m,
                                                        lessons: m.lessons.map((l) =>
                                                          l.tempId === lesson.tempId
                                                            ? {
                                                                ...l,
                                                                forms: l.forms.map((f) =>
                                                                  f.tempId === form.tempId
                                                                    ? {
                                                                        ...f,
                                                                        questions: f.questions.map(
                                                                          (q) =>
                                                                            q.tempId ===
                                                                            question.tempId
                                                                              ? {
                                                                                  ...q,
                                                                                  text: event.target.value,
                                                                                }
                                                                              : q,
                                                                        ),
                                                                      }
                                                                    : f,
                                                                ),
                                                              }
                                                            : l,
                                                        ),
                                                      }
                                                    : m,
                                                ),
                                              )
                                            }
                                            placeholder="Текст вопроса"
                                            className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
                                          />
                                        </label>

                                        <div className="space-y-1">
                                          {question.options.map((option, optionIndex) => (
                                            <div
                                              key={option.tempId}
                                              className="flex items-center gap-2"
                                            >
                                              <input
                                                type="text"
                                                value={option.text}
                                                onChange={(event) =>
                                                  setModules((prev) =>
                                                    prev.map((m) =>
                                                      m.tempId === module.tempId
                                                        ? {
                                                            ...m,
                                                            lessons: m.lessons.map((l) =>
                                                              l.tempId === lesson.tempId
                                                                ? {
                                                                    ...l,
                                                                    forms: l.forms.map((f) =>
                                                                      f.tempId === form.tempId
                                                                        ? {
                                                                            ...f,
                                                                            questions: f.questions.map(
                                                                              (q) =>
                                                                                q.tempId ===
                                                                                question.tempId
                                                                                  ? {
                                                                                      ...q,
                                                                                      options: q.options.map(
                                                                                        (opt) =>
                                                                                          opt.tempId ===
                                                                                          option.tempId
                                                                                            ? {
                                                                                                ...opt,
                                                                                                text: event.target.value,
                                                                                              }
                                                                                            : opt,
                                                                                      ),
                                                                                    }
                                                                                  : q,
                                                                            ),
                                                                          }
                                                                        : f,
                                                                    ),
                                                                  }
                                                                : l,
                                                            ),
                                                          }
                                                        : m,
                                                    ),
                                                  )
                                                }
                                                placeholder={`Вариант ${optionIndex + 1}`}
                                                className="flex-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
                                              />
                                              <select
                                                value={option.category}
                                                onChange={(event) =>
                                                  setModules((prev) =>
                                                    prev.map((m) =>
                                                      m.tempId === module.tempId
                                                        ? {
                                                            ...m,
                                                            lessons: m.lessons.map((l) =>
                                                              l.tempId === lesson.tempId
                                                                ? {
                                                                    ...l,
                                                                    forms: l.forms.map((f) =>
                                                                      f.tempId === form.tempId
                                                                        ? {
                                                                            ...f,
                                                                            questions: f.questions.map(
                                                                              (q) =>
                                                                                q.tempId ===
                                                                                question.tempId
                                                                                  ? {
                                                                                      ...q,
                                                                                      options: q.options.map(
                                                                                        (opt) =>
                                                                                          opt.tempId ===
                                                                                          option.tempId
                                                                                            ? {
                                                                                                ...opt,
                                                                                                category: event.target.value,
                                                                                              }
                                                                                            : opt,
                                                                                      ),
                                                                                    }
                                                                                  : q,
                                                                            ),
                                                                          }
                                                                        : f,
                                                                    ),
                                                                  }
                                                                : l,
                                                            ),
                                                          }
                                                        : m,
                                                    ),
                                                  )
                                                }
                                                className="w-16 rounded-lg border border-border bg-white px-1.5 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
                                              >
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                              </select>
                                              {question.options.length > 2 && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setModules((prev) =>
                                                      prev.map((m) =>
                                                        m.tempId === module.tempId
                                                          ? {
                                                              ...m,
                                                              lessons: m.lessons.map((l) =>
                                                                l.tempId === lesson.tempId
                                                                  ? {
                                                                      ...l,
                                                                      forms: l.forms.map((f) =>
                                                                        f.tempId === form.tempId
                                                                          ? {
                                                                              ...f,
                                                                              questions: f.questions.map(
                                                                                (q) =>
                                                                                  q.tempId ===
                                                                                  question.tempId
                                                                                    ? {
                                                                                        ...q,
                                                                                        options: q.options.filter(
                                                                                          (opt) =>
                                                                                            opt.tempId !==
                                                                                            option.tempId,
                                                                                        ),
                                                                                      }
                                                                                    : q,
                                                                              ),
                                                                            }
                                                                          : f,
                                                                      ),
                                                                    }
                                                                  : l,
                                                              ),
                                                            }
                                                          : m,
                                                      ),
                                                    )
                                                  }
                                                  className="rounded-full p-0.5 text-text-medium hover:bg-white hover:text-text-dark"
                                                  title="Удалить вариант"
                                                >
                                                  ✕
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setModules((prev) =>
                                                prev.map((m) =>
                                                  m.tempId === module.tempId
                                                    ? {
                                                        ...m,
                                                        lessons: m.lessons.map((l) =>
                                                          l.tempId === lesson.tempId
                                                            ? {
                                                                ...l,
                                                                forms: l.forms.map((f) =>
                                                                  f.tempId === form.tempId
                                                                    ? {
                                                                        ...f,
                                                                        questions: f.questions.map(
                                                                          (q) =>
                                                                            q.tempId ===
                                                                            question.tempId
                                                                              ? {
                                                                                  ...q,
                                                                                  options: [
                                                                                    ...q.options,
                                                                                    createFormOptionState(),
                                                                                  ],
                                                                                }
                                                                              : q,
                                                                        ),
                                                                      }
                                                                    : f,
                                                                ),
                                                              }
                                                            : l,
                                                        ),
                                                      }
                                                    : m,
                                                ),
                                              )
                                            }
                                            className="self-start rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-medium transition-colors hover:bg-white"
                                          >
                                            + Вариант
                                          </button>
                                        </div>
                                      </div>
                                      {form.questions.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setModules((prev) =>
                                              prev.map((m) =>
                                                m.tempId === module.tempId
                                                  ? {
                                                      ...m,
                                                      lessons: m.lessons.map((l) =>
                                                        l.tempId === lesson.tempId
                                                          ? {
                                                              ...l,
                                                              forms: l.forms.map((f) =>
                                                                f.tempId === form.tempId
                                                                  ? {
                                                                      ...f,
                                                                      questions: f.questions.filter(
                                                                        (q) =>
                                                                          q.tempId !==
                                                                          question.tempId,
                                                                      ),
                                                                    }
                                                                  : f,
                                                              ),
                                                            }
                                                          : l,
                                                      ),
                                                    }
                                                  : m,
                                              ),
                                            )
                                          }
                                          className="rounded-full p-1 text-text-medium hover:bg-white hover:text-text-dark"
                                          title="Удалить вопрос"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {/* Кнопка добавления вопроса внизу списка */}
                                {form.questions.length > 0 && (
                                  <div className="flex justify-center pt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setModules((prev) =>
                                          prev.map((m) =>
                                            m.tempId === module.tempId
                                              ? {
                                                  ...m,
                                                  lessons: m.lessons.map((l) =>
                                                    l.tempId === lesson.tempId
                                                      ? {
                                                          ...l,
                                                          forms: l.forms.map((f) =>
                                                            f.tempId === form.tempId
                                                              ? {
                                                                  ...f,
                                                                  questions: [
                                                                    ...f.questions,
                                                                    createFormQuestionState(),
                                                                  ],
                                                                }
                                                              : f,
                                                          ),
                                                        }
                                                      : l,
                                                  ),
                                                }
                                              : m,
                                          ),
                                        )
                                      }
                                      className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text-medium transition-colors hover:bg-surface"
                                    >
                                      + Добавить вопрос
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Результаты формы */}
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-text-dark">Результаты</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModules((prev) =>
                                        prev.map((m) =>
                                          m.tempId === module.tempId
                                            ? {
                                                ...m,
                                                lessons: m.lessons.map((l) =>
                                                  l.tempId === lesson.tempId
                                                    ? {
                                                        ...l,
                                                        forms: l.forms.map((f) =>
                                                          f.tempId === form.tempId
                                                            ? {
                                                                ...f,
                                                                results: [
                                                                  ...f.results,
                                                                  createFormResultState(),
                                                                ],
                                                              }
                                                            : f,
                                                        ),
                                                      }
                                                    : l,
                                                ),
                                              }
                                            : m,
                                        ),
                                      )
                                    }
                                    className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-medium transition-colors hover:bg-surface"
                                  >
                                    + Результат
                                  </button>
                                </div>

                                {form.results.map((result) => (
                                  <div
                                    key={result.tempId}
                                    className="rounded-lg border border-border/40 bg-surface p-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 space-y-2">
                                        <div className="grid gap-2 md:grid-cols-2">
                                          <label className="flex flex-col gap-1 text-xs text-text-dark">
                                            <span className="text-[11px] font-medium text-text-light">
                                              Условие
                                            </span>
                                            <select
                                              value={result.condition}
                                              onChange={(event) =>
                                                setModules((prev) =>
                                                  prev.map((m) =>
                                                    m.tempId === module.tempId
                                                      ? {
                                                          ...m,
                                                          lessons: m.lessons.map((l) =>
                                                            l.tempId === lesson.tempId
                                                              ? {
                                                                  ...l,
                                                                  forms: l.forms.map((f) =>
                                                                    f.tempId === form.tempId
                                                                      ? {
                                                                          ...f,
                                                                          results: f.results.map(
                                                                            (r) =>
                                                                              r.tempId ===
                                                                              result.tempId
                                                                                ? {
                                                                                    ...r,
                                                                                    condition: event.target.value,
                                                                                  }
                                                                                : r,
                                                                          ),
                                                                        }
                                                                      : f,
                                                                  ),
                                                                }
                                                              : l,
                                                          ),
                                                        }
                                                      : m,
                                                  ),
                                                )
                                              }
                                              className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
                                            >
                                              <option value="more_A">Больше вариантов A</option>
                                              <option value="more_B">Больше вариантов B</option>
                                              <option value="more_C">Больше вариантов C</option>
                                              <option value="more_D">Больше вариантов D</option>
                                              <option value="equal_A_B">Равно A и B</option>
                                            </select>
                                          </label>
                                          <label className="flex flex-col gap-1 text-xs text-text-dark">
                                            <span className="text-[11px] font-medium text-text-light">
                                              Название результата
                                            </span>
                                            <input
                                              type="text"
                                              value={result.title}
                                              onChange={(event) =>
                                                setModules((prev) =>
                                                  prev.map((m) =>
                                                    m.tempId === module.tempId
                                                      ? {
                                                          ...m,
                                                          lessons: m.lessons.map((l) =>
                                                            l.tempId === lesson.tempId
                                                              ? {
                                                                  ...l,
                                                                  forms: l.forms.map((f) =>
                                                                    f.tempId === form.tempId
                                                                      ? {
                                                                          ...f,
                                                                          results: f.results.map(
                                                                            (r) =>
                                                                              r.tempId ===
                                                                              result.tempId
                                                                                ? {
                                                                                    ...r,
                                                                                    title: event.target.value,
                                                                                  }
                                                                                : r,
                                                                          ),
                                                                        }
                                                                      : f,
                                                                  ),
                                                                }
                                                              : l,
                                                          ),
                                                        }
                                                      : m,
                                                  ),
                                                )
                                              }
                                              placeholder="Название результата"
                                              className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
                                            />
                                          </label>
                                        </div>
                                        <label className="flex flex-col gap-1 text-xs text-text-dark">
                                          <span className="text-[11px] font-medium text-text-light">
                                            Описание результата
                                          </span>
                                          <textarea
                                            value={result.description}
                                            onChange={(event) =>
                                              setModules((prev) =>
                                                prev.map((m) =>
                                                  m.tempId === module.tempId
                                                    ? {
                                                        ...m,
                                                        lessons: m.lessons.map((l) =>
                                                          l.tempId === lesson.tempId
                                                            ? {
                                                                ...l,
                                                                forms: l.forms.map((f) =>
                                                                  f.tempId === form.tempId
                                                                    ? {
                                                                        ...f,
                                                                        results: f.results.map(
                                                                          (r) =>
                                                                            r.tempId ===
                                                                            result.tempId
                                                                              ? {
                                                                                  ...r,
                                                                                  description: event.target.value,
                                                                                }
                                                                              : r,
                                                                        ),
                                                                      }
                                                                    : f,
                                                                ),
                                                              }
                                                            : l,
                                                        ),
                                                      }
                                                    : m,
                                                ),
                                              )
                                            }
                                            placeholder="Описание результата"
                                            rows={2}
                                            className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
                                          />
                                        </label>
                                      </div>
                                      {form.results.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setModules((prev) =>
                                              prev.map((m) =>
                                                m.tempId === module.tempId
                                                  ? {
                                                      ...m,
                                                      lessons: m.lessons.map((l) =>
                                                        l.tempId === lesson.tempId
                                                          ? {
                                                              ...l,
                                                              forms: l.forms.map((f) =>
                                                                f.tempId === form.tempId
                                                                  ? {
                                                                      ...f,
                                                                      results: f.results.filter(
                                                                        (r) =>
                                                                          r.tempId !==
                                                                          result.tempId,
                                                                      ),
                                                                    }
                                                                  : f,
                                                              ),
                                                            }
                                                          : l,
                                                      ),
                                                    }
                                                  : m,
                                              ),
                                            )
                                          }
                                          className="rounded-full p-1 text-text-medium hover:bg-white hover:text-text-dark"
                                          title="Удалить результат"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {/* Кнопка добавления результата внизу списка */}
                                {form.results.length > 0 && (
                                  <div className="flex justify-center pt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setModules((prev) =>
                                          prev.map((m) =>
                                            m.tempId === module.tempId
                                              ? {
                                                  ...m,
                                                  lessons: m.lessons.map((l) =>
                                                    l.tempId === lesson.tempId
                                                      ? {
                                                          ...l,
                                                          forms: l.forms.map((f) =>
                                                            f.tempId === form.tempId
                                                              ? {
                                                                  ...f,
                                                                  results: [
                                                                    ...f.results,
                                                                    createFormResultState(),
                                                                  ],
                                                                }
                                                              : f,
                                                          ),
                                                        }
                                                      : l,
                                                  ),
                                                }
                                              : m,
                                          ),
                                        )
                                      }
                                      className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-medium transition-colors hover:bg-surface"
                                    >
                                      + Добавить результат
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setModules((prev) =>
                                    prev.map((m) =>
                                      m.tempId === module.tempId
                                        ? {
                                            ...m,
                                            lessons: m.lessons.map((l) =>
                                              l.tempId === lesson.tempId
                                                ? {
                                                    ...l,
                                                    forms: l.forms.filter(
                                                      (f) => f.tempId !== form.tempId,
                                                    ),
                                                  }
                                                : l,
                                            ),
                                          }
                                        : m,
                                    ),
                                  )
                                }
                                className="self-start rounded-full border border-brand-orange px-3 py-1 text-xs font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
                              >
                                Удалить форму
                              </button>
                            </div>
                          ))}
                          {/* Кнопка добавления формы внизу списка */}
                          {lesson.forms.length > 0 && (
                            <div className="flex justify-center pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setModules((prev) =>
                                    prev.map((m) =>
                                      m.tempId === module.tempId
                                        ? {
                                            ...m,
                                            lessons: m.lessons.map((l) =>
                                              l.tempId === lesson.tempId
                                                ? {
                                                    ...l,
                                                    forms: [...l.forms, createFormState()],
                                                  }
                                                : l,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text-medium transition-colors hover:bg-white"
                              >
                                + Добавить форму
                              </button>
                            </div>
                          )}
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Кнопка добавления урока внизу списка */}
                  {module.lessons.length > 0 && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => handleAddLesson(module.tempId)}
                        className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
                      >
                        + Добавить урок
                      </button>
                    </div>
                  )}
              </div>
                </>
              )}
            </div>
          ))}
          {/* Кнопка добавления модуля внизу списка */}
          {modules.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleAddModule}
                className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
              >
                + Добавить модуль
              </button>
            </div>
          )}
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-dark">Тесты</h2>
          <button
            type="button"
            onClick={handleAddTest}
            className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
          >
            Добавить тест
          </button>
        </div>

        {tests.length === 0 ? (
          <p className="rounded-2xl bg-card px-4 py-3 text-sm text-text-medium">
            Пока нет тестов. Добавьте первый, чтобы завершить курс квизом.
          </p>
        ) : (
          tests.map((test, index) => (
            <div
              key={test.tempId}
              className="space-y-3 rounded-3xl border border-border/60 bg-surface px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-dark">
                  Тест {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveTest(test.tempId)}
                  className="text-xs font-semibold text-brand-orange underline-offset-4 hover:underline"
                >
                  Удалить
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs text-text-dark">
                  Название
                  <input
                    type="text"
                    value={test.title}
                    onChange={(event) =>
                      handleTestChange(test.tempId, "title", event.target.value)
                    }
                    required
                    className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs text-text-dark">
                  Описание
                  <input
                    type="text"
                    value={test.description}
                    onChange={(event) =>
                      handleTestChange(
                        test.tempId,
                        "description",
                        event.target.value,
                      )
                    }
                    className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/60 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-dark">
                    Вопросы теста
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAddTestQuestion(test.tempId)}
                    className="rounded-full border border-brand-pink px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
                  >
                    Добавить вопрос
                  </button>
                </div>

                {test.questions.length === 0 ? (
                  <p className="rounded-2xl bg-card px-3 py-3 text-xs text-text-medium">
                    Добавьте первый вопрос, чтобы сформировать тест.
                  </p>
                ) : (
                  test.questions.map((question, questionIndex) => (
                    <div
                      key={question.tempId}
                      className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-text-dark">
                          Вопрос {questionIndex + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-[11px] text-text-dark">
                            <span>Тип</span>
                            <select
                              value={question.type}
                              onChange={(event) =>
                                handleTestQuestionChange(
                                  test.tempId,
                                  question.tempId,
                                  'type',
                                  event.target.value as QuestionKind,
                                )
                              }
                              className="rounded-2xl border border-border bg-white px-3 py-1 text-sm text-text-dark outline-none focus:border-brand-pink"
                            >
                              {QUESTION_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveTestQuestion(
                                test.tempId,
                                question.tempId,
                              )
                            }
                            className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>

                      <label className="flex flex-col gap-2 text-[11px] text-text-dark">
                        Текст вопроса
                        <input
                          type="text"
                          value={question.prompt}
                          onChange={(event) =>
                            handleTestQuestionChange(
                              test.tempId,
                              question.tempId,
                              "prompt",
                              event.target.value,
                            )
                          }
                          placeholder="Введите формулировку вопроса"
                          className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-[11px] text-text-dark">
                        Пояснение после ответа (опционально)
                        <textarea
                          value={question.explanation}
                          onChange={(event) =>
                            handleTestQuestionChange(
                              test.tempId,
                              question.tempId,
                              "explanation",
                              event.target.value,
                            )
                          }
                          rows={2}
                          placeholder="Пояснение появится после ответа участника"
                          className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                        />
                      </label>

                      {question.type === 'open' ? (
                        <label className="flex flex-col gap-2 text-[11px] text-text-dark">
                          Ожидаемый ответ
                          <textarea
                            value={question.correctAnswer}
                            onChange={(event) =>
                              handleTestQuestionChange(
                                test.tempId,
                                question.tempId,
                                'correctAnswer',
                                event.target.value,
                              )
                            }
                            rows={3}
                            placeholder="Напишите, какой ответ считается верным"
                            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                          />
                          <span className="text-[11px] text-text-light">
                            Ответ увидят только администраторы и при проверке результатов.
                          </span>
                        </label>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
                            Варианты ответа
                          </p>
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={option.tempId}
                              className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-white px-3 py-3 md:flex-row md:items-center md:gap-3"
                            >
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(event) =>
                                    handleTestOptionChange(
                                      test.tempId,
                                      question.tempId,
                                      option.tempId,
                                      'text',
                                      event.target.value,
                                    )
                                  }
                                  placeholder={`Вариант ${optionIndex + 1}`}
                                  className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-[11px] text-text-dark">
                                  <input
                                    type="checkbox"
                                    checked={option.isCorrect}
                                    onChange={() =>
                                      handleToggleOptionCorrect(
                                        test.tempId,
                                        question.tempId,
                                        option.tempId,
                                      )
                                    }
                                    className="size-4 accent-brand-pink"
                                  />
                                  Правильный ответ
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveTestOption(
                                      test.tempId,
                                      question.tempId,
                                      option.tempId,
                                    )
                                  }
                                  disabled={question.options.length <= 2}
                                  className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              handleAddTestOption(test.tempId, question.tempId)
                            }
                            className="rounded-full border border-dashed border-brand-pink/70 px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:border-brand-pink hover:bg-brand-pink/10"
                          >
                            Добавить вариант
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Кнопка добавления вопроса внизу списка */}
                  {test.questions.length > 0 && (
                    <div className="flex justify-center pt-3">
                      <button
                        type="button"
                        onClick={() => handleAddTestQuestion(test.tempId)}
                        className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
                      >
                        + Добавить вопрос
                      </button>
                    </div>
                  )}
                )}
              </div>

              <details className="rounded-2xl border border-dashed border-border/70 bg-white px-4 py-3 text-xs text-text-dark">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-text-light">
                  Импорт / экспорт JSON
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] text-text-light">
                    Можно вставить JSON из другого источника или скопировать
                    готовый. Нажмите «Синхронизировать», чтобы обновить текст по
                    текущим вопросам.
                  </p>
                  <textarea
                    value={test.rawJson}
                    onChange={(event) =>
                      handleTestRawJsonChange(test.tempId, event.target.value)
                    }
                    rows={6}
                    className="w-full rounded-2xl border border-border bg-surface px-3 py-2 font-mono text-[12px] text-text-dark outline-none focus:border-brand-pink"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestImportFromJson(test.tempId)}
                      className="rounded-full bg-brand-pink px-3 py-1 text-[11px] font-semibold text-white transition-transform active:scale-95"
                    >
                      Импортировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestSyncJson(test.tempId)}
                      className="rounded-full border border-brand-pink px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
                    >
                      Синхронизировать с формой
                    </button>
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-dashed border-border/70 bg-white px-4 py-3 text-xs text-text-dark">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-text-light">
                  Предпросмотр теста
                </summary>
                <div className="mt-3 space-y-3">
                  {(() => {
                    const preview = serializeTestQuestions(test.questions);
                    if (preview.length === 0) {
                      return (
                        <p className="text-[11px] text-text-light">
                          Добавьте вопросы и варианты, чтобы посмотреть, как тест увидят участники.
                        </p>
                      );
                    }
                    return preview.map((questionPreview, questionIndex) => (
                      <div
                        key={`${test.tempId}-preview-${questionIndex}`}
                        className="space-y-2 rounded-2xl border border-border/40 bg-surface px-3 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-text-dark">
                            {questionIndex + 1}. {questionPreview.prompt}
                          </p>
                          <span className="text-[10px] uppercase tracking-wide text-text-light">
                            {questionPreview.type === 'open'
                              ? 'Свободный ответ'
                              : questionPreview.type === 'multiple'
                                ? 'Несколько ответов'
                                : 'Один ответ'}
                          </span>
                        </div>
                        {questionPreview.type === 'open' ? (
                          <p className="text-[11px] text-text-light">
                            Ожидаемый ответ:{' '}
                            {questionPreview.correctAnswer ?? '—'}
                          </p>
                        ) : (
                          <ul className="space-y-1 text-[11px] text-text-medium">
                            {(questionPreview.options ?? []).map((option) => (
                              <li
                                key={`${test.tempId}-option-${option.text}`}
                                className={option.isCorrect ? 'font-semibold text-text-dark' : ''}
                              >
                                {option.isCorrect ? '✔︎ ' : ''}
                                {option.text}
                              </li>
                            ))}
                          </ul>
                        )}
                        {questionPreview.explanation ? (
                          <p className="text-[10px] text-text-light">
                            Пояснение: {questionPreview.explanation}
                          </p>
                        ) : null}
                      </div>
                    ));
                  })()}
                </div>
              </details>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs text-text-dark">
                  Ограничение по модулю
                  <select
                    value={test.unlockModuleId ?? ""}
                    onChange={(event) =>
                      handleTestUnlockModuleChange(test.tempId, event.target.value)
                    }
                    disabled={unlockModuleOptions.length === 0}
                    className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Не требуется</option>
                    {unlockModuleOptions.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-text-light">
                    {unlockModuleOptions.length === 0
                      ? "Сначала сохраните курс, чтобы выбрать модуль."
                      : "При выборе модуля ограничение по уроку будет сброшено."}
                  </span>
                </label>
                <label className="flex flex-col gap-2 text-xs text-text-dark">
                  Ограничение по уроку
                  <select
                    value={test.unlockLessonId ?? ""}
                    onChange={(event) =>
                      handleTestUnlockLessonChange(test.tempId, event.target.value)
                    }
                    disabled={unlockLessonOptions.length === 0}
                    className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Не требуется</option>
                    {unlockLessonOptions.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.moduleLabel} — {lesson.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-text-light">
                    {unlockLessonOptions.length === 0
                      ? "Доступно после сохранения уроков."
                      : "Выбор конкретного урока сбрасывает ограничение по модулю."}
                  </span>
                </label>
              </div>
            </div>
          ))}
          {/* Кнопка добавления теста внизу списка */}
          {tests.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleAddTest}
                className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
              >
                + Добавить тест
              </button>
            </div>
          )}
        )}
      </section>

      {/* Формы теперь добавляются в уроках, а не на уровне курса */}

      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm text-text-dark md:col-span-1">
          <input
            type="checkbox"
            checked={formState.isFree}
            onChange={(event) => {
              const isFree = event.target.checked;
              handleFormChange("isFree", isFree);
              if (isFree) {
                handleFormChange("priceValue", "");
              }
            }}
            className="size-4 accent-brand-pink"
          />
          Бесплатный курс
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark md:col-span-2">
          Стоимость{" "}
          {formState.priceCurrency === "TELEGRAM_STAR"
            ? "(в звёздах)"
            : "(EUR)"}
          <input
            type="number"
            min="0"
            step="1"
            value={formState.priceValue}
            onChange={(event) =>
              handleFormChange("priceValue", event.target.value)
            }
            disabled={formState.isFree}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:opacity-50"
          />
          {formState.priceCurrency === "TELEGRAM_STAR" ? (
            <span className="text-xs text-text-light">
              Укажите количество звёзд Telegram для покупки курса.
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-text-dark">
          Валюта
          <select
            value={formState.priceCurrency}
            onChange={(event) =>
              handleFormChange("priceCurrency", event.target.value)
            }
            disabled={formState.isFree}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm text-text-dark md:col-span-1">
          <input
            type="checkbox"
            checked={formState.isPublished}
            onChange={(event) =>
              handleFormChange("isPublished", event.target.checked)
            }
            className="size-4 accent-brand-pink"
          />
          Опубликован
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl bg-brand-orange/10 px-4 py-2 text-sm text-brand-orange">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/courses")}
          className="rounded-full border border-card px-5 py-2 text-sm font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-brand-pink px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Сохраняем..." : "Сохранить курс"}
        </button>
      </div>
    </form>
      </div>
    </div>
  );
}

