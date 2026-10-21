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
}

export default function Editor({ content, onChange, readOnly = false }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit already bundles Heading, BulletList, OrderedList, Bold, Italic, etc.
        heading: { levels: [1, 2, 3] },
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

  // Sync external content changes (e.g. after load from DB)
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd+S: manual save shortcut — bubble to parent via synthetic form submit
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("editor:save"));
      }
    },
    []
  );

  return (
    <div className="flex flex-col h-full">
      {!readOnly && editor && <Toolbar editor={editor} />}
      <div
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-auto"
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose-base max-w-none min-h-[500px] p-6 focus-within:outline-none"
        />
      </div>
    </div>
  );
}
