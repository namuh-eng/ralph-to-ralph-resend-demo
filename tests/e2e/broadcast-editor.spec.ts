import { expect, test } from "@playwright/test";

test.describe("Broadcast Editor", () => {
  test("edit broadcast title inline", async ({ page }) => {
    // Create a broadcast first
    const res = await page.request.post("/api/broadcasts", {
      data: { name: "Untitled" },
    });
    const broadcast = await res.json();

    // Navigate to editor
    await page.goto(`/broadcasts/${broadcast.id}/editor`);

    // Wait for editor to load
    await page.waitForSelector('input[value="Untitled"]');

    // Click on the title and edit it
    const titleInput = page.locator('input[value="Untitled"]');
    await titleInput.fill("My Newsletter");

    // Click outside to blur
    await page.locator("body").click({ position: { x: 0, y: 0 } });

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Verify title persisted by reloading
    await page.reload();
    await page.waitForSelector('input[value="My Newsletter"]');
    const updatedTitle = page.locator('input[value="My Newsletter"]');
    await expect(updatedTitle).toBeVisible();

    // Cleanup
    await page.request.delete(`/api/broadcasts/${broadcast.id}`);
  });
});
