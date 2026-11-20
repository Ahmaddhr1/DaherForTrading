"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// A custom in-app confirmation popup, used in place of the browser's
// native window.confirm() for destructive actions (deleting a record).
// Keeping this generic (title/description/confirmLabel/variant) lets every
// delete button across the app share one consistent-looking dialog instead
// of each page building its own.
export function ConfirmDialog({
  open,
  onClose,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  variant = "destructive",
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={variant} onClick={onConfirm} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
