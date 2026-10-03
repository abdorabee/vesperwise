"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ShellPanelSize = "default" | "wide";

interface ActivePanel {
  id: symbol;
  label: string;
  size: ShellPanelSize;
  onClose?: () => void;
}

interface ShellPanelContextValue {
  activePanel: ActivePanel | null;
  target: HTMLElement | null;
  setTarget: (target: HTMLElement | null) => void;
  registerPanel: (panel: ActivePanel) => () => void;
  closePanel: () => void;
}

interface ShellPanelProviderProps {
  children: React.ReactNode;
  initialPanel?: { open: boolean; size?: ShellPanelSize; label: string };
}

const ShellPanelContext = createContext<ShellPanelContextValue | null>(null);

export function isShellPanelCloseKey(event: Pick<KeyboardEvent, "key">) {
  return event.key === "Escape";
}

export function shellPanelWidth(open: boolean, size: ShellPanelSize = "default") {
  if (!open) return "0px";
  return size === "wide" ? "var(--panel-w-wide)" : "var(--panel-w)";
}

export function ShellPanelProvider({ children, initialPanel }: ShellPanelProviderProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(() => (
    initialPanel?.open
      ? { id: Symbol("initial-shell-panel"), label: initialPanel.label, size: initialPanel.size ?? "default" }
      : null
  ));

  const registerPanel = useCallback((panel: ActivePanel) => {
    setActivePanel(panel);
    return () => {
      setActivePanel((current) => (current?.id === panel.id ? null : current));
    };
  }, []);

  const activePanelRef = useRef(activePanel);
  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  // A page that owns the panel closes it through onClose; side effects stay out of the state updater.
  const closePanel = useCallback(() => {
    const current = activePanelRef.current;
    if (current?.onClose) current.onClose();
    else setActivePanel(null);
  }, []);

  const value = useMemo<ShellPanelContextValue>(() => ({
    activePanel,
    target,
    setTarget,
    registerPanel,
    closePanel,
  }), [activePanel, closePanel, registerPanel, target]);

  return <ShellPanelContext.Provider value={value}>{children}</ShellPanelContext.Provider>;
}

export function useShellPanelFrame() {
  const context = useContext(ShellPanelContext);
  if (!context) return { managed: false, open: false, size: "default" as ShellPanelSize };
  return {
    managed: true,
    open: Boolean(context.activePanel),
    size: context.activePanel?.size ?? "default",
  };
}

export function ShellPanelSlot() {
  const context = useContext(ShellPanelContext);
  // Depend on the stable setter only: setting the target changes the context value,
  // so depending on `context` would recreate this ref and loop forever.
  const setTarget = context?.setTarget;
  const ref = useCallback((node: HTMLDivElement | null) => {
    setTarget?.(node);
  }, [setTarget]);

  return (
    <div
      ref={ref}
      data-slot="shell-panel-target"
      data-open={Boolean(context?.activePanel)}
      className="dashboard-shell-panel-target"
    />
  );
}

export function ShellPanel({
  open,
  size = "default",
  onClose,
  label,
  children,
}: {
  open: boolean;
  size?: ShellPanelSize;
  onClose?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const context = useContext(ShellPanelContext);
  const idRef = useRef<symbol>(Symbol("shell-panel"));
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // registerPanel and closePanel are stable; depending on `context` or an inline
  // onClose would re-register on every render and loop, because registering
  // changes the context value.
  const registerPanel = context?.registerPanel;
  const closePanel = context?.closePanel;
  const hasOnClose = Boolean(onClose);

  useEffect(() => {
    if (!open || !registerPanel) return undefined;
    return registerPanel({
      id: idRef.current,
      label,
      size,
      onClose: hasOnClose ? () => onCloseRef.current?.() : undefined,
    });
  }, [registerPanel, label, open, size, hasOnClose]);

  useEffect(() => {
    if (!open || !closePanel) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isShellPanelCloseKey(event)) return;
      event.preventDefault();
      closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel, open]);

  if (!open || !context?.target) return null;

  return createPortal(
    <section
      role="dialog"
      aria-label={label}
      data-slot="shell-panel"
      data-size={size}
      className="dashboard-shell-panel"
    >
      {children}
    </section>,
    context.target,
  );
}
