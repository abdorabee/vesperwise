import { cacheGet, cacheSet, personScoreCacheKey, SCORE_TTL_SECONDS } from "@/lib/cache";
import { createSupabaseAdmin } from "@/lib/supabase";
import { enrichPerson } from "@/lib/pdl";
import { computeCareerChangeSignal } from "@/lib/signals/person/career-change";
import { computeSeniorityFitSignal } from "@/lib/signals/person/seniority-fit";
import { fetchCompanyIntentSignal } from "@/lib/signals/person/company-intent";
import { fetchNewsMentionsSignal } from "@/lib/signals/person/news-mentions";
import { computeSocialPresenceSignal } from "@/lib/signals/person/social-presence";
import { getMockPersonSignals } from "@/lib/signals/person/mock";
import { computePersonIntentScore } from "@/lib/person-scorer";
import { generatePersonReasoning } from "@/lib/person-reasoning";
import type { PersonIntentScore, PersonSignalSet, BusinessProfile } from "@/lib/types";

const USE_MOCK = process.env.MOCK_SIGNALS === "true";

export interface ScorePersonOptions {
  email?: string;
  linkedinUrl?: string;
  name?: string;
  organizationName?: string;
  title?: string;
  userId: string;
  productCategory?: string;
  businessProfile?: BusinessProfile | null;
  skipCredits?: boolean;
}

/**
 * Core person scoring pipeline.
 * Handles: Apollo enrichment, signal fetching, score computation, AI reasoning, caching, DB persistence, credit deduction.
 */
export async function scorePerson(opts: ScorePersonOptions): Promise<PersonIntentScore> {
  const { email, linkedinUrl, name, organizationName, title, userId, productCategory = "B2B SaaS", businessProfile, skipCredits = false } = opts;
  const supabase = createSupabaseAdmin();

  // Build a cache key from the primary identifier
  const identifier = ((email ?? linkedinUrl ?? `${name}@${organizationName}`) || "unknown").toLowerCase().trim();
  const cacheKey = personScoreCacheKey(identifier);

  // ── Cache check ──────────────────────────────────────────────────────────
  const cached = await cacheGet<PersonIntentScore>(cacheKey);
  if (cached) return cached;

  // ── Apollo enrichment ────────────────────────────────────────────────────
  const apolloData = await enrichPerson({ email, linkedin_url: linkedinUrl, name, organization_name: organizationName, title });
  if (!apolloData) {
    throw new Error("Could not enrich person profile. Please verify the email, LinkedIn URL, or name + company.");
  }

  // ── Fetch signals ────────────────────────────────────────────────────────
  let signals: PersonSignalSet;

  if (USE_MOCK) {
    signals = getMockPersonSignals(identifier);
  } else {
    const personName = apolloData.name ?? ([apolloData.first_name, apolloData.last_name].filter(Boolean).join(" ") || "Unknown");
    const companyName = apolloData.organization_name ?? organizationName ?? "Unknown";

    const [careerChange, seniorityFit, companyIntent, newsMentions, socialPresence] = await Promise.all([
      Promise.resolve(computeCareerChangeSignal(apolloData)),
      Promise.resolve(computeSeniorityFitSignal(apolloData, businessProfile ?? null)),
      fetchCompanyIntentSignal(apolloData, userId),
      fetchNewsMentionsSignal(personName, companyName),
      Promise.resolve(computeSocialPresenceSignal(apolloData, businessProfile ?? null)),
    ]);

    signals = {
      career_change: careerChange,
      seniority_fit: seniorityFit,
      company_intent: companyIntent,
      news_mentions: newsMentions,
      social_presence: socialPresence,
      latestSignalDate: new Date().toISOString(),
    };
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const partial = computePersonIntentScore(apolloData, signals);

  // ── Detect first vs re-score ──────────────────────────────────────────────
  const lookupField = email ? "person_email" : linkedinUrl ? "person_linkedin" : "person_name";
  const lookupValue = email ?? linkedinUrl ?? apolloData.name ?? identifier;

  const { data: existingScore } = await supabase
    .from("person_scores")
    .select("id")
    .eq(lookupField, lookupValue)
    .limit(1)
    .maybeSingle();
  const isFirstScore = !existingScore;

  // ── AI Reasoning ──────────────────────────────────────────────────────────
  const reasoning = await generatePersonReasoning(
    apolloData,
    partial.intent_score,
    partial.score_band,
    signals,
    productCategory,
    isFirstScore,
    businessProfile
  );

  const result: PersonIntentScore = { ...partial, ...reasoning };

  // ── Cache + persist ───────────────────────────────────────────────────────
  await cacheSet(cacheKey, result, SCORE_TTL_SECONDS);

  const { error: insertError } = await supabase.from("person_scores").insert({
    user_id: userId,
    person_name: result.person_name,
    person_email: result.person_email,
    person_linkedin: result.person_linkedin,
    person_title: result.person_title,
    person_company: result.person_company,
    person_domain: result.person_domain,
    person_seniority: result.person_seniority,
    score: result.intent_score,
    score_band: result.score_band,
    signals,
    ai_summary: result.ai_summary,
    recommended_action: result.recommended_action,
    buying_stage: result.buying_stage,
    urgency: result.urgency,
    key_triggers: result.key_triggers,
    why_now: result.why_now,
    approach_angle: result.approach_angle,
    connection_hooks: result.connection_hooks,
    email_subject: result.email_subject,
    talk_track: result.talk_track,
    expires_at: result.score_decay_date,
  });
  if (insertError) console.error("[person-score-service] insert error:", insertError);

  // ── Deduct credit ─────────────────────────────────────────────────────────
  if (!skipCredits) {
    const { error: creditError } = await supabase.rpc("deduct_credit", { p_user_id: userId });
    if (creditError) console.error("[person-score-service] deduct_credit error:", creditError);
  }

  return result;
}
