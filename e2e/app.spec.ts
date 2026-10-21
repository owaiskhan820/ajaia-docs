import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function selectUser(page: Page, name: "Alice" | "Bob" | "Carol") {
  const ids = { Alice: "1", Bob: "2", Carol: "3" };
  await page.goto(`/?userId=${ids[name]}`);
  await page.waitForLoadState("networkidle");
}

async function createDoc(page: Page): Promise<string> {
  await page.click("button:has-text('+ New Document')");
  await page.waitForURL(/\/documents\/\d+/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  return page.url();
}

async function createTempFile(name: string, content: string) {
  const filePath = path.join(os.tmpdir(), name);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

const titleBtn = () => 'button[title="Click to rename"]';

// ─── tests ────────────────────────────────────────────────────────────────────

test.describe("Ajaia Docs — feature walkthrough", () => {

  // ── 1. Dashboard loads ────────────────────────────────────────────────────
  test("1 · Dashboard loads with Acting-as dropdown", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Ajaia Docs");
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.locator("select option", { hasText: "Alice" })).toHaveCount(1);
    await expect(page.locator("select option", { hasText: "Bob" })).toHaveCount(1);
    await expect(page.locator("select option", { hasText: "Carol" })).toHaveCount(1);
    console.log("✅ Dashboard loaded — user switcher present");
  });

  // ── 2. Create a document ──────────────────────────────────────────────────
  test("2 · Alice creates a new document", async ({ page }) => {
    await selectUser(page, "Alice");
    const url = await createDoc(page);
    expect(url).toMatch(/\/documents\/\d+/);
    await expect(page.locator(titleBtn())).toBeVisible();
    console.log("✅ New document created — navigated to editor");
  });

  // ── 3. Rich-text formatting ───────────────────────────────────────────────
  test("3 · Editor supports rich-text formatting", async ({ page }) => {
    await selectUser(page, "Alice");
    await createDoc(page);

    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();

    // H1
    await page.click("button:has-text('H1')");
    await editor.type("My Test Document");
    await page.keyboard.press("Enter");

    // Bold
    await page.click("button[title='Bold (Ctrl+B)']");
    await editor.type("Bold text here");
    await page.click("button[title='Bold (Ctrl+B)']");
    await page.keyboard.press("Enter");

    // Bullet list
    await page.click("button:has-text('• List')");
    await editor.type("First bullet");
    await page.keyboard.press("Enter");
    await editor.type("Second bullet");

    await expect(editor.locator("h1")).toContainText("My Test Document");
    await expect(editor.locator("strong").first()).toContainText("Bold text here");
    await expect(editor.locator("ul li").first()).toContainText("First bullet");

    console.log("✅ Formatting verified — H1, bold, bullet list all working");
  });

  // ── 4. Save and persist ───────────────────────────────────────────────────
  test("4 · Document saves and persists on reload", async ({ page }) => {
    await selectUser(page, "Alice");
    await createDoc(page);

    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.type("Persistence test content");

    await page.click("button:has-text('Save')");
    await expect(page.locator("text=✓ Saved")).toBeVisible({ timeout: 5000 });

    const url = page.url();
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".ProseMirror")).toContainText("Persistence test content");
    console.log("✅ Document saved and content survived page reload");
  });

  // ── 5. Rename a document ─────────────────────────────────────────────────
  test("5 · Alice can rename a document", async ({ page }) => {
    await selectUser(page, "Alice");
    await createDoc(page);

    // Accept the prompt with a new title
    page.on("dialog", async (dialog) => {
      await dialog.accept("My Renamed Document");
    });
    await page.click(titleBtn());

    // Title should update in the header
    await expect(page.locator(titleBtn())).toContainText("My Renamed Document", { timeout: 5000 });
    console.log("✅ Document renamed successfully");
  });

  // ── 6. Share with Bob ─────────────────────────────────────────────────────
  test("6 · Alice shares a document with Bob", async ({ page }) => {
    await selectUser(page, "Alice");
    await createDoc(page);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.type("Shared document content");
    await page.click("button:has-text('Save')");
    await expect(page.locator("text=✓ Saved")).toBeVisible({ timeout: 5000 });

    // Open share panel
    await page.click("button:has-text('Share')");
    await expect(page.locator("text=Share with…")).toBeVisible();

    // Share with Bob
    await page.click("button:has-text('+ Bob')");

    // Bob chip should appear
    await expect(page.locator(".rounded-full", { hasText: "Bob" })).toBeVisible({ timeout: 5000 });
    console.log("✅ Document shared with Bob");
  });

  // ── 7. Bob sees shared document ───────────────────────────────────────────
  test("7 · Bob sees the shared document in his dashboard", async ({ page }) => {
    // Create + share as Alice
    await selectUser(page, "Alice");
    await createDoc(page);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.type("Bob can read this");
    await page.click("button:has-text('Save')");
    await expect(page.locator("text=✓ Saved")).toBeVisible({ timeout: 5000 });

    await page.click("button:has-text('Share')");
    await expect(page.locator("text=Share with…")).toBeVisible();
    await page.click("button:has-text('+ Bob')");
    await expect(page.locator(".rounded-full", { hasText: "Bob" })).toBeVisible({ timeout: 5000 });

    // Wait for share API to fully persist before switching users
    await page.waitForTimeout(1500);

    // Switch to Bob's dashboard
    await page.goto("/?userId=2");
    await page.waitForLoadState("networkidle");
    // Extra wait: seeding + doc fetch can race on first load
    await page.waitForTimeout(1500);

    await expect(page.locator("text=Shared With Me")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Shared by Alice").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Bob sees 'Shared With Me' section with Alice's document");
  });

  // ── 8. File upload (.txt) ─────────────────────────────────────────────────
  test("8 · Upload a .txt file and open it as a document", async ({ page }) => {
    await selectUser(page, "Alice");

    const filePath = await createTempFile(
      "test-upload.txt",
      "First paragraph of the uploaded file.\n\nSecond paragraph here."
    );

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(filePath);

    await page.waitForURL(/\/documents\/\d+/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    // Title should come from the filename
    await expect(page.locator(titleBtn())).toContainText("test-upload", { timeout: 5000 });

    // Content should be in the editor
    await expect(page.locator(".ProseMirror")).toContainText("First paragraph");
    await expect(page.locator(".ProseMirror")).toContainText("Second paragraph");

    fs.unlinkSync(filePath);
    console.log("✅ .txt file uploaded and converted to editable document");
  });

  // ── 9. Upload rejects .docx ───────────────────────────────────────────────
  test("9 · Upload rejects unsupported file types", async ({ page }) => {
    await selectUser(page, "Alice");

    const filePath = await createTempFile("test.docx", "fake docx content");

    let alertMessage = "";
    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(filePath);

    // Should stay on dashboard (no navigation)
    await page.waitForTimeout(2000);
    expect(alertMessage).toMatch(/\.txt and \.md/i);

    fs.unlinkSync(filePath);
    console.log("✅ .docx upload correctly rejected with error message");
  });

  // ── 10. Delete a document ────────────────────────────────────────────────
  test("10 · Alice can delete her own document", async ({ page }) => {
    await selectUser(page, "Alice");

    // Create a doc and rename it to a unique title we can track
    await createDoc(page);
    const uniqueTitle = `DeleteTest-${Date.now()}`;
    page.once("dialog", async (dialog) => dialog.accept(uniqueTitle));
    await page.click(titleBtn());
    await expect(page.locator(titleBtn())).toContainText(uniqueTitle, { timeout: 5000 });

    // Go back to dashboard
    await page.click("button:has-text('← Back')");
    await page.waitForLoadState("networkidle");

    // Confirm the doc appears on the dashboard
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 5000 });

    // Accept the confirm dialog, then delete the specific doc card
    page.once("dialog", async (dialog) => dialog.accept());
    const docCard = page.locator(".grid > div").filter({ hasText: uniqueTitle });
    await docCard.locator("button[title='Delete document']").click();

    // Wait for DOM update and verify the card is gone
    await page.waitForTimeout(1500);
    await expect(page.locator(`text=${uniqueTitle}`)).not.toBeVisible({ timeout: 5000 });
    console.log("✅ Document deleted from dashboard");
  });
});
