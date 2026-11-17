import { expect, test } from "@playwright/test";

// /dev/shell renders the real dashboard sidebar and header with mock data and no auth
// (it is only reachable outside production).
test.describe("dashboard shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/shell");
  });

  test("shows the grouped nav with labels and the credits footer", async ({ page }) => {
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    for (const group of ["Overview", "Library", "Workspace"]) {
      await expect(sidebar.getByText(group, { exact: true })).toBeVisible();
    }
    for (const label of ["Dashboard", "Score", "History", "Watchlist", "Lists", "API Keys"]) {
      await expect(sidebar.getByRole("link", { name: label }).first()).toBeVisible();
    }
    await expect(page.locator('[data-slot="sidebar-credits"]')).toContainText("42");
  });

  test("the sidebar collapses and expands from the keyboard", async ({ page }) => {
    const sidebar = page.locator('[data-slot="sidebar"][data-state]').first();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
  });

  test("the search palette opens with the shortcut and closes with Escape", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Search" });
    // The shortcut listener attaches on hydration, so retry the press until it lands.
    await expect(async () => {
      await page.keyboard.press("ControlOrMeta+k");
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
