import { detectRecurringCharges, normalizeMerchant, type DetectorExpense } from './recurring-detector';

const TODAY = '2026-11-21';

const charge = (
  date: string,
  amount: string,
  description: string,
  extra: Partial<DetectorExpense> = {},
): DetectorExpense => ({ date, amount, description, currency: 'USD', categoryId: 'cat-subs', ...extra });

/** One charge per month on `day`, from `fromMonth` to `toMonth` (1-based, 2026). */
const monthly = (
  day: number,
  fromMonth: number,
  toMonth: number,
  amount: string,
  description: string,
): DetectorExpense[] =>
  Array.from({ length: toMonth - fromMonth + 1 }, (_, i) => {
    const m = String(fromMonth + i).padStart(2, '0');
    return charge(`2026-${m}-${String(day).padStart(2, '0')}`, amount, description);
  });

describe('normalizeMerchant', () => {
  it('reduces bank-export noise to the merchant name', () => {
    expect(normalizeMerchant('POS Payment STREAMFLIX.COM 866 579 7172 US')).toBe('STREAMFLIX');
    expect(normalizeMerchant('STREAMFLIXCOM 844 5052993 US.')).toBe('STREAMFLIX');
  });

  it('treats a repeated brand and stray ids as the same merchant', () => {
    expect(normalizeMerchant('CLOUDBOX Cloudbox One 855 836')).toBe('CLOUDBOX ONE');
    expect(normalizeMerchant('Cloudbox CLOUDBOX ONE 22M 650')).toBe('CLOUDBOX ONE');
  });

  it('strips accents and returns null when nothing identifying is left', () => {
    expect(normalizeMerchant('Farmacía Pérez CARACAS')).toBe('FARMACIA PEREZ');
    expect(normalizeMerchant('POS 12345 US')).toBeNull();
    expect(normalizeMerchant(null)).toBeNull();
  });
});

describe('detectRecurringCharges', () => {
  it('finds a monthly subscription and predicts the next charge', () => {
    const result = detectRecurringCharges(
      monthly(3, 1, 11, '5.99', 'STREAMFLIX.COM 866 579 7172 US'),
      [],
      TODAY,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'Streamflix',
      amount: '5.99',
      frequency: 'MONTHLY',
      status: 'ACTIVE',
      firstChargeDate: '2026-01-03',
      lastChargeDate: '2026-11-03',
      nextExpectedDate: '2026-12-03',
      chargeCount: 11,
      categoryId: 'cat-subs',
      trackedSubscriptionId: null,
      possibleDuplicate: false,
    });
    expect(result[0]?.confidence).toBeGreaterThan(0.9);
  });

  it('keeps a price increase in the same subscription and reports the new price', () => {
    const result = detectRecurringCharges(
      [...monthly(27, 1, 7, '5.99', 'Movieplus Video'), ...monthly(27, 8, 11, '6.99', 'Movieplus Video')],
      [],
      TODAY,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ amount: '6.99', chargeCount: 11 });
  });

  it('marks a schedule that missed its last expected charge as stopped', () => {
    const result = detectRecurringCharges(monthly(27, 1, 8, '6.99', 'Movieplus Video'), [], TODAY);
    expect(result[0]).toMatchObject({ status: 'STOPPED', nextExpectedDate: '2026-09-27' });
  });

  it('tolerates a single skipped month', () => {
    const charges = monthly(8, 1, 11, '20.00', 'CODEPILOT IDE').filter((c) => c.date !== '2026-06-08');
    const result = detectRecurringCharges(charges, [], TODAY);
    expect(result[0]).toMatchObject({ frequency: 'MONTHLY', status: 'ACTIVE' });
  });

  it('ignores frequent, irregular spending like ride-hailing', () => {
    const rides = ['01-03', '01-04', '01-09', '01-12', '01-13', '01-20', '01-23', '01-27', '02-02']
      .map((md, i) => charge(`2026-${md}`, (2.5 + (i % 4) * 1.7).toFixed(2), 'RIDEGO LLC +17860000000 US'));
    expect(detectRecurringCharges(rides, [], TODAY)).toEqual([]);
  });

  it('needs three charges for a monthly pattern', () => {
    expect(detectRecurringCharges(monthly(17, 10, 11, '2.99', 'Cloudbox One'), [], TODAY)).toEqual([]);
  });

  it('finds a yearly plan from two charges a year apart', () => {
    const result = detectRecurringCharges(
      [charge('2025-03-05', '99.00', 'SAFEVPN SAFEVPN +'), charge('2026-03-05', '99.00', 'SAFEVPN SAFEVPN +')],
      [],
      TODAY,
    );
    expect(result[0]).toMatchObject({
      name: 'Safevpn',
      frequency: 'YEARLY',
      status: 'ACTIVE',
      nextExpectedDate: '2027-03-05',
    });
  });

  it('flags two live plans from one merchant at different prices as a possible duplicate', () => {
    const result = detectRecurringCharges(
      [
        ...monthly(17, 7, 11, '2.99', 'Cloudbox One 650 2530000 US'),
        charge('2025-12-09', '19.99', 'CLOUDBOX Cloudbox One 855'),
        charge('2026-12-09', '19.99', 'CLOUDBOX Cloudbox One 855'),
      ],
      [],
      '2026-12-10',
    );

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.key).sort()).toEqual(['CLOUDBOX ONE@19.99', 'CLOUDBOX ONE@2.99']);
    expect(result.every((c) => c.possibleDuplicate)).toBe(true);
  });

  it('links a candidate to the subscription that already tracks it', () => {
    const result = detectRecurringCharges(
      monthly(3, 1, 11, '5.99', 'STREAMFLIX.COM 866 579 7172 US'),
      [{ id: 'sub-1', name: 'Streamflix', amount: '5.99', status: 'ACTIVE' }],
      TODAY,
    );
    expect(result[0]?.trackedSubscriptionId).toBe('sub-1');
  });

  it('does not let a tracked price tier hide an untracked one from the same merchant', () => {
    const result = detectRecurringCharges(
      [
        ...monthly(17, 7, 11, '2.99', 'Cloudbox One'),
        charge('2025-11-09', '19.99', 'Cloudbox One'),
        charge('2026-11-09', '19.99', 'Cloudbox One'),
      ],
      [{ id: 'sub-cheap', name: 'Cloudbox One', amount: '2.99', status: 'ACTIVE' }],
      TODAY,
    );
    const byAmount = Object.fromEntries(result.map((c) => [c.amount, c.trackedSubscriptionId]));
    expect(byAmount).toEqual({ '2.99': 'sub-cheap', '19.99': null });
  });

  it('ignores archived subscriptions when deciding what is tracked', () => {
    const result = detectRecurringCharges(
      monthly(3, 1, 11, '5.99', 'Streamflix'),
      [{ id: 'old', name: 'Streamflix', amount: '5.99', status: 'ARCHIVED' }],
      TODAY,
    );
    expect(result[0]?.trackedSubscriptionId).toBeNull();
  });

  it('keeps currencies apart and lists live candidates first, biggest first', () => {
    const result = detectRecurringCharges(
      [
        ...monthly(1, 1, 11, '5.99', 'Hostrail'),
        ...monthly(4, 1, 11, '21.78', 'Aiwrite Assistant'),
        ...monthly(15, 1, 4, '67.25', 'Learnly'),
        ...monthly(17, 1, 11, '46400.25', 'Netcable').map((c) => ({ ...c, currency: 'VES' })),
      ],
      [],
      TODAY,
    );

    expect(result.map((c) => `${c.name}:${c.status}`)).toEqual([
      'Netcable:ACTIVE',
      'Aiwrite Assistant:ACTIVE',
      'Hostrail:ACTIVE',
      'Learnly:STOPPED',
    ]);
    expect(result[0]).toMatchObject({ currency: 'VES', key: 'NETCABLE/VES' });
  });
});
