export type ScoreTarget =
  | { mode: "person"; email: string }
  | { mode: "domain"; domain: string }
  | { mode: "unknown" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseScoreTarget(input: string): ScoreTarget {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return { mode: "unknown" };
  if (EMAIL.test(trimmed)) return { mode: "person", email: trimmed.toLowerCase() };
  const domain = domainFromInput(trimmed);
  if (domain) return { mode: "domain", domain };
  return { mode: "unknown" };
}

export function parseScoreTargets(input: string): Array<Exclude<ScoreTarget, { mode: "unknown" }>> {
  const hits: Array<{ index: number; target: Exclude<ScoreTarget, { mode: "unknown" }> }> = [];
  const seen = new Set<string>();
  for (const match of input.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    const email = match[0].toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    hits.push({ index: match.index ?? 0, target: { mode: "person", email } });
  }
  const withoutEmails = input.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, " ");
  for (const match of withoutEmails.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
    const domain = match[1].replace(/^www\./i, "").toLowerCase();
    if (!domain.includes(".") || seen.has(domain)) continue;
    seen.add(domain);
    hits.push({ index: match.index ?? 0, target: { mode: "domain", domain } });
  }
  return hits.sort((a, b) => a.index - b.index).map((hit) => hit.target);
}

function domainFromInput(input: string): string | null {
  try {
    const url = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (!host.includes(".") || host.endsWith(".")) return null;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)+$/i.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}
