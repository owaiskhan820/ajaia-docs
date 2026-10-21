import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/documents?userId=1
// Returns all documents the user owns OR has been shared with.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId || isNaN(Number(userId))) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT
      d.id,
      d.title,
      d.owner_id,
      u.name  AS owner_name,
      d.created_at,
      d.updated_at,
      CASE WHEN d.owner_id = ${Number(userId)} THEN 'owned' ELSE 'shared' END AS access_type
    FROM documents d
    JOIN users u ON u.id = d.owner_id
    WHERE
      d.owner_id = ${Number(userId)}
      OR d.id IN (
        SELECT document_id FROM shares WHERE shared_with_user_id = ${Number(userId)}
      )
    ORDER BY d.updated_at DESC
  `;

  return NextResponse.json(rows);
}

// POST /api/documents
// Body: { title, content, ownerId }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { title = "Untitled", content = "", ownerId } = body;
  if (!ownerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });

  const rows = await sql`
    INSERT INTO documents (title, content, owner_id)
    VALUES (${title}, ${content}, ${Number(ownerId)})
    RETURNING id, title, content, owner_id, created_at, updated_at
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
