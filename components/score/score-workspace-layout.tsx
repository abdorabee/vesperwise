"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScoreWorkspaceLayoutProps { thread: ReactNode; composer: ReactNode; className?: string }
interface ScorePageFrameProps { children: ReactNode; mode: "entry" | "workspace"; className?: string }

export function ScorePageFrame({ children, mode, className }: ScorePageFrameProps) {
  return (
    <div data-slot="score-page-frame" data-mode={mode} className={cn("mx-auto flex min-h-0 w-full flex-1 flex-col", mode === "entry" ? "max-w-[46rem]" : "max-w-[50rem]", className)}>
      {children}
    </div>
  );
}

export function ScoreWorkspaceLayout({ thread, composer, className }: ScoreWorkspaceLayoutProps) {
  return (
    <section aria-label="Score conversation" className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div data-slot="score-thread" className="min-h-0 flex-1">{thread}</div>
      <div data-slot="score-composer" className="sticky bottom-0 z-10 shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-1">{composer}</div>
    </section>
  );
}
