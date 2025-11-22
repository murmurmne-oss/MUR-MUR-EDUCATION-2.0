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
import { Extension } from "@tiptap/core";
import { useCallback, useEffect } from "react";

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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      TextStyle,
      FontSize,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      BulletList,
      OrderedList,
      ListItem,
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

  const toggleBold = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setTextAlign = useCallback(
    (align: "left" | "center" | "right") => {
      if (!editor) return;
      editor.chain().focus().setTextAlign(align).run();
    },
    [editor],
  );

  if (!editor) {
    return null;
  }

  const currentFontFamily =
    editor.getAttributes("textStyle").fontFamily || "sans";
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "1rem";
  const currentAlign = editor.getAttributes("textAlign").textAlign || "left";

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-2">
        {/* Font Family */}
        <select
          value={currentFontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-dark outline-none focus:border-brand-pink"
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
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Bold */}
        <button
          type="button"
          onClick={toggleBold}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            editor.isActive("bold")
              ? "bg-brand-pink text-white"
              : "bg-surface text-text-medium hover:bg-gray-100"
          }`}
          title="Жирный (Ctrl+B)"
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={toggleItalic}
          className={`rounded-lg px-2 py-1 text-xs italic transition-colors ${
            editor.isActive("italic")
              ? "bg-brand-pink text-white"
              : "bg-surface text-text-medium hover:bg-gray-100"
          }`}
          title="Курсив (Ctrl+I)"
        >
          I
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={toggleBulletList}
          className={`rounded-lg px-2 py-1 text-xs transition-colors ${
            editor.isActive("bulletList")
              ? "bg-brand-pink text-white"
              : "bg-surface text-text-medium hover:bg-gray-100"
          }`}
          title="Маркированный список"
        >
          •
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={toggleOrderedList}
          className={`rounded-lg px-2 py-1 text-xs transition-colors ${
            editor.isActive("orderedList")
              ? "bg-brand-pink text-white"
              : "bg-surface text-text-medium hover:bg-gray-100"
          }`}
          title="Нумерованный список"
        >
          1.
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Text Align */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTextAlign("left")}
            className={`rounded-lg px-2 py-1 text-xs transition-colors ${
              currentAlign === "left"
                ? "bg-brand-pink text-white"
                : "bg-surface text-text-medium hover:bg-gray-100"
            }`}
            title="Выровнять по левому краю"
          >
            ⬅
          </button>
          <button
            type="button"
            onClick={() => setTextAlign("center")}
            className={`rounded-lg px-2 py-1 text-xs transition-colors ${
              currentAlign === "center"
                ? "bg-brand-pink text-white"
                : "bg-surface text-text-medium hover:bg-gray-100"
            }`}
            title="Выровнять по центру"
          >
            ⬌
          </button>
          <button
            type="button"
            onClick={() => setTextAlign("right")}
            className={`rounded-lg px-2 py-1 text-xs transition-colors ${
              currentAlign === "right"
                ? "bg-brand-pink text-white"
                : "bg-surface text-text-medium hover:bg-gray-100"
            }`}
            title="Выровнять по правому краю"
          >
            ➡
          </button>
        </div>
      </div>

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

