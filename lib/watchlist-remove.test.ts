import { describe, expect, it, vi } from "vitest";
import { deleteWatchlistEntry, restoreWatchlistEntry } from "@/lib/watchlist-remove";

describe("watchlist removal", () => {
  it("sends DELETE immediately and undo re-posts after that request settles", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    let releaseDelete: (value: Response) => void = () => {};
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      calls.push(`${init?.method} ${url}`);
      if (init?.method === "DELETE") {
        return new Promise<Response>((resolve) => {
          releaseDelete = resolve;
        });
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    });

    const removal = deleteWatchlistEntry("intercom.com", fetchImpl as unknown as typeof fetch);
    expect(calls).toEqual(["DELETE /api/dashboard/watchlist?domain=intercom.com"]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(1);

    const undo = removal.then(
      () => restoreWatchlistEntry("intercom.com", "Intercom", fetchImpl as unknown as typeof fetch),
      () => restoreWatchlistEntry("intercom.com", "Intercom", fetchImpl as unknown as typeof fetch),
    );
    expect(calls).toHaveLength(1);
    releaseDelete(new Response(null, { status: 200 }));
    await undo;
    expect(calls[1]).toContain("POST /api/dashboard/watchlist");
    expect(calls[1]).not.toContain("domain=");
    vi.useRealTimers();
  });
});
