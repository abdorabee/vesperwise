/** Count and percent stay in one string so "1" beside "11.1%" cannot read as 111.1%. */
export function formatHistoryShare(count: number, total: number): string {
  if (total <= 0) return String(count);
  const pct = ((count / total) * 100).toFixed(1);
  return `${count} · ${pct}%`;
}
