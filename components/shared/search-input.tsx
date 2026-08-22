"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (debouncedValue: string) => void;
  /** Debounce delay in ms (default 300ms) */
  delay?: number;
  className?: string;
  id?: string;
}

/**
 * SearchInput — debounced search field ported from Faceviz patterns.
 *
 * Internally wires `useDebounce` so the `onChange` callback only fires
 * after the user stops typing. Replaces manual search <Input> + useState
 * on Employees, Attendance, and Payroll pages.
 *
 * Usage:
 *   const [search, setSearch] = useState("");
 *   <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." />
 */
export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  delay = 300,
  className,
  id,
}: SearchInputProps) {
  const [local, setLocal] = React.useState(value);
  const debounced = useDebounce(local, delay);

  // Propagate debounced value upward
  React.useEffect(() => {
    onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Keep local in sync when parent resets value to ""
  React.useEffect(() => {
    if (value === "") setLocal("");
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        id={id}
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="pl-8 h-9"
      />
    </div>
  );
}
