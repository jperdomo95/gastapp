import {
  dayAfter,
  daysBetween,
  maxDateString,
  nextOccurrenceOnOrAfter,
  occurrenceOn,
  toDateString,
  toDbDate,
} from './recurrence';

/** The first `count` occurrences of a schedule, for readable sequence assertions. */
const series = (start: string, freq: Parameters<typeof occurrenceOn>[1], count: number) =>
  Array.from({ length: count }, (_, i) => occurrenceOn(start, freq, i));

describe('occurrenceOn', () => {
  it('returns the start date for index 0', () => {
    expect(occurrenceOn('2026-08-05', 'MONTHLY', 0)).toBe('2026-08-05');
  });

  it('keeps a month-end billing day anchored instead of drifting', () => {
    // The bug this guards: stepping from the *previous* occurrence gives
    // Feb 28 -> Mar 28 and the 31st is lost forever.
    expect(series('2026-01-31', 'MONTHLY', 5)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('clamps to Feb 29 in a leap year', () => {
    expect(occurrenceOn('2028-01-31', 'MONTHLY', 1)).toBe('2028-02-29');
  });

  it('rolls the year over correctly', () => {
    expect(occurrenceOn('2026-11-15', 'MONTHLY', 3)).toBe('2027-02-15');
  });

  it('steps 7 and 14 days for weekly and biweekly, crossing months', () => {
    expect(series('2026-07-28', 'WEEKLY', 3)).toEqual(['2026-07-28', '2026-08-04', '2026-08-11']);
    expect(series('2026-07-28', 'BIWEEKLY', 3)).toEqual(['2026-07-28', '2026-08-11', '2026-08-25']);
  });

  it('steps 3 months for quarterly', () => {
    expect(series('2026-01-31', 'QUARTERLY', 4)).toEqual([
      '2026-01-31',
      '2026-04-30',
      '2026-07-31',
      '2026-10-31',
    ]);
  });

  it('steps 12 months for yearly, clamping Feb 29 on non-leap years', () => {
    expect(series('2028-02-29', 'YEARLY', 5)).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29', // leap again — the anchor is never lost
    ]);
  });

  it('rejects a negative or fractional index', () => {
    expect(() => occurrenceOn('2026-08-05', 'MONTHLY', -1)).toThrow(RangeError);
    expect(() => occurrenceOn('2026-08-05', 'MONTHLY', 1.5)).toThrow(RangeError);
  });

  it('rejects a malformed start date', () => {
    expect(() => occurrenceOn('05/08/2026', 'MONTHLY', 0)).toThrow(RangeError);
  });
});

describe('nextOccurrenceOnOrAfter', () => {
  it('returns the start date when the floor precedes it', () => {
    expect(nextOccurrenceOnOrAfter('2026-08-05', 'MONTHLY', '2026-01-01')).toEqual({
      date: '2026-08-05',
      index: 0,
    });
  });

  it('is inclusive — a floor landing exactly on an occurrence returns it', () => {
    expect(nextOccurrenceOnOrAfter('2026-01-05', 'MONTHLY', '2026-04-05')).toEqual({
      date: '2026-04-05',
      index: 3,
    });
  });

  it('rounds up when the floor falls between two occurrences', () => {
    expect(nextOccurrenceOnOrAfter('2026-01-05', 'MONTHLY', '2026-04-06')).toEqual({
      date: '2026-05-05',
      index: 4,
    });
  });

  it('handles a floor in a month where the billing day is clamped', () => {
    // Feb has no 31st; the next occurrence on or after Feb 15 is Feb 28.
    expect(nextOccurrenceOnOrAfter('2026-01-31', 'MONTHLY', '2026-02-15')).toEqual({
      date: '2026-02-28',
      index: 1,
    });
  });

  it('resolves weekly and biweekly floors', () => {
    expect(nextOccurrenceOnOrAfter('2026-07-01', 'WEEKLY', '2026-07-20')).toEqual({
      date: '2026-07-22',
      index: 3,
    });
    expect(nextOccurrenceOnOrAfter('2026-07-01', 'BIWEEKLY', '2026-07-20')).toEqual({
      date: '2026-07-29',
      index: 2,
    });
  });

  it('resolves quarterly and yearly floors', () => {
    expect(nextOccurrenceOnOrAfter('2026-01-15', 'QUARTERLY', '2026-08-01')).toEqual({
      date: '2026-10-15',
      index: 3,
    });
    expect(nextOccurrenceOnOrAfter('2020-03-10', 'YEARLY', '2026-07-26')).toEqual({
      date: '2027-03-10',
      index: 7,
    });
  });

  it('stays O(1) for a start date decades in the past', () => {
    // Guards against a scan-from-zero implementation: 1990 monthly is ~430
    // periods, and the answer must still be exact.
    expect(nextOccurrenceOnOrAfter('1990-01-31', 'MONTHLY', '2026-07-26')).toEqual({
      date: '2026-07-31',
      index: 438,
    });
  });

  it('agrees with occurrenceOn for the index it reports', () => {
    const { date, index } = nextOccurrenceOnOrAfter('2026-01-31', 'MONTHLY', '2026-06-15');
    expect(occurrenceOn('2026-01-31', 'MONTHLY', index)).toBe(date);
  });
});

describe('date helpers', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2); // leap day
  });

  it('advances across month and year boundaries', () => {
    expect(dayAfter('2026-07-31')).toBe('2026-08-01');
    expect(dayAfter('2026-12-31')).toBe('2027-01-01');
    expect(dayAfter('2028-02-28')).toBe('2028-02-29');
  });

  it('picks the later calendar day', () => {
    expect(maxDateString('2026-07-01', '2026-07-26')).toBe('2026-07-26');
    expect(maxDateString('2026-07-26', '2026-07-01')).toBe('2026-07-26');
  });

  it('round-trips a calendar day through the DB representation', () => {
    expect(toDateString(toDbDate('2026-07-26'))).toBe('2026-07-26');
    // UTC midnight, so no timezone can shift it onto the previous day.
    expect(toDbDate('2026-07-26').toISOString()).toBe('2026-07-26T00:00:00.000Z');
  });
});
