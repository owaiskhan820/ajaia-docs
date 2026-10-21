import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export type SharePermission = "viewer" | "commenter" | "editor";

// GET /api/shares?documentId=1
export async function GET(req: NextRequest) {
  const documentId = req.nextUrl.searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const rows = await sql`
    SELECT s.id, s.shared_with_user_id, u.name AS shared_with_name, s.permission
    FROM shares s
    JOIN users u ON u.id = s.shared_with_user_id
    WHERE s.document_id = ${Number(documentId)}
    ORDER BY u.name
  `;

  return NextResponse.json(rows);
}

// POST /api/shares
// Body: { documentId, ownerId, shareWithUserId, permission? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { documentId, ownerId, shareWithUserId, permission = "editor" } = body;
  if (!documentId || !ownerId || !shareWithUserId) {
    return NextResponse.json(
      { error: "documentId, ownerId, and shareWithUserId are required" },
      { status: 400 }
    );
  }

  const validPermissions: SharePermission[] = ["viewer", "commenter", "editor"];
  if (!validPermissions.includes(permission)) {
    return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
  }

  const doc = await sql`SELECT owner_id FROM documents WHERE id = ${Number(documentId)}`;
  if (!doc.length) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc[0].owner_id !== Number(ownerId)) {
    return NextResponse.json({ error: "Only the owner may share this document" }, { status: 403 });
  }

  if (Number(ownerId) === Number(shareWithUserId)) {
    return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO shares (document_id, shared_with_user_id, permission)
    VALUES (${Number(documentId)}, ${Number(shareWithUserId)}, ${permission})
    ON CONFLICT (document_id, shared_with_user_id)
    DO UPDATE SET permission = EXCLUDED.permission
    RETURNING id, document_id, shared_with_user_id, permission
  `;

  return NextResponse.json(rows[0], { status: 201 });
}

// PATCH /api/shares — update permission for an existing share
// Body: { documentId, ownerId, shareWithUserId, permission }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { documentId, ownerId, shareWithUserId, permission } = body;

  const doc = await sql`SELECT owner_id FROM documents WHERE id = ${Number(documentId)}`;
  if (!doc.length) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc[0].owner_id !== Number(ownerId)) {
    return NextResponse.json({ error: "Only the owner may update sharing" }, { status: 403 });
  }

  const rows = await sql`
    UPDATE shares SET permission = ${permission}
    WHERE document_id = ${Number(documentId)} AND shared_with_user_id = ${Number(shareWithUserId)}
    RETURNING id, shared_with_user_id, permission
  `;

  return NextResponse.json(rows[0] ?? { error: "Share not found" });
}

// DELETE /api/shares
// Body: { documentId, ownerId, shareWithUserId }
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { documentId, ownerId, shareWithUserId } = body;

  const doc = await sql`SELECT owner_id FROM documents WHERE id = ${Number(documentId)}`;
  if (!doc.length) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc[0].owner_id !== Number(ownerId)) {
    return NextResponse.json({ error: "Only the owner may revoke sharing" }, { status: 403 });
  }

  await sql`
    DELETE FROM shares
    WHERE document_id = ${Number(documentId)} AND shared_with_user_id = ${Number(shareWithUserId)}
  `;

  return NextResponse.json({ ok: true });
}
