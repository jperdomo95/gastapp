import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import {
  CURRENCY, createSavingsGoalSchema, type CreateSavingsGoalDto, type SavingsGoal,
} from '@gastapp/types';
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from '@/hooks/use-goals';
import { useBuckets } from '@/hooks/use-income';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiErrorMessage } from '@/lib/api-error';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { GoalProgress, goalMoney } from '@/components/goals/GoalProgress';

/** Sentinel for "no set-aside" in the Select, which cannot hold an empty value. */
const NO_BUCKET = 'none';

/**
 * "1000, 2300; 7,000" → ["1000", "2300", "7000"]. A comma followed by exactly
 * three digits is a thousands separator; any other comma separates steps.
 */
export function parseSteps(text: string): string[] {
  return text
    .split(/[;\s]+/)
    .flatMap((t) => t.split(/,(?!\d{3}(?!\d))/))
    .map((t) => t.replace(/[$,]/g, ''))
    .filter((t) => t !== '');
}

export function SavingsPage() {
  const { data: goals, isLoading } = useGoals();
  const remove = useDeleteGoal();
  const [editing, setEditing] = useState<SavingsGoal | 'new' | null>(null);
  const [balanceFor, setBalanceFor] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-pulse-faint">
          Payments to a goal&apos;s linked set-aside count towards it automatically.
        </p>
        <Button size="sm" aria-label="New goal" onClick={() => setEditing('new')}>
          <Plus size={14} /> New
        </Button>
      </div>

      {!isLoading && (goals?.length ?? 0) === 0 && (
        <Card className="space-y-2 px-6 py-12 text-center">
          <PiggyBank size={22} className="mx-auto text-pulse-v2" />
          <p className="text-sm text-pulse-text">No savings goals yet.</p>
          <p className="mx-auto max-w-sm text-xs text-pulse-faint">
            An emergency fund is a good first one: a first step you can reach soon, then one
            month of expenses, then three.
          </p>
        </Card>
      )}

      {goals?.map((g) => (
        <Card key={g.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-[10rem] flex-1">
              <p className="truncate text-sm font-semibold text-pulse-text">{g.name}</p>
              <p className="text-xs text-pulse-faint">
                {Number(g.progress.contributed) > 0
                  ? `${goalMoney(g.progress.contributed, g.currency)} added since you last set the balance`
                  : 'Balance as you last set it'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button variant="secondary" size="sm" onClick={() => setBalanceFor(g)}>
                Update balance
              </Button>
              <Button variant="ghost" size="sm" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)}>
                <Pencil size={13} />
              </Button>
              <Button variant="ghost" size="sm" aria-label={`Delete ${g.name}`} onClick={() => setDeleting(g)}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
          <GoalProgress goal={g} />
        </Card>
      ))}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === 'new' ? 'New savings goal' : 'Edit goal'}>
          {editing && (
            <GoalForm goal={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={balanceFor !== null} onOpenChange={(o) => !o && setBalanceFor(null)}>
        <DialogContent title="Update balance">
          {balanceFor && <BalanceForm goal={balanceFor} onDone={() => setBalanceFor(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete goal?"
        description="Only the goal goes. Your expenses and set-asides stay as they are."
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
          } catch {
            // Shown below from remove.error.
          }
        }}
      >
        {remove.error && <p className="mt-3 text-xs text-red-400">{apiErrorMessage(remove.error)}</p>}
      </ConfirmDialog>
    </div>
  );
}

function GoalForm({ goal, onDone }: { goal?: SavingsGoal; onDone: () => void }) {
  const { data: buckets } = useBuckets();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const isPending = create.isPending || update.isPending;
  const [stepsText, setStepsText] = useState(
    goal?.milestones.map((m) => String(Number(m))).join(', ') ?? '',
  );

  const {
    register, handleSubmit, setValue, watch, formState: { errors },
  } = useForm<CreateSavingsGoalDto>({
    resolver: zodResolver(createSavingsGoalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          targetAmount: goal.targetAmount,
          currency: CURRENCY,
          milestones: goal.milestones,
          baseAmount: goal.baseAmount,
          bucketId: goal.bucketId,
        }
      : { currency: CURRENCY, milestones: [], baseAmount: '0' },
  });
  const bucketId = watch('bucketId');
  const saveError = create.error ?? update.error;
  // Only savings set-asides can fund a goal (a transfer or reserve isn't saving).
  const savingsBuckets = buckets?.filter((b) => b.kind === 'SAVINGS');
  // The server drops steps at or above the target; say so instead of losing them quietly.
  const target = Number(watch('targetAmount'));
  const droppedSteps = (watch('milestones') ?? []).filter((m) => target > 0 && Number(m) >= target);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (dto) => {
        try {
          if (goal) {
            // The balance has its own dialog; sending it here would re-date it.
            const { baseAmount: _balance, ...rest } = dto;
            await update.mutateAsync({ id: goal.id, dto: rest });
          } else {
            await create.mutateAsync(dto);
          }
          onDone();
        } catch {
          // Shown below from the mutation's error.
        }
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Name</Label>
        <Input id="goal-name" placeholder="Emergency fund" {...register('name')} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">Target</Label>
          <Input id="goal-target" placeholder="0.00" {...register('targetAmount')} />
          {errors.targetAmount && <p className="text-xs text-red-400">{errors.targetAmount.message}</p>}
        </div>
        {!goal && (
          <div className="space-y-1.5">
            <Label htmlFor="goal-balance">Saved so far</Label>
            <Input id="goal-balance" placeholder="0.00" {...register('baseAmount')} />
            {errors.baseAmount && <p className="text-xs text-red-400">{errors.baseAmount.message}</p>}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-steps">Steps on the way (optional)</Label>
        <Input
          id="goal-steps"
          placeholder="e.g. 1000, 2500"
          value={stepsText}
          onChange={(e) => {
            setStepsText(e.target.value);
            setValue('milestones', parseSteps(e.target.value));
          }}
        />
        {errors.milestones && <p className="text-xs text-red-400">Steps must be amounts, like 1000, 2500</p>}
        {droppedSteps.length > 0 && (
          <p className="text-xs text-amber-400">
            {droppedSteps.map((m) => goalMoney(m, CURRENCY)).join(', ')} is not below the target and
            won&apos;t be kept. To enter several steps, separate them with a space or “;” (e.g. 500; 750).
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Funded by set-aside</Label>
        <Select
          value={bucketId ?? NO_BUCKET}
          onValueChange={(v) => setValue('bucketId', v === NO_BUCKET ? null : v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_BUCKET}>None — I&apos;ll update the balance myself</SelectItem>
            {savingsBuckets?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({goalMoney(b.amount, b.currency)} per paycheck)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-pulse-faint">
          Its payments add to the goal, and its amount sets the pace for the dates. Create a Savings
          set-aside under Income → Off the top each payday.
        </p>
      </div>

      {saveError && <p className="text-xs text-red-400">{apiErrorMessage(saveError)}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}

function BalanceForm({ goal, onDone }: { goal: SavingsGoal; onDone: () => void }) {
  const update = useUpdateGoal();
  const [amount, setAmount] = useState(String(Number(goal.progress.saved)));
  const valid = /^\d+(\.\d{1,2})?$/.test(amount);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        try {
          await update.mutateAsync({ id: goal.id, dto: { baseAmount: amount } });
          onDone();
        } catch {
          // Shown below from update.error.
        }
      }}
    >
      <p className="text-sm text-pulse-dim">
        What is in your savings for “{goal.name}” today? Use this after a withdrawal, interest, or
        a deposit that did not go through the linked set-aside.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="goal-new-balance">Balance today</Label>
        <Input id="goal-new-balance" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      {update.error && <p className="text-xs text-red-400">{apiErrorMessage(update.error)}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={!valid || update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
