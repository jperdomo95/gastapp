import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { createExpenseSchema, type CreateExpenseDto } from '@gastapp/types';
import { useCreateExpense } from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { catSoft, catTint, SYSTEM_CATEGORY_HUES } from '@/lib/pulse';
import { useThemeStore } from '@/stores/theme-store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

export function AddExpenseSheet({ open, onOpenChange }: Props) {
  const { theme } = useThemeStore();
  const { data: categories } = useCategories();
  const create = useCreateExpense();

  const [amount, setAmount] = useState('0');
  const [selectedCat, setSelectedCat] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateExpenseDto>({
    resolver: zodResolver(createExpenseSchema),
  });

  function handleKey(key: string) {
    setAmount((prev) => {
      if (key === '⌫') return prev.length > 1 ? prev.slice(0, -1) : '0';
      if (key === '.' && prev.includes('.')) return prev;
      if (prev === '0' && key !== '.') return key;
      if (prev.includes('.') && prev.split('.')[1]!.length >= 2) return prev;
      return prev + key;
    });
  }

  function handleClose() {
    setAmount('0');
    setSelectedCat('');
    reset();
    onOpenChange(false);
  }

  async function onSubmit(data: CreateExpenseDto) {
    if (!selectedCat || Number(amount) <= 0) return;
    await create.mutateAsync({ ...data, amount, categoryId: selectedCat });
    handleClose();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[var(--pulse-scrim)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />

        {/* Desktop: centered modal */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 hidden w-full max-w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-pulse-card border border-pulse-stroke bg-[var(--pulse-sheet-bg)] p-6 shadow-pulse-card backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:block"
        >
          <SheetBody
            amount={amount}
            selectedCat={selectedCat}
            setSelectedCat={setSelectedCat}
            categories={categories ?? []}
            theme={theme}
            register={register}
            errors={errors}
            onKeypad={undefined}
            onSubmit={handleSubmit(onSubmit)}
            onClose={handleClose}
            loading={create.isPending}
          />
        </DialogPrimitive.Content>

        {/* Mobile: bottom sheet */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-pulse-sheet border-t border-pulse-stroke bg-[var(--pulse-sheet-bg)] px-5 pb-8 pt-3 shadow-pulse-card backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom md:hidden"
        >
          {/* Grabber */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--pulse-handle)]" />
          <SheetBody
            amount={amount}
            selectedCat={selectedCat}
            setSelectedCat={setSelectedCat}
            categories={categories ?? []}
            theme={theme}
            register={register}
            errors={errors}
            onKeypad={handleKey}
            onSubmit={handleSubmit(onSubmit)}
            onClose={handleClose}
            loading={create.isPending}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SheetBody({
  amount, selectedCat, setSelectedCat, categories, theme,
  register, errors, onKeypad, onSubmit, onClose, loading,
}: {
  amount: string;
  selectedCat: string;
  setSelectedCat: (id: string) => void;
  categories: Array<{ id: string; name: string; icon: string | null; color: string | null; isSystem: boolean; expenseCount: number }>;
  theme: 'dark' | 'light';
  register: ReturnType<typeof useForm<CreateExpenseDto>>['register'];
  errors: ReturnType<typeof useForm<CreateExpenseDto>>['formState']['errors'];
  onKeypad: ((key: string) => void) | undefined;
  onSubmit: React.FormEventHandler;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <DialogPrimitive.Title className="text-base font-semibold text-pulse-text">
          New expense
        </DialogPrimitive.Title>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-pulse-faint hover:bg-pulse-glass">
          <X size={16} />
        </button>
      </div>

      {/* Amount display */}
      <div className="text-center">
        <span
          className={`gradient-hero-text text-[52px] font-bold leading-none tracking-tight pulse-caret`}
        >
          ${amount}
        </span>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const hue = cat.color
            ? parseInt(cat.color.replace('#', ''), 16) % 360
            : SYSTEM_CATEGORY_HUES[cat.name] ?? 230;
          const isSelected = selectedCat === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCat(cat.id)}
              className="rounded-pulse-chip px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: catSoft(hue, theme),
                color: catTint(hue, theme),
                border: isSelected ? `1px solid ${catTint(hue, theme)}` : '1px solid transparent',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Date + Note */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ae-date">Date</Label>
          <Input
            id="ae-date"
            type="date"
            className="mt-1"
            defaultValue={new Date().toISOString().slice(0, 10)}
            {...register('date')}
          />
          {errors.date && <p className="mt-1 text-xs text-red-400">{errors.date.message}</p>}
        </div>
        <div>
          <Label htmlFor="ae-note">Note</Label>
          <Input
            id="ae-note"
            placeholder="Optional note"
            className="mt-1"
            {...register('description')}
          />
        </div>
      </div>

      {/* Numeric keypad (mobile only) */}
      {onKeypad && (
        <div className="grid grid-cols-3 gap-2">
          {KEYPAD.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onKeypad(k)}
              className="flex h-12 items-center justify-center rounded-xl bg-pulse-glass text-lg font-medium text-pulse-text transition-colors hover:bg-pulse-glass-hi active:scale-95"
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !selectedCat || Number(amount) <= 0}
      >
        {loading ? 'Adding…' : 'Add expense'}
      </Button>
    </form>
  );
}

import type React from 'react';
