/**
 * Pure validation helpers for file uploads.
 * Kept separate so they can be tested without a DB connection.
 */

export const ALLOWED_EXTENSIONS = [".txt", ".md"] as const;
export const ALLOWED_MIME_TYPES = ["text/plain", "text/markdown"] as const;
export const MAX_FILE_SIZE = 1_048_576; // 1 MB

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

  if (
    !ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number]) &&
    !ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])
  ) {
    return { valid: false, error: "Only .txt and .md files are supported" };
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: "File must be under 1 MB" };
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
