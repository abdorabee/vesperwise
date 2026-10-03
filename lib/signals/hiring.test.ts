import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildHiringSignalFromJobs, fetchHiringSignal } from "./hiring";

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("fetchHiringSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("EXPLORIUM_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("aggregates Explorium events, deduplicates titles, and preserves latest event_time", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ matched_businesses: [{ business_id: "biz_1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output_events: [
            {
              event_time: "2026-07-10T12:00:00.000Z",
              data: {
                event_time: "2026-07-10T12:00:00.000Z",
                job_count: 5,
                job_titles: ["Director of Sales", "Senior Software Engineer"],
                department: "sales",
                location: "Cairo",
                event_name: "hiring_in_sales_department",
              },
            },
            {
              data: {
                event_time: "2026-07-14T12:00:00.000Z",
                job_count: 3,
                job_titles: ["director of sales"],
                department: "sales",
                location: "Remote",
                event_name: "hiring_in_sales_department",
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await fetchHiringSignal("acme.com", controller.signal);

    expect(result.status).toBe("ok");
    expect(result.score).toBe(15); // unique-title score 10.6 + volume bonus 4
    expect(result.observed_at).toBe("2026-07-14T12:00:00.000Z");
    expect(result.source).toBe("explorium-events");
    expect(result.evidence).toHaveLength(2);
    expect(result.evidence?.[0]).toMatchObject({
      source: "explorium-events",
      fetched_at: NOW.toISOString(),
    });
    expect(result.metadata).toMatchObject({
      hiring_events: 2,
      total_job_count: 8,
      unique_job_titles: 2,
    });

    const eventRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(eventRequest.business_ids).toEqual(["biz_1"]);
    expect(eventRequest.event_types).toHaveLength(14);
    expect(eventRequest.timestamp_from).toBe("2026-04-16T12:00:00.000Z");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
    expect(fetchMock.mock.calls[1]?.[1]?.signal).toBe(controller.signal);
  });

  it("reports an empty event response as verified no-signal", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ matched_businesses: [{ business_id: "biz_1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ output_events: [] }),
      }));

    const result = await fetchHiringSignal("acme.com");

    expect(result.status).toBe("no_signal");
    expect(result.score).toBe(0);
    expect(result.observed_at).toBeNull();
  });

  it("marks an unmatched company separately from an unavailable provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ matched_businesses: [] }),
    }));

    const result = await fetchHiringSignal("missing.example");

    expect(result.status).toBe("not_found");
    expect(result.score).toBe(0);
  });

  it("marks a missing provider key unavailable without calling the source", async () => {
    vi.stubEnv("EXPLORIUM_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchHiringSignal("acme.com");

    expect(result.status).toBe("unavailable");
    expect(result.score).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("buildHiringSignalFromJobs", () => {
  it("normalizes, deduplicates, and scores promoted Scrapling job evidence", () => {
    const result = buildHiringSignalFromJobs([
      {
        title: "Director of Sales",
        department: "Sales",
        location: "Cairo",
        posted_at: "2026-07-10T12:00:00.000Z",
        source_url: "https://acme.com/jobs/sales-director",
      },
      {
        title: " director of sales ",
        department: "sales",
        location: "Cairo",
        posted_at: "2026-07-10T12:00:00.000Z",
        source_url: "https://jobs.lever.co/acme/sales-director",
      },
      {
        title: "Senior Software Engineer",
        location: "Remote",
        posted_at: null,
        source_url: "https://acme.com/jobs/senior-engineer",
      },
      {
        title: "Product Manager",
        location: "Remote",
        posted_at: "not-a-date",
        source_url: "https://acme.com/jobs/product-manager",
      },
    ], NOW.toISOString());

    expect(result.status).toBe("ok");
    expect(result.score).toBe(8); // only the dated Director of Sales contributes
    expect(result.observed_at).toBe("2026-07-10T12:00:00.000Z");
    expect(result.evidence).toHaveLength(3);
    expect(result.source).toBe("scrapling");
    expect(result.evidence?.[0]).toMatchObject({
      source: "scrapling",
      fetched_at: NOW.toISOString(),
      source_url: "https://acme.com/jobs/sales-director",
      metadata: { department: "Sales" },
    });
    expect(result.metadata).toMatchObject({
      source: "scrapling",
      total_job_count: 3,
      contributing_job_count: 1,
      unique_job_titles: 3,
      contributing_job_titles: 1,
      undated_context_count: 2,
    });
    expect(result.evidence?.[1]).toMatchObject({
      observed_at: null,
      metadata: { observed_via: "undated_context" },
    });
  });

  it("deduplicates the same dated job across careers and ATS URLs", () => {
    const result = buildHiringSignalFromJobs([
      {
        title: "Revenue Operations Director",
        department: "Revenue Operations",
        location: "Remote",
        posted_at: "2026-07-11",
        source_url: "https://acme.com/careers/revops-director",
        requisition_id: "REQ-42",
      },
      {
        title: "Revenue Operations Director",
        department: "revenue operations",
        location: "remote",
        posted_at: "2026-07-11T08:00:00.000Z",
        source_url: "https://boards.greenhouse.io/acme/jobs/42",
        requisition_id: "req-42",
      },
    ], NOW.toISOString());

    expect(result.evidence).toHaveLength(1);
    expect(result.score).toBe(8);
    expect(result.metadata).toMatchObject({
      total_job_count: 1,
      contributing_job_count: 1,
      contributing_job_titles: 1,
    });
    expect(result.evidence?.[0]?.metadata).toMatchObject({
      department: "Revenue Operations",
      requisition_id: "REQ-42",
    });
  });

  it("keeps undated jobs as context without treating them as fresh intent", () => {
    const empty = buildHiringSignalFromJobs([], NOW.toISOString());
    const undated = buildHiringSignalFromJobs([
      { title: "VP Sales", source_url: "https://acme.com/jobs/vp-sales" },
    ], NOW.toISOString());

    expect(empty).toMatchObject({ status: "no_signal", score: 0, observed_at: null });
    expect(undated).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      metadata: { contributing_job_count: 0, undated_context_count: 1 },
    });
    expect(undated.evidence).toHaveLength(1);
    expect(undated.evidence?.[0]?.observed_at).toBeNull();
  });

  it("never treats an invalid crawl timestamp as fresh positive evidence", () => {
    const result = buildHiringSignalFromJobs([
      { title: "VP Sales", source_url: "https://acme.com/jobs/vp-sales" },
    ], "invalid");

    expect(result).toMatchObject({
      status: "unavailable",
      score: 0,
      observed_at: null,
      metadata: { reason: "invalid_fetched_at", source: "scrapling" },
    });
  });
});

describe("buildHiringSignalFromJobs provider source", () => {
  it("stamps a custom source on job signal result, evidence, and metadata", () => {
    const result = buildHiringSignalFromJobs([
      {
        title: "VP Sales",
        department: "Sales",
        location: "Cairo",
        posted_at: "2026-07-14T12:00:00.000Z",
        source_url: "https://acme.com/jobs/vp-sales",
      },
    ], NOW.toISOString(), "treg-predictleads");

    expect(result).toMatchObject({
      status: "ok",
      source: "treg-predictleads",
      metadata: { source: "treg-predictleads" },
    });
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence?.[0]).toMatchObject({
      source: "treg-predictleads",
      fetched_at: NOW.toISOString(),
    });
  });

  it("keeps the default Scrapling source when no source is passed", () => {
    const result = buildHiringSignalFromJobs([], NOW.toISOString());

    expect(result).toMatchObject({
      status: "no_signal",
      source: "scrapling",
      metadata: { source: "scrapling" },
    });
    expect(result.evidence).toEqual([]);
  });
});
