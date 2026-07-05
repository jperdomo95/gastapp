import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createCategorySchema, type CreateCategoryDto, type Category } from '@gastapp/types';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
} from '@/hooks/use-categories';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { catColor, catHue, catSoft, catTint } from '@/lib/pulse';

export function CategoriesPage() {
  const { data: categories } = useCategories();
  const { theme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const maxTotal = Math.max(...(categories ?? []).map((c) => c.expenseCount), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-pulse-faint">
            {categories?.length ?? 0} categories
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> New category
        </Button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {categories?.map((cat) => {
          const hue = catHue(cat.name, cat.color);
          return (
            <Card key={cat.id} className="relative p-4">
              {/* System badge */}
              {cat.isSystem && (
                <span className="absolute right-3 top-3 rounded-full border border-pulse-stroke px-2 py-0.5 text-[9px] uppercase tracking-widest text-pulse-faint">
                  system
                </span>
              )}

              {/* Icon tile */}
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold"
                style={{ background: catSoft(hue, theme), color: catTint(hue, theme) }}
              >
                {cat.icon ?? cat.name[0]?.toUpperCase()}
              </div>

              <p className="text-sm font-semibold text-pulse-text">{cat.name}</p>
              <p className="mt-0.5 text-xs text-pulse-faint">{cat.expenseCount} entries</p>

              {/* Progress bar */}
              <div className="mt-3 h-1 w-full rounded-full" style={{ background: 'var(--pulse-track)' }}>
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${(cat.expenseCount / maxTotal) * 100}%`,
                    background: `linear-gradient(90deg, ${catColor(hue, theme)}, ${catColor(hue + 18, theme)})`,
                  }}
                />
              </div>

              {/* Actions */}
              {!cat.isSystem && (
                <div className="mt-3 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(cat)}>
                    <Pencil size={13} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(cat)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
            </Card>
          );
        })}

        {/* Add new tile */}
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-pulse-card border border-dashed border-pulse-stroke text-pulse-faint transition-colors hover:border-pulse-v2 hover:text-pulse-v2"
        >
          <Plus size={20} />
          <span className="text-xs font-medium">New category</span>
        </button>
      </div>

      {/* New category dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="New category">
          <CategoryForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit category">
          {editing && <CategoryForm category={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
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
          ? `This category has ${category.expenseCount} expense${category.expenseCount === 1 ? '' : 's'}. Pick a category to move them to first.`
          : 'This permanently removes the category.'
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
          setError('Could not delete. Please try again.');
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
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </ConfirmDialog>
  );
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateCategoryDto>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category
      ? { name: category.name, icon: category.icon ?? undefined, color: category.color ?? undefined }
      : { color: '#7c5cff' },
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
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
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
            value={color ?? '#7c5cff'}
            onChange={(e) => setValue('color', e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-pulse-stroke bg-pulse-glass px-1"
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
