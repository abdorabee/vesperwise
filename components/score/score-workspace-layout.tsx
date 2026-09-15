"use client";

import type { ReactNode } from "react";
import { MessageSquareText, ScanSearch } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ScoreWorkspaceLayoutProps {
  conversation: ReactNode;
  composer: ReactNode;
  evidence: ReactNode;
  className?: string;
}

function ConversationPane({ conversation, composer }: Pick<ScoreWorkspaceLayoutProps, "conversation" | "composer">) {
  return (
    <section
      aria-label="Score conversation"
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquareText className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Conversation</h2>
      </div>
      <div className="min-h-0 flex-1">{conversation}</div>
      <div className="shrink-0 border-t border-border bg-card">{composer}</div>
    </section>
  );
}

function EvidencePane({ evidence }: Pick<ScoreWorkspaceLayoutProps, "evidence">) {
  return (
    <section
      aria-label="Score evidence"
      className="min-h-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ScanSearch className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Evidence</h2>
      </div>
      <div className="h-[calc(100%-49px)] overflow-y-auto p-4 sm:p-5">{evidence}</div>
    </section>
  );
}

export function ScoreWorkspaceLayout({
  conversation,
  composer,
  evidence,
  className,
}: ScoreWorkspaceLayoutProps) {
  return (
    <div className={cn("min-h-0 flex-1", className)}>
      <div className="hidden h-full min-h-[34rem] gap-4 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(26rem,1.08fr)]">
        <ConversationPane conversation={conversation} composer={composer} />
        <EvidencePane evidence={evidence} />
      </div>

      <Tabs defaultValue="conversation" className="h-full min-h-[34rem] lg:hidden">
        <TabsList aria-label="Score workspace view" className="grid w-full grid-cols-2">
          <TabsTrigger value="conversation">
            <MessageSquareText className="size-4" aria-hidden="true" />
            Conversation
          </TabsTrigger>
          <TabsTrigger value="evidence">
            <ScanSearch className="size-4" aria-hidden="true" />
            Evidence
          </TabsTrigger>
        </TabsList>
        <TabsContent value="conversation" className="min-h-0 data-[state=inactive]:hidden">
          <ConversationPane conversation={conversation} composer={composer} />
        </TabsContent>
        <TabsContent value="evidence" className="min-h-0 data-[state=inactive]:hidden">
          <EvidencePane evidence={evidence} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
