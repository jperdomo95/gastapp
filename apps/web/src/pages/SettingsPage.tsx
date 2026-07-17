import { useMemo, useState } from 'react';
import { useCurrentUser, useUpdateTimezone } from '@/hooks/use-users';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function browserTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}

export function SettingsPage() {
  const { data: user } = useCurrentUser();
  const update = useUpdateTimezone();
  const [selected, setSelected] = useState<string | null>(null);

  const zones = useMemo(() => supportedTimezones(), []);
  const detected = useMemo(() => browserTimezone(), []);
  const current = selected ?? user?.timezone ?? undefined;

  return (
    <div className="max-w-lg space-y-5">
      <Card className="p-5">
        <p className="mb-1 text-sm font-semibold text-pulse-text">Timezone</p>
        <p className="mb-4 text-xs text-pulse-dim">
          Used to work out "today" and "this month" for your dashboard and reports.
        </p>

        <div className="space-y-1.5">
          <Label>Your timezone</Label>
          {zones.length > 0 ? (
            <Select value={current} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a timezone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-pulse-text">{user?.timezone ?? 'Not set'}</p>
          )}
        </div>

        {detected && detected !== (user?.timezone ?? undefined) && (
          <p className="mt-2 text-xs text-pulse-faint">
            This device is currently in <span className="text-pulse-text">{detected}</span>.{' '}
            <button
              type="button"
              className="text-pulse-v2 hover:underline"
              onClick={() => setSelected(detected)}
            >
              Use it
            </button>
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            disabled={!current || current === user?.timezone || update.isPending}
            onClick={() => current && update.mutate(current)}
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
          {update.isSuccess && <span className="text-xs text-pulse-dim">Saved.</span>}
          {update.isError && <span className="text-xs text-red-400">Could not save.</span>}
        </div>
      </Card>
    </div>
  );
}
