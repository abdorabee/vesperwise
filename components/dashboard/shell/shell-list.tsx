"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ActiveList {
  id: symbol;
  label: string;
}

interface ShellListContextValue {
  activeList: ActiveList | null;
  target: HTMLElement | null;
  setTarget: (target: HTMLElement | null) => void;
  registerList: (list: ActiveList) => () => void;
}

interface ShellListProviderProps {
  children: React.ReactNode;
  initialList?: { open: boolean; label: string };
}

const ShellListContext = createContext<ShellListContextValue | null>(null);

export function ShellListProvider({ children, initialList }: ShellListProviderProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
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
  }), [activeList, registerList, target]);

  return <ShellListContext.Provider value={value}>{children}</ShellListContext.Provider>;
}

export function useShellListFrame() {
  const context = useContext(ShellListContext);
  if (!context) return { managed: false, open: false };
  return { managed: true, open: Boolean(context.activeList) };
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
        {actions ? (
          <div data-slot="shell-list-actions" className="dashboard-shell-list__actions">
            {actions}
          </div>
        ) : null}
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
