import { useState } from "react";

/**
 * usePersistedTab — ported from Faceviz.
 *
 * Persists the active tab value in sessionStorage so it survives
 * page refreshes within the same browser session.
 *
 * Usage:
 *   const [activeTab, setActiveTab] = usePersistedTab("leave-page", "my-requests");
 *
 * @param key          - Unique storage key (scoped as `tabState:<key>`)
 * @param defaultValue - Default tab value if nothing stored yet
 */
export function usePersistedTab<T extends string>(
  key: string,
  defaultValue: T
): [T, (v: T) => void] {
  const storageKey = `tabState:${key}`;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    const stored = sessionStorage.getItem(storageKey);
    return (stored as T) ?? defaultValue;
  });

  const setPersistedValue = (v: T) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, v);
    }
    setValue(v);
  };

  return [value, setPersistedValue];
}
