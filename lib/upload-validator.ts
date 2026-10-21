/**
 * Pure validation helpers for file uploads.
 * Kept separate so they can be tested without a DB connection.
 */

export const ALLOWED_EXTENSIONS = [".txt", ".md", ".html", ".htm", ".csv", ".docx", ".pdf"] as const;

export const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  // browsers sometimes send these for docx/pdf
  "application/octet-stream",
  "application/zip",
] as const;

export const MAX_FILE_SIZE = 10_485_760; // 10 MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUploadedFile(
  filename: string,
  mimeType: string,
  sizeBytes: number
): ValidationResult {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();

  const extOk = ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number]);
  if (!extOk) {
    return {
      valid: false,
      error: "Unsupported file type. Allowed: .txt, .md, .html, .csv, .docx, .pdf",
    };
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: "File must be under 10 MB" };
  }

  return { valid: true };
}

/**
 * Convert raw plain-text content to simple Tiptap-compatible HTML.
 * Double newline → paragraph break; single newline → <br>.
 */
export function textToHtml(rawText: string): string {
  return rawText
    .split(/\r?\n\r?\n/)
    .map((para) =>
      para.trim() ? `<p>${para.replace(/\r?\n/g, "<br>")}</p>` : "<p></p>"
    )
    .join("\n");
}

/** Convert CSV rows to an HTML table */
export function csvToHtml(csvText: string): string {
  const rows = csvText.trim().split(/\r?\n/).map((row) =>
    row.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim())
  );
  if (!rows.length) return "<p></p>";
  const [header, ...body] = rows;
  const headerHtml = `<tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const bodyHtml = body.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n");
  return `<table>${headerHtml}${bodyHtml}</table>`;
}
