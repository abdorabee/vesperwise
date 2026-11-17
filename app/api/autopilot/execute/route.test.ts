import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getWorkflowsDue = vi.fn();
vi.mock("@/lib/autopilot", () => ({ getWorkflowsDue: () => getWorkflowsDue(), executeWorkflow: vi.fn() }));

const { POST } = await import("./route");
const call = (authorization?: string) =>
  POST(new NextRequest("http://localhost/api/autopilot/execute", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  }));

describe("POST /api/autopilot/execute", () => {
  beforeEach(() => {
    vi.stubEnv("AUTOPILOT_CRON_SECRET", "s3cret");
    getWorkflowsDue.mockResolvedValue([]);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the exact bearer secret", async () => {
    expect((await call("Bearer s3cret")).status).toBe(200);
  });

  it("rejects wrong, shorter, longer, and missing secrets", async () => {
    getWorkflowsDue.mockClear();
    for (const header of ["Bearer s3creT", "Bearer s3", "Bearer s3cretXX", undefined]) {
      expect((await call(header)).status).toBe(401);
    }
    expect(getWorkflowsDue).not.toHaveBeenCalled();
  });
});
