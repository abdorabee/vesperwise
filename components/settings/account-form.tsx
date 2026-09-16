"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, Save } from "lucide-react";

import {
  ROLE_HINTS,
  ROLE_LABELS,
  WORKSPACE_NAME_MAX,
} from "@/lib/account-settings";
import { PLAN_CREDITS, USER_ROLE_OPTIONS, type DbUser, type UserRole } from "@/lib/types";
import { SegmentedControl } from "@/components/settings/controls";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-row";

export interface AccountSettings {
  workspaceName: string;
  role: UserRole;
  email: string;
  plan: DbUser["plan"];
}

export function AccountForm({ initial }: { initial: AccountSettings }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [workspaceName, setWorkspaceName] = useState(initial.workspaceName);
  const [role, setRole] = useState<UserRole>(initial.role);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = workspaceName.trim();
  const hasChanges = useMemo(
    () => trimmedName !== saved.workspaceName.trim() || role !== saved.role,
    [trimmedName, role, saved]
  );
  const nameError =
    trimmedName.length === 0
      ? "Give your workspace a name."
      : trimmedName.length > WORKSPACE_NAME_MAX
        ? `Keep it to ${WORKSPACE_NAME_MAX} characters or fewer.`
        : null;

  async function handleSave() {
    if (!hasChanges || saving || nameError) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_name: trimmedName, role }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Failed to save your account settings");

      setSaved({ ...saved, workspaceName: trimmedName, role });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      // The sidebar label is server-rendered, so refresh to pick up the new name.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save your account settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="set-panel">
      <div className="page-head">
        <div>
          <h1 className="page-title">Account &amp; workspace</h1>
          <div className="page-sub">
            How your workspace is labelled across the app, and who you are on the team.
          </div>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || saving || Boolean(nameError)}
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

      <SettingsCard title="Workspace" sub="Shown in the sidebar and on your billing receipts.">
        <SettingsRow
          label="Workspace name"
          help="Usually your company or team name."
          htmlFor="workspace-name"
          error={hasChanges || trimmedName.length === 0 ? nameError : null}
        >
          <input
            id="workspace-name"
            className="set-input"
            value={workspaceName}
            maxLength={WORKSPACE_NAME_MAX + 1}
            placeholder="Northwind Analytics"
            onChange={(event) => {
              setWorkspaceName(event.target.value);
              setJustSaved(false);
              setError(null);
            }}
          />
        </SettingsRow>

        <SettingsRow label="Your role" help={ROLE_HINTS[role]}>
          <SegmentedControl
            name="Your role"
            options={USER_ROLE_OPTIONS}
            labels={ROLE_LABELS}
            value={role}
            onChange={(value) => {
              setRole(value as UserRole);
              setJustSaved(false);
              setError(null);
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Identity" sub="Managed by your sign-in provider.">
        <SettingsRow
          label="Email"
          help="Change this from your account menu — it is tied to how you sign in."
        >
          <span className="set-readonly mono">{saved.email || "—"}</span>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Plan &amp; credits" sub="Subscription, top-ups, and invoices.">
        <SettingsRow
          label="Current plan"
          help={`${PLAN_CREDITS[saved.plan].toLocaleString()} credits per month.`}
        >
          <div className="set-plan">
            <span className="set-plan-name">{saved.plan}</span>
            <Link href="/billing" className="tb-btn outlined">
              Manage billing
              <ArrowUpRight className="ic" aria-hidden="true" />
            </Link>
          </div>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
