"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface User {
  id: number;
  name: string;
}

interface Document {
  id: number;
  title: string;
  owner_id: number;
  owner_name: string;
  updated_at: string;
  access_type: "owned" | "shared";
}

const USERS: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Carol" },
];

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>}>
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
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Seed on first load
  useEffect(() => {
    if (!seeded) {
      fetch("/api/seed", { method: "POST" })
        .then(() => setSeeded(true))
        .catch(() => setSeeded(true)); // proceed even if already seeded
    }
  }, [seeded]);

  // Load documents for current user
  useEffect(() => {
    if (!seeded) return;
    setLoading(true);
    setError(null);
    fetch(`/api/documents?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
        else setError(data.error ?? "Failed to load documents");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [userId, seeded]);

  async function createDocument() {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", content: "", ownerId: userId }),
    });
    if (!res.ok) { alert("Failed to create document"); return; }
    const doc = await res.json();
    router.push(`/documents/${doc.id}?userId=${userId}`);
  }

  async function deleteDocument(docId: number) {
    if (!confirm("Delete this document permanently?")) return;
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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-700">📝 Ajaia Docs</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Acting as:</span>
          <select
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Action bar */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={createDocument}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Document
          </button>

          <label className="cursor-pointer bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            {uploading ? "Uploading…" : "⬆ Upload .txt / .md"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          <p className="text-xs text-gray-400 self-center">
            Upload limit: .txt and .md files only (max 1 MB)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading && <p className="text-gray-400 text-sm">Loading…</p>}

        {/* My Documents */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            My Documents ({owned.length})
          </h2>
          {owned.length === 0 && !loading && (
            <p className="text-gray-400 text-sm">No documents yet. Create one above.</p>
          )}
          <div className="grid gap-2">
            {owned.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                userId={userId}
                onDelete={() => deleteDocument(doc.id)}
                badge={{ label: "Owner", cls: "bg-indigo-100 text-indigo-700" }}
              />
            ))}
          </div>
        </section>

        {/* Shared With Me */}
        {shared.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Shared With Me ({shared.length})
            </h2>
            <div className="grid gap-2">
              {shared.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  userId={userId}
                  badge={{ label: `Shared by ${doc.owner_name}`, cls: "bg-amber-100 text-amber-700" }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DocCard({
  doc,
  userId,
  onDelete,
  badge,
}: {
  doc: Document;
  userId: number;
  onDelete?: () => void;
  badge: { label: string; cls: string };
}) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/documents/${doc.id}?userId=${userId}`)}
      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:shadow-sm hover:border-indigo-300 transition-all"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{doc.title || "Untitled"}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(doc.updated_at).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
          {badge.label}
        </span>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-400 hover:text-red-500 text-sm transition-colors"
            title="Delete document"
          >🗑</button>
        )}
      </div>
    </div>
  );
}
