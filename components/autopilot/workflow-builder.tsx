"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import ConditionRow from "./condition-row";
import ActionRow from "./action-row";
import type {
  AutopilotCondition,
  AutopilotAction,
  AutopilotSchedule,
  AutopilotSourceType,
  AutopilotConditionLogic,
  DbAutopilotWorkflow,
} from "@/lib/types";

interface WorkflowBuilderProps {
  workflow?: DbAutopilotWorkflow;
  onSave: () => void;
  onCancel: () => void;
}

export default function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Name & Source
  const [name, setName] = useState(workflow?.name ?? "");
  const [sourceType, setSourceType] = useState<AutopilotSourceType>(workflow?.source_type ?? "watchlist");
  const [sourceDomains, setSourceDomains] = useState(workflow?.source_domains?.join(", ") ?? "");
  const [schedule, setSchedule] = useState<AutopilotSchedule>(workflow?.schedule ?? "daily");

  // Step 2: Conditions
  const [conditions, setConditions] = useState<AutopilotCondition[]>(
    workflow?.conditions ?? [{ type: "score_above", params: { threshold: 75 } }]
  );
  const [conditionLogic, setConditionLogic] = useState<AutopilotConditionLogic>(workflow?.condition_logic ?? "any");

  // Step 3: Actions
  const [actions, setActions] = useState<AutopilotAction[]>(
    workflow?.actions ?? [{ type: "notification", params: {} }]
  );

  const addCondition = () => setConditions([...conditions, { type: "score_above", params: { threshold: 75 } }]);
  const addAction = () => setActions([...actions, { type: "notification", params: {} }]);

  const updateCondition = (i: number, c: AutopilotCondition) => {
    const copy = [...conditions];
    copy[i] = c;
    setConditions(copy);
  };

  const updateAction = (i: number, a: AutopilotAction) => {
    const copy = [...actions];
    copy[i] = a;
    setActions(copy);
  };

  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i));

  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return conditions.length > 0;
    if (step === 3) return actions.length > 0;
    return true;
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        source_type: sourceType,
        source_domains: sourceType === "specific_domains" ? sourceDomains.split(",").map((d) => d.trim()).filter(Boolean) : undefined,
        schedule,
        conditions,
        condition_logic: conditionLogic,
        actions,
      };

      const url = workflow ? `/api/autopilot/workflows/${workflow.id}` : "/api/autopilot/workflows";
      const method = workflow ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save workflow");
      onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const emailDraftCount = actions.filter((a) => a.type === "email_draft").length;
  const estimatedCreditsPerCompany = 1 + emailDraftCount * 0.5;

  return (
    <Card className="border-slate-200 dark:border-foreground/[0.08]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-800 dark:text-slate-100">
            {workflow ? "Edit Workflow" : "Create Workflow"}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${s === step ? "bg-cyan-400" : s < step ? "bg-cyan-400/40" : "bg-slate-300 dark:bg-foreground/[0.1]"}`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Step 1: Name & Source */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-cyan-400 uppercase tracking-[0.2em]">Step 1 — Name & Source</p>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-xs">Workflow Name</Label>
              <Input
                placeholder="Hot Lead Alert"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-100 dark:bg-foreground/[0.05] border-slate-200 dark:border-foreground/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-xs">Monitor</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as AutopilotSourceType)}>
                <SelectTrigger className="bg-slate-100 dark:bg-foreground/[0.05] border-slate-200 dark:border-foreground/[0.08] text-slate-800 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watchlist">All watchlist companies</SelectItem>
                  <SelectItem value="specific_domains">Specific domains</SelectItem>
                </SelectContent>
              </Select>
              {sourceType === "specific_domains" && (
                <Input
                  placeholder="stripe.com, linear.app, notion.so"
                  value={sourceDomains}
                  onChange={(e) => setSourceDomains(e.target.value)}
                  className="bg-slate-100 dark:bg-foreground/[0.05] border-slate-200 dark:border-foreground/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-500"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-xs">Schedule</Label>
              <Select value={schedule} onValueChange={(v) => setSchedule(v as AutopilotSchedule)}>
                <SelectTrigger className="bg-slate-100 dark:bg-foreground/[0.05] border-slate-200 dark:border-foreground/[0.08] text-slate-800 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Conditions */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-cyan-400 uppercase tracking-[0.2em]">Step 2 — Trigger Conditions</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Trigger when</span>
              <Select value={conditionLogic} onValueChange={(v) => setConditionLogic(v as AutopilotConditionLogic)}>
                <SelectTrigger className="w-[100px] bg-slate-100 dark:bg-foreground/[0.05] border-slate-200 dark:border-foreground/[0.08] text-slate-800 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">ANY</SelectItem>
                  <SelectItem value="all">ALL</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600 dark:text-slate-400">conditions match:</span>
            </div>
            <div className="space-y-3">
              {conditions.map((c, i) => (
                <ConditionRow
                  key={i}
                  condition={c}
                  onChange={(updated) => updateCondition(i, updated)}
                  onRemove={() => removeCondition(i)}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="border-dashed border-slate-300 dark:border-foreground/[0.1] text-slate-600 dark:text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Condition
            </Button>
          </div>
        )}

        {/* Step 3: Actions */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-cyan-400 uppercase tracking-[0.2em]">Step 3 — Actions</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">When conditions trigger, do:</p>
            <div className="space-y-3">
              {actions.map((a, i) => (
                <ActionRow
                  key={i}
                  action={a}
                  onChange={(updated) => updateAction(i, updated)}
                  onRemove={() => removeAction(i)}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addAction}
              className="border-dashed border-slate-300 dark:border-foreground/[0.1] text-slate-600 dark:text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Action
            </Button>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-xs text-cyan-400 uppercase tracking-[0.2em]">Step 4 — Review & Save</p>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-foreground/[0.03] border border-slate-200 dark:border-foreground/[0.06] space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source</span>
                  <span className="text-slate-800 dark:text-slate-200">{sourceType === "watchlist" ? "All watchlist" : `${sourceDomains.split(",").filter(Boolean).length} domains`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Schedule</span>
                  <span className="text-slate-800 dark:text-slate-200 capitalize">{schedule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Conditions</span>
                  <span className="text-slate-800 dark:text-slate-200">{conditions.length} ({conditionLogic.toUpperCase()} match)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actions</span>
                  <span className="text-slate-800 dark:text-slate-200">{actions.length}</span>
                </div>
              </div>
              <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs">
                Credit estimate: ~{estimatedCreditsPerCompany} credits per company per run (1 rescore{emailDraftCount > 0 ? ` + ${emailDraftCount * 0.5} AI draft` : ""})
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-foreground/[0.06]">
          <div>
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1 cursor-pointer">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                Cancel
              </Button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <Button
                size="sm"
                disabled={!canNext()}
                onClick={() => setStep(step + 1)}
                className="gap-1 cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSave}
                className="gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : workflow ? "Update Workflow" : "Create Workflow"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
