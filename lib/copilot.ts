import { createSupabaseAdmin } from "@/lib/supabase";
import { scoreCompany } from "@/lib/score-service";
import { scorePerson } from "@/lib/person-score-service";
import type { BusinessProfile, DbUser, PipelineStage, ConversationAnalysis } from "@/lib/types";
import { sanitizeUiBlocks } from "@/lib/gen-ui";

// ─── OpenRouter Tool Definitions (OpenAI-compatible format) ──────────────────

export interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const COPILOT_TOOLS: OpenRouterTool[] = [
  {
    type: "function",
    function: {
      name: "score_company",
      description: "Score a company's purchase intent by domain. Costs 1 credit in addition to the chat message cost.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Company domain (e.g. stripe.com)" },
          company_name: { type: "string", description: "Company name (optional, inferred from domain if not provided)" },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_watchlist",
      description: "Add a company to the user's watchlist for ongoing monitoring.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Company domain" },
          company_name: { type: "string", description: "Company name" },
        },
        required: ["domain", "company_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_watchlist",
      description: "Remove a company from the user's watchlist.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Company domain to remove" },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Get a summary of the user's intent pipeline with counts per stage and top companies in each stage.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_company_details",
      description: "Get detailed score, signals, and AI analysis for a specific company the user has previously scored.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Company domain to look up" },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_scored_companies",
      description: "Search the user's scored companies by name or domain keyword.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (company name or domain)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_outreach_email",
      description: "Fetch a company's intent data so you can draft a personalized outreach email. Returns the company's signals and AI analysis for you to compose the email.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Company domain" },
          tone: { type: "string", enum: ["formal", "casual", "executive"], description: "Desired email tone" },
          angle: { type: "string", description: "Specific angle or trigger to emphasize in the email" },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_person",
      description: "Score an individual person's purchase intent. Provide at least one of: email, LinkedIn URL, or name + company. Costs 1 credit.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Person's email address" },
          linkedin: { type: "string", description: "Person's LinkedIn profile URL" },
          name: { type: "string", description: "Person's full name (use with company)" },
          company: { type: "string", description: "Person's company name (use with name)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_pipeline_stage",
      description: "Manually move a company to a different pipeline stage (e.g. mark as 'engaged' after outreach or 'converted' after closing).",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Company domain" },
          stage: { type: "string", enum: ["cold", "warming", "hot", "engaged", "converted"], description: "New pipeline stage" },
        },
        required: ["domain", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_autopilot_workflows",
      description: "List the user's Autopilot workflows with their status, schedule, and run counts.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_autopilot_activity",
      description: "Get recent Autopilot activity — triggered actions from workflow runs, including which companies were flagged and why.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max number of recent actions to return (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_conversation",
      description: "Analyze a sales conversation (from a screenshot or pasted text export) to extract buying intent signals, identify prospect companies, and score purchase intent. Call this tool whenever a user shares a conversation screenshot or pastes chat/email content. You fill in all parameters based on your reading of the conversation.",
      parameters: {
        type: "object",
        properties: {
          signals: {
            type: "array",
            description: "Intent signals you identified in the conversation",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["pain_point", "budget_mention", "timeline", "competitor", "champion", "objection", "buying_trigger"],
                  description: "Type of intent signal",
                },
                excerpt: { type: "string", description: "Verbatim or near-verbatim quote from the conversation supporting this signal" },
                confidence: { type: "number", description: "Your confidence in this signal, 0.0 to 1.0" },
                company: { type: "string", description: "Company this signal relates to, if identifiable" },
              },
              required: ["type", "excerpt", "confidence"],
            },
          },
          companies: {
            type: "array",
            items: { type: "string" },
            description: "Company names you identified as the buyer or prospect in the conversation",
          },
          overall_intent: {
            type: "string",
            enum: ["hot", "warm", "cold", "unknown"],
            description: "Your verdict: hot = strong buying signals, warm = interested but early, cold = mostly objections or passive, unknown = insufficient data",
          },
          intent_score: {
            type: "number",
            description: "Intent score 0-100. HOT >= 75 (explicit budget + timeline + champion), WARM 50-74 (2+ active signals), COLD < 50 (discovery or objections)",
          },
          summary: {
            type: "string",
            description: "2-3 sentence sales intelligence summary of what this conversation reveals about the prospect's intent",
          },
          recommended_action: {
            type: "string",
            description: "The single most important next step the sales rep should take based on this conversation",
          },
        },
        required: ["signals", "companies", "overall_intent", "intent_score", "summary", "recommended_action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "present_ui",
      description: "Render an interactive VesperWise workspace in the chat instead of a long markdown answer. Prefer this after you have score or pipeline data. Keep prose to a few sentences and put the experience in blocks.",
      parameters: {
        type: "object",
        properties: {
          blocks: {
            type: "array",
            description: "Ordered UI blocks. Allowed types: intent_hero, signal_explorer, action, outreach_studio, action_rail, comparison, markdown. Prefer action over thesis.",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["intent_hero", "signal_explorer", "thesis", "domain", "action", "outreach_studio", "action_rail", "comparison", "markdown"],
                },
                company: { type: "string" },
                domain: { type: "string" },
                intent_score: { type: "number" },
                score_band: { type: "string", enum: ["HOT", "WARM", "COLD"] },
                buying_stage: { type: "string" },
                urgency: { type: "string" },
                data_coverage: { type: "number" },
                score_status: { type: "string" },
                icp_fit_score: { type: "number" },
                summary: { type: "string" },
                title: { type: "string" },
                recommended_action: { type: "string" },
                why_now: { type: "string" },
                subject: { type: "string" },
                talk_track: { type: "string" },
                text: { type: "string" },
                selected_key: { type: "string" },
                axes: { type: "array", items: { type: "object" } },
                suggestions: { type: "array", items: { type: "object" } },
                accounts: { type: "array", items: { type: "object" } },
              },
              required: ["type"],
            },
          },
        },
        required: ["blocks"],
      },
    },
  },
];

// ─── Tool Executor ───────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  productCategory: string,
  businessProfile?: BusinessProfile | null
): Promise<unknown> {
  const supabase = createSupabaseAdmin();

  switch (name) {
    case "score_company": {
      const result = await scoreCompany({
        domain: args.domain as string,
        userId,
        companyName: args.company_name as string | undefined,
        productCategory,
        businessProfile,
      });
      return {
        company: result.company,
        domain: result.domain,
        intent_score: result.intent_score,
        score_band: result.score_band,
        ai_summary: result.ai_summary,
        recommended_action: result.recommended_action,
        buying_stage: result.buying_stage,
        urgency: result.urgency,
        key_triggers: result.key_triggers,
        why_now: result.why_now,
        email_subject: result.email_subject,
        talk_track: result.talk_track,
        signals: result.signals,
      };
    }

    case "score_person": {
      const result = await scorePerson({
        email: args.email as string | undefined,
        linkedinUrl: args.linkedin as string | undefined,
        name: args.name as string | undefined,
        organizationName: args.company as string | undefined,
        userId,
        productCategory,
        businessProfile,
      });
      return {
        person_name: result.person_name,
        person_title: result.person_title,
        person_company: result.person_company,
        intent_score: result.intent_score,
        score_band: result.score_band,
        ai_summary: result.ai_summary,
        recommended_action: result.recommended_action,
        buying_stage: result.buying_stage,
        urgency: result.urgency,
        key_triggers: result.key_triggers,
        why_now: result.why_now,
        approach_angle: result.approach_angle,
        connection_hooks: result.connection_hooks,
      };
    }

    case "add_to_watchlist": {
      const { error } = await supabase.from("watchlist").upsert(
        {
          user_id: userId,
          domain: (args.domain as string).toLowerCase().trim(),
          company_name: args.company_name as string,
          is_active: true,
          pipeline_stage: "cold",
          stage_changed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,domain" }
      );
      if (error) return { success: false, error: error.message };
      return { success: true, domain: args.domain, message: `Added ${args.company_name} to watchlist` };
    }

    case "remove_from_watchlist": {
      const { error } = await supabase
        .from("watchlist")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("domain", (args.domain as string).toLowerCase().trim());
      if (error) return { success: false, error: error.message };
      return { success: true, domain: args.domain, message: `Removed from watchlist` };
    }

    case "get_pipeline_summary": {
      const { data: watchlist } = await supabase
        .from("watchlist")
        .select("domain, company_name, score, score_band, pipeline_stage, last_scored")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("score", { ascending: false });

      if (!watchlist || watchlist.length === 0) {
        return { total: 0, stages: {}, message: "No companies in pipeline" };
      }

      const stages: Record<string, Array<{ domain: string; company_name: string; score: number | null }>> = {};
      for (const w of watchlist) {
        const stage = w.pipeline_stage ?? "cold";
        if (!stages[stage]) stages[stage] = [];
        stages[stage].push({ domain: w.domain, company_name: w.company_name, score: w.score });
      }

      const counts: Record<string, number> = {};
      for (const [stage, companies] of Object.entries(stages)) {
        counts[stage] = companies.length;
      }

      return { total: watchlist.length, counts, top_per_stage: stages };
    }

    case "get_company_details": {
      const domain = (args.domain as string).toLowerCase().trim();
      const { data: score } = await supabase
        .from("scores")
        .select("*")
        .eq("user_id", userId)
        .eq("domain", domain)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!score) return { error: `No score found for ${domain}. You can score it using the score_company tool.` };

      return {
        company: score.company_name,
        domain: score.domain,
        score: score.score,
        score_band: score.score_band,
        signals: score.signals,
        ai_summary: score.ai_summary,
        recommended_action: score.recommended_action,
        buying_stage: score.buying_stage,
        urgency: score.urgency,
        key_triggers: score.key_triggers,
        why_now: score.why_now,
        email_subject: score.email_subject,
        talk_track: score.talk_track,
        scored_at: score.created_at,
      };
    }

    case "search_scored_companies": {
      const query = args.query as string;
      const { data: scores } = await supabase
        .from("scores")
        .select("domain, company_name, score, score_band, created_at")
        .eq("user_id", userId)
        .or(`domain.ilike.%${query}%,company_name.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!scores || scores.length === 0) return { results: [], message: `No scored companies matching "${query}"` };

      // Deduplicate by domain (latest score only)
      const seen = new Set<string>();
      const unique = scores.filter((s) => {
        if (seen.has(s.domain)) return false;
        seen.add(s.domain);
        return true;
      });

      return { results: unique };
    }

    case "draft_outreach_email": {
      const domain = (args.domain as string).toLowerCase().trim();
      const { data: score } = await supabase
        .from("scores")
        .select("company_name, score, score_band, signals, ai_summary, key_triggers, email_subject, talk_track, urgency")
        .eq("user_id", userId)
        .eq("domain", domain)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!score) return { error: `No score found for ${domain}. Score it first using score_company.` };

      return {
        company: score.company_name,
        domain,
        score: score.score,
        score_band: score.score_band,
        signals: score.signals,
        key_triggers: score.key_triggers,
        existing_email_subject: score.email_subject,
        existing_talk_track: score.talk_track,
        ai_summary: score.ai_summary,
        urgency: score.urgency,
        requested_tone: args.tone ?? "casual",
        requested_angle: args.angle ?? null,
        instruction: "Use the above data to draft a personalized outreach email. Reference specific signals and triggers. Match the requested tone.",
      };
    }

    case "update_pipeline_stage": {
      const domain = (args.domain as string).toLowerCase().trim();
      const stage = args.stage as PipelineStage;
      const { error } = await supabase
        .from("watchlist")
        .update({ pipeline_stage: stage, stage_changed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("domain", domain)
        .eq("is_active", true);

      if (error) return { success: false, error: error.message };
      return { success: true, domain, stage, message: `Moved ${domain} to "${stage}" stage` };
    }

    case "list_autopilot_workflows": {
      const { data: workflows } = await supabase
        .from("autopilot_workflows")
        .select("id, name, is_enabled, schedule, source_type, total_runs, last_run_at, conditions, actions")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!workflows || workflows.length === 0) {
        return { workflows: [], message: "Autopilot workflows are coming soon." };
      }

      return {
        workflows: workflows.map((w) => ({
          name: w.name,
          enabled: w.is_enabled,
          schedule: w.schedule,
          source: w.source_type,
          conditions: (w.conditions as Array<{ type: string }>).length,
          actions: (w.actions as Array<{ type: string }>).length,
          total_runs: w.total_runs,
          last_run: w.last_run_at,
        })),
      };
    }

    case "get_autopilot_activity": {
      const limit = Math.min((args.limit as number) ?? 20, 50);
      const { data: actions } = await supabase
        .from("autopilot_actions")
        .select("domain, company_name, trigger_reason, old_score, new_score, old_band, new_band, action_type, action_status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!actions || actions.length === 0) {
        return { actions: [], message: "No Autopilot activity yet. Workflows run on their configured schedule." };
      }

      return { actions };
    }

    case "present_ui": {
      const { data } = await supabase
        .from("scores")
        .select("domain")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80);
      const domains = [...new Set((data ?? []).map((row) => String(row.domain).toLowerCase()))];
      const blocks = sanitizeUiBlocks(args.blocks ?? args, domains.length > 0 ? domains : undefined);
      return { ok: true, blocks };
    }

    case "analyze_conversation": {
      // Claude has already extracted and structured the analysis via vision or text reading.
      // Deduct 1 credit for the analysis and return the structured result.
      const { error: creditError } = await supabase.rpc("deduct_credit", { p_user_id: userId });
      if (creditError) console.error("[copilot] analyze_conversation deduct_credit error:", creditError);

      const analysis: ConversationAnalysis = {
        signals: (args.signals as ConversationAnalysis["signals"]) ?? [],
        companies: (args.companies as string[]) ?? [],
        overall_intent: (args.overall_intent as ConversationAnalysis["overall_intent"]) ?? "unknown",
        intent_score: Number(args.intent_score) || 0,
        summary: (args.summary as string) ?? "",
        recommended_action: (args.recommended_action as string) ?? "",
      };

      return analysis;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── System Prompt Builder ───────────────────────────────────────────────────

interface CopilotContext {
  recentScores: Array<{ domain: string; company_name: string; score: number; score_band: string }>;
  watchlist: Array<{ domain: string; company_name: string; score: number | null; pipeline_stage: string }>;
}

export async function buildCopilotContext(userId: string): Promise<CopilotContext> {
  const supabase = createSupabaseAdmin();

  const [scoresResult, watchlistResult] = await Promise.all([
    supabase
      .from("scores")
      .select("domain, company_name, score, score_band")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("watchlist")
      .select("domain, company_name, score, pipeline_stage")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("score", { ascending: false }),
  ]);

  // Deduplicate scores by domain
  const seen = new Set<string>();
  const recentScores = (scoresResult.data ?? []).filter((s) => {
    if (seen.has(s.domain)) return false;
    seen.add(s.domain);
    return true;
  }).slice(0, 20);

  return {
    recentScores,
    watchlist: watchlistResult.data ?? [],
  };
}

export function buildCopilotSystemPrompt(user: DbUser, context: CopilotContext): string {
  const roleInstructions = user.role === "manager" || user.role === "admin"
    ? `ROLE: Sales Manager/Leader
BEHAVIOR:
- Focus on strategic pipeline analysis, trend identification, and team coaching insights
- When asked about pipeline health, provide aggregate metrics and patterns
- Identify companies that need attention or follow-up based on score trends
- Suggest team-level strategies based on pipeline composition
- Highlight risks (many cold leads, no hot leads) and opportunities (score jumps, new triggers)`
    : `ROLE: ${user.role === "ae" ? "Account Executive" : "Sales Development Rep"}
BEHAVIOR:
- Focus on tactical output: company briefs, outreach angles, lead prioritization, objection handling
- When asked about a company, lead with actionable intelligence
- Draft emails and talk tracks that reference specific signal data
- Prioritize leads based on intent score, urgency, and buying stage
- Help prepare for calls with specific talking points from signal data`;

  const scoreSummary = context.recentScores.length > 0
    ? context.recentScores.map((s) => `  - ${s.company_name} (${s.domain}): ${s.score}/100 [${s.score_band}]`).join("\n")
    : "  No companies scored yet.";

  const watchlistSummary = context.watchlist.length > 0
    ? context.watchlist.map((w) => `  - ${w.company_name} (${w.domain}): score=${w.score ?? "unscored"}, stage=${w.pipeline_stage}`).join("\n")
    : "  Watchlist is empty.";

  const hotLeads = context.watchlist.filter((w) => w.score !== null && w.score >= 75);
  const hotSection = hotLeads.length > 0
    ? `\nHOT LEADS REQUIRING ACTION:\n${hotLeads.map((h) => `  - ${h.company_name} (${h.domain}): ${h.score}/100`).join("\n")}`
    : "";

  const stageCounts: Record<string, number> = {};
  for (const w of context.watchlist) {
    const stage = w.pipeline_stage ?? "cold";
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
  }
  const pipelineSummary = Object.entries(stageCounts).map(([s, c]) => `${s}: ${c}`).join(", ") || "empty";

  return `You are VesperWise Copilot, an AI sales intelligence assistant. You help sales teams understand and act on purchase intent signals.

You have access to tools that let you score companies, score individual people, manage watchlists, query pipeline data, and draft outreach. Use these tools proactively when the user's request would benefit from real data. When a user asks about a specific person (by name, email, or LinkedIn), use the score_person tool.

USER CONTEXT:
- Name/ID: ${user.id}
- Plan: ${user.plan} | Credits: ${user.credits_remaining}
- Product category: ${user.product_category ?? "B2B SaaS"}${user.business_profile ? `
- Target Industries: ${user.business_profile.target_industries.join(", ")}
- Target Company Size: ${user.business_profile.company_size}
- Primary Buyer: ${user.business_profile.buyer_role}
- Sales Motion: ${user.business_profile.sales_motion}
- Deal Size: ${user.business_profile.deal_size}
- Sales Cycle: ${user.business_profile.sales_cycle}` : ""}

${roleInstructions}

RECENTLY SCORED COMPANIES (last 20 unique):
${scoreSummary}

WATCHLIST (${context.watchlist.length} companies):
${watchlistSummary}

PIPELINE STAGES: ${pipelineSummary}
${hotSection}

CONVERSATION ANALYSIS:
When the user shares a screenshot or pastes raw chat/email/Slack content, ALWAYS call the analyze_conversation tool immediately — do not describe what you see first, just call the tool.
After the tool returns, lead your response with the intent verdict ("This looks like a [HOT/WARM/COLD] prospect") and highlight the 2-3 strongest signals with direct quotes. Always offer to run a full domain score if you identified the company ("Want me to run a full intent score on [Company]?").

GENERATIVE UI:
You are composing an interactive workspace, not a markdown essay. After you have score or pipeline data, call present_ui with a compact block list tailored to the user's goal:
- Score / why this band → intent_hero + signal_explorer + action + action_rail (never a thesis essay)
- Draft email → outreach_studio + action_rail (include subject and talk_track)
- Compare accounts → comparison (2-4 scored domains only)
Keep spoken text to 1-3 sentences. Put evidence in signal_explorer axes (key, label, score, max, detail). Always include suggested next prompts on action_rail. Never invent scores or domains that are not in tool results.

GUIDELINES:
- Always cite specific data from scores and signals. Never fabricate company data.
- When you don't have data about a company, offer to score it (costs 1 credit).
- Be concise and direct — sales reps value speed over verbose explanations.
- When drafting emails, reference specific signals (funding rounds, hires, news events).
- Scoring a company costs 1 credit. Conversation analysis costs 1 credit. The user currently has ${user.credits_remaining} credits.
- If the user asks about a company not in their data, search first, then offer to score.`;
}
