// ABOUTME: E2E test for Settings Documents tab — verifies all 4 compliance document sections with download links

import { expect, test } from "@playwright/test";

test.describe("Settings Documents Page", () => {
  test("documents page displays all sections with download links", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Click Documents tab
    const documentsTab = page.locator('button:has-text("Documents")');
    await expect(documentsTab).toBeVisible();
    await documentsTab.click();

    // Verify Penetration test section
    await expect(page.locator("text=Penetration test")).toBeVisible();
    await expect(
      page.locator("text=/Penetration testing is performed/"),
    ).toBeVisible();

    // Verify SOC 2 section
    await expect(page.locator("text=SOC 2").first()).toBeVisible();
    await expect(page.locator("text=/SOC 2 Type II compliant/")).toBeVisible();

    // Verify DPA section
    await expect(page.locator("text=DPA").first()).toBeVisible();
    await expect(
      page.locator("text=/Data Processing Agreement/"),
    ).toBeVisible();

    // Verify Form W-9 section
    await expect(page.locator("text=Form W-9")).toBeVisible();
    await expect(page.locator("text=/tax document/")).toBeVisible();

    // Verify 4 download links exist
    const downloadLinks = page.locator('a:has-text("Download")');
    await expect(downloadLinks).toHaveCount(4);

    // Verify download links point to PDF files
    for (let i = 0; i < 4; i++) {
      const href = await downloadLinks.nth(i).getAttribute("href");
      expect(href).toContain("/static/documents/");
      expect(href).toMatch(/\.pdf$/);
    }
  });
});
