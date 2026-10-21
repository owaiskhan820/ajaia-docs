import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/:id?userId=1
// Returns document + userPermission: 'owner' | 'editor' | 'commenter' | 'viewer'
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = _req.nextUrl.searchParams.get("userId");

  const rows = await sql`
    SELECT d.id, d.title, d.content, d.owner_id, u.name AS owner_name, d.created_at, d.updated_at
    FROM documents d
    JOIN users u ON u.id = d.owner_id
    WHERE d.id = ${Number(id)}
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = rows[0];
  let userPermission: "owner" | "editor" | "commenter" | "viewer" = "owner";

  if (userId) {
    const uid = Number(userId);
    if (doc.owner_id !== uid) {
      const shareRows = await sql`
        SELECT permission FROM shares
        WHERE document_id = ${Number(id)} AND shared_with_user_id = ${uid}
      `;
      if (!shareRows.length) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userPermission = shareRows[0].permission as "editor" | "commenter" | "viewer";
    }
  }

  return NextResponse.json({ ...doc, userPermission });
}

// PATCH /api/documents/:id
// Body: { title?, content?, userId }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { title, content, userId } = body;

  const doc = await sql`SELECT owner_id FROM documents WHERE id = ${Number(id)}`;
  if (!doc.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (userId) {
    const uid = Number(userId);
    if (doc[0].owner_id !== uid) {
      const shareRows = await sql`
        SELECT permission FROM shares
        WHERE document_id = ${Number(id)} AND shared_with_user_id = ${uid}
      `;
      if (!shareRows.length) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Viewers and commenters cannot edit content
      if (shareRows[0].permission === "viewer" || shareRows[0].permission === "commenter") {
        return NextResponse.json({ error: "You have view-only access to this document" }, { status: 403 });
      }
    }
  }

  const updated = await sql`
    UPDATE documents
    SET
      title      = COALESCE(${title ?? null}, title),
      content    = COALESCE(${content ?? null}, content),
      updated_at = NOW()
    WHERE id = ${Number(id)}
    RETURNING id, title, content, owner_id, created_at, updated_at
  `;

  return NextResponse.json(updated[0]);
}

// DELETE /api/documents/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { userId } = body;

  const doc = await sql`SELECT owner_id FROM documents WHERE id = ${Number(id)}`;
  if (!doc.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (Number(userId) !== doc[0].owner_id) {
    return NextResponse.json({ error: "Only the owner may delete" }, { status: 403 });
  }

  await sql`DELETE FROM documents WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
