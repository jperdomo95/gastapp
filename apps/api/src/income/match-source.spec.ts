import { matchIncomeSource, type MatchableSource } from './match-source';

const source = (o: Partial<MatchableSource> & Pick<MatchableSource, 'id'>): MatchableSource => ({
  amount: '3000.00', currency: 'USD', matchText: null, active: true, ...o,
});

const usd = (description: string, amount: string) => ({ description, amount, currency: 'USD' });

describe('matchIncomeSource', () => {
  it('matches on the text in the bank description, ignoring case and accents', () => {
    const sources = [source({ id: 'salary', matchText: 'nómina acme' })];
    expect(matchIncomeSource(sources, usd('DEPOSITO NOMINA ACME CORP', '1.00'))).toBe('salary');
  });

  it('falls back to an amount within 1% of the expected one', () => {
    const sources = [source({ id: 'salary' })];
    expect(matchIncomeSource(sources, usd('ACH CREDIT', '2985.00'))).toBe('salary');
    expect(matchIncomeSource(sources, usd('ACH CREDIT', '2900.00'))).toBeNull();
  });

  it('prefers text over amount', () => {
    const sources = [source({ id: 'salary' }), source({ id: 'bonus', amount: '50.00', matchText: 'BONO' })];
    expect(matchIncomeSource(sources, usd('BONO ANUAL', '3000.00'))).toBe('bonus');
  });

  it('refuses to guess when the amount fits two sources', () => {
    const sources = [source({ id: 'a' }), source({ id: 'b', amount: '3010.00' })];
    expect(matchIncomeSource(sources, usd('TRANSFER IN', '3005.00'))).toBeNull();
  });

  it('ignores inactive sources and other currencies', () => {
    const sources = [
      source({ id: 'old', active: false }),
      source({ id: 'eur', currency: 'EUR' }),
    ];
    expect(matchIncomeSource(sources, usd('TRANSFER IN', '3000.00'))).toBeNull();
  });
});
