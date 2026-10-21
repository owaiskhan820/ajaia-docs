import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/shares?documentId=1
// Returns who the document is currently shared with.
export async function GET(req: NextRequest) {
  const documentId = req.nextUrl.searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const rows = await sql`
    SELECT s.id, s.shared_with_user_id, u.name AS shared_with_name
    FROM shares s
    JOIN users u ON u.id = s.shared_with_user_id
    WHERE s.document_id = ${Number(documentId)}
    ORDER BY u.name
  `;

  return NextResponse.json(rows);
}

// POST /api/shares
// Body: { documentId, ownerId, shareWithUserId }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { documentId, ownerId, shareWithUserId } = body;
  if (!documentId || !ownerId || !shareWithUserId) {
    return NextResponse.json(
      { error: "documentId, ownerId, and shareWithUserId are required" },
      { status: 400 }
    );
  }

  // Only the document owner may share
  const doc = await sql`SELECT owner_id FROM documents WHERE id = ${Number(documentId)}`;
  if (!doc.length) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc[0].owner_id !== Number(ownerId)) {
    return NextResponse.json({ error: "Only the owner may share this document" }, { status: 403 });
  }

  // Cannot share with yourself
  if (Number(ownerId) === Number(shareWithUserId)) {
    return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO shares (document_id, shared_with_user_id)
    VALUES (${Number(documentId)}, ${Number(shareWithUserId)})
    ON CONFLICT (document_id, shared_with_user_id) DO NOTHING
    RETURNING id, document_id, shared_with_user_id
  `;

  return NextResponse.json(rows[0] ?? { message: "Already shared" }, { status: 201 });
}

// DELETE /api/shares
// Body: { documentId, ownerId, shareWithUserId }
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { documentId, ownerId, shareWithUserId } = body;

  // Verify ownership
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
