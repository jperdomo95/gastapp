import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  createExpenseSchema, type CreateExpenseDto, type Expense, type ImportExpensesResult,
} from '@gastapp/types';
import {
  useCreateExpense, useUpdateExpense, useDeleteExpense, useExpenses,
  useImportExpenses,
} from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 25;

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { data } = useExpenses({ page, pageSize: PAGE_SIZE });
  const remove = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary"><Upload size={16} /> Import CSV</Button>
            </DialogTrigger>
            <DialogContent title="Import bank CSV">
              <ImportForm onDone={() => setImportOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> New expense</Button>
            </DialogTrigger>
            <DialogContent title="New expense">
              <ExpenseForm onDone={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-500">{e.date.slice(0, 10)}</td>
                <td className="px-4 py-3">{e.description ?? '—'}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {e.currency} {e.amount}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(e)}>
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-neutral-500">No expenses yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Showing {rangeStart}–{rangeEnd} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Prev
            </Button>
            <span className="tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit expense">
          {editing && <ExpenseForm expense={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete expense?"
        description="This permanently removes the expense. This action cannot be undone."
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
          {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
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
        {errors.categoryId && <p className="text-xs text-red-600">Required</p>}
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

  // After a successful import, show the summary instead of the form.
  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <p className="font-medium text-neutral-800">
            Imported {result.imported} expense{result.imported === 1 ? '' : 's'}.
          </p>
          <p className="text-neutral-500">
            {result.skipped} row{result.skipped === 1 ? '' : 's'} skipped (credits / non-debit rows).
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-700">
              {result.errors.slice(0, 8).map((e) => (
                <li key={e.line}>Line {e.line}: {e.reason}</li>
              ))}
              {result.errors.length > 8 && <li>…and {result.errors.length - 8} more</li>}
            </ul>
          )}
        </div>
        <p className="text-xs text-neutral-500">
          The imported entries were all filed under the category you picked — edit them individually here.
        </p>
        <div className="flex justify-end pt-2">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Upload a CSV exported from your bank. Money-out rows (debits) are imported as expenses under
        a single category; credits and refunds are skipped. You can fix categories afterwards.
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
        <Input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

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
