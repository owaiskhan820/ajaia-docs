import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { validateUploadedFile, textToHtml } from "@/lib/upload-validator";

// POST /api/upload
// Accepts multipart/form-data: file (File), ownerId (string).
// Supported types: .txt and .md only (max 1 MB).
// Converts the file content into a new editable Tiptap document.
export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const ownerId = formData.get("ownerId") as string | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!ownerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });

  const validation = validateUploadedFile(file.name, file.type, file.size);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 415 });
  }

  const rawText = await file.text();
  const html = textToHtml(rawText);
  const title = file.name.replace(/\.(txt|md)$/i, "") || "Uploaded document";

  const rows = await sql`
    INSERT INTO documents (title, content, owner_id)
    VALUES (${title}, ${html}, ${Number(ownerId)})
    RETURNING id, title, owner_id, created_at
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
