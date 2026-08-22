"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  className?: string;
}

/**
 * ExportButton — CSV export button inspired by Faceviz's exportTo.tsx.
 *
 * Uses the browser's native Blob API (no external dependencies).
 * Exports any table data to a downloadable CSV file.
 *
 * Usage:
 *   <ExportButton
 *     data={employees}
 *     filename="employees"
 *     columns={[
 *       { header: "Name", accessor: (r) => `${r.firstName} ${r.lastName}` },
 *       { header: "Department", accessor: "department" },
 *       { header: "Status", accessor: "employmentStatus" },
 *     ]}
 *   />
 */
export function ExportButton<T extends object>({
  data,
  columns,
  filename = "export",
  className,
}: ExportButtonProps<T>) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    // Build CSV rows
    const headers = columns.map((c) => `"${c.header}"`).join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value =
            typeof col.accessor === "function"
              ? col.accessor(row)
              : row[col.accessor];
          // Escape quotes and wrap in quotes
          const str = value === null || value === undefined ? "" : String(value);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleExport}
      disabled={!data || data.length === 0}
      title="Export to CSV"
    >
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Export CSV
    </Button>
  );
}
