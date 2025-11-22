"use client";

import { useMemo } from "react";
import type { LessonContentBlockState } from "./lesson-content-editor";
import type { LessonState } from "./course-form";

type LessonPreviewProps = {
  lesson: LessonState;
  moduleTitle: string;
  onClose: () => void;
};

const FONT_FAMILY_CLASSES = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
  display: "font-display",
  handwriting: "font-handwriting",
} as const;

const FONT_SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
} as const;

const FONT_WEIGHT_CLASSES = {
  regular: "font-normal",
  medium: "font-medium",
  bold: "font-semibold",
} as const;

const ALIGN_CLASSES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function LessonPreview({
  lesson,
  moduleTitle,
  onClose,
}: LessonPreviewProps) {
  const blocks = useMemo(() => {
    if (lesson.contentMode === "simple") {
      if (!lesson.contentText || lesson.contentText.trim().length === 0) {
        return [];
      }
      return [
        {
          id: "simple-text-block",
          type: "paragraph" as const,
          text: lesson.contentText,
        },
      ];
    }
    return lesson.contentBlocks || [];
  }, [lesson.contentMode, lesson.contentText, lesson.contentBlocks]);

  return (
    <div className="flex h-full flex-col">
      {/* Мобильный телефон */}
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="relative h-[720px] w-[380px] rounded-[3.5rem] border-[14px] border-gray-800 bg-gray-900 p-3 shadow-2xl">
          {/* Вырез для камеры */}
          <div className="absolute left-1/2 top-0 h-9 w-48 -translate-x-1/2 rounded-b-3xl bg-gray-900"></div>

          {/* Экран */}
          <div className="h-full w-full overflow-y-auto rounded-[2.75rem] bg-background">
            <div className="flex min-h-full flex-col bg-background text-text-dark">
              {/* Header */}
              <header className="space-y-2 px-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-medium text-brand-orange underline-offset-4 hover:underline"
                >
                  ← Назад к курсу
                </button>
                <h1 className="text-xl font-semibold line-clamp-2">
                  {lesson.title || "Урок без названия"}
                </h1>
                <p className="text-xs text-text-light">{moduleTitle}</p>
                {lesson.summary && (
                  <p className="text-[10px] text-text-light/70 line-clamp-2">
                    {lesson.summary}
                  </p>
                )}
              </header>

              {/* Main content */}
              <main className="mt-4 flex flex-1 flex-col gap-4 px-4 pb-6">
                {blocks.length === 0 ? (
                  <p className="rounded-2xl bg-card px-4 py-3 text-sm text-text-medium">
                    Контент урока появится совсем скоро.
                  </p>
                ) : (
                  blocks.map((block, index) => {
                    if (block.type === "image") {
                      return (
                        <figure
                          key={`${block.id}-${index}`}
                          className={`overflow-hidden rounded-3xl bg-surface ${
                            block.align === "left"
                              ? "ml-0 mr-auto"
                              : block.align === "right"
                                ? "ml-auto mr-0"
                                : ""
                          } ${
                            block.width === "full"
                              ? "-mx-5 md:mx-0"
                              : ""
                          }`}
                        >
                          <img
                            src={block.url}
                            alt={block.caption ?? "Изображение урока"}
                            className={`h-auto w-full object-cover ${
                              block.width === "full"
                                ? "max-h-[360px]"
                                : "max-h-[280px]"
                            }`}
                          />
                          {block.caption ? (
                            <figcaption className="px-4 py-3 text-xs text-text-light">
                              {block.caption}
                            </figcaption>
                          ) : null}
                        </figure>
                      );
                    }

                    if (block.type === "video") {
                      const autoplayProps = block.autoplay
                        ? { autoPlay: true, muted: true, loop: true }
                        : {};
                      return (
                        <figure
                          key={`${block.id}-${index}`}
                          className="overflow-hidden rounded-3xl bg-black/80"
                        >
                          <video
                            controls
                            poster={block.coverImageUrl ?? undefined}
                            className="h-auto w-full"
                            src={block.url}
                            {...autoplayProps}
                          />
                          {block.caption ? (
                            <figcaption className="px-4 py-2 text-xs text-text-light">
                              {block.caption}
                            </figcaption>
                          ) : null}
                        </figure>
                      );
                    }

                    if (block.type === "audio") {
                      return (
                        <div
                          key={`${block.id}-${index}`}
                          className="rounded-3xl border border-border/40 bg-white px-4 py-3"
                        >
                          <audio controls className="w-full" src={block.url}>
                            Ваш браузер не поддерживает элемент audio.
                          </audio>
                          {block.caption ? (
                            <p className="mt-2 text-xs text-text-light">
                              {block.caption}
                            </p>
                          ) : null}
                        </div>
                      );
                    }

                    if (block.type === "section") {
                      return (
                        <section
                          key={`${block.id}-${index}`}
                          className="space-y-3 rounded-3xl border border-border/50 bg-surface px-4 py-4"
                        >
                          {block.title ? (
                            <h4 className="text-base font-semibold text-text-dark">
                              {block.title}
                            </h4>
                          ) : null}
                          {block.description ? (
                            <p className="text-sm text-text-light">
                              {block.description}
                            </p>
                          ) : null}
                          {block.items.length > 0 ? (
                            <ul className="space-y-2 text-sm text-text-medium">
                              {block.items.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-1 size-1.5 rounded-full bg-brand-orange" />
                                  <span>{item.text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </section>
                      );
                    }

                    if (block.type === "heading") {
                      const levelClass =
                        block.level === 1
                          ? "text-2xl"
                          : block.level === 3
                            ? "text-lg"
                            : "text-xl";
                      return (
                        <h3
                          key={`${block.id}-${index}`}
                          className={`${levelClass} font-semibold text-text-dark ${
                            ALIGN_CLASSES[block.align ?? "left"]
                          }`}
                        >
                          {block.text}
                        </h3>
                      );
                    }

                    // Проверяем, является ли текст HTML (начинается с <)
                    const isHTML =
                      typeof block.text === "string" &&
                      block.text.trim().startsWith("<");

                    if (isHTML) {
                      // Рендерим HTML с базовыми стилями
                      return (
                        <div
                          key={`${block.id}-${index}`}
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: block.text }}
                          style={{
                            fontFamily:
                              block.fontFamily === "serif"
                                ? "serif"
                                : block.fontFamily === "mono"
                                  ? "monospace"
                                  : block.fontFamily === "display"
                                    ? "display"
                                    : block.fontFamily === "handwriting"
                                      ? "cursive"
                                      : "sans-serif",
                            fontSize:
                              block.fontSize === "sm"
                                ? "0.875rem"
                                : block.fontSize === "lg"
                                  ? "1.125rem"
                                  : block.fontSize === "xl"
                                    ? "1.25rem"
                                    : block.fontSize === "2xl"
                                      ? "1.5rem"
                                      : "1rem",
                            fontWeight:
                              block.fontWeight === "bold"
                                ? "600"
                                : block.fontWeight === "medium"
                                  ? "500"
                                  : "400",
                            textAlign: block.align || "left",
                          }}
                        />
                      );
                    }

                    // Обратная совместимость: plain text с применением стилей
                    const fontFamily =
                      FONT_FAMILY_CLASSES[block.fontFamily ?? "sans"];
                    const fontSize =
                      FONT_SIZE_CLASSES[block.fontSize ?? "md"];
                    const fontWeight =
                      FONT_WEIGHT_CLASSES[block.fontWeight ?? "regular"];
                    const align = ALIGN_CLASSES[block.align ?? "left"];

                    return (
                      <p
                        key={`${block.id}-${index}`}
                        className={`${fontFamily} ${fontSize} ${fontWeight} ${align} whitespace-pre-wrap`}
                      >
                        {block.text}
                      </p>
                    );
                  })
                )}

                {lesson.videoUrl && (
                  <div className="rounded-2xl bg-brand-pink/10 p-4 text-sm text-brand-pink">
                    Видео урок:{" "}
                    <a
                      href={lesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {lesson.videoUrl}
                    </a>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

