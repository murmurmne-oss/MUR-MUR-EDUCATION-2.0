export type LessonContentBlock =
  | {
      type: "paragraph";
      text: string;
      fontFamily?: "sans" | "serif" | "mono" | "display" | "handwriting";
      fontSize?: "sm" | "md" | "lg" | "xl" | "2xl";
      fontWeight?: "regular" | "medium" | "bold";
      align?: "left" | "center" | "right";
    }
  | {
      type: "heading";
      text: string;
      level?: 1 | 2 | 3;
      align?: "left" | "center" | "right";
    }
  | {
      type: "image";
      url: string;
      caption?: string;
      width?: "auto" | "full";
      align?: "left" | "center" | "right";
    }
  | {
      type: "video";
      url: string;
      caption?: string;
      autoplay?: boolean;
      coverImageUrl?: string;
    }
  | {
      type: "audio";
      url: string;
      caption?: string;
    }
  | {
      type: "section";
      title?: string;
      description?: string;
      items: Array<{
        id: string;
        text: string;
      }>;
    };

type DraftContent =
  | string
  | null
  | undefined
  | {
      text?: unknown;
      blocks?: unknown;
    };

export function parseLessonBlocks(content: unknown): LessonContentBlock[] {
  const source = content as DraftContent;

  if (typeof source === "string") {
    return source.trim().length === 0
      ? []
      : [
          {
            type: "paragraph",
            text: source.trim(),
          },
        ];
  }

  if (!source) {
    return [];
  }

  if (typeof source === "object" && Array.isArray(source.blocks)) {
    return (source.blocks as unknown[])
      .map((rawBlock) => normalizeBlock(rawBlock))
      .filter((block): block is LessonContentBlock => block !== null);
  }

  if (
    typeof source === "object" &&
    typeof source.text === "string" &&
    source.text.trim().length > 0
  ) {
    return [
      {
        type: "paragraph",
        text: source.text.trim(),
      },
    ];
  }

  return [];
}

export function extractPlainText(content: unknown, limit = 280): string {
  const blocks = parseLessonBlocks(content);

  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading") {
      return truncate(block.text, limit);
    }
    if (block.type === "section" && block.items.length > 0) {
      return truncate(block.items[0].text, limit);
    }
  }

  if (typeof content === "string") {
    return truncate(content, limit);
  }

  if (
    content &&
    typeof content === "object" &&
    typeof (content as { text?: unknown }).text === "string"
  ) {
    return truncate((content as { text: string }).text, limit);
  }

  if (content && typeof content === "object") {
    const collected: string[] = [];
    for (const value of Object.values(content)) {
      if (typeof value === "string") {
        collected.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            collected.push(item);
          } else if (
            item &&
            typeof item === "object" &&
            typeof (item as { text?: unknown }).text === "string"
          ) {
            collected.push((item as { text: string }).text);
          }
        }
      }
    }

    if (collected.length > 0) {
      return truncate(collected.join(" · "), limit);
    }

    try {
      const serialized = JSON.stringify(content);
      if (serialized) {
        return truncate(serialized, limit);
      }
    } catch {
      // ignore
    }
  }

  return "";
}

function normalizeBlock(rawBlock: unknown): LessonContentBlock | null {
  if (!rawBlock || typeof rawBlock !== "object") {
    return null;
  }

  const block = rawBlock as Record<string, unknown>;
  const type = block.type;

  if (type === "image") {
    const url = typeof block.url === "string" ? block.url.trim() : "";
    if (url.length === 0) {
      return null;
    }

    return {
      type: "image",
      url,
      caption:
        typeof block.caption === "string" && block.caption.trim().length > 0
          ? block.caption.trim()
          : undefined,
      width:
        block.width === "full" || block.width === "auto"
          ? block.width
          : "auto",
      align:
        block.align === "left" ||
        block.align === "center" ||
        block.align === "right"
          ? (block.align as "left" | "center" | "right")
          : "center",
    };
  }

  if (type === "heading") {
    const text = typeof block.text === "string" ? block.text.trim() : "";
    if (text.length === 0) {
      return null;
    }

    const level = [1, 2, 3].includes(block.level as number)
      ? (block.level as 1 | 2 | 3)
      : 2;

    return {
      type: "heading",
      text,
      level,
      align:
        block.align === "left" ||
        block.align === "center" ||
        block.align === "right"
          ? (block.align as "left" | "center" | "right")
          : "left",
    };
  }

  if (type === "video") {
    const url = typeof block.url === "string" ? block.url.trim() : "";
    if (url.length === 0) {
      return null;
    }

    return {
      type: "video",
      url,
      caption:
        typeof block.caption === "string" && block.caption.trim().length > 0
          ? block.caption.trim()
          : undefined,
      autoplay: block.autoplay === true,
      coverImageUrl:
        typeof block.coverImageUrl === "string" &&
        block.coverImageUrl.trim().length > 0
          ? block.coverImageUrl.trim()
          : undefined,
    };
  }

  if (type === "audio") {
    const url = typeof block.url === "string" ? block.url.trim() : "";
    if (url.length === 0) {
      return null;
    }

    return {
      type: "audio",
      url,
      caption:
        typeof block.caption === "string" && block.caption.trim().length > 0
          ? block.caption.trim()
          : undefined,
    };
  }

  if (type === "section") {
    const title =
      typeof block.title === "string" && block.title.trim().length > 0
        ? block.title.trim()
        : undefined;
    const description =
      typeof block.description === "string" && block.description.trim().length > 0
        ? block.description.trim()
        : undefined;
    const rawItems = Array.isArray(block.items)
      ? (block.items as unknown[])
      : [];

    const items = rawItems
      .map((item) => {
        if (typeof item === "string") {
          const textValue = item.trim();
          if (textValue.length === 0) {
            return null;
          }
          return {
            id: createLocalId(),
            text: textValue,
          };
        }

        if (item && typeof item === "object") {
          const textValue =
            typeof (item as { text?: unknown }).text === "string"
              ? (item as { text: string }).text.trim()
              : "";
          if (textValue.length === 0) {
            return null;
          }
          const idValue =
            typeof (item as { id?: unknown }).id === "string"
              ? ((item as { id: string }).id || createLocalId())
              : createLocalId();
          return {
            id: idValue,
            text: textValue,
          };
        }

        return null;
      })
      .filter((entry): entry is { id: string; text: string } => entry !== null);

    if (!title && !description && items.length === 0) {
      return null;
    }

    return {
      type: "section",
      title,
      description,
      items,
    };
  }

  // default to paragraph
  const text = typeof block.text === "string" ? block.text.trim() : "";
  if (text.length === 0) {
    return null;
  }

  // Сохраняем HTML как есть (для rich text editor)
  return {
    type: "paragraph",
    text, // Может содержать HTML из rich text editor
    fontFamily:
      block.fontFamily === "serif" ||
      block.fontFamily === "mono" ||
      block.fontFamily === "display" ||
      block.fontFamily === "handwriting"
        ? block.fontFamily
        : "sans",
    fontSize:
      block.fontSize === "sm" ||
      block.fontSize === "lg" ||
      block.fontSize === "xl" ||
      block.fontSize === "2xl"
        ? block.fontSize
        : "md",
    fontWeight:
      block.fontWeight === "medium" || block.fontWeight === "bold"
        ? block.fontWeight
        : "regular",
    align:
      block.align === "center" || block.align === "right"
        ? block.align
        : "left",
  };
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 1).trim()}…`;
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lc-${Math.random().toString(36).slice(2, 10)}`;
}

