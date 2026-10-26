/** Count and percent stay in one string so "1" beside "11.1%" cannot read as 111.1%. */
export function formatHistoryShare(count: number, total: number): string {
  if (total <= 0) return String(count);
  const pct = ((count / total) * 100).toFixed(1);
  return `${count} · ${pct}%`;
}

/** 30-day credit pace. A rate above 0 and below 1 stays visible instead of rounding to 0. */
export function formatCreditPace(creditsUsed: number, days = 30): string {
  if (days <= 0 || creditsUsed <= 0) return "≈ 0/day pace";
  const pace = creditsUsed / days;
  if (pace > 0 && pace < 1) return "<1/day pace";
  return `≈ ${Math.round(pace)}/day pace`;
}
