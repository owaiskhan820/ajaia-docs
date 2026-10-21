import { describe, it, expect } from "vitest";
import {
  validateUploadedFile,
  textToHtml,
  MAX_FILE_SIZE,
} from "../lib/upload-validator";

describe("validateUploadedFile", () => {
  it("accepts a .txt file with text/plain MIME type", () => {
    const result = validateUploadedFile("notes.txt", "text/plain", 1024);
    expect(result.valid).toBe(true);
  });

  it("accepts a .md file with text/markdown MIME type", () => {
    const result = validateUploadedFile("readme.md", "text/markdown", 2048);
    expect(result.valid).toBe(true);
  });

  it("accepts a .txt file when the MIME type is empty (extension fallback)", () => {
    const result = validateUploadedFile("export.txt", "", 512);
    expect(result.valid).toBe(true);
  });

  it("rejects a .docx file", () => {
    const result = validateUploadedFile(
      "report.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      5000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/\.txt and \.md/);
  });

  it("rejects a .png file", () => {
    const result = validateUploadedFile("screenshot.png", "image/png", 200_000);
    expect(result.valid).toBe(false);
  });

  it("rejects a file larger than 1 MB", () => {
    const result = validateUploadedFile("huge.txt", "text/plain", MAX_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/1 MB/);
  });

  it("accepts a file exactly at the 1 MB limit", () => {
    const result = validateUploadedFile("exactly.txt", "text/plain", MAX_FILE_SIZE);
    expect(result.valid).toBe(true);
  });
});

describe("textToHtml", () => {
  it("wraps each double-newline-separated paragraph in <p> tags", () => {
    const html = textToHtml("Hello world\n\nSecond paragraph");
    expect(html).toContain("<p>Hello world</p>");
    expect(html).toContain("<p>Second paragraph</p>");
  });

  it("converts single newlines within a paragraph to <br>", () => {
    const html = textToHtml("Line one\nLine two");
    expect(html).toContain("Line one<br>Line two");
  });

  it("produces an empty <p> for blank lines", () => {
    const html = textToHtml("Para one\n\n\n\nPara two");
    expect(html).toContain("<p></p>");
  });
});
