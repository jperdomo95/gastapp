## Importing a bank CSV

Upload a statement exported from your bank, and each money-out row becomes an expense.

![The Import bank CSV dialog](/guide/csv-import.png)

1. On the Expenses page, press **CSV**.
2. Pick the **category for all imported rows**. You can change single expenses afterwards.
3. Choose the CSV file (up to 5 MB).
4. Optionally tick **Also record deposits (credit rows) as income**. Deposits that match one of your income sources are linked to it, so your pay cycle starts on your real payday.
5. Press **Import**. GastApp shows how many expenses it imported, how many deposits it recorded, how many rows it skipped, and the first errors with their line numbers.

GastApp reads the file's header row to find its columns, in English or Spanish. It works out the separator (comma or semicolon) and whether dates are day-first, as in 31/10/2026.

| Column | Header words it recognises |
| --- | --- |
| Date | Fecha, Date, Posted, Posting date, Transaction date |
| Description | Descripción, Description, Concepto, Detalle, Memo, Payee, Narration, Glosa |
| One signed amount (negative = money out) | Monto, Importe, Amount, Valor, Value |
| Or separate money-out and money-in columns | Débito, Debit, Cargo, Retiro, Withdrawal, Money out · Crédito, Credit, Abono, Depósito, Ingreso, Money in |

**Re-importing an overlapping statement:** deposits you already recorded are skipped, so income is never counted twice. Expenses are not checked for duplicates, so import each statement period only once.
