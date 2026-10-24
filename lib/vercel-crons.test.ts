import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const vercel = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
  crons: Array<{ path: string; schedule: string }>;
};

describe("vercel crons", () => {
  it("schedules every cron once a day", () => {
    expect(vercel.crons.length).toBeGreaterThan(0);
    for (const cron of vercel.crons) {
      expect(cron.schedule, cron.path).toMatch(/^\d+ \d+ \* \* \*$/);
    }
    expect(vercel.crons.map((cron) => cron.path)).toContain("/api/cron/sweep-bulk-jobs");
  });

  it("lets the bulk sweep run long enough to retry webhooks", () => {
    const source = readFileSync(join(process.cwd(), "app/api/cron/sweep-bulk-jobs/route.ts"), "utf8");
    expect(source).toContain("export const maxDuration = 60");
  });
});
