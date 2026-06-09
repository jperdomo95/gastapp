import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  /** Extra content (e.g. a reassignment picker) rendered between the description and the footer. */
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
          <AlertDialogPrimitive.Title className="text-lg font-semibold">{title}</AlertDialogPrimitive.Title>
          {description && (
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-neutral-600">
              {description}
            </AlertDialogPrimitive.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button type="button" variant="secondary">{cancelLabel}</Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              type="button"
              variant={variant}
              disabled={loading || confirmDisabled}
              onClick={onConfirm}
            >
              {loading ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
