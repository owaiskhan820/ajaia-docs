"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useCallback } from "react";
import Toolbar from "./Toolbar";

interface EditorProps {
  content: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  lineSpacing?: number;
  onLineSpacingChange?: (v: number) => void;
}

export default function Editor({
  content,
  onChange,
  readOnly = false,
  lineSpacing = 1.5,
  onLineSpacingChange,
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        underline: false,
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("editor:save"));
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {!readOnly && editor && onLineSpacingChange && (
        <Toolbar
          editor={editor}
          lineSpacing={lineSpacing}
          onLineSpacingChange={onLineSpacingChange}
        />
      )}
      <div onKeyDown={handleKeyDown} className="flex-1 overflow-auto bg-[#f8f9fa]">
        <div className="mx-auto my-8 bg-white shadow-sm"
          style={{ maxWidth: 816, minHeight: 1056, padding: "96px 96px 80px" }}>
          <EditorContent
            editor={editor}
            style={{ lineHeight: lineSpacing }}
            className="prose prose-sm sm:prose-base max-w-none focus-within:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
