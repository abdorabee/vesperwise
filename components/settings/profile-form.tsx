"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";

import { normalizeDomainInput } from "@/lib/business-profile";
import {
  buildIcpSummary,
  ICP_GROUPS,
  icpCompletionCount,
  icpCustomValues,
  icpFieldsInGroup,
  icpListValue,
  icpTextValue,
  type IcpFieldSpec,
} from "@/lib/icp-fields";
import type { BusinessProfile } from "@/lib/types";
import {
  ChipMultiSelect,
  RemovableChipInput,
  SegmentedControl,
  SingleSelect,
} from "@/components/settings/controls";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-row";

interface SaveIssue {
  path: string;
  message: string;
}

export function ProfileForm({ initialProfile }: { initialProfile: BusinessProfile }) {
  const router = useRouter();
  const [saved, setSaved] = useState<BusinessProfile>(initialProfile);
  const [draft, setDraft] = useState<BusinessProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<SaveIssue[]>([]);

  const hasChanges = useMemo(
    () => JSON.stringify(saved) !== JSON.stringify(draft),
    [saved, draft]
  );
  const completion = icpCompletionCount(draft);
  const summary = buildIcpSummary(draft);
  const issueFor = (key: string) => issues.find((i) => i.path === key)?.message ?? null;

  function patch(next: Partial<BusinessProfile>) {
    setDraft((current) => ({ ...current, ...next }));
    setJustSaved(false);
    setError(null);
    setIssues([]);
  }

  function toggleInList(key: keyof BusinessProfile, value: string) {
    const current = (draft[key] as string[] | undefined) ?? [];
    const lower = value.toLocaleLowerCase();
    const next = current.some((v) => v.toLocaleLowerCase() === lower)
      ? current.filter((v) => v.toLocaleLowerCase() !== lower)
      : [...current, value];
    patch({ [key]: next } as Partial<BusinessProfile>);
  }

  async function handleSave() {
    if (!hasChanges || saving) return;
    setSaving(true);
    setError(null);
    setIssues([]);

    try {
      // All 11 fields go up every save. The endpoint accepts a partial body, but
      // sending the full set makes "I cleared this list" unambiguous.
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_profile: draft }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        issues?: SaveIssue[];
        business_profile?: BusinessProfile;
      } | null;

      if (!response.ok) {
        setIssues(data?.issues ?? []);
        throw new Error(data?.error ?? "Failed to save your profile");
      }

      // Trust the server's merged result over the local draft — it normalizes
      // and drops cleared optional lists.
      const persisted = data?.business_profile ?? draft;
      setSaved(persisted);
      setDraft(persisted);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save your profile");
    } finally {
      setSaving(false);
    }
  }

  function renderControl(spec: IcpFieldSpec) {
    switch (spec.control) {
      case "single-select":
        return (
          <SingleSelect
            name={spec.label}
            options={spec.options}
            value={icpTextValue(draft, spec.key)}
            onChange={(value) => patch({ [spec.key]: value } as Partial<BusinessProfile>)}
          />
        );
      case "segmented":
        return (
          <SegmentedControl
            name={spec.label}
            options={spec.options}
            labels={spec.labels}
            value={icpTextValue(draft, spec.key)}
            onChange={(value) => patch({ [spec.key]: value } as Partial<BusinessProfile>)}
          />
        );
      case "multi-select":
        return (
          <ChipMultiSelect
            name={spec.label}
            options={spec.options}
            selected={icpListValue(draft, spec.key)}
            onToggle={(value) => toggleInList(spec.key, value)}
            extras={spec.allowCustom ? icpCustomValues(draft, spec) : undefined}
            onRemoveExtra={
              spec.allowCustom ? (value) => toggleInList(spec.key, value) : undefined
            }
          />
        );
      case "chip-input":
        return (
          <RemovableChipInput
            name={spec.label}
            values={icpListValue(draft, spec.key)}
            onChange={(values) => patch({ [spec.key]: values } as Partial<BusinessProfile>)}
            placeholder={spec.placeholder}
            maxItems={spec.maxItems}
            normalize={spec.normalize === "domain" ? normalizeDomainInput : undefined}
          />
        );
    }
  }

  return (
    <div className="set-panel">
      <div className="page-head">
        <div>
          <h1 className="page-title">Business profile</h1>
          <div className="page-sub">
            What VesperWise knows about who you sell to. It drives every score, every
            recommended action, and the ICP Fit % on each result.
          </div>
        </div>
        <div className="page-actions">
          <span className="set-meter mono">
            {completion.set} of {completion.total} set
          </span>
          {hasChanges && (
            <button
              type="button"
              className="tb-btn outlined"
              onClick={() => {
                setDraft(saved);
                setError(null);
                setIssues([]);
              }}
              disabled={saving}
            >
              <RotateCcw className="ic" aria-hidden="true" />
              Discard
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <Loader2 className="ic animate-spin" aria-hidden="true" />
            ) : justSaved ? (
              <Check className="ic" aria-hidden="true" />
            ) : (
              <Save className="ic" aria-hidden="true" />
            )}
            {justSaved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="set-alert">
          {error}
        </p>
      )}

      {summary && (
        <div className="set-summary">
          <span className="set-summary-label">Your ICP, in plain English</span>
          <p>{summary}</p>
        </div>
      )}

      {ICP_GROUPS.map((group) => (
        <SettingsCard
          key={group.id}
          title={group.label}
          sub={
            group.id === "signals"
              ? "Context for your match preview. These do not change a score."
              : undefined
          }
        >
          {icpFieldsInGroup(group.id).map((spec) => (
            <SettingsRow
              key={spec.key}
              label={spec.label}
              help={spec.hint ?? spec.question}
              error={issueFor(spec.key)}
              badge={
                spec.required ? (
                  <span className="set-badge">Required</span>
                ) : !spec.affectsScoring ? (
                  <span className="set-badge muted">No score impact</span>
                ) : null
              }
            >
              {renderControl(spec)}
            </SettingsRow>
          ))}
        </SettingsCard>
      ))}

      <p className="set-foot">
        Changing anything marked as affecting your score re-scores accounts on their next
        run rather than rewriting past results — history keeps the profile it was scored
        under.
      </p>
    </div>
  );
}
