import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createCategorySchema, type CreateCategoryDto, type Category } from '@gastapp/types';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
} from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export function CategoriesPage() {
  const { data: categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> New category</Button>
          </DialogTrigger>
          <DialogContent title="New category">
            <CategoryForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Expenses</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories?.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-200"
                      style={{ backgroundColor: c.color ?? '#e5e5e5' }}
                    />
                    {c.icon && <span>{c.icon}</span>}
                    <span className="font-medium">{c.name}</span>
                    {c.isSystem && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                        System
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{c.expenseCount}</td>
                <td className="px-4 py-3 text-right">
                  {!c.isSystem && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(c)}>
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {categories && categories.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-neutral-500">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit category">
          {editing && <CategoryForm category={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      {deleting && (
        <DeleteCategoryConfirm
          category={deleting}
          categories={categories ?? []}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function DeleteCategoryConfirm({
  category, categories, onClose,
}: { category: Category; categories: Category[]; onClose: () => void }) {
  const remove = useDeleteCategory();
  const [reassignTo, setReassignTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const needsReassign = category.expenseCount > 0;
  const targets = categories.filter((c) => c.id !== category.id);

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Delete "${category.name}"?`}
      description={
        needsReassign
          ? `This category has ${category.expenseCount} expense${category.expenseCount === 1 ? '' : 's'}. Pick a category to move them to before deleting.`
          : 'This permanently removes the category. This action cannot be undone.'
      }
      loading={remove.isPending}
      confirmDisabled={needsReassign && !reassignTo}
      onConfirm={async () => {
        setError(null);
        try {
          await remove.mutateAsync({
            id: category.id,
            reassignTo: needsReassign ? reassignTo : undefined,
          });
          onClose();
        } catch {
          setError('Could not delete this category. Please try again.');
        }
      }}
    >
      {needsReassign && (
        <div className="space-y-1.5">
          <Label>Move expenses to</Label>
          <Select value={reassignTo} onValueChange={setReassignTo}>
            <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent>
              {targets.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </ConfirmDialog>
  );
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateCategoryDto>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category
      ? {
        name: category.name,
        icon: category.icon ?? undefined,
        color: category.color ?? undefined,
      }
      : { color: '#10b981' },
  });
  const color = watch('color');
  const isPending = create.isPending || update.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (dto) => {
        if (category) {
          await update.mutateAsync({ id: category.id, dto });
        } else {
          await create.mutateAsync(dto);
        }
        onDone();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="icon">Icon (optional)</Label>
          <Input id="icon" placeholder="🍔" {...register('icon')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <input
            id="color"
            type="color"
            value={color ?? '#10b981'}
            onChange={(e) => setValue('color', e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-neutral-200 bg-white px-1"
          />
        </div>
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
