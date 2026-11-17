"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PanelLeft, PanelLeftClose } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ActiveList {
  id: symbol;
  label: string;
}

interface ShellListContextValue {
  activeList: ActiveList | null;
  target: HTMLElement | null;
  setTarget: (target: HTMLElement | null) => void;
  registerList: (list: ActiveList) => () => void;
  /** Whether the list column is expanded. Owned here, independent of the app sidebar. */
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

interface ShellListProviderProps {
  children: React.ReactNode;
  initialList?: { open: boolean; label: string };
  /** Initial expanded state of the list column (default true; never persisted). */
  defaultExpanded?: boolean;
}

const ShellListContext = createContext<ShellListContextValue | null>(null);

export function ShellListProvider({ children, initialList, defaultExpanded = true }: ShellListProviderProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeList, setActiveList] = useState<ActiveList | null>(() => (
    initialList?.open ? { id: Symbol("initial-shell-list"), label: initialList.label } : null
  ));

  const registerList = useCallback((list: ActiveList) => {
    setActiveList(list);
    return () => {
      setActiveList((current) => (current?.id === list.id ? null : current));
    };
  }, []);

  const value = useMemo<ShellListContextValue>(() => ({
    activeList,
    target,
    setTarget,
    registerList,
    expanded,
    setExpanded,
  }), [activeList, expanded, registerList, target]);

  return <ShellListContext.Provider value={value}>{children}</ShellListContext.Provider>;
}

export function useShellListFrame() {
  const context = useContext(ShellListContext);
  if (!context) return { managed: false, open: false, expanded: true };
  return { managed: true, open: Boolean(context.activeList), expanded: context.expanded };
}

/** Shown in the page header while a page's list column is collapsed. */
export function ShellListReopenButton() {
  const context = useContext(ShellListContext);
  const label = context?.activeList?.label;
  if (!label || !context || context.expanded) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="hidden shrink-0 md:inline-flex"
      aria-label={`Show ${label}`}
      title={`Show ${label}`}
      onClick={() => context.setExpanded(true)}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

function ShellListCollapseButton({ label }: { label: string }) {
  const context = useContext(ShellListContext);
  if (!context) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Collapse ${label}`}
      title={`Collapse ${label}`}
      onClick={() => context.setExpanded(false)}
    >
      <PanelLeftClose className="size-3.5" />
    </Button>
  );
}

export function ShellListSlot() {
  const context = useContext(ShellListContext);
  // Depend on the stable setter only; setting the target changes the context value.
  const setTarget = context?.setTarget;
  const ref = useCallback((node: HTMLDivElement | null) => {
    setTarget?.(node);
  }, [setTarget]);

  return (
    <div
      ref={ref}
      data-slot="shell-list-target"
      data-open={Boolean(context?.activeList)}
      className="dashboard-shell-list-target"
    />
  );
}

export function ShellListColumn({
  label,
  title,
  actions,
  children,
}: {
  label: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} data-slot="shell-list" className="dashboard-shell-list">
      <header data-slot="shell-list-header" className="dashboard-shell-list__header">
        <h2 data-slot="shell-list-title" className="dashboard-shell-list__title">
          {title}
        </h2>
        <div data-slot="shell-list-actions" className="dashboard-shell-list__actions">
          {actions}
          <ShellListCollapseButton label={label} />
        </div>
      </header>
      <div data-slot="shell-list-body" className="dashboard-shell-list__body">
        {children}
      </div>
    </section>
  );
}

export function ShellList({
  label,
  title,
  actions,
  children,
}: {
  label: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const context = useContext(ShellListContext);
  const idRef = useRef<symbol>(Symbol("shell-list"));
  const registerList = context?.registerList;

  useEffect(() => {
    if (!registerList) return undefined;
    return registerList({ id: idRef.current, label });
  }, [registerList, label]);

  if (!context?.target) return null;

  return createPortal(
    <ShellListColumn label={label} title={title} actions={actions}>
      {children}
    </ShellListColumn>,
    context.target,
  );
}
