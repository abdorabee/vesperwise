import { expect, test } from "@playwright/test";

const PRIVATE_PAGES = ["/dashboard", "/score", "/history", "/watchlist", "/lists", "/bulk", "/billing", "/api-keys", "/settings"];

test.describe("signed-out access", () => {
  for (const path of PRIVATE_PAGES) {
    test(`${path} sends a signed-out visitor to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }

  test("a credit-spending API refuses a request with no session or key", async ({ request }) => {
    const response = await request.post("/api/v1/score", { data: { domain: "stripe.com" } });
    expect(response.status()).toBe(401);
  });

  test("a private dashboard API answers with a JSON 401, not a redirect", async ({ request }) => {
    const response = await request.get("/api/dashboard/watchlist", { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("a mixed-case path cannot slip past the guard", async ({ page }) => {
    await page.goto("/DashBoard");
    await expect(page).not.toHaveURL(/\/DashBoard$/);
  });
});
