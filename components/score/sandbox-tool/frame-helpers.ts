/**
 * `window.VW` helpers injected into every sandboxed tool. Generated code calls
 * these instead of re-deriving scoring math, so charts match the Living Brief
 * exactly. Mirrors lib/brief/decay.ts (kept in sync by frame-helpers.test.ts).
 */
export const FRAME_HELPERS_JS = `
(function () {
  var TRIGGERS = ["funding", "hiring", "news", "technology"];
  function band(score) { return score >= 75 ? "HOT" : score >= 50 ? "WARM" : "COLD"; }
  function clamp(v) { return Math.min(100, Math.max(0, v)); }
  function freshness(c, offsetDays) {
    if (c.status === "no_signal" || c.daysAgo === null || c.daysAgo === undefined) return 1;
    var age = Math.max(0, c.daysAgo + Math.max(0, offsetDays || 0));
    if (typeof c.halfLifeDays === "number" && c.halfLifeDays > 0) return Math.pow(2, -age / c.halfLifeDays);
    return Math.pow(0.85, age / 30);
  }
  function projectScore(contributions, offsetDays) {
    var list = (contributions || []).filter(function (c) { return TRIGGERS.indexOf(c.type) !== -1; });
    var total = list.reduce(function (s, c) { return s + (isFinite(c.effectiveWeight) ? Math.max(0, c.effectiveWeight) : 0); }, 0);
    var perSignal = { funding: 0, hiring: 0, news: 0, technology: 0 };
    if (total > 0) {
      list.forEach(function (c) {
        var w = isFinite(c.effectiveWeight) ? Math.max(0, c.effectiveWeight) : 0;
        perSignal[c.type] = clamp(c.rawScore * freshness(c, offsetDays) * w / total);
      });
    }
    var score = clamp(Math.round(TRIGGERS.reduce(function (s, k) { return s + perSignal[k]; }, 0)));
    return { score: score, band: band(score), perSignal: perSignal };
  }
  function daysSince(iso) {
    var t = Date.parse(iso);
    return isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0;
  }
  function formatDate(iso) {
    var t = Date.parse(iso);
    return isFinite(t) ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  }
  window.VW = Object.freeze({ projectScore: projectScore, freshness: freshness, band: band, daysSince: daysSince, formatDate: formatDate });
})();
`;
