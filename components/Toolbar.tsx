"use client";

import { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor;
  lineSpacing: number;
  onLineSpacingChange: (v: number) => void;
}

const LINE_SPACINGS = [1, 1.15, 1.5, 2];

// ── SVG icon helpers ──────────────────────────────────────────────────────────
function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const Icons = {
  Bold: () => <Icon><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></Icon>,
  Italic: () => <Icon><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></Icon>,
  Underline: () => <Icon><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></Icon>,
  Strikethrough: () => <Icon><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></Icon>,
  AlignLeft: () => <Icon><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></Icon>,
  AlignCenter: () => <Icon><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></Icon>,
  AlignRight: () => <Icon><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></Icon>,
  AlignJustify: () => <Icon><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></Icon>,
  BulletList: () => <Icon><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></Icon>,
  OrderedList: () => <Icon><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4" fill="none"/><path d="M4 10h2" fill="none"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></Icon>,
  Blockquote: () => <Icon><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></Icon>,
  Code: () => <Icon><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></Icon>,
  LineSpacing: () => <Icon><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/><path d="M8 3l-4 3 4 3"/><path d="M8 21l-4-3 4-3"/></Icon>,
  ChevronDown: () => <Icon size={14}><polyline points="6 9 12 15 18 9"/></Icon>,
};

// ── Reusable button ───────────────────────────────────────────────────────────
function TBtn({
  onClick, active, title, children, className = "",
}: {
  onClick: () => void; active?: boolean; title: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`
        flex items-center justify-center w-8 h-8 rounded
        text-[#3c4043] transition-colors
        hover:bg-[#e8eaed]
        ${active ? "bg-[#d2e3fc] text-[#1a73e8]" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[#dadce0] mx-0.5 self-center flex-shrink-0" />;
}

// ── Heading dropdown ──────────────────────────────────────────────────────────
function HeadingDropdown({ editor }: { editor: Editor }) {
  const current =
    editor.isActive("heading", { level: 1 }) ? "Heading 1" :
    editor.isActive("heading", { level: 2 }) ? "Heading 2" :
    editor.isActive("heading", { level: 3 }) ? "Heading 3" :
    "Normal text";

  return (
    <div className="relative group">
      <button
        onMouseDown={(e) => e.preventDefault()}
        className="flex items-center gap-1 h-8 px-2 rounded text-sm text-[#3c4043] hover:bg-[#e8eaed] transition-colors min-w-[108px] justify-between"
      >
        <span>{current}</span>
        <Icons.ChevronDown />
      </button>
      <div className="absolute top-full left-0 mt-0.5 bg-white border border-[#dadce0] rounded shadow-lg z-50 hidden group-focus-within:block group-hover:block min-w-[140px]">
        {([
          { label: "Normal text", action: () => editor.chain().focus().setParagraph().run(), style: "text-sm" },
          { label: "Heading 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), style: "text-xl font-bold" },
          { label: "Heading 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), style: "text-lg font-bold" },
          { label: "Heading 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), style: "text-base font-semibold" },
        ] as const).map((item) => (
          <button
            key={item.label}
            onMouseDown={(e) => { e.preventDefault(); item.action(); }}
            className={`w-full text-left px-3 py-2 hover:bg-[#f1f3f4] text-[#3c4043] ${item.style}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Line spacing dropdown ─────────────────────────────────────────────────────
function LineSpacingDropdown({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative group">
      <button
        onMouseDown={(e) => e.preventDefault()}
        title="Line spacing"
        className="flex items-center justify-center w-8 h-8 rounded text-[#3c4043] hover:bg-[#e8eaed] transition-colors"
      >
        <Icons.LineSpacing />
      </button>
      <div className="absolute top-full left-0 mt-0.5 bg-white border border-[#dadce0] rounded shadow-lg z-50 hidden group-focus-within:block group-hover:block min-w-[100px]">
        {LINE_SPACINGS.map((sp) => (
          <button
            key={sp}
            onMouseDown={(e) => { e.preventDefault(); onChange(sp); }}
            className={`
              w-full text-left px-3 py-2 text-sm hover:bg-[#f1f3f4] text-[#3c4043]
              ${value === sp ? "font-semibold text-[#1a73e8]" : ""}
            `}
          >
            {sp}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────────
export default function Toolbar({ editor, lineSpacing, onLineSpacingChange }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-[#dadce0] bg-[#f8f9fa] sticky top-[57px] z-10 overflow-x-auto">

      <HeadingDropdown editor={editor} />

      <Divider />

      <TBtn onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")} title="Bold (Ctrl+B)">
        <Icons.Bold />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")} title="Italic (Ctrl+I)">
        <Icons.Italic />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")} title="Underline (Ctrl+U)">
        <Icons.Underline />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")} title="Strikethrough">
        <Icons.Strikethrough />
      </TBtn>

      <Divider />

      <TBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })} title="Align left">
        <Icons.AlignLeft />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })} title="Center">
        <Icons.AlignCenter />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })} title="Align right">
        <Icons.AlignRight />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })} title="Justify">
        <Icons.AlignJustify />
      </TBtn>

      <Divider />

      <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")} title="Bullet list">
        <Icons.BulletList />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")} title="Numbered list">
        <Icons.OrderedList />
      </TBtn>

      <Divider />

      <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")} title="Blockquote">
        <Icons.Blockquote />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")} title="Inline code">
        <Icons.Code />
      </TBtn>

      <Divider />

      <LineSpacingDropdown value={lineSpacing} onChange={onLineSpacingChange} />

      <div className="flex-1" />
      <span className="text-xs text-[#80868b] hidden sm:block pr-1">Ctrl+S to save</span>
    </div>
  );
}
