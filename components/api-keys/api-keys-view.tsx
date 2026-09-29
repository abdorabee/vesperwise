"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Check, Copy, KeyRound, Plus } from "lucide-react";
import {
  EmptyState,
  InlineError,
  PageHeader,
  PageSurface,
} from "@/components/app-ui/page-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  API_KEY_LABEL_MAX,
  API_KEY_PREFIX,
  scoreCurlExample,
  type ApiKeySummary,
} from "@/lib/api-keys";
import { cn } from "@/lib/utils";

/** Real monospace for keys and code — the app's --font-mono token is a sans. */
const MONO = "[font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]";

const DATE_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
}

const PUBLIC_ORIGIN = "https://www.vesperwise.com";
const subscribeNoop = () => () => {};
function useOrigin() {
  return useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => PUBLIC_ORIGIN
  );
}

function CopyButton({
  text,
  label,
  size = "sm",
  variant = "outline",
}: {
  text: string;
  label: string;
  size?: "sm" | "xs";
  variant?: "outline" | "default";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — select the text and copy it manually.");
    }
  }

  return (
    <Button type="button" size={size} variant={variant} onClick={copy} className="active:scale-[0.96]">
      <span className="relative inline-grid size-4 place-items-center" aria-hidden="true">
        <Copy
          className={cn(
            "absolute size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
            copied ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
          )}
        />
        <Check
          className={cn(
            "absolute size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
            copied ? "scale-100 opacity-100 blur-0" : "scale-25 opacity-0 blur-[4px]"
          )}
        />
      </span>
      <span>{copied ? "Copied" : label}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </Button>
  );
}

type CreateState =
  | { step: "closed" }
  | { step: "form"; saving: boolean; error: string | null }
  | { step: "reveal"; key: string; label: string };

export function ApiKeysView({
  initialKeys,
  initialError,
}: {
  initialKeys: ApiKeySummary[];
  initialError: string | null;
}) {
  const origin = useOrigin();
  const [keys, setKeys] = useState<ApiKeySummary[]>(initialKeys);
  const loadError = initialError;
  const [create, setCreate] = useState<CreateState>({ step: "closed" });
  const [name, setName] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const activeKeys = keys.filter((k) => k.is_active);
  const showLastUsed = keys.some((k) => k.last_used);

  function openCreate() {
    setName("");
    setCreate({ step: "form", saving: false, error: null });
  }

  function closeCreate() {
    // Drop the plaintext key from memory as soon as the dialog closes.
    setCreate({ step: "closed" });
    setName("");
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (create.step !== "form" || create.saving) return;
    setCreate({ step: "form", saving: true, error: null });
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: name.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        key?: string;
        record?: ApiKeySummary;
        error?: string;
      };
      if (!res.ok || !data.key || !data.record) {
        throw new Error(data.error ?? "Couldn't create the key. Try again.");
      }
      setKeys((prev) => [data.record!, ...prev]);
      setCreate({ step: "reveal", key: data.key, label: data.record.label });
    } catch (err) {
      setCreate({
        step: "form",
        saving: false,
        error: err instanceof Error ? err.message : "Couldn't create the key. Try again.",
      });
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/user/api-keys?id=${encodeURIComponent(revokeTarget.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't revoke the key. Try again.");
      const revokedLabel = revokeTarget.label;
      setKeys((prev) => prev.map((k) => (k.id === revokeTarget.id ? { ...k, is_active: false } : k)));
      setRevokeTarget(null);
      toast.success(`Revoked “${revokedLabel}”. Requests using it now return 401.`);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Couldn't revoke the key. Try again.");
    } finally {
      setRevoking(false);
    }
  }

  const curl = scoreCurlExample(origin);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API keys"
        description="Call the VesperWise REST API from your own tools. Keys act on behalf of this workspace, and each score request spends 1 credit — the same as scoring in the app."
        actions={
          <Button type="button" onClick={openCreate} className="active:scale-[0.96]">
            <Plus aria-hidden="true" />
            Create key
          </Button>
        }
      />

      {loadError ? (
        <InlineError title="Keys didn't load" description={loadError} />
      ) : null}

      <PageSurface
        title="Your keys"
        description={
          activeKeys.length > 0
            ? `${activeKeys.length} active ${activeKeys.length === 1 ? "key" : "keys"}. Keys are stored hashed, so they can't be shown again.`
            : "Keys are stored hashed, so a key is shown only once, when you create it."
        }
      >
        {keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="size-5" aria-hidden="true" />}
            title="No API keys yet"
            description="Create a key to score companies from a script, your CRM or a workflow tool."
            action={
              <Button type="button" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Create your first key
              </Button>
            }
            className="min-h-56"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead>Created</TableHead>
                {showLastUsed ? <TableHead>Last used</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id} className={cn(!k.is_active && "text-muted-foreground")}>
                  <TableCell className="pl-5">
                    <div className="font-medium text-foreground">{k.label}</div>
                    <div className={cn("text-xs text-muted-foreground", MONO)}>{API_KEY_PREFIX}••••••••</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(k.created_at)}</TableCell>
                  {showLastUsed ? (
                    <TableCell className="tabular-nums">{k.last_used ? formatDate(k.last_used) : "Never"}</TableCell>
                  ) : null}
                  <TableCell>
                    {k.is_active ? (
                      <Badge variant="outline" className="gap-1.5 font-medium">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--success,#15803d)]" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-medium text-muted-foreground">
                        Revoked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {k.is_active ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setRevokeError(null);
                          setRevokeTarget(k);
                        }}
                        aria-label={`Revoke ${k.label}`}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageSurface>

      <PageSurface
        title="Quick start"
        description="Score a company with one request. Send the key as a Bearer token."
        action={<CopyButton text={curl} label="Copy" />}
      >
        <pre
          className={cn(
            "overflow-x-auto px-5 py-4 text-[13px] leading-6 text-foreground",
            MONO
          )}
        >
          <code>{curl}</code>
        </pre>
        <p className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
          Replace <code className={MONO}>{API_KEY_PREFIX}YOUR_KEY</code> with a key from above. The response has the
          same score, band and reasoning you see in the app.{" "}
          <Link href="/docs" className="font-medium text-foreground underline underline-offset-4">
            API reference
          </Link>
        </p>
      </PageSurface>

      {/* Create → reveal once */}
      <Dialog open={create.step !== "closed"} onOpenChange={(open) => (open ? null : closeCreate())}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => {
            // Don't let a stray click discard a key the user hasn't copied yet.
            if (create.step === "reveal") e.preventDefault();
          }}
        >
          {create.step === "reveal" ? (
            <>
              <DialogHeader>
                <DialogTitle>Copy your new key</DialogTitle>
                <DialogDescription>
                  “{create.label}” is ready. Store it somewhere safe, like a secrets manager.
                </DialogDescription>
              </DialogHeader>
              <div
                role="note"
                className="flex gap-2.5 rounded-lg border border-[var(--warm-border,rgba(180,83,9,0.3))] bg-[var(--warm-bg,rgba(180,83,9,0.08))] px-3 py-2.5 text-sm text-foreground"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warm,#b45309)]" aria-hidden="true" />
                <p>This is the only time the key is shown. If you lose it, revoke it and create a new one.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-api-key">API key</Label>
                <Input
                  id="new-api-key"
                  readOnly
                  value={create.key}
                  onFocus={(e) => e.currentTarget.select()}
                  className={cn("text-[13px]", MONO)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <CopyButton text={create.key} label="Copy key" variant="default" />
                <Button type="button" variant="outline" size="sm" onClick={closeCreate}>
                  I&apos;ve saved it
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={submitCreate} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Name it after where it will be used, so you know what breaks if you revoke it.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="api-key-name">
                  Name <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="api-key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CRM sync"
                  maxLength={API_KEY_LABEL_MAX}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {create.step === "form" && create.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {create.error}
                </p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={closeCreate}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={create.step === "form" && create.saving}>
                  {create.step === "form" && create.saving ? "Creating…" : "Create key"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revoking) setRevokeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke “{revokeTarget?.label}”?</DialogTitle>
            <DialogDescription>
              Anything using this key stops working immediately and gets a 401. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {revokeError ? (
            <p role="alert" className="text-sm text-destructive">
              {revokeError}
            </p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={confirmRevoke} disabled={revoking}>
              {revoking ? "Revoking…" : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
