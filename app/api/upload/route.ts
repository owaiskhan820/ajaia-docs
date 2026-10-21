import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { validateUploadedFile, textToHtml, csvToHtml } from "@/lib/upload-validator";

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

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const title = file.name.replace(/\.(txt|md|html|htm|csv|docx|pdf)$/i, "") || "Uploaded document";

  let html = "";

  try {
    if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value || "<p></p>";
    } else if (ext === ".pdf") {
      // pdf-parse ships CJS; .default may or may not exist depending on bundler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMod = await import("pdf-parse") as any;
      const pdfParse = pdfMod.default ?? pdfMod;
      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buffer);
      html = textToHtml(data.text);
    } else if (ext === ".html" || ext === ".htm") {
      const raw = await file.text();
      // Strip <html>/<head>/<body> wrappers, keep inner content
      const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      html = bodyMatch ? bodyMatch[1].trim() : raw;
    } else if (ext === ".csv") {
      const raw = await file.text();
      html = csvToHtml(raw);
    } else {
      // .txt and .md
      const rawText = await file.text();
      html = textToHtml(rawText);
    }
  } catch (err) {
    console.error("File conversion error:", err);
    return NextResponse.json({ error: "Failed to convert file. It may be corrupt or encrypted." }, { status: 422 });
  }

  const rows = await sql`
    INSERT INTO documents (title, content, owner_id)
    VALUES (${title}, ${html}, ${Number(ownerId)})
    RETURNING id, title, owner_id, created_at
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
