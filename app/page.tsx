"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface User { id: number; name: string; }
interface Document {
  id: number; title: string; owner_id: number; owner_name: string;
  updated_at: string; access_type: "owned" | "shared";
}

const USERS: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Carol" },
];

const USER_COLORS = ["#1a73e8", "#ea4335", "#34a853"];

function DocsWordmark() {
  return (
    <div className="flex items-center gap-2">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
        <path d="M0 3C0 1.34 1.34 0 3 0H19.5L30 10.5V35C30 36.66 28.66 38 27 38H3C1.34 38 0 36.66 0 35V3Z" fill="#4285F4"/>
        <path d="M19.5 0L30 10.5H19.5V0Z" fill="#A8C7FA"/>
        <rect x="6" y="16" width="18" height="2" rx="1" fill="white"/>
        <rect x="6" y="21" width="18" height="2" rx="1" fill="white"/>
        <rect x="6" y="26" width="12" height="2" rx="1" fill="white"/>
      </svg>
      <span className="text-xl font-normal text-[#5f6368]">Docs</span>
    </div>
  );
}

function DocThumbnail({ title }: { title: string }) {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-[#dadce0] rounded overflow-hidden flex flex-col p-3 gap-1.5">
      <div className="h-2 bg-[#e8eaed] rounded w-3/4" />
      <div className="h-1.5 bg-[#f1f3f4] rounded w-full" />
      <div className="h-1.5 bg-[#f1f3f4] rounded w-5/6" />
      <div className="h-1.5 bg-[#f1f3f4] rounded w-full" />
      <div className="h-1.5 bg-[#f1f3f4] rounded w-2/3" />
      <div className="mt-1 h-1.5 bg-[#f1f3f4] rounded w-full" />
      <div className="h-1.5 bg-[#f1f3f4] rounded w-4/5" />
      <div className="h-1.5 bg-[#f1f3f4] rounded w-full" />
      {title && title !== "Untitled" && (
        <div className="mt-auto pt-1">
          <div className="h-1.5 bg-[#c2d7f8] rounded w-1/2" />
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa]" />}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<number>(() => {
    const id = searchParams.get("userId");
    return id ? Number(id) : 1;
  });
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"owned" | "shared">("owned");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!seeded) {
      fetch("/api/seed", { method: "POST" })
        .then(() => setSeeded(true))
        .catch(() => setSeeded(true));
    }
  }, [seeded]);

  useEffect(() => {
    if (!seeded) return;
    setLoading(true);
    fetch(`/api/documents?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDocs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, seeded]);

  async function createDocument() {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled document", content: "", ownerId: userId }),
    });
    if (!res.ok) return;
    const doc = await res.json();
    router.push(`/documents/${doc.id}?userId=${userId}`);
  }

  async function deleteDocument(docId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents/${docId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("ownerId", String(userId));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);
    e.target.value = "";
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Upload failed");
      return;
    }
    const doc = await res.json();
    router.push(`/documents/${doc.id}?userId=${userId}`);
  }

  const owned = docs.filter((d) => d.access_type === "owned");
  const shared = docs.filter((d) => d.access_type === "shared");
  const currentUser = USERS.find((u) => u.id === userId)!;
  const userColor = USER_COLORS[(userId - 1) % USER_COLORS.length];
  const visibleDocs = tab === "owned" ? owned : shared;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">

      {/* ── Top nav ── */}
      <header className="bg-white border-b border-[#dadce0] px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <DocsWordmark />

        {/* Search bar (decorative) */}
        <div className="flex-1 max-w-xl mx-8 hidden md:flex items-center gap-3 bg-[#f1f3f4] rounded-full px-4 py-2.5 text-[#5f6368] text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search</span>
        </div>

        {/* User switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#5f6368] hidden sm:block">Acting as:</span>
          <div className="relative">
            <select
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              className="appearance-none pl-10 pr-6 py-1.5 rounded-full border border-[#dadce0] text-sm text-[#3c4043] bg-white focus:outline-none focus:border-[#1a73e8] cursor-pointer"
            >
              {USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center pointer-events-none"
              style={{ backgroundColor: userColor }}
            >
              {currentUser.name[0]}
            </div>
          </div>
        </div>
      </header>

      {/* ── New document strip ── */}
      <div className="bg-[#f8f9fa] border-b border-[#dadce0] px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-[#5f6368] mb-4 font-medium">Start a new document</p>
          <div className="flex items-start gap-4">
            {/* Blank doc card */}
            <button
              onClick={createDocument}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-[120px] h-[156px] bg-white border-2 border-[#dadce0] group-hover:border-[#1a73e8] rounded transition-colors flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span className="text-xs text-[#3c4043]">Blank document</span>
            </button>

            {/* Upload card */}
            <label className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-[120px] h-[156px] bg-white border-2 border-dashed border-[#dadce0] group-hover:border-[#1a73e8] rounded transition-colors flex flex-col items-center justify-center gap-2">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[10px] text-[#5f6368] text-center px-2">Upload file</span>
                  </>
                )}
              </div>
              <span className="text-xs text-[#3c4043]">From your device</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.html,.htm,.csv,.docx,.pdf,text/plain,text/markdown,text/html,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Document list ── */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {(["owned", "shared"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  tab === t
                    ? "bg-[#d2e3fc] text-[#1a73e8]"
                    : "text-[#5f6368] hover:bg-[#e8eaed]"
                }`}
              >
                {t === "owned" ? `My documents (${owned.length})` : `Shared with me (${shared.length})`}
              </button>
            ))}
          </div>
          {/* Grid icon decorative */}
          <div className="text-[#5f6368]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-[#5f6368] gap-3">
            <div className="w-5 h-5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        )}

        {!loading && visibleDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#5f6368]">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dadce0" strokeWidth="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p className="mt-4 text-sm">
              {tab === "owned" ? "No documents yet. Create one above." : "No documents have been shared with you."}
            </p>
          </div>
        )}

        {!loading && visibleDocs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visibleDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/documents/${doc.id}?userId=${userId}`)}
                className="group cursor-pointer"
              >
                <div className="rounded-t-lg overflow-hidden border border-b-0 border-[#dadce0] group-hover:border-[#1a73e8] transition-colors">
                  <DocThumbnail title={doc.title} />
                </div>
                <div className="flex items-start justify-between p-3 bg-white border border-t-0 border-[#dadce0] group-hover:border-[#1a73e8] rounded-b-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#202124] truncate">{doc.title || "Untitled"}</p>
                    <p className="text-xs text-[#80868b] mt-0.5 truncate">
                      {tab === "shared" ? `${doc.owner_name} · ` : ""}
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  {doc.access_type === "owned" && (
                    <button
                      onClick={(e) => deleteDocument(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-50 text-[#80868b] hover:text-red-500 transition-all ml-1 flex-shrink-0"
                      title="Delete document"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
