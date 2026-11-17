import { expect, test } from "@playwright/test";

test("every page carries the security headers and hides the framework", async ({ request }) => {
  for (const path of ["/", "/pricing", "/login"]) {
    const response = await request.get(path);
    const headers = response.headers();

    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"], path).toContain("object-src 'none'");
    expect(headers["content-security-policy-report-only"], path).toBeTruthy();
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});

test("the contact API rejects an empty submission", async ({ request }) => {
  const response = await request.post("/api/contact", { data: {} });
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).toBeLessThan(500);
});
