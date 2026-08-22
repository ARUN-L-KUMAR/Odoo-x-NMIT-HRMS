"use client";

import * as React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The resource name shown in the dialog, e.g. "John Doe" or "this record" */
  itemName?: string;
  /** Custom message override */
  message?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * DeleteConfirmDialog — reusable delete confirmation dialog, inspired by Faceviz's DeleteModal.tsx.
 *
 * Usage:
 *   <DeleteConfirmDialog
 *     open={deleteOpen}
 *     onOpenChange={setDeleteOpen}
 *     itemName={employee.firstName}
 *     onConfirm={() => deleteEmployee.mutate(employee.id)}
 *     isLoading={deleteEmployee.isPending}
 *   />
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  message,
  onConfirm,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const displayMessage =
    message ??
    (itemName
      ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
      : "Are you sure you want to delete this item? This action cannot be undone.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="p-1.5 rounded-full bg-destructive/10">
              <Trash2 className="h-4 w-4 text-destructive" />
            </span>
            Confirm Delete
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{displayMessage}</p>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
