"use client";

import { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor;
}

const btn =
  "px-2 py-1 rounded text-sm font-medium transition-colors hover:bg-gray-200 disabled:opacity-40";
const active = "bg-indigo-100 text-indigo-700";

export default function Toolbar({ editor }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} font-bold ${editor.isActive("bold") ? active : ""}`}
        title="Bold (Ctrl+B)"
      >B</button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} italic ${editor.isActive("italic") ? active : ""}`}
        title="Italic (Ctrl+I)"
      >I</button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${btn} underline ${editor.isActive("underline") ? active : ""}`}
        title="Underline (Ctrl+U)"
      >U</button>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Headings */}
      {([1, 2, 3] as const).map((level) => (
        <button
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          className={`${btn} ${editor.isActive("heading", { level }) ? active : ""}`}
          title={`Heading ${level}`}
        >
          H{level}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
        title="Bullet list"
      >• List</button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
        title="Ordered list"
      >1. List</button>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={`${btn} ${editor.isActive({ textAlign: "left" }) ? active : ""}`}
        title="Align left"
      >⬅</button>
      <button
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={`${btn} ${editor.isActive({ textAlign: "center" }) ? active : ""}`}
        title="Align center"
      >⬆</button>
      <button
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={`${btn} ${editor.isActive({ textAlign: "right" }) ? active : ""}`}
        title="Align right"
      >➡</button>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Block elements */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${btn} ${editor.isActive("blockquote") ? active : ""}`}
        title="Blockquote"
      >" "</button>

      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`${btn} font-mono ${editor.isActive("code") ? active : ""}`}
        title="Inline code"
      >{"`code`"}</button>

      <div className="flex-1" />

      <span className="text-xs text-gray-400 hidden sm:block">Ctrl+S to save</span>
    </div>
  );
}
