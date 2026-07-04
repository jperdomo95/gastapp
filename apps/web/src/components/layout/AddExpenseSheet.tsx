import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { z } from 'zod';
import { useCreateExpense } from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { catHue, catSoft, catTint } from '@/lib/pulse';
import { useThemeStore } from '@/stores/theme-store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

// Only the fields react-hook-form owns; amount and category are component
// state, so validating the full createExpenseSchema here can never pass.
// The date input yields YYYY-MM-DD; onSubmit converts it to the ISO datetime
// the API's schema requires.
const sheetFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().max(280).optional(),
});
type SheetForm = z.infer<typeof sheetFormSchema>;

export function AddExpenseSheet({ open, onOpenChange }: Props) {
  const { theme } = useThemeStore();
  const { data: categories } = useCategories();
  const create = useCreateExpense();

  const [amount, setAmount] = useState('0');
  const [selectedCat, setSelectedCat] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SheetForm>({
    resolver: zodResolver(sheetFormSchema),
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

  function handleAmountInput(value: string) {
    const clean = value.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '');
    if (!/^\d*\.?\d{0,2}$/.test(clean)) return;
    setAmount(clean === '' ? '0' : clean);
  }

  function handleClose() {
    setAmount('0');
    setSelectedCat('');
    reset();
    onOpenChange(false);
  }

  async function onSubmit(data: SheetForm) {
    if (!selectedCat || Number(amount) <= 0) return;
    await create.mutateAsync({
      amount: Number(amount).toFixed(2),
      currency: 'USD',
      description: data.description || undefined,
      // Noon local time keeps the calendar day stable across timezones.
      date: new Date(`${data.date}T12:00:00`).toISOString(),
      categoryId: selectedCat,
    });
    handleClose();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[var(--pulse-scrim)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />

        {/* Single Content, responsive: bottom sheet below md, centered modal at md+.
            A Dialog.Root must have exactly one Content — a second one registers a
            competing dismissable layer and the dialog closes as soon as it opens. */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed z-50 border-pulse-stroke bg-[var(--pulse-sheet-bg)] shadow-pulse-card backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 inset-x-0 bottom-0 rounded-t-pulse-sheet border-t px-5 pb-8 pt-3 max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-[540px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-pulse-card md:border md:p-6 md:data-[state=open]:zoom-in-95"
        >
          {/* Grabber (bottom sheet only) */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--pulse-handle)] md:hidden" />
          <SheetBody
            amount={amount}
            selectedCat={selectedCat}
            setSelectedCat={setSelectedCat}
            categories={categories ?? []}
            theme={theme}
            register={register}
            errors={errors}
            onKeypad={handleKey}
            onAmountChange={handleAmountInput}
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
  register, errors, onKeypad, onAmountChange, onSubmit, onClose, loading,
}: {
  amount: string;
  selectedCat: string;
  setSelectedCat: (id: string) => void;
  categories: Array<{ id: string; name: string; icon: string | null; color: string | null; isSystem: boolean; expenseCount: number }>;
  theme: 'dark' | 'light';
  register: ReturnType<typeof useForm<SheetForm>>['register'];
  errors: ReturnType<typeof useForm<SheetForm>>['formState']['errors'];
  onKeypad: (key: string) => void;
  onAmountChange: (value: string) => void;
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
          const hue = catHue(cat.name, cat.color);
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

      {/* Amount input (desktop; mobile enters via the keypad) */}
      <div className="hidden md:block">
        <Label htmlFor="ae-amount">Amount</Label>
        <Input
          id="ae-amount"
          inputMode="decimal"
          className="mt-1"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />
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
      <div className="grid grid-cols-3 gap-2 md:hidden">
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
