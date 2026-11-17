import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page shows the hero and a sign-up path", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "See which accounts are ready to buy this week."
    );
    await expect(page.locator('a[href^="/signup"]').first()).toBeVisible();
  });

  test("pricing page renders its plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Start free. Pay for the accounts you score."
    );
  });

  for (const path of ["/about", "/contact", "/privacy", "/terms"]) {
    test(`${path} loads`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("login and signup show their auth cards", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/signup");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("an unknown path returns the 404 page, not a sign-in redirect", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    expect(new URL(page.url()).pathname).toBe("/this-page-does-not-exist");
  });

  test("robots.txt and sitemap.xml are served", async ({ request }) => {
    expect((await request.get("/robots.txt")).status()).toBe(200);
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
  });
});
