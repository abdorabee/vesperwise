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
});
