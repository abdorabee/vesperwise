"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ListRule, ListType } from "@/lib/lists-types";
import { LIST_COLORS, MAX_LIST_DOMAINS } from "@/lib/lists-types";
import { pluralize } from "@/lib/lists-display";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AccountPicker, type PickedAccount } from "./account-picker";
import { RuleBuilder } from "./rule-builder";

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_RULE: ListRule = { field: "score", op: ">=", value: 75 };
const PREVIEW_DEBOUNCE_MS = 300;

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Failed to create list";
  } catch {
    return "Failed to create list";
  }
}

export function CreateListModal({ open, onClose }: CreateListModalProps) {
  const router = useRouter();
  const [listType, setListType] = useState<ListType>("smart");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LIST_COLORS[0].value);
  const [rules, setRules] = useState<ListRule[]>([{ ...DEFAULT_RULE }]);
  const [accounts, setAccounts] = useState<PickedAccount[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async (r: ListRule[]) => {
    try {
      const res = await fetch("/api/dashboard/lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: r }),
      });
      const data = (await res.json()) as { count?: number };
      setPreviewCount(res.ok ? (data.count ?? 0) : null);
    } catch {
      setPreviewCount(null);
    }
  }, []);

  useEffect(() => {
    if (!open || listType !== "smart") return;
    const t = setTimeout(() => void fetchPreview(rules), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, listType, rules, fetchPreview]);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          list_type: listType,
          color,
          rules: listType === "smart" ? rules : undefined,
          auto_refresh: listType === "smart" ? autoRefresh : false,
          domains: listType === "manual" && accounts.length > 0 ? accounts : undefined,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { list: { id: string } };
      toast.success(`Created "${name.trim()}"`);
      onClose();
      setName("");
      setAccounts([]);
      router.push(`/lists/${data.list.id}`);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create list";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 p-0 sm:max-w-[580px]">
        <div className="lists-page flex min-h-0 flex-col">
          <div className="lst-modal-head">
            <DialogTitle className="title">Create a new list</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Choose a smart list built from rules, or a manual list you fill by hand.
          </DialogDescription>

          <div className="lst-modal-body">
            <div className="lst-field-label" id="list-type-label">List type</div>
            <div className="mode-picker" role="group" aria-labelledby="list-type-label">
              <button
                type="button"
                className={`mode-card${listType === "smart" ? " active" : ""}`}
                aria-pressed={listType === "smart"}
                onClick={() => setListType("smart")}
              >
                <div className="mi"><div className="t">Smart list</div></div>
                <div className="d">Builds itself from rules. Auto-refreshes as accounts qualify or drop out.</div>
              </button>
              <button
                type="button"
                className={`mode-card manual${listType === "manual" ? " active" : ""}`}
                aria-pressed={listType === "manual"}
                onClick={() => setListType("manual")}
              >
                <div className="mi"><div className="t">Manual list</div></div>
                <div className="d">Add accounts by hand. Membership only changes when you change it.</div>
              </button>
            </div>

            <div className="lst-field">
              <label className="lst-field-label" htmlFor="list-name">Name</label>
              <input
                id="list-name"
                className="lst-field-input"
                type="text"
                placeholder="e.g. Q3 expansion targets"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="lst-field">
              <div className="lst-field-label" id="list-color-label">Color</div>
              <div className="color-picker" role="group" aria-labelledby="list-color-label">
                {LIST_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`sw${color === c.value ? " active" : ""}`}
                    style={{ background: c.value }}
                    onClick={() => setColor(c.value)}
                    aria-label={c.label}
                    aria-pressed={color === c.value}
                  />
                ))}
              </div>
            </div>

            {listType === "smart" ? (
              <>
                <div className="lst-field">
                  <div className="lst-field-label">Rules: accounts match all of</div>
                  <RuleBuilder rules={rules} onChange={setRules} />
                </div>
                <div className="lst-autorefresh">
                  <div className="lst-autorefresh-info">
                    <div className="lst-autorefresh-title">Auto-refresh</div>
                    <div className="lst-autorefresh-sub">Re-evaluate every 6 hours and notify on changes.</div>
                  </div>
                  <button
                    type="button"
                    className={`lst-toggle${autoRefresh ? " on" : ""}`}
                    role="switch"
                    aria-checked={autoRefresh}
                    onClick={() => setAutoRefresh((v) => !v)}
                    aria-label="Auto-refresh"
                  >
                    <span className="lst-toggle-thumb" />
                  </button>
                </div>
              </>
            ) : (
              <div className="lst-field">
                <div className="lst-field-label">Accounts (optional)</div>
                <AccountPicker selected={accounts} onChange={setAccounts} max={MAX_LIST_DOMAINS} />
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <div className="lst-modal-foot">
            {listType === "smart" && previewCount != null && (
              <div className="preview-count">
                Matches <strong>{pluralize(previewCount, "account")}</strong> right now
              </div>
            )}
            <button type="button" className="tb-btn outlined" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create list"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
