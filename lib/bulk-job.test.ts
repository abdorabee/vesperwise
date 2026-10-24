import { describe, expect, it, vi } from "vitest";
import { InsufficientCreditsError } from "@/lib/score-service";
import {
  BULK_STALE_MS,
  advanceBulkState,
  bulkJobStatus,
  failBulkState,
  freshBulkState,
  isBulkJobStale,
  runBulkWindow,
  type BulkScoredRow,
} from "./bulk-job";

function row(domain: string, charged: boolean): BulkScoredRow {
  return {
    domain,
    company_name: domain,
    intent_score: 10,
    score_band: "COLD",
    cached: !charged,
    charged,
  };
}

describe("bulk job debit", () => {
  it("stops mid-job when a score cannot debit and releases the processing state", async () => {
    const companies = ["a.com", "b.com", "c.com", "d.com"].map((domain) => ({ domain }));
    let balance = 1;
    const state = await advanceBulkState(freshBulkState(companies), async (company) => {
      if (company.domain === "a.com") return row("a.com", false);
      if (balance < 1) throw new InsufficientCreditsError(balance);
      balance -= 1;
      return row(company.domain ?? "", true);
    });

    expect(state.credits_charged).toBe(1);
    expect(state.scored.map((item) => item.domain)).toEqual(["a.com", "b.com"]);
    expect(state.stopped).toBe("insufficient_credits");
    expect(bulkJobStatus(state)).toBe("completed");
    expect(balance).toBe(0);
  });

  it("marks a thrown failure as failed so it does not stay queued", () => {
    const state = failBulkState(freshBulkState([{ domain: "a.com" }, { domain: "b.com" }]), "error");
    state.scored.push(row("a.com", true));
    const failed = failBulkState({ ...state, cursor: 1 }, "error");
    expect(bulkJobStatus(failed)).toBe("failed");
    expect(failed.partial).toBe(true);
  });

  it("treats a quiet job as stale once the touch window expires", () => {
    const created = new Date("2026-10-24T00:00:00Z");
    const state = freshBulkState([{ domain: "a.com" }], created);
    expect(isBulkJobStale(created.toISOString(), state, created.getTime() + BULK_STALE_MS - 1)).toBe(false);
    expect(isBulkJobStale(created.toISOString(), state, created.getTime() + BULK_STALE_MS)).toBe(true);
  });

  it("stops a window when the time budget is already spent and leaves the job resumable", async () => {
    const score = vi.fn(async (company: { domain?: string }) => row(company.domain ?? "", true));
    const state = await runBulkWindow(
      freshBulkState([{ domain: "a.com" }, { domain: "b.com" }]),
      score,
      0,
    );
    expect(score).not.toHaveBeenCalled();
    expect(bulkJobStatus(state)).toBe("processing");
  });
});
