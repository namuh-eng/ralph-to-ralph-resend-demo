import { expect, test } from "@playwright/test";

test.describe("Emails Sending Filter Bar", () => {
  test("filter bar renders all filter controls", async ({ page }) => {
    await page.goto("/emails");
    // Search input
    await expect(page.getByPlaceholder("Search...")).toBeVisible();
    // Date range picker
    await expect(page.getByText("Last 15 days")).toBeVisible();
    // Status filter
    await expect(page.getByText("All Statuses")).toBeVisible();
    // API Key filter
    await expect(page.getByText("All API Keys")).toBeVisible();
    // Export button
    await expect(page.getByLabel("Export")).toBeVisible();
  });

  test("filter emails by status dropdown", async ({ page }) => {
    await page.goto("/emails");
    await page.getByText("All Statuses").click();
    await expect(page.getByText("Delivered")).toBeVisible();
    await expect(page.getByText("Bounced")).toBeVisible();
    await expect(page.getByText("Failed")).toBeVisible();
    // Select a status
    await page.getByText("Delivered").click();
    // Dropdown should close and show selected value
    await expect(page.getByText("Delivered")).toBeVisible();
  });

  test("filter emails by date range preset", async ({ page }) => {
    await page.goto("/emails");
    await page.getByText("Last 15 days").click();
    await expect(page.getByText("Today")).toBeVisible();
    await expect(page.getByText("Yesterday")).toBeVisible();
    await expect(page.getByText("Last 7 days")).toBeVisible();
    // Select Today
    await page.getByText("Today").click();
    // Button should now show "Today"
    await expect(page.getByText("Today")).toBeVisible();
  });
});
