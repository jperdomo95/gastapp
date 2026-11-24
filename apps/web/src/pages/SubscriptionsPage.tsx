import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pause, Pencil, Play, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  CURRENCY,
  createSubscriptionSchema,
  type CreateSubscriptionDto,
  type RecurrenceFrequency,
  type RecurringCandidate,
  type Subscription,
  type SubscriptionStatus,
} from '@gastapp/types';
import {
  useAddPriceChange, useCreateSubscription, useDeleteSubscription, useRecurringCandidates,
  useRemovePriceChange, useSubscriptions, useUpdateSubscription,
} from '@/hooks/use-subscriptions';
import { useCategories } from '@/hooks/use-categories';
import { useThemeStore } from '@/stores/theme-store';
import { useDismissedCandidatesStore } from '@/stores/dismissed-candidates-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { catHue, catSoft, catTint, usd } from '@/lib/pulse';
import { todayDateString } from '@/lib/date-range';

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

/** Periods per month, for normalising every frequency onto one comparable figure. */
const PER_MONTH: Record<RecurrenceFrequency, number> = {
  WEEKLY: 52 / 12,
  BIWEEKLY: 26 / 12,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
};

const STATUS_FILTERS: Array<{ value: SubscriptionStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const formatDay = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function SubscriptionsPage() {
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);
  const [tracking, setTracking] = useState<RecurringCandidate | null>(null);
  const { theme } = useThemeStore();

  const { data: subscriptions } = useSubscriptions({ status });
  const { data: categories } = useCategories();
  const update = useUpdateSubscription();
  const remove = useDeleteSubscription();

  // Only active subscriptions are actually committed spend.
  const { data: active } = useSubscriptions({ status: 'ACTIVE' });
  const monthlyCommitted = useMemo(
    () =>
      (active ?? []).reduce((acc, s) => acc + Number(s.amount) * PER_MONTH[s.frequency], 0),
    [active],
  );

  const items = subscriptions ?? [];

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div
        className="rounded-pulse-card p-4"
        style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.20), rgba(34,211,238,0.08))' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-pulse-dim">Committed / month</p>
            <p className="mt-0.5 text-2xl font-bold text-pulse-text">${usd(monthlyCommitted)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-pulse-dim">Active</p>
            <p className="mt-0.5 text-2xl font-bold text-pulse-text">{active?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Filter chips + create */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} active={status === f.value} onClick={() => setStatus(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            {/* Distinct accessible name: the header already has "New expense". */}
            <Button size="sm" aria-label="New subscription"><Plus size={14} /> New</Button>
          </DialogTrigger>
          <DialogContent title="New subscription">
            <SubscriptionForm onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {status === 'ACTIVE' && <RecurringCandidatesPanel onTrack={setTracking} />}

      {items.length === 0 && (
        <Card className="py-16 text-center">
          <p className="text-pulse-faint">
            {status === 'ACTIVE'
              ? 'No subscriptions yet. Add one to track recurring charges automatically.'
              : `No ${status.toLowerCase()} subscriptions.`}
          </p>
        </Card>
      )}

      {items.length > 0 && (
        <Card className="overflow-hidden">
          <div className="divide-y divide-pulse-stroke">
            {items.map((s) => {
              const cat = categories?.find((c) => c.id === s.categoryId);
              const hue = catHue(cat?.name ?? '', cat?.color);
              const initial = s.name[0]?.toUpperCase() ?? '?';
              const isPaused = s.status === 'PAUSED';

              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ background: catSoft(hue, theme), color: catTint(hue, theme) }}
                  >
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-pulse-text">{s.name}</p>
                    <p className="text-xs text-pulse-faint">
                      {FREQUENCY_LABELS[s.frequency]}
                      {' · '}
                      {cat?.name ?? '—'}
                      {s.nextOccurrenceDate && s.status === 'ACTIVE'
                        ? ` · next ${formatDay(s.nextOccurrenceDate)}`
                        : s.status === 'ACTIVE'
                          ? ' · ended'
                          : ''}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-pulse-text">
                    ${usd(Number(s.amount))}
                  </span>

                  <div className="flex shrink-0 items-center gap-0.5">
                    {s.status !== 'ARCHIVED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={isPaused ? `Resume ${s.name}` : `Pause ${s.name}`}
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: s.id,
                            dto: { status: isPaused ? 'ACTIVE' : 'PAUSED' },
                          })
                        }
                      >
                        {isPaused ? <Play size={13} /> : <Pause size={13} />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${s.name}`}
                      onClick={() => setEditing(s)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${s.name}`}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Edit dialog — reads the live record out of the refetched list so
          price changes added while it is open show up straight away. */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit subscription">
          {editing && (
            <SubscriptionForm
              subscription={items.find((s) => s.id === editing.id) ?? editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Track a detected recurring charge */}
      <Dialog open={tracking !== null} onOpenChange={(o) => !o && setTracking(null)}>
        <DialogContent title="Track subscription">
          {tracking && (
            <SubscriptionForm
              prefill={{
                name: tracking.name,
                amount: tracking.amount,
                currency: CURRENCY, // the finder only suggests USD charges
                frequency: tracking.frequency,
                // From the next charge: starting on the last one (already in the
                // ledger) would generate it a second time when it is dated today.
                startDate: tracking.nextExpectedDate,
                categoryId: tracking.categoryId,
              }}
              onDone={() => setTracking(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete subscription?"
        description={
          'This stops all future charges. Expenses it already created stay in your ledger, ' +
          'so past months keep their totals — but they will not be re-linked if you create ' +
          'the subscription again.'
        }
        variant="danger"
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

function SubscriptionForm({
  subscription,
  prefill,
  onDone,
}: {
  subscription?: Subscription;
  /** Starting values for a new subscription, e.g. from a detected recurring charge. */
  prefill?: Partial<CreateSubscriptionDto>;
  onDone: () => void;
}) {
  const { data: categories } = useCategories();
  const create = useCreateSubscription();
  const update = useUpdateSubscription();
  const today = todayDateString();

  const {
    register, handleSubmit, setValue, watch, formState: { errors },
  } = useForm<CreateSubscriptionDto>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: subscription
      ? {
          name: subscription.name,
          amount: subscription.amount,
          currency: CURRENCY,
          description: subscription.description ?? undefined,
          frequency: subscription.frequency,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          categoryId: subscription.categoryId,
          backfillPastOccurrences: false,
        }
      : {
          currency: CURRENCY,
          frequency: 'MONTHLY',
          startDate: today,
          ...prefill,
          backfillPastOccurrences: false,
        },
  });

  const categoryId = watch('categoryId');
  const frequency = watch('frequency');
  const startDate = watch('startDate');
  const isPending = create.isPending || update.isPending;
  // Backfill only means anything when there are past periods to materialise.
  const startsInThePast = Boolean(startDate) && startDate < today;

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (dto) => {
        if (subscription) {
          const { backfillPastOccurrences: _ignored, ...rest } = dto;
          await update.mutateAsync({ id: subscription.id, dto: rest });
        } else {
          await create.mutateAsync(dto);
        }
        onDone();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="sub-name">Name</Label>
        <Input id="sub-name" placeholder="Netflix" {...register('name')} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sub-amount">Amount</Label>
          <Input id="sub-amount" placeholder="0.00" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(v) => setValue('frequency', v as RecurrenceFrequency)}
          >
            <SelectTrigger><SelectValue placeholder="How often" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FREQUENCY_LABELS) as RecurrenceFrequency[]).map((f) => (
                <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frequency && <p className="text-xs text-red-400">Required</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sub-start">Starts</Label>
          <Input
            id="sub-start"
            type="date"
            defaultValue={subscription?.startDate ?? prefill?.startDate ?? today}
            onChange={(e) => setValue('startDate', e.target.value)}
          />
          {errors.startDate && <p className="text-xs text-red-400">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub-end">Ends (optional)</Label>
          <Input
            id="sub-end"
            type="date"
            defaultValue={subscription?.endDate ?? ''}
            // null, not undefined — clearing the field has to reach the API as
            // an explicit "no end date", or the old value silently survives.
            onChange={(e) => setValue('endDate', e.target.value || null)}
          />
          {errors.endDate && <p className="text-xs text-red-400">{errors.endDate.message}</p>}
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
        <Label htmlFor="sub-description">Note (optional)</Label>
        <Input
          id="sub-description"
          placeholder="Shows on each generated expense"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-red-400">{errors.description.message}</p>
        )}
      </div>

      {prefill && (
        <p className="text-xs text-pulse-dim">
          The charges found so far are already in your ledger, so tracking starts from the next
          one. From then on GastApp adds each charge itself — skip those lines when you import
          a bank statement, or they will count twice.
        </p>
      )}

      {!subscription && !prefill && startsInThePast && (
        <label className="flex items-start gap-2 text-xs text-pulse-dim">
          <input
            type="checkbox"
            className="mt-0.5 accent-pulse-v2"
            {...register('backfillPastOccurrences')}
          />
          <span>
            Add the charges that already happened since the start date. Leave this off to
            start from the next upcoming charge.
          </span>
        </label>
      )}

      {subscription && <PriceChanges subscription={subscription} />}

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}

/**
 * Scheduled price changes. Charges already generated keep the amount they were
 * created with, so this only affects periods generated from `effectiveFrom` on.
 *
 * Plain buttons rather than a nested <form> — this lives inside the edit form.
 */
function PriceChanges({ subscription }: { subscription: Subscription }) {
  const add = useAddPriceChange();
  const remove = useRemovePriceChange();
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  const canAdd = /^\d+(\.\d{1,2})?$/.test(amount) && effectiveFrom !== '' && !add.isPending;

  return (
    <div className="space-y-2 border-t border-pulse-stroke pt-4">
      <Label>Scheduled price changes</Label>

      {subscription.amountChanges.length > 0 && (
        <ul className="space-y-1">
          {subscription.amountChanges.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-xs text-pulse-dim">
              <span className="text-pulse-text">${usd(Number(c.amount))}</span>
              <span>from {formatDay(c.effectiveFrom)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove price change from ${c.effectiveFrom}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ id: subscription.id, changeId: c.id })}
              >
                <Trash2 size={12} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="pc-amount">New amount</Label>
          <Input
            id="pc-amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="pc-from">From</Label>
          <Input
            id="pc-from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canAdd}
          onClick={async () => {
            await add.mutateAsync({ id: subscription.id, dto: { amount, effectiveFrom } });
            setAmount('');
            setEffectiveFrom('');
          }}
        >
          Add
        </Button>
      </div>
      {add.isError && (
        <p className="text-xs text-red-400">Could not add — is there already one on that date?</p>
      )}
    </div>
  );
}

/** Money per month, for ranking and the "could save" line. */
const perMonth = (c: RecurringCandidate) => Number(c.amount) * PER_MONTH[c.frequency];

const money = (amount: string | number, currency: string) =>
  currency === 'USD' ? `$${usd(amount)}` : `${usd(amount)} ${currency}`;

/**
 * Charges that repeat in the ledger but are not tracked as subscriptions yet —
 * usually what a bank-statement import brings in. "Track" turns one into a
 * subscription; "Not a subscription" hides it in this browser.
 */
function RecurringCandidatesPanel({ onTrack }: { onTrack: (c: RecurringCandidate) => void }) {
  const { data } = useRecurringCandidates();
  const { keys: dismissed, dismiss, restoreAll } = useDismissedCandidatesStore();
  const [showStopped, setShowStopped] = useState(false);

  const untracked = (data ?? []).filter((c) => c.trackedSubscriptionId === null);
  const visible = untracked.filter((c) => !dismissed.includes(c.key));
  const live = visible.filter((c) => c.status === 'ACTIVE');
  const stopped = visible.filter((c) => c.status === 'STOPPED');
  const hiddenCount = untracked.length - visible.length;
  const shown = showStopped ? [...live, ...stopped] : live;

  if (live.length === 0 && stopped.length === 0) {
    return hiddenCount > 0 ? (
      <p className="text-right text-xs text-pulse-faint">
        <button type="button" className="underline hover:text-pulse-text" onClick={restoreAll}>
          Show {hiddenCount} dismissed suggestion{hiddenCount === 1 ? '' : 's'}
        </button>
      </p>
    ) : null;
  }

  const liveUsdPerMonth = live
    .filter((c) => c.currency === 'USD')
    .reduce((acc, c) => acc + perMonth(c), 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-pulse-stroke px-4 py-3">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-pulse-v2" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-pulse-text">Found in your expenses</p>
          <p className="text-xs text-pulse-faint">
            {live.length > 0
              ? `${live.length} repeating charge${live.length === 1 ? '' : 's'} you are not tracking`
              : 'No live repeating charges you are not tracking'}
            {liveUsdPerMonth > 0 && ` · about $${usd(liveUsdPerMonth)} / month`}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-pulse-stroke">
        {shown.map((c) => {
          const isStopped = c.status === 'STOPPED';
          return (
            <li key={c.key} className={`flex items-center gap-3 px-4 py-3 ${isStopped ? 'opacity-60' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-pulse-text">
                  <span className="truncate">{c.name}</span>
                  {c.possibleDuplicate && (
                    <span className="rounded-pulse-chip border border-amber-400/40 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                      Possible duplicate
                    </span>
                  )}
                  {isStopped && (
                    <span className="rounded-pulse-chip border border-pulse-stroke px-1.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-dim">
                      Looks stopped
                    </span>
                  )}
                </p>
                <p className="text-xs text-pulse-faint">
                  {FREQUENCY_LABELS[c.frequency]}
                  {` · ${c.chargeCount} charges since ${formatDay(c.firstChargeDate)}`}
                  {isStopped
                    ? ` · last ${formatDay(c.lastChargeDate)}`
                    : ` · next ~${formatDay(c.nextExpectedDate)}`}
                  {c.confidence < 0.7 && ' · irregular'}
                </p>
              </div>

              <span className="shrink-0 text-sm font-semibold text-pulse-text">
                {money(c.amount, c.currency)}
              </span>

              <div className="flex shrink-0 items-center gap-0.5">
                {!isStopped && (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Track ${c.name}`}
                    onClick={() => onTrack(c)}
                  >
                    Track
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${c.name} is not a subscription`}
                  title="Not a subscription"
                  onClick={() => dismiss(c.key)}
                >
                  <X size={13} />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {(stopped.length > 0 || hiddenCount > 0) && (
        <div className="flex justify-end gap-4 border-t border-pulse-stroke px-4 py-2 text-xs text-pulse-faint">
          {stopped.length > 0 && (
            <button
              type="button"
              className="underline hover:text-pulse-text"
              onClick={() => setShowStopped((v) => !v)}
            >
              {showStopped ? 'Hide' : 'Show'} {stopped.length} that look stopped
            </button>
          )}
          {hiddenCount > 0 && (
            <button type="button" className="underline hover:text-pulse-text" onClick={restoreAll}>
              Show {hiddenCount} dismissed
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
