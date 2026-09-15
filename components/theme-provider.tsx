"use client";

import { createContext, useContext, useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

let listeners: Array<() => void> = [];
function emitChange() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem("intentiq-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function getSnapshot(): Theme {
  return readStoredTheme();
}

function getServerSnapshot(): Theme {
  return "dark";
}

/** Imperative theme write — keeps ThemeProvider subscribers in sync (e.g. /dev/shell preview). */
export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem("intentiq-theme", theme);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  emitChange();
}

export function getStoredTheme(): Theme {
  return readStoredTheme();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setStoredTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
