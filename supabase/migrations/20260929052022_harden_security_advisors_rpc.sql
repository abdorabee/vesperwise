-- Backfilled from production's migration history (applied 2026-09-29 as
-- version 20260929052022 but never committed). Production already has it, so
-- this file only keeps fresh databases in step with production.
--
-- domain_enrichment, domain_signals and set_enrichment_updated_at() exist in
-- production but are not created by any migration in this repo, so those
-- statements are guarded. On production they run exactly as originally applied.

-- Pin search_path on credit / trigger functions
ALTER FUNCTION public.deduct_autopilot_credits(text, numeric, text) SET search_path = public;
ALTER FUNCTION public.deduct_chat_credit(text, numeric) SET search_path = public;
ALTER FUNCTION public.deduct_credit(text) SET search_path = public;
ALTER FUNCTION public.increment_credits(text, numeric) SET search_path = public;
ALTER FUNCTION public.enforce_scoring_v3_shadow() SET search_path = public;
ALTER FUNCTION public.sync_scoring_v3_metadata() SET search_path = public;

-- Credit + internal scoring helpers must not be callable by anon/authenticated via PostgREST
REVOKE EXECUTE ON FUNCTION public.deduct_autopilot_credits(text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_scoring_v3_shadow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_scoring_v3_metadata() FROM PUBLIC, anon, authenticated;

-- Ensure service_role retains execute for server-side calls
GRANT EXECUTE ON FUNCTION public.deduct_autopilot_credits(text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_scoring_v3_shadow() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_scoring_v3_metadata() TO service_role;

-- Explicitly lock worker-only evidence / enrichment tables from client roles
REVOKE ALL ON TABLE public.processed_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.signal_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.web_enrichment_maps FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.web_enrichment_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.web_page_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.processed_webhook_events TO service_role;
GRANT ALL ON TABLE public.signal_evidence TO service_role;
GRANT ALL ON TABLE public.web_enrichment_maps TO service_role;
GRANT ALL ON TABLE public.web_enrichment_runs TO service_role;
GRANT ALL ON TABLE public.web_page_snapshots TO service_role;

-- Production-only objects (see header)
DO $harden_production_only$
BEGIN
  IF to_regprocedure('public.set_enrichment_updated_at()') IS NOT NULL THEN
    ALTER FUNCTION public.set_enrichment_updated_at() SET search_path = public;
    REVOKE EXECUTE ON FUNCTION public.set_enrichment_updated_at() FROM PUBLIC, anon, authenticated;
  END IF;

  IF to_regclass('public.domain_enrichment') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.domain_enrichment FROM PUBLIC, anon, authenticated;
    GRANT ALL ON TABLE public.domain_enrichment TO service_role;
  END IF;

  IF to_regclass('public.domain_signals') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.domain_signals FROM PUBLIC, anon, authenticated;
    GRANT ALL ON TABLE public.domain_signals TO service_role;
  END IF;
END
$harden_production_only$;
