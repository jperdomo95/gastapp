import { parse } from 'csv-parse/sync';

/**
 * Parser for bank-account CSV exports.
 *
 * Uses `csv-parse` to turn the file into header-keyed records, then auto-detects
 * the delimiter, the date / description / amount columns, and the date ordering.
 * It yields one parsed entry per *debit* (money-out) row — credits, refunds and
 * income are skipped, because every imported row becomes an expense.
 *
 * Validated against a Banesco "Cuenta de ahorros" export:
 *   CANAL;FECHA;DESCRIPCIÓN;REFERENCIA;CHEQUE;MONTO;SALDO
 *   pos;02/06/2026;POS Payment RIDERY LLC;FT26153WL4V40;;-6.85;1,017.94
 * i.e. ';'-delimited, Spanish headers, DD/MM/YYYY dates, signed MONTO (negative
 * = money out), with a SALDO balance column that must NOT be read as the amount.
 */

export interface ParsedExpenseRow {
  /** 1-based line number in the source file, for error reporting. */
  line: number;
  date: Date;
  description: string;
  /** Positive money-out amount, formatted with 2 decimals. */
  amount: string;
}

export interface ParseError {
  line: number;
  reason: string;
}

export interface ParseResult {
  rows: ParsedExpenseRow[];
  /** Rows intentionally skipped (e.g. credits, blank lines). */
  skipped: number;
  errors: ParseError[];
}

interface ColumnMap {
  date: string;
  description: string | null;
  /** Single signed-amount column (negative = debit), or null. */
  amount: string | null;
  /** Dedicated debit column, or null. */
  debit: string | null;
  /** Dedicated credit column, or null. */
  credit: string | null;
}

// Accent-free, lower-case header keywords (English + Spanish). The header is
// normalized the same way before matching, so "DESCRIPCIÓN" matches "descripcion".
const DATE_KEYS = ['fecha', 'date', 'posted', 'posting date', 'transaction date'];
const DESC_KEYS = ['descripcion', 'description', 'concepto', 'detalle', 'memo', 'payee', 'narration', 'glosa'];
// NOTE: "saldo"/"balance" are deliberately absent — a running balance is not the transaction amount.
const AMOUNT_KEYS = ['monto', 'importe', 'amount', 'valor', 'value'];
const DEBIT_KEYS = ['debito', 'debit', 'cargo', 'retiro', 'egreso', 'withdrawal', 'paid out', 'money out', 'outflow'];
const CREDIT_KEYS = ['credito', 'credit', 'abono', 'deposito', 'haber', 'ingreso', 'paid in', 'money in', 'inflow'];

const norm = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function findColumn(headers: string[], keys: string[]): string | null {
  const match = headers.find((h) => {
    const n = norm(h);
    return keys.some((k) => n === k || n.includes(k));
  });
  return match ?? null;
}

function mapColumns(headers: string[]): ColumnMap | null {
  const date = findColumn(headers, DATE_KEYS);
  const amount = findColumn(headers, AMOUNT_KEYS);
  const debit = findColumn(headers, DEBIT_KEYS);
  if (!date || (!amount && !debit)) return null;
  return {
    date,
    description: findColumn(headers, DESC_KEYS),
    amount,
    debit,
    credit: findColumn(headers, CREDIT_KEYS),
  };
}

/** Picks the most likely field separator by counting candidates in the header. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** Parses a money cell into a number. Returns null when not a number. */
function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  // Accounting-style negatives: (123.45)
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  // Drop currency symbols/letters and thousands separators (e.g. "1,948.15").
  s = s.replace(/[^0-9.]/g, '');
  if (!s || s === '.') return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

const SLASH_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;

/**
 * Decides whether slash/dot dates in this file are day-first (DD/MM) or
 * month-first (MM/DD) by looking for a decisive row where one field exceeds 12.
 * Defaults to day-first, which matches the Latin-American/European exports this
 * importer targets (ISO dates are handled separately and never reach here).
 */
function detectDayFirst(values: string[]): boolean {
  for (const v of values) {
    const m = v.trim().match(SLASH_DATE);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) return true; // first field can't be a month
    if (b > 12) return false; // second field can't be a month
  }
  return true;
}

function parseDate(raw: string, dayFirst: boolean): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // ISO / RFC formats Date understands natively.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(SLASH_DATE);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const first = Number(m[1]);
    const second = Number(m[2]);
    const day = dayFirst ? first : second;
    const month = dayFirst ? second : first;
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function parseBankCsv(text: string): ParseResult {
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: true,
      delimiter: detectDelimiter(text),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    return {
      rows: [],
      skipped: 0,
      errors: [{ line: 0, reason: `Could not parse CSV: ${(err as Error).message}` }],
    };
  }

  const [first] = records;
  if (!first) {
    return { rows: [], skipped: 0, errors: [{ line: 0, reason: 'File has no data rows' }] };
  }

  const cols = mapColumns(Object.keys(first));
  if (!cols) {
    return {
      rows: [],
      skipped: 0,
      errors: [
        {
          line: 1,
          reason:
            'Could not detect required columns. Expected a header row with a date column and an amount (or debit) column.',
        },
      ],
    };
  }

  const dayFirst = detectDayFirst(records.map((r) => r[cols.date] ?? ''));

  const rows: ParsedExpenseRow[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  records.forEach((record, i) => {
    const line = i + 2; // header is line 1, data starts at line 2
    const cell = (key: string | null) => (key ? (record[key] ?? '').trim() : '');

    const date = parseDate(cell(cols.date), dayFirst);
    if (!date) {
      errors.push({ line, reason: `Unrecognized or missing date: "${cell(cols.date)}"` });
      return;
    }

    // Determine the debit (money-out) amount for this row.
    let outflow: number | null = null;
    const debitRaw = cell(cols.debit);
    if (cols.debit || cols.credit) {
      if (debitRaw) {
        const v = parseAmount(debitRaw);
        if (v === null) {
          errors.push({ line, reason: `Invalid debit amount: "${debitRaw}"` });
          return;
        }
        outflow = Math.abs(v);
      } else {
        skipped++; // credit/inflow row, or no money movement — not an expense
        return;
      }
    } else {
      const v = parseAmount(cell(cols.amount));
      if (v === null) {
        errors.push({ line, reason: `Invalid amount: "${cell(cols.amount)}"` });
        return;
      }
      // Convention for a single signed column: negative = money out.
      if (v < 0) {
        outflow = Math.abs(v);
      } else {
        skipped++; // positive = credit/inflow (e.g. interest)
        return;
      }
    }

    if (outflow === null || outflow === 0) {
      skipped++;
      return;
    }

    rows.push({
      line,
      date,
      description: cell(cols.description),
      amount: outflow.toFixed(2),
    });
  });

  return { rows, skipped, errors };
}
