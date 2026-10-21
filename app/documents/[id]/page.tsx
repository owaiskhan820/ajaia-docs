"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load the Editor to keep the page bundle lean and avoid SSR issues with Tiptap
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface DocumentData {
  id: number;
  title: string;
  content: string;
  owner_id: number;
  owner_name: string;
  updated_at: string;
}

interface ShareEntry {
  id: number;
  shared_with_user_id: number;
  shared_with_name: string;
}

const ALL_USERS = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Carol" },
];

// Inner component that uses the hooks — must be inside <Suspense> in Next.js 16
function DocumentPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = Number(searchParams.get("userId") ?? 1);

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [showShare, setShowShare] = useState(false);

  const isOwner = doc?.owner_id === userId;

  // Load document
  useEffect(() => {
    fetch(`/api/documents/${id}?userId=${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Access denied or document not found");
        return r.json();
      })
      .then((data: DocumentData) => {
        setDoc(data);
        setTitle(data.title);
        setContent(data.content);
      })
      .catch((e) => setError(e.message));
  }, [id, userId]);

  // Load shares (only if owner)
  useEffect(() => {
    if (!doc || !isOwner) return;
    fetch(`/api/shares?documentId=${id}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setShares(data))
      .catch(() => {});
  }, [id, doc, isOwner]);

  // Save handler
  const save = useCallback(async (latestContent?: string) => {
    setSaving(true);
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: latestContent ?? content,
        userId,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setDoc(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const err = await res.json();
      alert(err.error ?? "Save failed");
    }
  }, [id, title, content, userId]);

  // Ctrl+S listener
  useEffect(() => {
    const handler = () => save();
    document.addEventListener("editor:save", handler);
    return () => document.removeEventListener("editor:save", handler);
  }, [save]);

  async function renameTitle() {
    const newTitle = prompt("Rename document:", title);
    if (!newTitle || newTitle === title) return;
    setTitle(newTitle);
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, userId }),
    });
  }

  async function shareWith(shareUserId: number) {
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id, ownerId: userId, shareWithUserId: shareUserId }),
    });
    if (res.ok) {
      const user = ALL_USERS.find((u) => u.id === shareUserId);
      if (user) {
        setShares((prev) => [...prev, { id: Date.now(), shared_with_user_id: shareUserId, shared_with_name: user.name }]);
      }
    } else {
      const err = await res.json();
      alert(err.error ?? "Share failed");
    }
  }

  async function revokeShare(shareUserId: number) {
    await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id, ownerId: userId, shareWithUserId: shareUserId }),
    });
    setShares((prev) => prev.filter((s) => s.shared_with_user_id !== shareUserId));
  }

  const alreadySharedIds = new Set(shares.map((s) => s.shared_with_user_id));
  const shareablePeople = ALL_USERS.filter(
    (u) => u.id !== userId && !alreadySharedIds.has(u.id)
  );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button onClick={() => router.back()} className="mt-4 text-indigo-600 underline text-sm">
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading document…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 bg-white z-20">
        <button
          onClick={() => router.push(`/?userId=${userId}`)}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >
          ← Back
        </button>

        {/* Title — click to rename */}
        <div className="flex-1 min-w-0">
          <button
            onClick={renameTitle}
            className="text-lg font-semibold text-gray-900 hover:text-indigo-600 truncate max-w-xs sm:max-w-lg text-left"
            title="Click to rename"
          >
            {title || "Untitled"}
          </button>
          <p className="text-xs text-gray-400 hidden sm:block">
            {isOwner ? "Owner" : `Shared by ${doc.owner_name}`} ·{" "}
            {new Date(doc.updated_at).toLocaleString()}
          </p>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
          {saved && <span className="text-xs text-green-500">✓ Saved</span>}

          <button
            onClick={() => save()}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>

          {isOwner && (
            <button
              onClick={() => setShowShare(!showShare)}
              className="border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded text-sm font-medium"
            >
              Share
            </button>
          )}

          {/* Acting-as switcher inline */}
          <span className="text-xs text-gray-400 hidden md:block">
            Editing as{" "}
            <select
              value={userId}
              onChange={(e) => {
                const newId = Number(e.target.value);
                router.push(`/documents/${id}?userId=${newId}`);
              }}
              className="border-0 bg-transparent text-indigo-600 font-medium text-xs focus:outline-none cursor-pointer"
            >
              {ALL_USERS.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </span>
        </div>
      </header>

      {/* Share panel */}
      {showShare && isOwner && (
        <div className="border-b border-gray-200 bg-amber-50 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Share with…</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {shareablePeople.map((u) => (
              <button
                key={u.id}
                onClick={() => shareWith(u.id)}
                className="bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 px-3 py-1 rounded text-sm"
              >
                + {u.name}
              </button>
            ))}
            {shareablePeople.length === 0 && (
              <p className="text-sm text-gray-500">Shared with all available users.</p>
            )}
          </div>
          {shares.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Currently shared with:</p>
              <div className="flex flex-wrap gap-2">
                {shares.map((s) => (
                  <span
                    key={s.shared_with_user_id}
                    className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs"
                  >
                    {s.shared_with_name}
                    <button
                      onClick={() => revokeShare(s.shared_with_user_id)}
                      className="hover:text-red-500"
                      title="Revoke access"
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 max-w-4xl w-full mx-auto">
        <Editor
          content={content}
          onChange={setContent}
        />
      </div>
    </div>
  );
}

// Outer wrapper: <Suspense> is required by Next.js 16 whenever a client component
// uses useParams() or useSearchParams() — these hooks access runtime URL data.
export default function DocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          Loading…
        </div>
      }
    >
      <DocumentPageInner />
    </Suspense>
  );
}
