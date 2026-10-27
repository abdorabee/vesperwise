import { describe, expect, it } from "vitest";
import { InsufficientCreditsError } from "@/lib/score-service";
import { runBulkScores } from "@/lib/bulk-runner";

function atomicBalance(start: number) {
  let balance = start;
  let chain = Promise.resolve();
  return {
    remaining: () => balance,
    charge(): Promise<boolean> {
      const run = chain.then(() => {
        if (balance < 1) return false;
        balance -= 1;
        return true;
      });
      chain = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}

describe("bulk debit", () => {
  it("charges one credit per scored company, leaves cache hits free, and stops mid-job", async () => {
    const bank = atomicBalance(2);
    const ledger: string[] = [];
    const companies = [
      { domain: "cached.example", cached: true },
      { domain: "one.example", cached: false },
      { domain: "two.example", cached: false },
      { domain: "three.example", cached: false },
    ];

    const summary = await runBulkScores(companies, async (company) => {
      const row = company as { domain: string; cached: boolean };
      if (row.cached) return { domain: row.domain, cached: true, charged: false };
      const ok = await bank.charge();
      if (!ok) throw new InsufficientCreditsError(bank.remaining());
      ledger.push(row.domain);
      return { domain: row.domain, cached: false, charged: true };
    });

    expect(summary.cached).toBe(1);
    expect(summary.charged).toBe(2);
    expect(summary.stopped).toBe(true);
    expect(summary.results.map((row) => row.domain)).toEqual([
      "cached.example",
      "one.example",
      "two.example",
    ]);
    expect(ledger).toEqual(["one.example", "two.example"]);
    expect(bank.remaining()).toBe(0);
  });

  it("does not let concurrent jobs overspend one credit", async () => {
    const bank = atomicBalance(1);
    const score = async () => {
      const ok = await bank.charge();
      if (!ok) throw new InsufficientCreditsError(bank.remaining());
      return { cached: false, charged: true };
    };

    const [first, second] = await Promise.all([
      runBulkScores([1, 2, 3], score),
      runBulkScores([4, 5, 6], score),
    ]);

    expect(first.charged + second.charged).toBe(1);
    expect(first.stopped || second.stopped).toBe(true);
    expect(bank.remaining()).toBe(0);
  });
});
