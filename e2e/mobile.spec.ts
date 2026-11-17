import { expect, test } from "@playwright/test";

test.describe("mobile", () => {
  test("the nav drawer opens from the header and lists the destinations", async ({ page }) => {
    await page.goto("/dev/shell");
    await page.getByRole("button", { name: /toggle sidebar/i }).first().click();
    const drawer = page.getByRole("dialog", { name: "Sidebar" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Score" }).first()).toBeVisible();
  });

  test("keyboard shortcut hints are hidden on touch screens", async ({ page }) => {
    await page.goto("/dev/shell");
    const hints = page.locator(".kbd-hint");
    const count = await hints.count();
    for (let i = 0; i < count; i += 1) {
      await expect(hints.nth(i)).toBeHidden();
    }
  });

  test("the landing page has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
