import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  scoreLimit: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ from: mocks.from }),
}));

vi.mock("./score-view", () => ({
  ScoreView: (props: { creditsRemaining: number; recentScores: unknown[] }) => (
    <div data-credits={props.creditsRemaining} data-recent-count={props.recentScores.length} />
  ),
}));

function usersQuery() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: { credits_remaining: 12 } })),
  };
  return chain;
}

function scoresQuery() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: mocks.scoreLimit,
  };
  mocks.scoreLimit.mockResolvedValue({
    data: Array.from({ length: 20 }, (_, index) => ({
      domain: `account-${index + 1}.com`,
      company_name: `Account ${index + 1}`,
      score: 80 - index,
      score_band: "HOT",
      created_at: "2026-10-10T00:00:00.000Z",
    })),
  });
  return chain;
}

describe("ScorePage", () => {
  it("loads enough recent score domains for sandbox account-comparison openAccount actions", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1" });
    mocks.from.mockImplementation((table: string) => table === "users" ? usersQuery() : scoresQuery());

    const { default: ScorePage } = await import("./page");
    const element = await ScorePage();

    expect(mocks.scoreLimit).toHaveBeenCalledWith(20);
    expect(element).toMatchObject({
      props: {
        recentScores: expect.arrayContaining([
          expect.objectContaining({ domain: "account-20.com" }),
        ]),
      },
    });
  });
});
