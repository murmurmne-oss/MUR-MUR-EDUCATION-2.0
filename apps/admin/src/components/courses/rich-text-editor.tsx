"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import Heading from "@tiptap/extension-heading";
import { Extension } from "@tiptap/core";
import { useCallback, useEffect, useState } from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Link as LinkIcon,
  Type,
  Palette,
  Eraser,
} from "lucide-react";

// Кастомное расширение для fontSize
const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

const FONT_FAMILIES = [
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
  { value: "display", label: "Display" },
  { value: "handwriting", label: "Handwriting" },
] as const;

const FONT_SIZES = [
  { value: "sm", label: "Маленький", size: "0.875rem" },
  { value: "md", label: "Стандарт", size: "1rem" },
  { value: "lg", label: "Крупный", size: "1.125rem" },
  { value: "xl", label: "Очень крупный", size: "1.25rem" },
  { value: "2xl", label: "Заголовок", size: "1.5rem" },
] as const;

const HEADING_LEVELS = [
  { value: "paragraph", label: "Обычный" },
  { value: "heading1", label: "Заголовок 1" },
  { value: "heading2", label: "Заголовок 2" },
  { value: "heading3", label: "Заголовок 3" },
] as const;

const TEXT_COLORS = [
  { value: "#000000", label: "Черный" },
  { value: "#333333", label: "Темно-серый" },
  { value: "#666666", label: "Серый" },
  { value: "#FF0000", label: "Красный" },
  { value: "#00AA00", label: "Зеленый" },
  { value: "#0000FF", label: "Синий" },
  { value: "#FF6600", label: "Оранжевый" },
  { value: "#9900FF", label: "Фиолетовый" },
] as const;

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Введите текст...",
  className = "",
}: RichTextEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Закрываем диалоги при клике вне их
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showColorPicker) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showColorPicker]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Используем кастомный Heading
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        link: false, // Используем кастомный Link
        underline: false, // Используем кастомный Underline
        strike: false, // Используем кастомный Strike
        bulletList: false, // Используем кастомный BulletList
        orderedList: false, // Используем кастомный OrderedList
        listItem: false, // Используем кастомный ListItem
      }),
      TextStyle,
      FontSize,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Color.configure({
        types: ["textStyle"],
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "left",
      }),
      Underline,
      Strike,
      BulletList,
      OrderedList,
      ListItem,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand-pink underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${className}`,
      },
    },
  });

  // Обновляем контент при изменении пропса
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setFontFamily = useCallback(
    (fontFamily: string) => {
      if (!editor) return;
      editor.chain().focus().setFontFamily(fontFamily).run();
    },
    [editor],
  );

  const setFontSize = useCallback(
    (size: string) => {
      if (!editor) return;
      editor.chain().focus().setFontSize(size).run();
    },
    [editor],
  );

  const setHeading = useCallback(
    (level: string) => {
      if (!editor) return;
      if (level === "paragraph") {
        editor.chain().focus().setParagraph().run();
      } else if (level === "heading1") {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      } else if (level === "heading2") {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      } else if (level === "heading3") {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      }
    },
    [editor],
  );

  const toggleBold = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleStrike().run();
  }, [editor]);

  const setTextColor = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().setColor(color).run();
      setShowColorPicker(false);
    },
    [editor],
  );

  const toggleBulletList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setTextAlign = useCallback(
    (align: "left" | "center" | "right" | "justify") => {
      if (!editor) return;
      editor.chain().focus().setTextAlign(align).run();
    },
    [editor],
  );

  const increaseIndent = useCallback(() => {
    if (!editor) return;
    // Для списков: sink увеличивает отступ (вложенность)
    if (editor.isActive("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();
    }
  }, [editor]);

  const decreaseIndent = useCallback(() => {
    if (!editor) return;
    // Для списков: lift уменьшает отступ (вложенность)
    if (editor.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();
    }
  }, [editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;
    const url = editor.getAttributes("link").href;
    if (url) {
      setLinkUrl(url);
    }
    setShowLinkDialog(true);
  }, [editor]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
    setLinkUrl("");
  }, [editor]);

  const clearFormatting = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  }, [editor]);

  const undo = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().undo().run();
  }, [editor]);

  const redo = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().redo().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const currentFontFamily =
    editor.getAttributes("textStyle").fontFamily || "sans";
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "1rem";
  const currentAlign = editor.getAttributes("textAlign").textAlign || "left";
  const currentColor = editor.getAttributes("textStyle").color || "#000000";
  const currentHeading = editor.isActive("heading", { level: 1 })
    ? "heading1"
    : editor.isActive("heading", { level: 2 })
      ? "heading2"
      : editor.isActive("heading", { level: 3 })
        ? "heading3"
        : "paragraph";

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-white p-2">
        {/* Undo/Redo */}
        <button
          type="button"
          onClick={undo}
          disabled={!editor.can().undo()}
          className="rounded-lg p-1.5 text-text-medium transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Отменить (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!editor.can().redo()}
          className="rounded-lg p-1.5 text-text-medium transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Повторить (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="h-6 w-px bg-border" />

        {/* Heading Style */}
        <select
          value={currentHeading}
          onChange={(e) => setHeading(e.target.value)}
          className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
          title="Стиль текста"
        >
          {HEADING_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>

        {/* Font Family */}
        <select
          value={currentFontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
          title="Шрифт"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        {/* Font Size */}
        <select
          value={
            FONT_SIZES.find((fs) => fs.size === currentFontSize)?.value || "md"
          }
          onChange={(e) => {
            const size = FONT_SIZES.find((fs) => fs.value === e.target.value);
            if (size) setFontSize(size.size);
          }}
          className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
          title="Размер шрифта"
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <div className="h-6 w-px bg-border" />

        {/* Bold */}
        <button
          type="button"
          onClick={toggleBold}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("bold")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Жирный (Ctrl+B)"
        >
          <Bold size={16} />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={toggleItalic}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("italic")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Курсив (Ctrl+I)"
        >
          <Italic size={16} />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={toggleUnderline}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("underline")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Подчеркнутый (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={toggleStrike}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("strike")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Зачеркнутый"
        >
          <Strikethrough size={16} />
        </button>

        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="rounded-lg p-1.5 text-text-medium transition-colors hover:bg-gray-100"
            title="Цвет текста"
          >
            <div className="flex items-center gap-1">
              <Type size={16} />
              <div
                className="h-3 w-3 rounded border border-gray-300"
                style={{ backgroundColor: currentColor }}
              />
            </div>
          </button>
          {showColorPicker && (
            <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-white p-2 shadow-lg">
              <div className="grid grid-cols-4 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setTextColor(color.value)}
                    className="h-6 w-6 rounded border border-gray-300 transition-transform hover:scale-110"
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={toggleBulletList}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("bulletList")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Маркированный список"
        >
          <List size={16} />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={toggleOrderedList}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("orderedList")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Нумерованный список"
        >
          <ListOrdered size={16} />
        </button>

        {/* Indent */}
        <button
          type="button"
          onClick={decreaseIndent}
          className="rounded-lg p-1.5 text-text-medium transition-colors hover:bg-gray-100"
          title="Уменьшить отступ"
        >
          <Outdent size={16} />
        </button>
        <button
          type="button"
          onClick={increaseIndent}
          className="rounded-lg p-1.5 text-text-medium transition-colors hover:bg-gray-100"
          title="Увеличить отступ"
        >
          <Indent size={16} />
        </button>

        <div className="h-6 w-px bg-border" />

        {/* Text Align */}
        <button
          type="button"
          onClick={() => setTextAlign("left")}
          className={`rounded-lg p-1.5 transition-colors ${
            currentAlign === "left"
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Выровнять по левому краю"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign("center")}
          className={`rounded-lg p-1.5 transition-colors ${
            currentAlign === "center"
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Выровнять по центру"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign("right")}
          className={`rounded-lg p-1.5 transition-colors ${
            currentAlign === "right"
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Выровнять по правому краю"
        >
          <AlignRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign("justify")}
          className={`rounded-lg p-1.5 transition-colors ${
            currentAlign === "justify"
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Выровнять по ширине"
        >
          <AlignJustify size={16} />
        </button>

        <div className="h-6 w-px bg-border" />

        {/* Link */}
        <button
          type="button"
          onClick={handleLink}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("link")
              ? "bg-brand-pink text-white"
              : "text-text-medium hover:bg-gray-100"
          }`}
          title="Вставить ссылку"
        >
          <LinkIcon size={16} />
        </button>

        {/* Clear Formatting */}
        <button
          type="button"
          onClick={clearFormatting}
          className="rounded-lg p-1.5 text-text-medium transition-colors hover:bg-gray-100"
          title="Очистить форматирование"
        >
          <Eraser size={16} />
        </button>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div
          className="rounded-lg border border-border bg-white p-3 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-pink"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  insertLink();
                } else if (e.key === "Escape") {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={insertLink}
                className="flex-1 rounded-lg bg-brand-pink px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-pink/90"
              >
                Вставить
              </button>
              {editor.isActive("link") && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-medium transition-colors hover:bg-gray-100"
                >
                  Удалить
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-medium transition-colors hover:bg-gray-100"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="rounded-2xl border border-border bg-white p-3 min-h-[120px]">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none"
        />
        <style jsx global>{`
          .ProseMirror {
            outline: none;
            min-height: 100px;
          }
          .ProseMirror p {
            margin: 0.5rem 0;
          }
          .ProseMirror h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 1rem 0;
          }
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0.875rem 0;
          }
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.75rem 0;
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror .is-empty::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror ul,
          .ProseMirror ol {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .ProseMirror ul {
            list-style-type: disc;
          }
          .ProseMirror ol {
            list-style-type: decimal;
          }
          .ProseMirror li {
            margin: 0.25rem 0;
          }
          .ProseMirror li p {
            margin: 0;
          }
          .ProseMirror strong {
            font-weight: 600;
          }
          .ProseMirror em {
            font-style: italic;
          }
          .ProseMirror u {
            text-decoration: underline;
          }
          .ProseMirror s {
            text-decoration: line-through;
          }
          .ProseMirror a {
            color: #ec4899;
            text-decoration: underline;
            cursor: pointer;
          }
          .ProseMirror a:hover {
            color: #be185d;
          }
          .ProseMirror[data-placeholder]:empty::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }
        `}</style>
      </div>
    </div>
  );
}
