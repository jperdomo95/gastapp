## Income and pay cycle

The pay cycle is the stretch one paycheck has to cover: from your last payday up to your next one. GastApp shows what is left of it and how much you can spend per day.

![The pay-cycle card on the Income page, with the weekly allowance, forecast and burn chart](/guide/income.png)

**Add an income source** under Income: a name (like Salary), the net amount in USD, and the days it usually lands, such as **between day 28 and 30**. A window can run past the month's end, as 28 to 2 does. Optionally add text from the bank description (like NOMINA) so imports can recognise the deposit. Without that text, an imported deposit within 1% of the amount is matched. Untick **Active** to stop counting on a source.

Your biggest active source drives the cycle. The cycle starts on its recorded deposit, if one landed within 5 days of its window. Otherwise it starts on the day the window opened, marked **expected payday, no deposit recorded yet**. A deposit far from the window, like a mid-month refund, counts as income but doesn't start a new cycle. GastApp budgets up to the **last** day of the next window, the safe end.

**Record a deposit** under Deposits with **Record**: amount, date, which source it came from (or Other / one-off), and an optional note. Imports can record deposits too (see [Importing a bank CSV](#importing-a-bank-csv)).

| On the cycle card | Meaning |
| --- | --- |
| Income | Deposits recorded this cycle, plus any source whose window has opened but whose deposit you haven't recorded yet. |
| Spent | Expenses since the cycle started. |
| Still due | Subscription charges before the next payday, at the price in effect on each date. |
| To set aside | What your set-asides still need this cycle (see [Set-asides and savings goals](#set-asides-and-savings-goals)). |
| Left this pay cycle | Income minus spent, still due and to set aside. It can go negative. |
| Per day | What is left divided by the days to the next payday. |

The bar shows spent, then still due or set aside. Its tick shows how much of the cycle has gone.

**The forecast** looks at your day-to-day pace: average spending over up to the last 7 full days since payday. It leaves out payday itself, today, subscription charges and set-aside payments, which are already counted. It needs 3 full days; before that it says it's too early and just shows your per-day figure. If the money runs out before payday at that pace, it names the day and what to keep to per day. It also warns when the share of the paycheck spent runs more than 10 points ahead of the share of the cycle gone.

**The burn chart** draws your running total spent against what the paycheck covers, with your pace projected to payday. It adds last cycle's line for comparison when you spent anything then.
