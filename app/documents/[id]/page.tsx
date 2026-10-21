"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

type Permission = "viewer" | "commenter" | "editor";

interface DocumentData {
  id: number;
  title: string;
  content: string;
  owner_id: number;
  owner_name: string;
  updated_at: string;
  userPermission: "owner" | "editor" | "commenter" | "viewer";
}

interface ShareEntry {
  id: number;
  shared_with_user_id: number;
  shared_with_name: string;
  permission: Permission;
}

const ALL_USERS = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Carol" },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  viewer: "Viewer",
  commenter: "Commenter",
  editor: "Editor",
};

const PERMISSION_COLORS: Record<Permission, string> = {
  viewer: "bg-gray-100 text-gray-600",
  commenter: "bg-amber-100 text-amber-700",
  editor: "bg-blue-100 text-blue-700",
};

function DocsIcon() {
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
      <path d="M0 4C0 1.79 1.79 0 4 0H22L32 10V36C32 38.21 30.21 40 28 40H4C1.79 40 0 38.21 0 36V4Z" fill="#4285F4"/>
      <path d="M22 0L32 10H22V0Z" fill="#A8C7FA"/>
      <rect x="7" y="17" width="18" height="2" rx="1" fill="white"/>
      <rect x="7" y="22" width="18" height="2" rx="1" fill="white"/>
      <rect x="7" y="27" width="12" height="2" rx="1" fill="white"/>
    </svg>
  );
}

function DocumentPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = Number(searchParams.get("userId") ?? 1);

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  // pendingShare: track which user we're about to share with + chosen permission
  const [pendingShare, setPendingShare] = useState<{ userId: number; permission: Permission } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isOwner = doc?.userPermission === "owner";
  const canEdit = doc?.userPermission === "owner" || doc?.userPermission === "editor";

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

  useEffect(() => {
    if (!doc || !isOwner) return;
    fetch(`/api/shares?documentId=${id}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setShares(data))
      .catch(() => {});
  }, [id, doc, isOwner]);

  const save = useCallback(async (latestContent?: string) => {
    if (!canEdit) return;
    setSaving(true);
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: latestContent ?? content, userId }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setDoc((prev) => prev ? { ...prev, updated_at: updated.updated_at } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const err = await res.json();
      alert(err.error ?? "Save failed");
    }
  }, [id, title, content, userId, canEdit]);

  useEffect(() => {
    const handler = () => save();
    document.addEventListener("editor:save", handler);
    return () => document.removeEventListener("editor:save", handler);
  }, [save]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  async function commitTitle() {
    setEditingTitle(false);
    if (!title.trim()) { setTitle(doc?.title ?? "Untitled"); return; }
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, userId }),
    });
  }

  async function confirmShare() {
    if (!pendingShare) return;
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: id,
        ownerId: userId,
        shareWithUserId: pendingShare.userId,
        permission: pendingShare.permission,
      }),
    });
    if (res.ok) {
      const user = ALL_USERS.find((u) => u.id === pendingShare.userId);
      if (user) {
        setShares((prev) => {
          const exists = prev.find((s) => s.shared_with_user_id === pendingShare.userId);
          if (exists) return prev.map((s) =>
            s.shared_with_user_id === pendingShare.userId
              ? { ...s, permission: pendingShare.permission }
              : s
          );
          return [...prev, {
            id: Date.now(),
            shared_with_user_id: pendingShare.userId,
            shared_with_name: user.name,
            permission: pendingShare.permission,
          }];
        });
      }
    } else {
      const err = await res.json();
      alert(err.error ?? "Share failed");
    }
    setPendingShare(null);
  }

  async function updatePermission(shareUserId: number, permission: Permission) {
    await fetch("/api/shares", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id, ownerId: userId, shareWithUserId: shareUserId, permission }),
    });
    setShares((prev) => prev.map((s) =>
      s.shared_with_user_id === shareUserId ? { ...s, permission } : s
    ));
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
  const shareablePeople = ALL_USERS.filter((u) => u.id !== userId && !alreadySharedIds.has(u.id));

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="text-center bg-white rounded-xl shadow p-10">
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button onClick={() => router.back()} className="text-[#1a73e8] text-sm hover:underline">← Go back</button>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-[#5f6368]">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
        Loading document…
      </div>
    </div>
  );

  const currentUserName = ALL_USERS.find((u) => u.id === userId)?.name ?? "User";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">

      {/* ── App bar ── */}
      <header className="flex items-center gap-3 px-4 h-[57px] bg-white border-b border-[#dadce0] sticky top-0 z-20">
        <button
          onClick={() => router.push(`/?userId=${userId}`)}
          className="p-2 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors"
          title="Back to Docs"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>

        <DocsIcon />

        {/* Editable title */}
        <div className="flex-1 min-w-0 ml-1">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(doc.title); setEditingTitle(false); } }}
              className="text-[#202124] text-base font-medium border-b-2 border-[#1a73e8] outline-none bg-transparent w-full max-w-md"
            />
          ) : (
            <button
              onClick={() => canEdit && setEditingTitle(true)}
              title={canEdit ? "Click to rename" : undefined}
              className={`text-[#202124] text-base font-medium truncate max-w-xs sm:max-w-md text-left block ${canEdit ? "hover:border-b hover:border-[#dadce0]" : ""}`}
            >
              {title || "Untitled"}
            </button>
          )}
          <div className="text-[11px] text-[#80868b] leading-tight">
            {isOwner ? "Owner" : `Shared by ${doc.owner_name} · ${PERMISSION_LABELS[doc.userPermission as Permission] ?? "Viewer"}`}
            {" · "}{new Date(doc.updated_at).toLocaleString()}
          </div>
        </div>

        {/* Save status + actions */}
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-[#80868b] animate-pulse">Saving…</span>}
          {saved && <span className="text-xs text-[#34a853] font-medium">✓ Saved</span>}
          {!canEdit && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {PERMISSION_LABELS[doc.userPermission as Permission]}
            </span>
          )}

          {canEdit && (
            <button
              onClick={() => save()}
              disabled={saving}
              className="text-sm font-medium text-[#1a73e8] hover:bg-[#e8f0fe] px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              Save
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setShowShare(!showShare)}
              className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share
            </button>
          )}

          {/* Acting-as */}
          <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-[#dadce0]">
            <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white text-sm font-medium flex items-center justify-center flex-shrink-0">
              {currentUserName[0]}
            </div>
            <select
              value={userId}
              onChange={(e) => router.push(`/documents/${id}?userId=${Number(e.target.value)}`)}
              className="text-xs text-[#5f6368] bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              {ALL_USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* ── Share modal overlay ── */}
      {showShare && isOwner && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={() => { setShowShare(false); setPendingShare(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#dadce0]">
              <h2 className="text-base font-medium text-[#202124]">Share "{title}"</h2>
              <button onClick={() => { setShowShare(false); setPendingShare(null); }} className="p-1 rounded-full hover:bg-[#f1f3f4] text-[#5f6368]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-6 py-4">
              {/* Add people */}
              {shareablePeople.length > 0 ? (
                <div className="mb-5">
                  <p className="text-sm text-[#5f6368] mb-3 font-medium">Add people</p>
                  <div className="space-y-2">
                    {shareablePeople.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#f8fbff] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#ea4335] text-white text-sm font-medium flex items-center justify-center">
                            {u.name[0]}
                          </div>
                          <span className="text-sm font-medium text-[#202124]">{u.name}</span>
                        </div>
                        {pendingShare?.userId === u.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={pendingShare.permission}
                              onChange={(e) => setPendingShare({ userId: u.id, permission: e.target.value as Permission })}
                              className="text-sm border border-[#dadce0] rounded-lg px-2 py-1 text-[#3c4043] focus:outline-none focus:border-[#1a73e8]"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="commenter">Commenter</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button onClick={confirmShare} className="bg-[#1a73e8] text-white text-sm px-3 py-1 rounded-lg hover:bg-[#1557b0] transition-colors">
                              Add
                            </button>
                            <button onClick={() => setPendingShare(null)} className="text-[#5f6368] text-sm px-2 py-1 hover:bg-[#f1f3f4] rounded-lg">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingShare({ userId: u.id, permission: "editor" })}
                            className="text-sm text-[#1a73e8] font-medium hover:bg-[#e8f0fe] px-3 py-1 rounded-lg transition-colors"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#5f6368] mb-4">Shared with all available users.</p>
              )}

              {/* Current shares */}
              {shares.length > 0 && (
                <div>
                  <p className="text-sm text-[#5f6368] mb-3 font-medium">People with access</p>
                  <div className="space-y-2">
                    {/* Owner row */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9fa]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1a73e8] text-white text-sm font-medium flex items-center justify-center">
                          {currentUserName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#202124]">{currentUserName} (you)</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#5f6368] bg-white border border-[#dadce0] px-2 py-1 rounded-full">Owner</span>
                    </div>

                    {shares.map((s) => (
                      <div key={s.shared_with_user_id} className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#34a853] text-white text-sm font-medium flex items-center justify-center">
                            {s.shared_with_name[0]}
                          </div>
                          <span className="text-sm font-medium text-[#202124]">{s.shared_with_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={s.permission}
                            onChange={(e) => updatePermission(s.shared_with_user_id, e.target.value as Permission)}
                            className="text-sm border border-[#dadce0] rounded-lg px-2 py-1 text-[#3c4043] focus:outline-none focus:border-[#1a73e8] bg-white"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="commenter">Commenter</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => revokeShare(s.shared_with_user_id)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-[#80868b] hover:text-red-500 transition-colors"
                            title="Remove access"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-[#f8f9fa] border-t border-[#dadce0] flex justify-end">
              <button
                onClick={() => { setShowShare(false); setPendingShare(null); }}
                className="text-sm font-medium text-[#1a73e8] hover:bg-[#e8f0fe] px-4 py-2 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor ── */}
      <div className="flex-1 flex flex-col">
        <Editor
          content={content}
          onChange={canEdit ? setContent : undefined}
          readOnly={!canEdit}
          lineSpacing={lineSpacing}
          onLineSpacingChange={canEdit ? setLineSpacing : undefined}
        />
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-[#5f6368]">
        Loading…
      </div>
    }>
      <DocumentPageInner />
    </Suspense>
  );
}
