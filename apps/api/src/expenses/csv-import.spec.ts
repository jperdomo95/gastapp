import { parseBankCsv } from './csv-import';

// Fully synthetic data — invented merchants/amounts/references — that mirrors
// the *shape* of a Latin-American bank export: ';'-delimited, Spanish headers,
// DD/MM/YYYY dates, a signed MONTO column, and a SALDO balance column with
// unquoted thousands commas.
const LATAM_SAMPLE = [
  'CANAL;FECHA;DESCRIPCIÓN;REFERENCIA;CHEQUE;MONTO;SALDO',
  'pos;02/06/2026;POS Payment EXAMPLE COFFEE;REF00000001;;-6.85;1,000.00',
  'web_mobile;02/06/2026;Transf Online Pago ACME CORP;REF00000002;;-250.00;750.00',
  'generico;31/05/2026;Intereses Capitalizables;REF00000003;;0.01;1,000.00',
  'web_mobile;30/05/2026;Transf Online Pago SAMPLE LLC;REF00000004;;-1,948.15;999.99',
].join('\n');

describe('parseBankCsv', () => {
  it('imports debits only from a semicolon-delimited LatAm-style export', () => {
    const result = parseBankCsv(LATAM_SAMPLE);

    expect(result.errors).toEqual([]);
    // 3 debits imported; the +0.01 interest credit is skipped.
    expect(result.rows).toHaveLength(3);
    expect(result.skipped).toBe(1);
  });

  it('parses DD/MM/YYYY dates and unquoted thousands separators correctly', () => {
    const { rows } = parseBankCsv(LATAM_SAMPLE);

    // 02/06/2026 must be June 2nd, not Feb 6th.
    expect(rows[0]!.date.getFullYear()).toBe(2026);
    expect(rows[0]!.date.getMonth()).toBe(5); // June (0-based)
    expect(rows[0]!.date.getDate()).toBe(2);
    expect(rows[0]!.amount).toBe('6.85');
    expect(rows[0]!.description).toBe('POS Payment EXAMPLE COFFEE');

    // "-1,948.15" → positive 1948.15 outflow.
    expect(rows[2]!.amount).toBe('1948.15');
  });

  it('reports an error when required columns are missing', () => {
    const result = parseBankCsv('foo,bar,baz\n1,2,3');
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]!.reason).toMatch(/Could not detect required columns/);
  });

  it('handles a comma-delimited signed amount column', () => {
    const csv = ['Date,Description,Amount', '2026-05-01,Coffee,-3.50', '2026-05-02,Refund,12.00'].join('\n');
    const result = parseBankCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.amount).toBe('3.50');
    expect(result.skipped).toBe(1);
  });

  it('uses a dedicated debit column when present and skips credit rows', () => {
    const csv = [
      'Date,Description,Debit,Credit',
      '2026-05-01,Groceries,45.20,',
      '2026-05-02,Salary,,2000.00',
    ].join('\n');
    const result = parseBankCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.amount).toBe('45.20');
    expect(result.skipped).toBe(1);
  });
});
