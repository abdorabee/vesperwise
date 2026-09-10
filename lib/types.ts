// ─── Signal Types ─────────────────────────────────────────────────────────────

export type SignalStatus =
  | "ok"
  | "no_signal"
  | "stale"
  | "not_found"
  | "unavailable";

export interface SignalEvidence {
  label: string;
  observed_at: string | null;
  /** Provider identifier exposed with the public score payload. */
  source: string;
  /** Timestamp when this evidence was fetched or verified. */
  fetched_at: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
}

export interface SignalResult {
  score: number;
  max: number;
  detail: string;
  /** Omitted only by legacy cached signal payloads. */
  status?: SignalStatus;
  /** Timestamp of the newest event that contributed to a positive score. */
  observed_at?: string | null;
  /** Timestamp of the most recent successful or attempted source fetch. */
  fetched_at?: string;
  /** Provider identifier; omitted only by legacy cached payloads. */
  source?: string;
  evidence?: SignalEvidence[];
  metadata?: Record<string, unknown>;
}

export interface SignalSet {
  funding: SignalResult;
  hiring: SignalResult;
  news: SignalResult;
  technology: SignalResult;
  /** Dated, meaningful first-party site changes. OpenPageRank remains `web`. */
  web_activity?: SignalResult;
  web: SignalResult;
  github: SignalResult;
  latestSignalDate: string; // ISO date string
}

// ─── Score Types ──────────────────────────────────────────────────────────────

export type ScoreBand = "HOT" | "WARM" | "COLD";
export type ScoreStatus = "complete" | "partial" | "unscorable";
export type BuyingStage = "awareness" | "consideration" | "decision";
export type UrgencyLevel = "act-now" | "this-week" | "this-month" | "nurture";

export type CoreIntentSignalKey = "funding" | "hiring" | "news" | "technology";
export type IntentSignalKey = CoreIntentSignalKey | "web_activity";

export interface ScoringPolicy {
  id: string;
  version: string;
  weights: Record<IntentSignalKey, number>;
  halfLivesDays: Record<IntentSignalKey, number>;
  minimumCoverage: number;
  minimumSignalEquivalent: number;
  vertical?: string | null;
  icpKey?: string | null;
}

export interface SignalContribution {
  type: IntentSignalKey;
  status: SignalStatus;
  rawScore: number;
  decayedScore: number;
  freshness: number;
  daysAgo: number | null;
  summary: string;
  baseWeight: number;
  effectiveWeight: number;
  contribution: number;
  observedAt: string | null;
  halfLifeDays?: number;
  confidence?: number;
  selectedSource?: string | null;
  reasonCodes?: string[];
  sourceUrls?: string[];
  fetchedAt?: string | null;
}

export interface IntentScore {
  company: string;
  domain: string;
  intent_score: number | null;
  score_band: ScoreBand | null;
  last_updated: string;
  signals: SignalSet;
  ai_summary: string;
  recommended_action: string;
  buying_stage: BuyingStage;
  urgency: UrgencyLevel;
  key_triggers: string[];
  why_now: string;
  email_subject: string;
  talk_track: string;
  score_decay_date: string;
  model_tier: "premium" | "free";
  scoring_version: string;
  scoring_policy_id?: string;
  scoring_policy?: ScoringPolicy;
  score_status: ScoreStatus;
  data_coverage: number;
  signal_coverage?: number;
  contributions: SignalContribution[];
  cached: boolean;
  charged: boolean;
  icp_fit_score: number | null; // 0-100, how well the company fits the user's ICP
  model_fallback: boolean;
  automation_eligible: boolean;
  is_baseline: boolean;
  profile_hash: string;
  source_status: Partial<Record<keyof Omit<SignalSet, "latestSignalDate">, SignalStatus>>;
  score_id?: string;
  score_run_id?: string;
  raw_score?: number | null;    // weighted score before freshness decay
  confidence?: number;          // backward-compatible alias for data_coverage
  score_explanation?: string;   // bounded reasoning summary for older clients
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ScoreRequest {
  domain?: string;
  company?: string;
}

export interface BulkScoreRequest {
  companies: Array<{ domain?: string; name?: string }>;
  webhook_url?: string;
  callback_id?: string;
}

export interface BulkJobResponse {
  job_id: string;
  estimated_seconds: number;
}

export interface WatchlistEntry {
  id: string;
  user_id: string;
  domain: string;
  company_name: string;
  last_scored: string;
  score: number;
  score_band: ScoreBand;
  is_active: boolean;
  pipeline_stage: PipelineStage;
  stage_changed_at: string;
  previous_score: number | null;
}

// ─── Business Profile ────────────────────────────────────────────────────────

export interface BusinessProfile {
  product_category: string;
  target_industries: string[];
  company_size: string;
  buyer_role: string;
  sales_motion: string;
  deal_size: string;
  sales_cycle: string;
  /** Wrapping chip multi-select, onboarding ICP screen. */
  geography?: string[];
  /** Tech-stack chips the user says their ICP already runs. */
  tech_stack_include?: string[];
  /** Tech-stack chips that disqualify a candidate account. */
  tech_stack_exclude?: string[];
  /** 1-5 domains the user actually cares about, scored live during onboarding. */
  seed_domains?: string[];
  /** Editable, persisted workspace display name captured on the first onboarding screen. */
  workspace_name?: string;
}

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  subscription_renews_at: string | null;
  subscription_cancel_at_period_end: boolean;
  plan: "free" | "starter" | "growth" | "pro" | "agency";
  credits_remaining: number;
  product_category: string | null;
  business_profile: BusinessProfile | null;
  workspace_name: string | null;
  onboarding_completed: boolean;
  role: UserRole;
  created_at: string;
}

export interface DbApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  label: string;
  last_used: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbScore {
  id: string;
  user_id: string;
  domain: string;
  company_name: string;
  score: number;
  score_band: ScoreBand;
  signals: SignalSet;
  ai_summary: string;
  recommended_action: string;
  buying_stage: BuyingStage | null;
  urgency: UrgencyLevel | null;
  key_triggers: string[] | null;
  why_now: string | null;
  email_subject: string | null;
  talk_track: string | null;
  score_run_id: string | null;
  scoring_version: string;
  scoring_policy_id: string | null;
  scoring_policy: ScoringPolicy | null;
  profile_hash: string | null;
  score_status: Exclude<ScoreStatus, "unscorable">;
  data_coverage: number | null;
  signal_coverage: number | null;
  confidence: number | null;
  raw_score: number | null;
  contributions: SignalContribution[];
  source_status: Partial<Record<keyof Omit<SignalSet, "latestSignalDate">, SignalStatus>>;
  is_baseline: boolean;
  automation_eligible: boolean;
  evidence_ids: string[];
  model_tier: "premium" | "free" | null;
  model_fallback: boolean;
  score_explanation: string | null;
  icp_fit_score: number | null;
  expires_at: string;
  created_at: string;
}

export interface DbBulkJob {
  id: string;
  user_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  total: number;
  completed: number;
  webhook_url: string | null;
  results: IntentScore[] | null;
  created_at: string;
}

export interface DbCreditLog {
  id: string;
  user_id: string;
  amount: number;
  type: "debit" | "credit";
  reason: string;
  created_at: string;
}

// ─── Pipeline & Chat Types ───────────────────────────────────────────────────

export type PipelineStage = "cold" | "warming" | "hot" | "engaged" | "converted";
export type ScoreOutcome = "closed_won" | "closed_lost" | "no_decision" | "disqualified";
/**
 * Kept as a const tuple so `z.enum(USER_ROLE_OPTIONS)` is provably the same set
 * as this union and as the DB CHECK constraint on `users.role`
 * (supabase/migrations/20260317000000_chat_and_pipeline.sql).
 */
export const USER_ROLE_OPTIONS = ["sdr", "ae", "manager", "admin"] as const;

export type UserRole = (typeof USER_ROLE_OPTIONS)[number];

export interface DbChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls: unknown | null;
  tool_result: unknown | null;
  tokens_used: number;
  created_at: string;
}

export const CHAT_CREDIT_COST = 0.25;

// ─── Conversation Analysis Types ─────────────────────────────────────────────

export type ConversationSignalType =
  | "pain_point"
  | "budget_mention"
  | "timeline"
  | "competitor"
  | "champion"
  | "objection"
  | "buying_trigger";

export interface ConversationSignal {
  type: ConversationSignalType;
  excerpt: string;        // verbatim quote from conversation
  confidence: number;     // 0-1
  company?: string;       // if identifiable from context
}

export interface ConversationAnalysis {
  signals: ConversationSignal[];
  companies: string[];                              // extracted company names
  overall_intent: "hot" | "warm" | "cold" | "unknown";
  intent_score: number;                             // 0-100
  summary: string;                                  // 2-3 sentence analyst take
  recommended_action: string;                       // what to do next
}

// ─── Person Scoring Types ────────────────────────────────────────────────────

export interface PersonSignalSet {
  career_change: SignalResult;   // max 30
  seniority_fit: SignalResult;   // max 20
  company_intent: SignalResult;  // max 20
  news_mentions: SignalResult;   // max 15
  social_presence: SignalResult; // max 15
  latestSignalDate: string;
}

export interface PersonIntentScore {
  person_name: string;
  person_email: string | null;
  person_linkedin: string | null;
  person_title: string | null;
  person_company: string | null;
  person_domain: string | null;
  person_seniority: string | null;
  intent_score: number;
  score_band: ScoreBand;
  last_updated: string;
  signals: PersonSignalSet;
  ai_summary: string;
  recommended_action: string;
  buying_stage: BuyingStage;
  urgency: UrgencyLevel;
  key_triggers: string[];
  why_now: string;
  approach_angle: string;
  connection_hooks: string[];
  email_subject: string;
  talk_track: string;
  score_decay_date: string;
  model_tier: "premium" | "free";
}

export interface DbPersonScore {
  id: string;
  user_id: string;
  person_name: string;
  person_email: string | null;
  person_linkedin: string | null;
  person_title: string | null;
  person_company: string | null;
  person_domain: string | null;
  person_seniority: string | null;
  score: number;
  score_band: ScoreBand;
  signals: PersonSignalSet;
  ai_summary: string;
  recommended_action: string;
  buying_stage: BuyingStage | null;
  urgency: UrgencyLevel | null;
  key_triggers: string[] | null;
  why_now: string | null;
  approach_angle: string | null;
  connection_hooks: string[] | null;
  email_subject: string | null;
  talk_track: string | null;
  expires_at: string;
  created_at: string;
}

export interface ApolloPersonData {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  seniority: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  organization_name: string | null;
  organization?: { primary_domain?: string };
  employment_history: Array<{
    title: string;
    organization_name: string;
    start_date: string | null;
    end_date: string | null;
    current: boolean;
  }>;
}

// ─── Plan Config ──────────────────────────────────────────────────────────────

export const PLAN_CREDITS: Record<DbUser["plan"], number> = {
  free: 20,
  starter: 500,
  growth: 2500,
  pro: 8000,
  agency: 25000,
};

export const PLAN_WATCHLIST_LIMIT: Record<DbUser["plan"], number | null> = {
  free: 5,
  starter: 50,
  growth: 250,
  pro: 1000,
  agency: null, // unlimited
};

export const PLAN_RATE_LIMIT: Record<DbUser["plan"], number> = {
  free: 10,
  starter: 100,
  growth: 100,
  pro: 100,
  agency: 100,
};

// ─── Autopilot Types ────────────────────────────────────────────────────────

export type AutopilotSchedule = "daily" | "weekly";
export type AutopilotSourceType = "watchlist" | "specific_domains";
export type AutopilotConditionLogic = "any" | "all";

export type AutopilotConditionType =
  | "score_above"    // params: { threshold: number }
  | "score_below"    // params: { threshold: number }
  | "score_change"   // params: { direction: "up" | "down" | "any", min_change: number }
  | "band_change"    // params: { from?: ScoreBand, to?: ScoreBand }
  | "signal_spike";  // params: { signal: keyof Omit<SignalSet, "latestSignalDate">, min_ratio: number }

export interface AutopilotCondition {
  type: AutopilotConditionType;
  params: Record<string, unknown>;
}

export type AutopilotActionType =
  | "email_draft"     // params: { tone?: "formal" | "casual" | "executive" }
  | "webhook"         // params: { url: string, headers?: Record<string, string> }
  | "slack"           // params: { webhook_url: string }
  | "pipeline_stage"  // params: { stage: PipelineStage }
  | "notification";   // params: {}

export interface AutopilotAction {
  type: AutopilotActionType;
  params: Record<string, unknown>;
}

export interface DbAutopilotWorkflow {
  id: string;
  user_id: string;
  name: string;
  is_enabled: boolean;
  source_type: AutopilotSourceType;
  source_domains: string[] | null;
  schedule: AutopilotSchedule;
  next_run_at: string;
  conditions: AutopilotCondition[];
  condition_logic: AutopilotConditionLogic;
  actions: AutopilotAction[];
  total_runs: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAutopilotRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: "running" | "completed" | "failed" | "partial";
  companies_checked: number;
  companies_triggered: number;
  credits_used: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface DbAutopilotAction {
  id: string;
  run_id: string;
  workflow_id: string;
  user_id: string;
  domain: string;
  company_name: string;
  trigger_reason: string;
  old_score: number | null;
  new_score: number | null;
  old_band: string | null;
  new_band: string | null;
  action_type: AutopilotActionType;
  action_result: unknown;
  action_status: "success" | "failed" | "skipped";
  credits_used: number;
  created_at: string;
}

export const PLAN_AUTOPILOT_LIMIT: Record<DbUser["plan"], number | null> = {
  free: 1,
  starter: 5,
  growth: 20,
  pro: 50,
  agency: null, // unlimited
};

export type InboxEventType =
  | "hot_crossing"
  | "stage_change"
  | "autopilot_fire"
  | "bulk_job_complete"
  | "tech_signal"
  | "score_drop"
  | "system"
  | "reply_activity";

export interface InboxNotification {
  id: string;
  user_id: string;
  event_type: InboxEventType;
  domain: string;
  company_name: string;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
  tags: string[];
  list_id: string | null;
  is_read: boolean;
  is_archived: boolean;
  is_snoozed: boolean;
  snoozed_until: string | null;
  created_at: string;
}
