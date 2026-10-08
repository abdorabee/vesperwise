import type { SignalEvidence, SignalResult } from "@/lib/types";

const EXPLORIUM_SOURCE = "explorium-events";
const SCRAPLING_SOURCE = "scrapling";

interface ExploriumMatchResponse {
  matched_businesses?: Array<{ business_id?: string }>;
}

interface ExploriumHiringEventFields {
  event_time?: string;
  job_count?: number;
  job_titles?: string[];
  department?: string;
  location?: string;
  event_name?: string;
}

interface ExploriumHiringEvent extends ExploriumHiringEventFields {
  data?: ExploriumHiringEventFields;
}

interface ExploriumEventsResponse {
  output_events?: ExploriumHiringEvent[];
  events?: ExploriumHiringEvent[];
}

export interface HiringJob {
  title: string;
  department?: string | null;
  location?: string | null;
  posted_at?: string | null;
  source_url?: string | null;
  requisition_id?: string | null;
}

const HIRING_EVENT_TYPES = [
  "hiring_in_creative_department",
  "hiring_in_education_department",
  "hiring_in_engineering_department",
  "hiring_in_finance_department",
  "hiring_in_health_department",
  "hiring_in_human_resources_department",
  "hiring_in_legal_department",
  "hiring_in_marketing_department",
  "hiring_in_operations_department",
  "hiring_in_professional_service_department",
  "hiring_in_sales_department",
  "hiring_in_support_department",
  "hiring_in_trade_department",
  "hiring_in_unknown_department",
] as const;

const HIGH_INTENT = ["sales", "sdr", "bdr", "account executive", "revenue", "business development"];
const MEDIUM_INTENT = ["marketing", "growth", "operations", "ops", "product", "analyst"];
const LOW_INTENT = ["engineer", "developer", "designer"];
const EVENT_WINDOW_MS = 90 * 86_400_000;

function baseJobPoints(title: string): number {
  const lower = title.toLowerCase();
  if (HIGH_INTENT.some((keyword) => lower.includes(keyword))) return 6;
  if (MEDIUM_INTENT.some((keyword) => lower.includes(keyword))) return 4;
  if (LOW_INTENT.some((keyword) => lower.includes(keyword))) return 2;
  return 0;
}

function seniorityMultiplier(title: string): number {
  const lower = title.toLowerCase();
  if (/\b(vp|vice president|head of|director|chief|cro|cmo|cso|president|founder)\b/.test(lower)) {
    return 1.4;
  }
  if (/\b(senior|lead|manager)\b/.test(lower)) return 1.1;
  return 1;
}

function parseRecentEventDate(value: string | undefined, now: Date): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const age = now.getTime() - date.getTime();
  if (age < -86_400_000 || age > EVENT_WINDOW_MS) return null;
  return date;
}

function volumeBonus(jobCount: number): number {
  if (jobCount >= 10) return 6;
  if (jobCount >= 6) return 4;
  if (jobCount >= 3) return 2;
  return 0;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizePostedDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function scoreUniqueTitles(titles: Iterable<string>): {
  titleScore: number;
  relevantTitles: string[];
} {
  let titleScore = 0;
  const relevantTitles: string[] = [];

  for (const title of titles) {
    const basePoints = baseJobPoints(title);
    if (basePoints === 0) continue;
    titleScore += basePoints * seniorityMultiplier(title);
    relevantTitles.push(title);
  }

  return { titleScore, relevantTitles };
}

/** Convert a verified current-job crawl into the v2 hiring signal contract. */
export function buildHiringSignalFromJobs(
  jobs: ReadonlyArray<HiringJob>,
  fetchedAt: string,
  source: string = SCRAPLING_SOURCE
): SignalResult {
  const fetchedDate = new Date(fetchedAt);
  if (!Number.isFinite(fetchedDate.getTime())) {
    return {
      score: 0,
      max: 20,
      detail: "Hiring crawl timestamp is invalid",
      status: "unavailable",
      observed_at: null,
      fetched_at: new Date().toISOString(),
      source,
      evidence: [],
      metadata: { reason: "invalid_fetched_at", source },
    };
  }

  const canonicalFetchedAt = fetchedDate.toISOString();
  const uniqueJobs = new Map<string, HiringJob>();
  const allUniqueTitles = new Map<string, string>();

  for (const job of jobs) {
    if (!job || typeof job.title !== "string" || !job.title.trim()) continue;
    const title = job.title.trim();
    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) continue;

    const department = typeof job.department === "string" ? normalizeTitle(job.department) : "";
    const location = typeof job.location === "string" ? normalizeTitle(job.location) : "";
    const postedDate = normalizePostedDate(job.posted_at);
    const requisitionId = typeof job.requisition_id === "string"
      ? normalizeTitle(job.requisition_id)
      : "";
    const key = [normalizedTitle, department, location, postedDate, requisitionId].join("|");
    if (!uniqueJobs.has(key)) uniqueJobs.set(key, { ...job, title });
    if (!allUniqueTitles.has(normalizedTitle)) allUniqueTitles.set(normalizedTitle, title);
  }

  const contributingTitles = new Map<string, string>();
  let contributingJobCount = 0;
  let latestContributingDate: Date | null = null;
  const evidence: SignalEvidence[] = [];
  for (const job of uniqueJobs.values()) {
    const postedDate = parseRecentEventDate(job.posted_at ?? undefined, fetchedDate);
    if (postedDate) {
      const titleKey = normalizeTitle(job.title);
      if (titleKey && !contributingTitles.has(titleKey)) {
        contributingTitles.set(titleKey, job.title);
      }
      contributingJobCount++;
      if (!latestContributingDate || postedDate > latestContributingDate) {
        latestContributingDate = postedDate;
      }
    }
    evidence.push({
      label: `${job.title}${job.location ? ` — ${job.location}` : ""}`,
      observed_at: postedDate?.toISOString() ?? null,
      source,
      fetched_at: canonicalFetchedAt,
      ...(job.source_url ? { source_url: job.source_url } : {}),
      metadata: {
        title: job.title,
        department: job.department ?? null,
        location: job.location ?? null,
        posted_at: job.posted_at ?? null,
        requisition_id: job.requisition_id ?? null,
        observed_via: postedDate ? "posted_at" : "undated_context",
      },
    });
  }

  const { titleScore, relevantTitles } = scoreUniqueTitles(contributingTitles.values());
  const jobCount = evidence.length;
  const score = contributingJobCount > 0
    ? Math.min(20, Math.round(titleScore + volumeBonus(contributingJobCount)))
    : 0;
  const titleSummary = relevantTitles.slice(0, 3).join(", ");
  const contextOnlyCount = jobCount - contributingJobCount;

  return {
    score,
    max: 20,
    detail: score > 0
      ? `${contributingJobCount} recently dated job posting(s)${titleSummary ? `: ${titleSummary}` : ""}${contextOnlyCount > 0 ? `; ${contextOnlyCount} undated retained as context` : ""}`
      : jobCount > 0
        ? `${jobCount} active job posting(s) retained as context; no scoreable recent posting dates or roles`
        : "No verified active job postings found",
    status: score > 0 ? "ok" : "no_signal",
    observed_at: score > 0 ? latestContributingDate?.toISOString() ?? null : null,
    fetched_at: canonicalFetchedAt,
    source,
    evidence,
    metadata: {
      source,
      total_job_count: jobCount,
      contributing_job_count: contributingJobCount,
      unique_job_titles: allUniqueTitles.size,
      contributing_job_titles: contributingTitles.size,
      undated_context_count: contextOnlyCount,
    },
  };
}

export async function fetchHiringSignal(
  domain: string,
  signal?: AbortSignal
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const apiKey = process.env.EXPLORIUM_API_KEY;

  if (!apiKey) {
    return {
      score: 0,
      max: 20,
      detail: "Hiring data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: EXPLORIUM_SOURCE,
      evidence: [],
      metadata: { reason: "missing_api_key" },
    };
  }

  try {
    const hostname = domain.replace(/^https?:\/\//, "").split("/")[0];
    const parts = hostname.split(".");
    const companyName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    const headers = {
      "api_key": apiKey,
      "Content-Type": "application/json",
    };

    const matchRes = await fetch("https://api.explorium.ai/v1/businesses/match", {
      method: "POST",
      headers,
      body: JSON.stringify({ businesses_to_match: [{ domain, name: companyName }] }),
      next: { revalidate: 86400 },
      signal,
    });
    if (!matchRes.ok) throw new Error("Source unavailable");

    const matchData = (await matchRes.json()) as ExploriumMatchResponse;
    const businessId = matchData.matched_businesses?.[0]?.business_id;
    if (!businessId) {
      return {
        score: 0,
        max: 20,
        detail: "Company not found",
        status: "not_found",
        observed_at: null,
        fetched_at: fetchedAt,
        source: EXPLORIUM_SOURCE,
        evidence: [],
      };
    }

    const timestampFrom = new Date(now.getTime() - EVENT_WINDOW_MS).toISOString();
    const eventsRes = await fetch("https://api.explorium.ai/v1/businesses/events", {
      method: "POST",
      headers,
      body: JSON.stringify({
        business_ids: [businessId],
        event_types: HIRING_EVENT_TYPES,
        timestamp_from: timestampFrom,
      }),
      next: { revalidate: 43200 },
      signal,
    });
    if (!eventsRes.ok) throw new Error("Source unavailable");

    const response = (await eventsRes.json()) as ExploriumEventsResponse;
    const events = response.output_events ?? response.events ?? [];
    const evidence: SignalEvidence[] = [];
    const uniqueTitles = new Map<string, string>();
    let totalJobCount = 0;
    let latestEventDate: Date | null = null;
    let ignoredUndatedEvents = 0;

    for (const event of events) {
      const data = event.data ?? event;
      const eventDate = parseRecentEventDate(data.event_time ?? event.event_time, now);
      if (!eventDate) {
        ignoredUndatedEvents++;
        continue;
      }

      const eventTitles = data.job_titles ?? event.job_titles;
      const titles = Array.isArray(eventTitles)
        ? eventTitles.filter((title): title is string => typeof title === "string" && title.trim().length > 0)
        : [];
      for (const title of titles) {
        const key = normalizeTitle(title);
        if (key && !uniqueTitles.has(key)) uniqueTitles.set(key, title.trim());
      }

      const reportedJobCount = data.job_count ?? event.job_count;
      const jobCount = Number.isFinite(reportedJobCount)
        ? Math.max(0, Math.floor(reportedJobCount ?? 0))
        : titles.length;
      if (jobCount === 0 && titles.length === 0) continue;
      totalJobCount += jobCount;
      if (!latestEventDate || eventDate > latestEventDate) latestEventDate = eventDate;
      evidence.push({
        label: `${data.department ?? event.department ?? "Unknown"} hiring: ${jobCount} open role(s)`,
        observed_at: eventDate.toISOString(),
        source: EXPLORIUM_SOURCE,
        fetched_at: fetchedAt,
        metadata: {
          event_name: data.event_name ?? event.event_name,
          department: data.department ?? event.department ?? null,
          location: data.location ?? event.location ?? null,
          job_count: jobCount,
          job_titles: titles,
        },
      });
    }

    const { titleScore, relevantTitles } = scoreUniqueTitles(uniqueTitles.values());

    const score = latestEventDate
      ? Math.min(20, Math.round(titleScore + volumeBonus(totalJobCount)))
      : 0;
    const titleSummary = relevantTitles.slice(0, 3).join(", ");
    const detail = score > 0
      ? `${totalJobCount} open role(s) across ${evidence.length} hiring event(s)${titleSummary ? `: ${titleSummary}` : ""}`
      : "No verified relevant hiring events in the last 90 days";

    return {
      score,
      max: 20,
      detail,
      status: score > 0 && latestEventDate ? "ok" : "no_signal",
      observed_at: score > 0 ? latestEventDate?.toISOString() ?? null : null,
      fetched_at: fetchedAt,
      source: EXPLORIUM_SOURCE,
      evidence,
      metadata: {
        business_id: businessId,
        hiring_events: evidence.length,
        total_job_count: totalJobCount,
        unique_job_titles: uniqueTitles.size,
        ignored_undated_events: ignoredUndatedEvents,
      },
    };
  } catch (error) {
    return {
      score: 0,
      max: 20,
      detail: "Hiring data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: EXPLORIUM_SOURCE,
      evidence: [],
      metadata: { reason: error instanceof Error ? error.message : "unknown_error" },
    };
  }
}
