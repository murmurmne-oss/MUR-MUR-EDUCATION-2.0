'use client';

import React, {
  ChangeEvent,
  Fragment,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export type LessonContentMode = "simple" | "rich";

export type LessonSectionItemState = {
  id: string;
  text: string;
};

export type LessonContentBlockState =
  | {
      id: string;
      type: "paragraph";
      text: string;
      fontFamily?: "sans" | "serif" | "mono" | "display" | "handwriting";
      fontSize?: "sm" | "md" | "lg" | "xl" | "2xl";
      fontWeight?: "regular" | "medium" | "bold";
      align?: "left" | "center" | "right";
    }
  | {
      id: string;
      type: "heading";
      text: string;
      level?: 1 | 2 | 3;
      align?: "left" | "center" | "right";
    }
  | {
      id: string;
      type: "image";
      url: string;
      caption?: string;
      align?: "left" | "center" | "right";
      width?: "auto" | "full";
    }
  | {
      id: string;
      type: "video";
      url: string;
      caption?: string;
      autoplay?: boolean;
      coverImageUrl?: string;
    }
  | {
      id: string;
      type: "audio";
      url: string;
      caption?: string;
    }
  | {
      id: string;
      type: "section";
      title?: string;
      description?: string;
      items: LessonSectionItemState[];
    };

type LessonContentEditorProps = {
  mode: LessonContentMode;
  onModeChange: (mode: LessonContentMode) => void;
  simpleText: string;
  onSimpleTextChange: (value: string) => void;
  blocks: LessonContentBlockState[];
  onAddBlock: (type: LessonContentBlockState["type"]) => string;
  onUpdateBlock: (
    blockId: string,
    patch: Partial<LessonContentBlockState>,
  ) => void;
  onRemoveBlock: (blockId: string) => void;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  // Пропсы для drag-and-drop
  moduleTempId?: string;
  lessonTempId?: string;
  renderBlockWrapper?: (block: LessonContentBlockState, children: React.ReactNode) => React.ReactNode;
};

const PARAGRAPH_FONT_FAMILIES = [
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "display", label: "Display" },
  { value: "handwriting", label: "Handwriting" },
  { value: "mono", label: "Monospace" },
] as const;

const PARAGRAPH_FONT_SIZES = [
  { value: "sm", label: "Маленький" },
  { value: "md", label: "Стандарт" },
  { value: "lg", label: "Крупный" },
  { value: "xl", label: "Очень крупный" },
  { value: "2xl", label: "Заголовок" },
] as const;

const PARAGRAPH_FONT_WEIGHTS = [
  { value: "regular", label: "Обычный" },
  { value: "medium", label: "Средний" },
  { value: "bold", label: "Жирный" },
] as const;

const ALIGN_OPTIONS = [
  { value: "left", label: "Слева" },
  { value: "center", label: "По центру" },
  { value: "right", label: "Справа" },
] as const;

const HEADING_LEVEL_OPTIONS = [
  { value: 1, label: "H1" },
  { value: 2, label: "H2" },
  { value: 3, label: "H3" },
] as const;

const IMAGE_WIDTH_OPTIONS = [
  { value: "auto", label: "По ширине текста" },
  { value: "full", label: "Во всю ширину" },
] as const;

const BLOCK_ADD_OPTIONS: Array<{
  type: LessonContentBlockState["type"];
  label: string;
}> = [
  { type: "paragraph", label: "Текст" },
  { type: "heading", label: "Заголовок" },
  { type: "image", label: "Изображение" },
  { type: "video", label: "Видео" },
  { type: "audio", label: "Аудио" },
  { type: "section", label: "Секция" },
];

function ensureParagraphDefaults(
  block: Extract<LessonContentBlockState, { type: "paragraph" }>,
) {
  return {
    fontFamily: block.fontFamily ?? "sans",
    fontSize: block.fontSize ?? "md",
    fontWeight: block.fontWeight ?? "regular",
    align: block.align ?? "left",
  } as const;
}

function ensureHeadingDefaults(
  block: Extract<LessonContentBlockState, { type: "heading" }>,
) {
  return {
    level: block.level ?? 2,
    align: block.align ?? "left",
  } as const;
}

function ensureImageDefaults(
  block: Extract<LessonContentBlockState, { type: "image" }>,
) {
  return {
    align: block.align ?? "center",
    width: block.width ?? "auto",
  } as const;
}

export function LessonContentEditor({
  mode,
  onModeChange,
  simpleText,
  onSimpleTextChange,
  blocks,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onUploadImage,
  moduleTempId,
  lessonTempId,
  renderBlockWrapper,
}: LessonContentEditorProps) {
  const sectionId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUploadBlockId, setPendingUploadBlockId] = useState<string | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const hasBlocks = blocks.length > 0;

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!onUploadImage) {
        return;
      }
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setUploadError(null);
      let targetBlockId = pendingUploadBlockId;
      let createdBlockId: string | null = null;

      try {
        setIsUploading(true);
        if (!targetBlockId) {
          targetBlockId = onAddBlock("image");
          createdBlockId = targetBlockId;
        }
        setPendingUploadBlockId(targetBlockId);

        const result = await onUploadImage(file);
        onUpdateBlock(targetBlockId, { url: result.url });
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить изображение. Попробуйте снова.",
        );
        if (createdBlockId) {
          onRemoveBlock(createdBlockId);
        }
      } finally {
        setIsUploading(false);
        setPendingUploadBlockId(null);
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [onAddBlock, onRemoveBlock, onUpdateBlock, onUploadImage, pendingUploadBlockId],
  );

  const handleUploadClick = useCallback(
    (blockId?: string) => {
      setPendingUploadBlockId(blockId ?? null);
      setUploadError(null);
      fileInputRef.current?.click();
    },
    [],
  );

  const renderParagraphBlock = useCallback(
    (block: Extract<LessonContentBlockState, { type: "paragraph" }>) => {
      const defaults = ensureParagraphDefaults(block);
      return (
        <div
          key={block.id}
          className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
              Текстовый блок
            </span>
            <button
              type="button"
              onClick={() => onRemoveBlock(block.id)}
              className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
            >
              Удалить
            </button>
          </div>
          <textarea
            value={block.text}
            onChange={(event) =>
              onUpdateBlock(block.id, { text: event.target.value })
            }
            rows={4}
            className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            placeholder="Введите текст"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Шрифт
              <select
                value={defaults.fontFamily}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    fontFamily: event.target.value as (typeof PARAGRAPH_FONT_FAMILIES)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {PARAGRAPH_FONT_FAMILIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Размер
              <select
                value={defaults.fontSize}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    fontSize: event.target.value as (typeof PARAGRAPH_FONT_SIZES)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {PARAGRAPH_FONT_SIZES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Толщина
              <select
                value={defaults.fontWeight}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    fontWeight: event.target.value as (typeof PARAGRAPH_FONT_WEIGHTS)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {PARAGRAPH_FONT_WEIGHTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Выравнивание
              <select
                value={defaults.align}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    align: event.target.value as (typeof ALIGN_OPTIONS)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {ALIGN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      );
    },
    [onRemoveBlock, onUpdateBlock],
  );

  const renderHeadingBlock = useCallback(
    (block: Extract<LessonContentBlockState, { type: "heading" }>) => {
      const defaults = ensureHeadingDefaults(block);
      return (
        <div
          key={block.id}
          className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
              Заголовок
            </span>
            <button
              type="button"
              onClick={() => onRemoveBlock(block.id)}
              className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
            >
              Удалить
            </button>
          </div>
          <input
            type="text"
            value={block.text}
            onChange={(event) =>
              onUpdateBlock(block.id, { text: event.target.value })
            }
            className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            placeholder="Введите текст заголовка"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Размер
              <select
                value={defaults.level}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    level: Number(event.target.value) as 1 | 2 | 3,
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {HEADING_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Выравнивание
              <select
                value={defaults.align}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    align: event.target.value as (typeof ALIGN_OPTIONS)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {ALIGN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      );
    },
    [onRemoveBlock, onUpdateBlock],
  );

  const renderImageBlock = useCallback(
    (block: Extract<LessonContentBlockState, { type: "image" }>) => {
      const defaults = ensureImageDefaults(block);
      const isUploadingThis = isUploading && pendingUploadBlockId === block.id;
      return (
        <div
          key={block.id}
          className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
              Изображение
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUploadClick(block.id)}
                disabled={isUploading}
                className="rounded-full border border-brand-pink px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploadingThis ? "Загружаем..." : "Загрузить"}
              </button>
              <button
                type="button"
                onClick={() => onRemoveBlock(block.id)}
                className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
              >
                Удалить
              </button>
            </div>
          </div>
          {block.url ? (
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-white">
              <img
                src={block.url}
                alt={block.caption || "Изображение урока"}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border/70 bg-card px-3 py-4 text-center text-[11px] text-text-light">
              Добавьте ссылку или загрузите изображение.
            </p>
          )}
          <label className="flex flex-col gap-2 text-[11px] text-text-dark">
            Ссылка на изображение
            <input
              type="url"
              value={block.url}
              onChange={(event) =>
                onUpdateBlock(block.id, { url: event.target.value })
              }
              placeholder="https://..."
              className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
          </label>
          <label className="flex flex-col gap-2 text-[11px] text-text-dark">
            Подпись (опционально)
            <input
              type="text"
              value={block.caption ?? ""}
              onChange={(event) =>
                onUpdateBlock(block.id, { caption: event.target.value })
              }
              className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Ширина
              <select
                value={defaults.width}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    width: event.target.value as (typeof IMAGE_WIDTH_OPTIONS)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {IMAGE_WIDTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[11px] text-text-dark">
              Выравнивание
              <select
                value={defaults.align}
                onChange={(event) =>
                  onUpdateBlock(block.id, {
                    align: event.target.value as (typeof ALIGN_OPTIONS)[number]["value"],
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              >
                {ALIGN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      );
    },
    [handleUploadClick, isUploading, onRemoveBlock, onUpdateBlock, pendingUploadBlockId],
  );

  const renderVideoBlock = useCallback(
    (block: Extract<LessonContentBlockState, { type: "video" }>) => (
      <div
        key={block.id}
        className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
            Видео
          </span>
          <button
            type="button"
            onClick={() => onRemoveBlock(block.id)}
            className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
          >
            Удалить
          </button>
        </div>
        <label className="flex flex-col gap-2 text-[11px] text-text-dark">
          Ссылка на видео
          <input
            type="url"
            value={block.url}
            onChange={(event) =>
              onUpdateBlock(block.id, { url: event.target.value })
            }
            placeholder="https://..."
            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>
        <label className="flex flex-col gap-2 text-[11px] text-text-dark">
          Подпись (опционально)
          <input
            type="text"
            value={block.caption ?? ""}
            onChange={(event) =>
              onUpdateBlock(block.id, { caption: event.target.value })
            }
            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>
        <label className="flex flex-col gap-2 text-[11px] text-text-dark">
          Обложка (опционально)
          <input
            type="url"
            value={block.coverImageUrl ?? ""}
            onChange={(event) =>
              onUpdateBlock(block.id, { coverImageUrl: event.target.value })
            }
            placeholder="https://..."
            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-dark">
          <input
            type="checkbox"
            checked={Boolean(block.autoplay)}
            onChange={(event) =>
              onUpdateBlock(block.id, { autoplay: event.target.checked })
            }
            className="size-4 accent-brand-pink"
          />
          Автовоспроизведение (mute + loop)
        </label>
        {block.url ? (
          <div className="overflow-hidden rounded-2xl bg-black/80">
            <video
              controls
              className="h-auto w-full"
              poster={block.coverImageUrl || undefined}
              src={block.url}
              {...(block.autoplay ? { autoPlay: true, muted: true, loop: true } : {})}
            />
          </div>
        ) : null}
      </div>
    ),
    [onRemoveBlock, onUpdateBlock],
  );

  const renderAudioBlock = useCallback(
    (block: Extract<LessonContentBlockState, { type: "audio" }>) => (
      <div
        key={block.id}
        className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
            Аудио
          </span>
          <button
            type="button"
            onClick={() => onRemoveBlock(block.id)}
            className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
          >
            Удалить
          </button>
        </div>
        <label className="flex flex-col gap-2 text-[11px] text-text-dark">
          Ссылка на аудиофайл
          <input
            type="url"
            value={block.url}
            onChange={(event) =>
              onUpdateBlock(block.id, { url: event.target.value })
            }
            placeholder="https://..."
            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>
        <label className="flex flex-col gap-2 text-[11px] text-text-dark">
          Подпись (опционально)
          <input
            type="text"
            value={block.caption ?? ""}
            onChange={(event) =>
              onUpdateBlock(block.id, { caption: event.target.value })
            }
            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        </label>
        {block.url ? (
          <div className="rounded-2xl border border-border/40 bg-white px-3 py-2">
            <audio controls className="w-full" src={block.url}>
              Ваш браузер не поддерживает элемент audio.
            </audio>
          </div>
        ) : null}
      </div>
    ),
    [onRemoveBlock, onUpdateBlock],
  );

  const renderSectionBlock = useCallback(
    (block: Extract<LessonContentBlockState, { type: "section" }>) => {
      const addItem = () =>
        onUpdateBlock(block.id, {
          items: [
            ...block.items,
            { id: `${sectionId}-${Math.random().toString(36).slice(2, 8)}`, text: "" },
          ],
        });

      const updateItem = (itemId: string, text: string) =>
        onUpdateBlock(block.id, {
          items: block.items.map((item) =>
            item.id === itemId ? { ...item, text } : item,
          ),
        });

      const removeItem = (itemId: string) =>
        onUpdateBlock(block.id, {
          items: block.items.filter((item) => item.id !== itemId),
        });

      return (
        <div
          key={block.id}
          className="space-y-3 rounded-2xl border border-border/50 bg-surface px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
              Секция урока
            </span>
            <button
              type="button"
              onClick={() => onRemoveBlock(block.id)}
              className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
            >
              Удалить
            </button>
          </div>
          <label className="flex flex-col gap-2 text-[11px] text-text-dark">
            Название секции
            <input
              type="text"
              value={block.title ?? ""}
              onChange={(event) =>
                onUpdateBlock(block.id, { title: event.target.value })
              }
              className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
          </label>
          <label className="flex flex-col gap-2 text-[11px] text-text-dark">
            Описание (опционально)
            <textarea
              value={block.description ?? ""}
              onChange={(event) =>
                onUpdateBlock(block.id, { description: event.target.value })
              }
              rows={2}
              className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-light">
                Подпункты
              </p>
              <button
                type="button"
                onClick={addItem}
                className="rounded-full border border-brand-pink px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
              >
                Добавить пункт
              </button>
            </div>
            {block.items.length === 0 ? (
              <p className="rounded-2xl bg-card px-3 py-3 text-[11px] text-text-light">
                Добавьте подпункты, чтобы структурировать материал.
              </p>
            ) : (
              block.items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-white px-3 py-3 md:flex-row md:items-center md:gap-3"
                >
                  <span className="text-[11px] font-semibold text-text-light md:w-20">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(event) => updateItem(item.id, event.target.value)}
                    placeholder="Сформулируйте пункт"
                    className="flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-[11px] font-semibold text-brand-orange underline-offset-4 hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    },
    [onRemoveBlock, onUpdateBlock, sectionId],
  );

  const renderBlockEditor = useCallback(
    (block: LessonContentBlockState) => {
      switch (block.type) {
        case "paragraph":
          return renderParagraphBlock(block);
        case "heading":
          return renderHeadingBlock(block);
        case "image":
          return renderImageBlock(block);
        case "video":
          return renderVideoBlock(block);
        case "audio":
          return renderAudioBlock(block);
        case "section":
          return renderSectionBlock(block);
        default:
          return null;
      }
    },
    [
      renderAudioBlock,
      renderHeadingBlock,
      renderImageBlock,
      renderParagraphBlock,
      renderSectionBlock,
      renderVideoBlock,
    ],
  );

  const previewBlocks = useMemo(
    () =>
      blocks.map((block) => {
        switch (block.type) {
          case "paragraph": {
            const defaults = ensureParagraphDefaults(block);
            const fontFamily =
              {
                sans: "font-sans",
                serif: "font-serif",
                display: "font-display",
                handwriting: "font-handwriting",
                mono: "font-mono",
              }[defaults.fontFamily];
            const fontSize =
              {
                sm: "text-sm",
                md: "text-base",
                lg: "text-lg",
                xl: "text-xl",
                "2xl": "text-2xl",
              }[defaults.fontSize];
            const fontWeight =
              {
                regular: "font-normal",
                medium: "font-medium",
                bold: "font-semibold",
              }[defaults.fontWeight];
            const align =
              {
                left: "text-left",
                center: "text-center",
                right: "text-right",
              }[defaults.align];
            return (
              <p key={block.id} className={`${fontFamily} ${fontSize} ${fontWeight} ${align}`}>
                {block.text}
              </p>
            );
          }
          case "heading": {
            const defaults = ensureHeadingDefaults(block);
            const levelClass =
              {
                1: "text-2xl",
                2: "text-xl",
                3: "text-lg",
              }[defaults.level];
            const align =
              {
                left: "text-left",
                center: "text-center",
                right: "text-right",
              }[defaults.align];
            return (
              <h3 key={block.id} className={`${levelClass} font-semibold text-text-dark ${align}`}>
                {block.text}
              </h3>
            );
          }
          case "image": {
            const defaults = ensureImageDefaults(block);
            const alignClass =
              defaults.align === "left"
                ? "ml-0 mr-auto"
                : defaults.align === "right"
                  ? "ml-auto mr-0"
                  : "mx-auto";
            const widthClass = defaults.width === "full" ? "-mx-4 md:mx-0" : "max-w-xl mx-auto";
            return (
              <figure
                key={block.id}
                className={`overflow-hidden rounded-2xl border border-border/30 bg-white ${alignClass} ${widthClass}`}
              >
                {block.url ? (
                  <img
                    src={block.url}
                    alt={block.caption || "Изображение урока"}
                    className="h-auto w-full object-cover"
                  />
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-text-light">
                    Изображение ещё не добавлено
                  </div>
                )}
                {block.caption ? (
                  <figcaption className="px-3 py-2 text-xs text-text-light">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          }
          case "video":
            return (
              <div key={block.id} className="overflow-hidden rounded-2xl bg-black/80">
                {block.url ? (
                  <video
                    controls
                    className="h-auto w-full"
                    poster={block.coverImageUrl || undefined}
                    src={block.url}
                    {...(block.autoplay ? { autoPlay: true, muted: true, loop: true } : {})}
                  />
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-text-light">
                    Добавьте ссылку на видео, чтобы увидеть предпросмотр.
                  </div>
                )}
                {block.caption ? (
                  <p className="px-3 py-2 text-xs text-text-light">{block.caption}</p>
                ) : null}
              </div>
            );
          case "audio":
            return (
              <div key={block.id} className="rounded-2xl border border-border/40 bg-white px-3 py-2">
                {block.url ? (
                  <audio controls className="w-full" src={block.url}>
                    Ваш браузер не поддерживает элемент audio.
                  </audio>
                ) : (
                  <p className="text-xs text-text-light">
                    Добавьте ссылку на аудио, чтобы воспроизвести дорожку.
                  </p>
                )}
                {block.caption ? (
                  <p className="mt-1 text-xs text-text-light">{block.caption}</p>
                ) : null}
              </div>
            );
          case "section":
            return (
              <section
                key={block.id}
                className="space-y-2 rounded-2xl border border-border/40 bg-white px-4 py-3"
              >
                {(block.title || block.description) && (
                  <header>
                    {block.title ? (
                      <h4 className="text-base font-semibold text-text-dark">{block.title}</h4>
                    ) : null}
                    {block.description ? (
                      <p className="text-xs text-text-light">{block.description}</p>
                    ) : null}
                  </header>
                )}
                {block.items.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-text-medium">
                    {block.items.map((item) => (
                      <li key={item.id}>{item.text}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          default:
            return null;
        }
      }),
    [blocks],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-text-dark">Контент / текст урока</p>
        <div className="flex items-center gap-2 text-[11px] text-text-light">
          <button
            type="button"
            onClick={() => onModeChange("simple")}
            className={`rounded-full px-3 py-1 transition-colors ${
              mode === "simple"
                ? "bg-brand-pink text-white"
                : "border border-border bg-card text-text-dark hover:border-brand-pink"
            }`}
          >
            Простой текст
          </button>
          <button
            type="button"
            onClick={() => onModeChange("rich")}
            className={`rounded-full px-3 py-1 transition-colors ${
              mode === "rich"
                ? "bg-brand-pink text-white"
                : "border border-border bg-card text-text-dark hover:border-brand-pink"
            }`}
          >
            Расширенный
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsPreviewOpen((prev) => !prev)}
          className="rounded-full border border-brand-pink px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
        >
          {isPreviewOpen ? "Скрыть предпросмотр" : "Предпросмотр"}
        </button>
      </div>

      {mode === "simple" ? (
        <textarea
          value={simpleText}
          onChange={(event) => onSimpleTextChange(event.target.value)}
          rows={4}
          placeholder="Введите основной текст урока"
          className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
        />
      ) : (
        <div className="space-y-3">
          {hasBlocks ? (
            blocks.map((block) => {
              const blockContent = <Fragment key={block.id}>{renderBlockEditor(block)}</Fragment>;
              return renderBlockWrapper && moduleTempId && lessonTempId
                ? renderBlockWrapper(block, blockContent)
                : blockContent;
            })
          ) : (
            <p className="rounded-2xl bg-card px-4 py-3 text-xs text-text-medium">
              Здесь появятся блоки контента. Добавьте первый блок, чтобы начать.
            </p>
          )}

          {uploadError ? (
            <p className="rounded-2xl bg-brand-orange/10 px-3 py-2 text-[11px] text-brand-orange">
              {uploadError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-text-light">
              Добавить блок:
            </span>
            {BLOCK_ADD_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  setUploadError(null);
                  onAddBlock(option.type);
                }}
                className="rounded-full border border-brand-pink px-3 py-1 text-[11px] font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
              >
                {option.label}
              </button>
            ))}
            {onUploadImage ? (
              <button
                type="button"
                onClick={() => handleUploadClick()}
                disabled={isUploading}
                className="rounded-full border border-dashed border-brand-orange/60 px-3 py-1 text-[11px] font-semibold text-brand-orange transition-colors hover:border-brand-orange hover:bg-brand-orange/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Загрузить файл
              </button>
            ) : null}
          </div>
        </div>
      )}

      {onUploadImage ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}

      {isPreviewOpen ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-brand-pink/40 bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-pink">
              Предпросмотр урока
            </span>
            <span className="text-[11px] text-text-light">
              {mode === "simple" ? "Простой текст" : "Расширенный"}
            </span>
          </div>
          {mode === "simple" ? (
            simpleText.trim().length > 0 ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-dark">
                {simpleText}
              </p>
            ) : (
              <p className="text-xs text-text-light">
                Добавьте текст, чтобы увидеть, как он будет отображаться у студента.
              </p>
            )
          ) : !hasBlocks ? (
            <p className="text-xs text-text-light">
              Добавьте блоки текста, медиа или секций. Предпросмотр обновится автоматически.
            </p>
          ) : (
            <div className="space-y-4 text-sm leading-relaxed text-text-dark">
              {previewBlocks}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
