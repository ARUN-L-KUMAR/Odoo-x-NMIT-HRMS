import { useEffect, useState } from "react";

/**
 * Debounces a value by the given delay (default 300ms).
 * Ported from Faceviz — used to prevent API calls on every keystroke
 * in search inputs across Employees, Attendance, and Payroll pages.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
