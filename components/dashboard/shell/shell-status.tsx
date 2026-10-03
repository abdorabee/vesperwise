"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface ShellStatusMessage {
  text: string;
  busy?: boolean;
}

interface ShellStatusContextValue {
  message: ShellStatusMessage | null;
  setMessage: (message: ShellStatusMessage | null) => void;
}

const ShellStatusContext = createContext<ShellStatusContextValue | null>(null);

export function ShellStatusProvider({
  children,
  initialMessage = null,
}: {
  children: React.ReactNode;
  initialMessage?: ShellStatusMessage | null;
}) {
  const [message, setMessage] = useState<ShellStatusMessage | null>(initialMessage);
  const value = useMemo(() => ({ message, setMessage }), [message]);
  return <ShellStatusContext.Provider value={value}>{children}</ShellStatusContext.Provider>;
}

export function useShellStatusValue() {
  return useContext(ShellStatusContext)?.message ?? null;
}

export function useShellStatus(message: ShellStatusMessage | null) {
  // Depend on the stable setter and primitive fields only. The context value and the
  // message object both change on every update, which would re-run this effect forever.
  const setMessage = useContext(ShellStatusContext)?.setMessage;
  const text = message?.text ?? null;
  const busy = message?.busy ?? false;
  useEffect(() => {
    if (!setMessage) return undefined;
    setMessage(text === null ? null : { text, busy });
    return () => setMessage(null);
  }, [setMessage, text, busy]);
}
