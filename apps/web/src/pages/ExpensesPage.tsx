import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Upload } from 'lucide-react';
import {
  createExpenseSchema, type CreateExpenseDto, type Expense, type ImportExpensesResult,
} from '@gastapp/types';
import {
  useCreateExpense, useUpdateExpense, useDeleteExpense, useExpenses,
  useImportExpenses,
} from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { useMonthlyTotals } from '@/hooks/use-reports';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { catSoft, catTint, usd, SYSTEM_CATEGORY_HUES } from '@/lib/pulse';

const PAGE_SIZE = 25;

type FilterPeriod = 'all' | 'month';

function monthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString(),
    to:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
  };
}

function groupByDay(expenses: Expense[]): Array<{ label: string; date: string; items: Expense[]; dayTotal: number }> {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return Array.from(map.entries()).map(([date, items]) => {
    const d = new Date(date + 'T12:00:00');
    const label =
      date === today ? 'Today' :
      date === yesterday ? 'Yesterday' :
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayTotal = items.reduce((acc, e) => acc + Number(e.amount), 0);
    return { label, date, items, dayTotal };
  });
}

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [filterCat, setFilterCat] = useState<string>('');
  const { theme } = useThemeStore();

  const range = useMemo(() => monthRange(), []);
  const { data: monthlyData } = useMonthlyTotals(range);
  const { data: categories } = useCategories();

  const thisMonthKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const thisMonthTotal = Number(monthlyData?.find((m) => m.month === thisMonthKey)?.total ?? 0);

  const query = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    ...(period === 'month' ? { from: range.from, to: range.to } : {}),
    ...(filterCat ? { categoryId: filterCat } : {}),
  }), [page, period, filterCat, range]);

  const { data } = useExpenses(query);
  const remove = useDeleteExpense();
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const groups = useMemo(() => groupByDay(data?.items ?? []), [data]);

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div
        className="rounded-pulse-card p-4"
        style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.20), rgba(34,211,238,0.08))' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-pulse-dim">This month</p>
            <p className="mt-0.5 text-2xl font-bold text-pulse-text">${usd(thisMonthTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-pulse-dim">Entries</p>
            <p className="mt-0.5 text-2xl font-bold text-pulse-text">{total}</p>
          </div>
        </div>
      </div>

      {/* Filter chips + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Chip active={period === 'all'} onClick={() => { setPeriod('all'); setPage(1); }}>
            All time
          </Chip>
          <Chip active={period === 'month'} onClick={() => { setPeriod('month'); setPage(1); }}>
            This month
          </Chip>
          <Select value={filterCat} onValueChange={(v) => { setFilterCat(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] rounded-pulse-chip text-xs">
              <SelectValue placeholder="Category ▾" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm"><Upload size={14} /> CSV</Button>
          </DialogTrigger>
          <DialogContent title="Import bank CSV">
            <ImportForm onDone={() => setImportOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Grouped ledger */}
      {groups.length === 0 && (
        <Card className="py-16 text-center">
          <p className="text-pulse-faint">No expenses yet.</p>
        </Card>
      )}

      {groups.map((group) => (
        <div key={group.date}>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-pulse-text">{group.label}</span>
            <span className="text-xs text-pulse-faint">
              {new Date(group.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' · '}−${usd(group.dayTotal)}
            </span>
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-pulse-stroke">
              {group.items.map((e) => {
                const cat = categories?.find((c) => c.id === e.categoryId);
                const hue = SYSTEM_CATEGORY_HUES[cat?.name ?? ''] ?? 230;
                const initial = (e.description ?? cat?.name ?? '?')[0]?.toUpperCase() ?? '?';
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ background: catSoft(hue, theme), color: catTint(hue, theme) }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-pulse-text">
                        {e.description ?? 'Expense'}
                      </p>
                      <p className="text-xs text-pulse-faint">{cat?.name ?? '—'}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-pulse-text">
                      −${usd(Number(e.amount))}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(e)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ))}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-xs text-pulse-faint">
          <span>Showing {rangeStart}–{rangeEnd} of {total}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={13} />
            </Button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit expense">
          {editing && <ExpenseForm expense={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete expense?"
        description="This permanently removes the expense."
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const { data: categories } = useCategories();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const today = new Date().toISOString().slice(0, 10);
  const dateValue = expense ? expense.date.slice(0, 10) : today;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateExpenseDto>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: expense
      ? {
          amount: expense.amount,
          currency: expense.currency,
          description: expense.description ?? undefined,
          date: expense.date,
          categoryId: expense.categoryId,
        }
      : { currency: 'USD', date: new Date(today).toISOString() },
  });
  const categoryId = watch('categoryId');
  const isPending = create.isPending || update.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (dto) => {
        if (expense) {
          await update.mutateAsync({ id: expense.id, dto });
        } else {
          await create.mutateAsync(dto);
        }
        onDone();
      })}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" placeholder="0.00" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            defaultValue={dateValue}
            onChange={(e) => setValue('date', new Date(e.target.value).toISOString())}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={(v) => setValue('categoryId', v)}>
          <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
          <SelectContent>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-xs text-red-400">Required</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const { data: categories } = useCategories();
  const importCsv = useImportExpenses();
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportExpensesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file || !categoryId) return;
    setError(null);
    setResult(null);
    try {
      const res = await importCsv.mutateAsync({ file, categoryId });
      setResult(res);
    } catch {
      setError('Could not import this file. Make sure it is a bank CSV with a date and amount column.');
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <Card className="p-4 text-sm">
          <p className="font-semibold text-pulse-text">
            Imported {result.imported} expense{result.imported === 1 ? '' : 's'}.
          </p>
          <p className="text-pulse-dim">
            {result.skipped} row{result.skipped === 1 ? '' : 's'} skipped (credits).
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-400">
              {result.errors.slice(0, 8).map((e) => (
                <li key={e.line}>Line {e.line}: {e.reason}</li>
              ))}
              {result.errors.length > 8 && <li>…and {result.errors.length - 8} more</li>}
            </ul>
          )}
        </Card>
        <div className="flex justify-end pt-2">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-pulse-dim">
        Upload a CSV exported from your bank. Debit rows are imported; credits are skipped.
      </p>
      <div className="space-y-1.5">
        <Label>Category for all imported rows</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
          <SelectContent>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button onClick={submit} disabled={!file || !categoryId || importCsv.isPending}>
          {importCsv.isPending ? 'Importing…' : 'Import'}
        </Button>
      </div>
    </div>
  );
}
