"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  canUseFeature,
  featureDeniedMessage,
  type GatedFeature,
  type PlanKey,
} from "@/lib/plan-features";

interface WorkspaceState {
  creditsRemaining: number;
  plan: PlanKey;
  setCreditsRemaining: (credits: number) => void;
}

const WorkspaceStateContext = createContext<WorkspaceState | null>(null);

export function WorkspaceStateProvider({
  initialCredits,
  plan,
  children,
}: {
  initialCredits: number;
  plan: PlanKey;
  children: React.ReactNode;
}) {
  const [creditsRemaining, setCreditsRemaining] = useState(initialCredits);
  useEffect(() => {
    setCreditsRemaining(initialCredits);
  }, [initialCredits]);

  const value = useMemo(
    () => ({ creditsRemaining, plan, setCreditsRemaining }),
    [creditsRemaining, plan],
  );

  return <WorkspaceStateContext.Provider value={value}>{children}</WorkspaceStateContext.Provider>;
}

export function useWorkspaceState(): WorkspaceState | null {
  return useContext(WorkspaceStateContext);
}

export function useSetCreditsRemaining(): (credits: number) => void {
  return useWorkspaceState()?.setCreditsRemaining ?? (() => {});
}

/** Returns true when the click was blocked and the upgrade prompt was shown. */
export function useFeatureGuard(feature: GatedFeature): () => boolean {
  const state = useWorkspaceState();
  return () => {
    if (!state || canUseFeature(state.plan, feature)) return false;
    const message = featureDeniedMessage(state.plan, feature);
    toast.error(message, {
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = "/billing#plans";
        },
      },
    });
    return true;
  };
}
