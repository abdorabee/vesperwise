"use client";

import { signalAxesFromSet } from "@/lib/gen-ui";
import { timeAgo } from "@/lib/time-ago";
import type { SignalSet } from "@/lib/types";

/** Screen 5's expandable per-signal evidence row — score/max/detail/bar/date. */
export function SignalEvidenceRow({ signals }: { signals: SignalSet }) {
  const axes = signalAxesFromSet(signals);

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {axes.map((axis) => {
        const strong = axis.max > 0 && axis.score / axis.max >= 0.75;
        const pct = axis.max > 0 ? Math.round((axis.score / axis.max) * 100) : 0;
        return (
          <div key={axis.key} className="grid grid-cols-[96px_56px_1fr_96px] items-center gap-4">
            <span className={`font-mono text-[12px] ${strong ? "text-white" : "text-[#a0a0a0]"}`}>
              {axis.label}
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className="font-mono text-[13px] tabular-nums"
                style={{ color: strong ? "var(--hot)" : "#f7f8f8" }}
              >
                {axis.score}
              </span>
              <span className="font-mono text-[11px] text-[#4a4a4a]">/{axis.max}</span>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-1 w-[88px] flex-none overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-1 rounded-full"
                  style={{ width: `${pct}%`, background: strong ? "var(--hot)" : "rgba(255,255,255,.4)" }}
                />
              </div>
              <span className={`truncate text-[12px] leading-[1.4] tracking-[-0.006em] ${strong ? "text-[#a0a0a0]" : "text-[#666]"}`}>
                {axis.detail}
              </span>
            </div>
            <span className="text-right font-mono text-[11px] text-[#4a4a4a]">
              {axis.context ? "context" : timeAgo(axis.observed_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
