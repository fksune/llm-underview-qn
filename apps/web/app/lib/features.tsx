import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "feedback-feature-flags";

export type FeatureFlag = "darkMode" | "filterPills" | "dateSeparators";

export const ALL_FLAGS: FeatureFlag[] = ["darkMode", "filterPills", "dateSeparators"];

function loadFlags(): Set<FeatureFlag> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FeatureFlag[];
      return new Set(parsed.filter((f) => ALL_FLAGS.includes(f)));
    }
  } catch {}
  return new Set();
}

function saveFlags(flags: Set<FeatureFlag>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...flags]));
}

interface FeatureContextValue {
flags: Set<FeatureFlag>;
  isEnabled: (flag: FeatureFlag) => boolean;
  toggle: (flag: FeatureFlag) => void;
}

const FeatureContext = createContext<FeatureContextValue | null>(null);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Set<FeatureFlag>>(loadFlags);

  const toggle = useCallback((flag: FeatureFlag) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) {
        next.delete(flag);
      } else {
        next.add(flag);
      }
      saveFlags(next);
      return next;
    });
  }, []);

  const isEnabled = useCallback((flag: FeatureFlag) => flags.has(flag), [flags]);

  return (
    <FeatureContext.Provider value={{ flags, isEnabled, toggle }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeature(flag: FeatureFlag): boolean {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeature must be used within FeatureProvider");
  return ctx.isEnabled(flag);
}

export function useFeatureToggle() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatureToggle must be used within FeatureProvider");
  return ctx.toggle;
}

export function useAllFlags() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useAllFlags must be used within FeatureProvider");
  return ctx.flags;
}