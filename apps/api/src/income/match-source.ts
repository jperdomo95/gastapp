/** Recognising which income source an imported deposit came from. */

export interface MatchableSource {
  id: string;
  amount: string;
  currency: string;
  matchText: string | null;
  active: boolean;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Within 1% of the expected amount — a fixed salary barely moves. */
const AMOUNT_TOLERANCE = 0.01;

/**
 * The source a deposit belongs to: the one whose match text appears in the
 * bank description, else the one whose amount is within 1%. Null when neither
 * — or when the amount matches more than one source and nothing else decides.
 */
export function matchIncomeSource(
  sources: MatchableSource[],
  deposit: { description: string; amount: string; currency: string },
): string | null {
  const candidates = sources.filter((s) => s.active && s.currency === deposit.currency);
  const description = norm(deposit.description);

  const byText = candidates.find((s) => s.matchText && description.includes(norm(s.matchText)));
  if (byText) return byText.id;

  const amount = Number(deposit.amount);
  const byAmount = candidates.filter((s) => {
    const expected = Number(s.amount);
    return expected > 0 && Math.abs(amount - expected) <= expected * AMOUNT_TOLERANCE;
  });
  return byAmount.length === 1 ? (byAmount[0]?.id ?? null) : null;
}
