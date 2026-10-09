import { scrubVendorNames } from "./scrub-vendors";
import { applyIssues, isRecord, pathString, reportStrippedKeys } from "../zod-repair";
import {
  BRIEF_SECTION_SCHEMAS,
  briefSpecSchema,
  TRIGGER_KEYS,
  type BriefSection,
  type BriefSpec,
  type TriggerKey,
} from "./brief-schema";

export type BriefDiagnosticCode =
  | "unknown_section"
  | "unknown_prop"
  | "invalid_prop"
  | "truncated"
  | "dropped_section"
  | "unavailable_signal"
  | "duplicate_section"
  | "limit_exceeded"
  | "inserted_score_hero"
  | "moved_score_hero"
  | "invalid_spec";

export interface BriefDiagnostic {
  code: BriefDiagnosticCode;
  path: string;
  type?: string;
  index?: number;
}

const MAX_PASSES = 3;
const DEFAULT_PERSONAS = ["VP Sales"] as const;

function isTriggerKey(value: string): value is TriggerKey {
  return (TRIGGER_KEYS as readonly string[]).includes(value);
}

function scrubString(value: string): string {
  return scrubVendorNames(value);
}

function scrubStrings<T>(value: T): T {
  if (typeof value === "string") return scrubString(value) as T;
  if (Array.isArray(value)) return value.map(scrubStrings) as T;
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = scrubStrings(child);
  }
  return next as T;
}

function addDiagnostic(
  diagnostics: BriefDiagnostic[],
  code: BriefDiagnosticCode,
  path: string,
  type?: string,
  index?: number,
): void {
  diagnostics.push({ code, path, ...(type ? { type } : {}), ...(index === undefined ? {} : { index }) });
}

function repairBoundedString(
  value: unknown,
  maximum: number,
  diagnostics: BriefDiagnostic[],
  path: string,
  options: { required?: boolean } = {},
): string | null {
  if (typeof value !== "string") {
    if (value !== undefined || options.required) addDiagnostic(diagnostics, "invalid_prop", path);
    return options.required ? "" : null;
  }
  let next = value;
  if (next.length > maximum) {
    next = next.slice(0, maximum);
    addDiagnostic(diagnostics, "truncated", path);
  }
  return scrubString(next);
}

function repairPersonas(value: unknown, diagnostics: BriefDiagnostic[]): { personas: string[]; usable: boolean } {
  if (!Array.isArray(value)) return { personas: [...DEFAULT_PERSONAS], usable: false };
  const personas: string[] = [];
  let usable = false;
  value.forEach((item, index) => {
    if (personas.length >= 3) {
      addDiagnostic(diagnostics, "limit_exceeded", `personas.${index}`);
      return;
    }
    const persona = repairBoundedString(item, 40, diagnostics, `personas.${index}`);
    if (!persona) return;
    personas.push(persona);
    usable = true;
  });
  return { personas: personas.length > 0 ? personas : [...DEFAULT_PERSONAS], usable };
}

function repairOpeners(
  value: unknown,
  personas: readonly string[],
  availableSignals: readonly TriggerKey[],
  diagnostics: BriefDiagnostic[],
): { openers: BriefSpec["openers"]; usable: boolean } {
  if (!isRecord(value)) return { openers: {}, usable: false };
  const personaSet = new Set(personas);
  const availableSet = new Set(availableSignals);
  const openers: BriefSpec["openers"] = {};
  let usable = false;

  for (const [angle, byPersona] of Object.entries(value)) {
    if (!isTriggerKey(angle)) {
      addDiagnostic(diagnostics, "invalid_prop", `openers.${angle}`);
      continue;
    }
    if (!availableSet.has(angle)) {
      addDiagnostic(diagnostics, "unavailable_signal", `openers.${angle}`);
      continue;
    }
    if (!isRecord(byPersona)) {
      addDiagnostic(diagnostics, "invalid_prop", `openers.${angle}`);
      continue;
    }
    const repaired: Record<string, string> = {};
    for (const [persona, text] of Object.entries(byPersona)) {
      if (!personaSet.has(persona)) {
        addDiagnostic(diagnostics, "invalid_prop", `openers.${angle}.${persona}`);
        continue;
      }
      const opener = repairBoundedString(text, 400, diagnostics, `openers.${angle}.${persona}`);
      if (!opener) continue;
      repaired[persona] = opener;
      usable = true;
    }
    if (Object.keys(repaired).length > 0) openers[angle] = repaired;
  }

  return { openers, usable };
}

function repairSection(item: unknown, index: number, diagnostics: BriefDiagnostic[]): BriefSection | null {
  const type = isRecord(item) && typeof item.type === "string" ? item.type : undefined;
  if (!type || !(type in BRIEF_SECTION_SCHEMAS)) {
    addDiagnostic(diagnostics, "unknown_section", `layout.${index}`, type, index);
    return null;
  }

  const schema = BRIEF_SECTION_SCHEMAS[type as BriefSection["type"]];
  const seen = new Set<string>();
  const diagnose = (code: BriefDiagnosticCode, path: readonly PropertyKey[]) => {
    const key = `${code}:${pathString(path)}`;
    if (seen.has(key)) return;
    seen.add(key);
    addDiagnostic(diagnostics, code, path.length ? `layout.${index}.${pathString(path)}` : `layout.${index}`, type, index);
  };

  let candidate: unknown = item;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
      reportStrippedKeys(candidate, parsed.data, [], diagnose);
      return scrubStrings(parsed.data) as BriefSection;
    }
    const next = applyIssues(candidate, parsed.error.issues, diagnose);
    if (next === candidate) break;
    candidate = next;
  }

  addDiagnostic(diagnostics, "dropped_section", `layout.${index}`, type, index);
  return null;
}

function firstAvailableAngle(availableSignals: readonly TriggerKey[], openers: BriefSpec["openers"]): TriggerKey | undefined {
  return availableSignals.find((signal) => openers[signal]) ?? availableSignals[0];
}

function normalizeSectionSignals(
  section: BriefSection,
  index: number,
  availableSignals: readonly TriggerKey[],
  personas: readonly string[],
  openers: BriefSpec["openers"],
  diagnostics: BriefDiagnostic[],
): BriefSection | null {
  const availableSet = new Set(availableSignals);
  if (section.type === "signal_spotlight") {
    if (!availableSet.has(section.signal)) {
      addDiagnostic(diagnostics, "unavailable_signal", `layout.${index}.signal`, section.type, index);
      return null;
    }
    return section;
  }
  if (section.type === "what_would_change") {
    const items = section.items.filter((item, itemIndex) => {
      const keep = availableSet.has(item.signal);
      if (!keep) {
        addDiagnostic(diagnostics, "unavailable_signal", `layout.${index}.items.${itemIndex}.signal`, section.type, index);
      }
      return keep;
    });
    if (items.length === 0) {
      addDiagnostic(diagnostics, "dropped_section", `layout.${index}`, section.type, index);
      return null;
    }
    return { ...section, items };
  }
  if (section.type === "opener_picker") {
    const fallback = firstAvailableAngle(availableSignals, openers);
    if (!fallback) {
      addDiagnostic(diagnostics, "dropped_section", `layout.${index}`, section.type, index);
      return null;
    }
    const default_angle = availableSet.has(section.default_angle) ? section.default_angle : fallback;
    if (default_angle !== section.default_angle) {
      addDiagnostic(diagnostics, "unavailable_signal", `layout.${index}.default_angle`, section.type, index);
    }
    const default_persona = personas.includes(section.default_persona) ? section.default_persona : personas[0];
    if (default_persona !== section.default_persona) {
      addDiagnostic(diagnostics, "invalid_prop", `layout.${index}.default_persona`, section.type, index);
    }
    return { ...section, default_angle, default_persona };
  }
  return section;
}

function repairLayout(
  value: unknown,
  availableSignals: readonly TriggerKey[],
  personas: readonly string[],
  openers: BriefSpec["openers"],
  diagnostics: BriefDiagnostic[],
): { layout: BriefSection[]; usable: boolean } {
  if (!Array.isArray(value)) return { layout: [], usable: false };
  const repaired: BriefSection[] = [];
  value.forEach((item, index) => {
    const section = repairSection(item, index, diagnostics);
    if (!section) return;
    const normalized = normalizeSectionSignals(section, index, availableSignals, personas, openers, diagnostics);
    if (normalized) repaired.push(normalized);
  });
  if (repaired.length === 0) return { layout: [], usable: false };

  const firstHeroIndex = repaired.findIndex((section) => section.type === "score_hero");
  const hero: BriefSection = { type: "score_hero" };
  const withoutHeroes = repaired.filter((section) => section.type !== "score_hero");
  if (firstHeroIndex === -1) {
    addDiagnostic(diagnostics, "inserted_score_hero", "layout.0", "score_hero");
  } else if (firstHeroIndex !== 0) {
    addDiagnostic(diagnostics, "moved_score_hero", `layout.${firstHeroIndex}`, "score_hero", firstHeroIndex);
  }

  const seenTypes = new Set<BriefSection["type"]>(["score_hero"]);
  let spotlightCount = 0;
  const deduped: BriefSection[] = [];
  withoutHeroes.forEach((section, index) => {
    if (section.type === "signal_spotlight") {
      spotlightCount += 1;
      if (spotlightCount > 2) {
        addDiagnostic(diagnostics, "limit_exceeded", "layout.signal_spotlight", section.type, index);
        return;
      }
      deduped.push(section);
      return;
    }
    if (seenTypes.has(section.type)) {
      addDiagnostic(diagnostics, "duplicate_section", `layout.${section.type}`, section.type, index);
      return;
    }
    seenTypes.add(section.type);
    deduped.push(section);
  });

  const fullLayout = [hero, ...deduped];
  if (fullLayout.length > 6) {
    fullLayout.slice(6).forEach((section, index) => {
      addDiagnostic(diagnostics, "limit_exceeded", `layout.${index + 6}`, section.type);
    });
  }
  return { layout: fullLayout.slice(0, 6), usable: repaired.length > 0 };
}

function availableTriggerSignals(input: readonly TriggerKey[]): TriggerKey[] {
  const seen = new Set<TriggerKey>();
  const signals: TriggerKey[] = [];
  for (const signal of input) {
    if (!isTriggerKey(signal) || seen.has(signal)) continue;
    seen.add(signal);
    signals.push(signal);
  }
  return signals;
}

export function repairBrief(
  input: unknown,
  ctx: { availableSignals: TriggerKey[] },
): { spec: BriefSpec | null; diagnostics: BriefDiagnostic[] } {
  const diagnostics: BriefDiagnostic[] = [];
  if (!isRecord(input)) {
    addDiagnostic(diagnostics, "invalid_spec", "");
    return { spec: null, diagnostics };
  }

  const headline = repairBoundedString(input.headline, 140, diagnostics, "headline") ?? "";
  const personasResult = repairPersonas(input.personas, diagnostics);
  const availableSignals = availableTriggerSignals(ctx.availableSignals);
  const openersResult = repairOpeners(input.openers, personasResult.personas, availableSignals, diagnostics);
  const layoutResult = repairLayout(input.layout, availableSignals, personasResult.personas, openersResult.openers, diagnostics);

  const hasUsableContent =
    headline.length > 0 ||
    personasResult.usable ||
    openersResult.usable ||
    layoutResult.usable;
  if (!hasUsableContent) return { spec: null, diagnostics };

  const layout = layoutResult.layout.length > 0
    ? layoutResult.layout
    : [{ type: "score_hero" } satisfies BriefSection];
  if (layoutResult.layout.length === 0) {
    addDiagnostic(diagnostics, "inserted_score_hero", "layout.0", "score_hero");
  }

  const spec: BriefSpec = {
    version: 1,
    headline,
    layout,
    personas: personasResult.personas,
    openers: openersResult.openers,
  };
  const parsed = briefSpecSchema.safeParse(spec);
  if (!parsed.success) {
    addDiagnostic(diagnostics, "invalid_spec", "");
    return { spec: null, diagnostics };
  }
  return { spec: parsed.data, diagnostics };
}
