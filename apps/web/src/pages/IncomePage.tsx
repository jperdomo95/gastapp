import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  CURRENCY, INCOME_LIST_LIMIT, createIncomeSchema, createIncomeSourceSchema,
  type CreateIncomeDto, type CreateIncomeSourceDto, type Income, type IncomeSource, type PayCycle,
} from '@gastapp/types';
import {
  useCreateIncome, useCreateIncomeSource, useDeleteIncome, useDeleteIncomeSource, useIncome,
  useIncomeSources, usePayCycle, useUpdateIncomeSource,
} from '@/hooks/use-income';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usd } from '@/lib/pulse';
import { todayDateString } from '@/lib/date-range';

const formatDay = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const money = (amount: string | number, currency: string) =>
  currency === 'USD' ? `$${usd(amount)}` : `${usd(amount)} ${currency}`;

const payDays = (s: Pick<IncomeSource, 'payDayFrom' | 'payDayTo'>) =>
  s.payDayFrom === s.payDayTo ? `the ${ordinal(s.payDayFrom)}` : `${s.payDayFrom}–${s.payDayTo}`;

function ordinal(n: number) {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${tail}`;
}

/** Sentinel for "no source" in the Select, which cannot hold an empty value. */
const NO_SOURCE = 'none';

export function IncomePage() {
  const { data: cycle, isLoading } = usePayCycle();
  const { data: sources } = useIncomeSources();
  const { data: deposits } = useIncome();
  const removeSource = useDeleteIncomeSource();
  const removeDeposit = useDeleteIncome();

  const [sourceDialog, setSourceDialog] = useState<IncomeSource | 'new' | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<IncomeSource | null>(null);
  const [deletingDeposit, setDeletingDeposit] = useState<Income | null>(null);

  const sourceName = (id: string | null) => sources?.find((s) => s.id === id)?.name;

  return (
    <div className="space-y-5">
      {cycle ? (
        <CycleCard cycle={cycle} />
      ) : (
        !isLoading && (
          <Card className="space-y-3 p-6 text-center">
            <p className="text-sm text-pulse-text">Add your salary to see your pay cycle.</p>
            <p className="text-xs text-pulse-faint">
              GastApp then works out how much of each paycheck is left, and how much you can spend
              per day until the next one.
            </p>
            <div>
              <Button size="sm" onClick={() => setSourceDialog('new')}>
                <Plus size={14} /> Add income source
              </Button>
            </div>
          </Card>
        )
      )}

      {/* Sources */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-pulse-dim">Income sources</h2>
          <Button size="sm" variant="ghost" aria-label="New income source" onClick={() => setSourceDialog('new')}>
            <Plus size={14} /> Add
          </Button>
        </div>
        {(sources?.length ?? 0) > 0 && (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-pulse-stroke">
              {sources?.map((s) => (
                <li key={s.id} className={`flex items-center gap-3 px-4 py-3 ${s.active ? '' : 'opacity-60'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-pulse-text">{s.name}</p>
                    <p className="text-xs text-pulse-faint">
                      Monthly, lands {payDays(s)}
                      {s.matchText && ` · matches “${s.matchText}”`}
                      {!s.active && ' · inactive'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-pulse-text">
                    {money(s.amount, s.currency)}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button variant="ghost" size="sm" aria-label={`Edit ${s.name}`} onClick={() => setSourceDialog(s)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Delete ${s.name}`} onClick={() => setDeletingSource(s)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Deposits */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-pulse-dim">Deposits</h2>
          <Button size="sm" variant="ghost" aria-label="Record deposit" onClick={() => setDepositOpen(true)}>
            <Plus size={14} /> Record
          </Button>
        </div>
        {(deposits?.length ?? 0) === 0 ? (
          <Card className="py-8 text-center">
            <p className="text-xs text-pulse-faint">
              No deposits yet. Record one here, or tick “Also record deposits” when importing a
              bank CSV on the Expenses page.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-pulse-stroke">
              {deposits?.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-pulse-text">
                      {d.description || sourceName(d.sourceId) || 'Deposit'}
                    </p>
                    <p className="text-xs text-pulse-faint">
                      {formatDay(d.date)}
                      {sourceName(d.sourceId) && ` · ${sourceName(d.sourceId)}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-pulse-v2">
                    +{money(d.amount, d.currency)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete deposit of ${d.amount} on ${d.date}`}
                    onClick={() => setDeletingDeposit(d)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </li>
              ))}
            </ul>
            {deposits?.length === INCOME_LIST_LIMIT && (
              <p className="border-t border-pulse-stroke px-4 py-2 text-xs text-pulse-faint">
                Showing the {INCOME_LIST_LIMIT} most recent deposits.
              </p>
            )}
          </Card>
        )}
      </section>

      <Dialog open={sourceDialog !== null} onOpenChange={(o) => !o && setSourceDialog(null)}>
        <DialogContent title={sourceDialog === 'new' ? 'New income source' : 'Edit income source'}>
          {sourceDialog && (
            <SourceForm
              source={sourceDialog === 'new' ? undefined : sourceDialog}
              onDone={() => setSourceDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent title="Record deposit">
          <DepositForm sources={sources ?? []} onDone={() => setDepositOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingSource !== null}
        onOpenChange={(o) => !o && setDeletingSource(null)}
        title="Delete income source?"
        description="Deposits already recorded stay, just unlinked. To stop counting on it for a while, edit it and mark it inactive instead."
        loading={removeSource.isPending}
        onConfirm={async () => {
          if (!deletingSource) return;
          await removeSource.mutateAsync(deletingSource.id);
          setDeletingSource(null);
        }}
      />
      <ConfirmDialog
        open={deletingDeposit !== null}
        onOpenChange={(o) => !o && setDeletingDeposit(null)}
        title="Delete deposit?"
        loading={removeDeposit.isPending}
        onConfirm={async () => {
          if (!deletingDeposit) return;
          await removeDeposit.mutateAsync(deletingDeposit.id);
          setDeletingDeposit(null);
        }}
      />
    </div>
  );
}

function CycleCard({ cycle }: { cycle: PayCycle }) {
  const c = cycle.currency;
  const income = Number(cycle.income);
  const spent = Number(cycle.spent);
  const committed = Number(cycle.committed);
  const left = Number(cycle.left);
  // Both counts include today.
  const totalDays = cycle.daysElapsed + cycle.daysLeft - 1;
  const timePct = Math.min(100, (cycle.daysElapsed / totalDays) * 100);
  const spentPct = income > 0 ? Math.min(100, (spent / income) * 100) : 100;
  const committedPct = income > 0 ? Math.min(100 - spentPct, (committed / income) * 100) : 0;
  const overspent = left < 0;

  return (
    <div
      className="space-y-4 rounded-pulse-card p-5"
      style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.20), rgba(34,211,238,0.08))' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-pulse-dim">Left this pay cycle</p>
          <p className={`mt-0.5 text-3xl font-bold ${overspent ? 'text-red-400' : 'text-pulse-text'}`}>
            {money(left, c)}
          </p>
          <p className="text-xs text-pulse-dim">
            {overspent
              ? 'Spent past this paycheck'
              : `≈ ${money(cycle.perDay, c)} a day for ${cycle.daysLeft} day${cycle.daysLeft === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="text-right text-xs text-pulse-dim">
          <p>Day {cycle.daysElapsed} of {totalDays}</p>
          <p>
            Next pay {cycle.nextPaydayEarliest === cycle.nextPaydayLatest
              ? formatDay(cycle.nextPaydayLatest)
              : `${formatDay(cycle.nextPaydayEarliest)}–${formatDay(cycle.nextPaydayLatest)}`}
          </p>
        </div>
      </div>

      {/* Money used vs. time gone: if the bar outruns the tick, the paycheck runs out early. */}
      <div className="space-y-1">
        <div
          className="relative h-2.5 overflow-hidden rounded-full bg-pulse-track"
          role="img"
          aria-label={`${Math.round(spentPct)}% of income spent, ${Math.round(timePct)}% of the cycle gone`}
        >
          <div className="absolute inset-y-0 left-0 bg-pulse-v1" style={{ width: `${spentPct}%` }} />
          <div
            className="absolute inset-y-0 bg-pulse-v2 opacity-50"
            style={{ left: `${spentPct}%`, width: `${committedPct}%` }}
          />
          <div className="absolute inset-y-0 w-0.5 bg-pulse-text" style={{ left: `${timePct}%` }} />
        </div>
        <p className="text-[11px] text-pulse-faint">
          Bar: spent, then still due. Tick: how much of the cycle has gone.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-pulse-dim">Income</dt>
          <dd className="font-semibold text-pulse-text">{money(cycle.income, c)}</dd>
        </div>
        <div>
          <dt className="text-xs text-pulse-dim">Spent</dt>
          <dd className="font-semibold text-pulse-text">{money(cycle.spent, c)}</dd>
        </div>
        <div>
          <dt className="text-xs text-pulse-dim">Still due</dt>
          <dd className="font-semibold text-pulse-text">{money(cycle.committed, c)}</dd>
        </div>
      </dl>

      <p className="text-xs text-pulse-faint">
        Since {formatDay(cycle.start)}
        {cycle.paydayConfirmed ? ' (recorded payday)' : ' (expected payday — no deposit recorded yet)'}.
        {' '}“Still due” is subscriptions charged before the next payday.
        {cycle.otherCurrencyExpenses > 0 &&
          ` ${cycle.otherCurrencyExpenses} expense${cycle.otherCurrencyExpenses === 1 ? '' : 's'} in other currencies not counted.`}
      </p>
    </div>
  );
}

function SourceForm({ source, onDone }: { source?: IncomeSource; onDone: () => void }) {
  const create = useCreateIncomeSource();
  const update = useUpdateIncomeSource();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, formState: { errors } } = useForm<CreateIncomeSourceDto>({
    resolver: zodResolver(createIncomeSourceSchema),
    defaultValues: source
      ? {
          name: source.name,
          amount: source.amount,
          currency: CURRENCY,
          payDayFrom: source.payDayFrom,
          payDayTo: source.payDayTo,
          matchText: source.matchText ?? '',
          active: source.active,
        }
      : { currency: CURRENCY, active: true },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (dto) => {
        if (source) await update.mutateAsync({ id: source.id, dto });
        else await create.mutateAsync(dto);
        onDone();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="src-name">Name</Label>
        <Input id="src-name" placeholder="Salary" {...register('name')} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="src-amount">Amount (net, USD)</Label>
        <Input id="src-amount" placeholder="0.00" {...register('amount')} />
        {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium uppercase tracking-wide text-pulse-dim">
          Usually lands between day
        </legend>
        <div className="flex items-center gap-2">
          <div className="w-20">
            <Input
              aria-label="Earliest pay day"
              type="number" min={1} max={31} placeholder="28"
              {...register('payDayFrom', { valueAsNumber: true })}
            />
          </div>
          <span className="text-sm text-pulse-dim">and</span>
          <div className="w-20">
            <Input
              aria-label="Latest pay day"
              type="number" min={1} max={31} placeholder="30"
              {...register('payDayTo', { valueAsNumber: true })}
            />
          </div>
          <span className="text-xs text-pulse-faint">of each month</span>
        </div>
        {(errors.payDayFrom || errors.payDayTo) && (
          <p className="text-xs text-red-400">Days are 1–31. Use 28 and 2 for a window that crosses the month end.</p>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="src-match">Bank description contains (optional)</Label>
        <Input id="src-match" placeholder="e.g. NOMINA" {...register('matchText')} />
        <p className="text-xs text-pulse-faint">
          Used to recognise this deposit when importing a statement. Without it, a deposit within
          1% of the amount above is matched.
        </p>
      </div>

      {source && (
        <label className="flex items-center gap-2 text-xs text-pulse-dim">
          <input type="checkbox" className="accent-pulse-v2" {...register('active')} />
          Active — count on this money in the pay cycle
        </label>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}

function DepositForm({ sources, onDone }: { sources: IncomeSource[]; onDone: () => void }) {
  const create = useCreateIncome();
  const today = todayDateString();
  const {
    register, handleSubmit, setValue, watch, formState: { errors },
  } = useForm<CreateIncomeDto>({
    resolver: zodResolver(createIncomeSchema),
    defaultValues: { currency: CURRENCY, date: today },
  });
  const sourceId = watch('sourceId');

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (dto) => {
        await create.mutateAsync(dto);
        onDone();
      })}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dep-amount">Amount</Label>
          <Input id="dep-amount" placeholder="0.00" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dep-date">Date</Label>
          <Input id="dep-date" type="date" {...register('date')} />
          {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>From</Label>
        <Select
          value={sourceId ?? NO_SOURCE}
          onValueChange={(v) => {
            const picked = sources.find((s) => s.id === v);
            setValue('sourceId', picked ? picked.id : null);
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SOURCE}>Other / one-off</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dep-description">Note (optional)</Label>
        <Input id="dep-description" placeholder="Bonus, refund…" {...register('description')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}
