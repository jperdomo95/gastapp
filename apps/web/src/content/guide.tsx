import type { ReactNode } from 'react';
import { B, H3, Ol, P, Ref, Shot, Table, Ul } from '@/components/guide/GuideParts';

/**
 * The user guide shown at /help, one entry per section, in reading order.
 * Keep it in step with the app: a PR that changes how a feature works updates
 * its section here, and re-runs `pnpm --filter @gastapp/web guide:screenshots`
 * when the screen changed.
 */
export interface GuideSection {
  id: string;
  title: string;
  body: ReactNode;
}

export const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    body: (
      <>
        <P>GastApp tracks what you spend, what comes in, and how long each paycheck has to last. Four steps get you set up:</P>
        <Ol>
          <li>
            <B>Set your timezone</B> in Settings (the gear icon). It decides what &ldquo;today&rdquo; and &ldquo;this
            month&rdquo; mean for the dashboard, reports, the pay cycle and subscription charges. Until you set it,
            GastApp uses UTC. If your device is in a different zone, Settings offers to switch to it.
          </li>
          <li><B>Add your salary</B> under Income, so the dashboard can show how much of this paycheck is left.</li>
          <li>
            <B>Add expenses</B> one at a time with the <B>+</B> button, or import a bank statement CSV on the
            Expenses page.
          </li>
          <li><B>Add your subscriptions</B>, or let the recurring-charge finder suggest them from your expenses.</li>
        </Ol>
        <P>
          The main menu has Dashboard, Expenses, Subscriptions, Income, Savings, Categories and Reports. On a phone,
          the bottom bar holds the main pages and the <B>+</B> button for a quick expense.
        </P>
        <P><B>Amounts are in US dollars.</B> GastApp is USD-only for now, and every form saves amounts as USD.</P>
      </>
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    body: (
      <>
        <P>
          The dashboard answers two questions: how much have I spent this month, and will this paycheck last until
          the next one?
        </P>
        <Shot name="dashboard" alt="The dashboard with this month's spending, the pay-cycle card and the top goal" />
        <Table
          head={['Card', 'What it shows']}
          rows={[
            ['Spent this month', 'Total spent so far this month, and how it compares with last month in percent.'],
            ['This paycheck', <>What is left of the current paycheck, how much you can spend per day, this week&rsquo;s allowance, the forecast and the burn chart (see <Ref to="income-and-pay-cycle">Income and pay cycle</Ref>). Until you add a salary it shows a <B>Set up</B> link instead.</>],
            ['Top goal', 'Your first savings goal that still has a step to reach. Hidden when you have no goals.'],
            ['Avg / day and Total entries', 'Average daily spending this month, and how many expenses you have recorded.'],
            ['By category', "This month's spending by category."],
            ['Monthly trend', 'Spending per month over recent months.'],
            ['Upcoming this month', 'Active subscriptions still due to charge this month, with their total.'],
            ['Recent', 'Your five most recent expenses.'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'expenses-and-categories',
    title: 'Expenses and categories',
    body: (
      <>
        <P>Every expense has an amount, a date, a category and an optional description.</P>
        <Shot name="expenses" alt="The Expenses page with the period and category filters" />
        <P>
          <B>Add an expense</B> with the <B>+</B> button, from any page. Fill in the amount (like 12.50), the date,
          the category and a description, then save.
        </P>
        <P>
          <B>Find expenses</B> on the Expenses page. Switch between <B>All</B> and <B>This month</B>, and filter by
          category. The list shows 25 expenses per page. Expenses that a subscription created carry a repeat icon.
        </P>
        <P><B>Edit or delete</B> an expense with the pencil or trash icon on its row. Deleting asks you to confirm.</P>
        <P>
          <B>Categories</B> live on the Categories page, each with a name, an optional icon and a color. Categories
          marked <B>system</B> come with the app for everyone; you can&rsquo;t edit or delete them. You can add your
          own, and edit or delete them. If you delete a category that still has expenses, GastApp asks which
          category to move them to first, so no expense is left without one.
        </P>
      </>
    ),
  },
  {
    id: 'importing-a-bank-csv',
    title: 'Importing a bank CSV',
    body: (
      <>
        <P>Upload a statement exported from your bank, and each money-out row becomes an expense.</P>
        <Shot name="csv-import" alt="The Import bank CSV dialog" />
        <Ol>
          <li>On the Expenses page, press <B>CSV</B>.</li>
          <li>Pick the <B>category for all imported rows</B>. You can change single expenses afterwards.</li>
          <li>Choose the CSV file (up to 5 MB).</li>
          <li>
            Optionally tick <B>Also record deposits (credit rows) as income</B>. Deposits that match one of your
            income sources are linked to it, so your pay cycle starts on your real payday.
          </li>
          <li>
            Press <B>Import</B>. GastApp shows how many expenses it imported, how many deposits it recorded, how many
            rows it skipped, and the first errors with their line numbers.
          </li>
        </Ol>
        <P>
          GastApp reads the file&rsquo;s header row to find its columns, in English or Spanish. It works out the
          separator (comma or semicolon) and whether dates are day-first, as in 31/10/2026.
        </P>
        <Table
          head={['Column', 'Header words it recognises']}
          rows={[
            ['Date', 'Fecha, Date, Posted, Posting date, Transaction date'],
            ['Description', 'Descripción, Description, Concepto, Detalle, Memo, Payee, Narration, Glosa'],
            ['One signed amount (negative = money out)', 'Monto, Importe, Amount, Valor, Value'],
            ['Or separate money-out and money-in columns', 'Débito, Debit, Cargo, Retiro, Withdrawal, Money out · Crédito, Credit, Abono, Depósito, Ingreso, Money in'],
          ]}
        />
        <P>
          <B>Re-importing an overlapping statement:</B> deposits you already recorded are skipped, so income is never
          counted twice. Expenses are not checked for duplicates, so import each statement period only once.
        </P>
      </>
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    body: (
      <>
        <P>
          A subscription adds its own charge to your expenses on each billing date, so you never type recurring
          bills by hand. GastApp adds charges that come due every night, and again whenever you open your expenses.
        </P>
        <Shot name="subscriptions" alt="The Subscriptions page with suggestions found in your expenses" />
        <P>
          <B>Add one</B> with <B>New</B> on the Subscriptions page: name, amount, frequency (weekly, every 2 weeks,
          monthly, quarterly or yearly), start date, an optional end date, a category and an optional note. If the
          start date is in the past, you can tick <B>Add the charges that already happened since the start date</B>.
          Leave it off to start from the next charge.
        </P>
        <P><B>Manage them</B> with the icons on each row:</P>
        <Ul>
          <li><B>Pause and resume.</B> A paused subscription adds no charges until you resume it.</li>
          <li>
            <B>Edit.</B> While editing, add a <B>scheduled price change</B> with its new amount and the date it takes
            effect. Charges already added keep their old amount.
          </li>
          <li><B>Delete.</B> This stops all future charges. Charges it already added stay in your expenses.</li>
        </Ul>
        <P>
          The top of the page shows what your subscriptions commit you to per month. You can filter the list by
          Active, Paused and Archived.
        </P>
        <H3 id="recurring-charge-finder">Recurring-charge finder</H3>
        <P>
          On the Active tab, <B>Found in your expenses</B> lists charges that repeat on a schedule in expenses you
          typed or imported: same merchant, similar amount, regular dates. Each suggestion shows how many charges it
          found since when, and the last or next expected date. A few labels can appear:
        </P>
        <Ul>
          <li><B>Looks stopped:</B> the expected charge is overdue.</li>
          <li><B>Possible duplicate:</B> two live plans from the same merchant at different prices, so you may be paying twice.</li>
          <li><B>Irregular:</B> the dates or amounts vary, so the guess is less certain.</li>
        </Ul>
        <P>
          Press <B>Track</B> to turn a suggestion into a subscription. It starts from the next expected charge,
          because the earlier ones are already in your expenses. After that GastApp adds each charge itself, so{' '}
          <B>skip those lines in future bank imports</B>, or they count twice. Press <B>X</B> if it isn&rsquo;t a
          subscription. Dismissed suggestions are remembered on that device, and <B>Show dismissed</B> brings them back.
        </P>
      </>
    ),
  },
  {
    id: 'income-and-pay-cycle',
    title: 'Income and pay cycle',
    body: (
      <>
        <P>
          The pay cycle is the stretch one paycheck has to cover: from your last payday up to your next one. GastApp
          shows what is left of it and how much you can spend per day.
        </P>
        <Shot name="income" alt="The pay-cycle card on the Income page, with the weekly allowance, forecast and burn chart" />
        <P>
          <B>Add an income source</B> under Income: a name (like Salary), the net amount in USD, and the days it
          usually lands, such as <B>between day 28 and 30</B>. A window can run past the month&rsquo;s end, as 28 to 2
          does. Optionally add text from the bank description (like NOMINA) so imports can recognise the deposit.
          Without that text, an imported deposit within 1% of the amount is matched. Untick <B>Active</B> to stop
          counting on a source.
        </P>
        <P>
          Your biggest active source drives the cycle. The cycle starts on its recorded deposit, if one landed within
          5 days of its window. Otherwise it starts on the day the window opened, marked <B>expected payday, no
          deposit recorded yet</B>. A deposit far from the window, like a mid-month refund, counts as income but
          doesn&rsquo;t start a new cycle. GastApp budgets up to the <B>last</B> day of the next window, the safe end.
        </P>
        <P>
          <B>Record a deposit</B> under Deposits with <B>Record</B>: amount, date, which source it came from (or
          Other / one-off), and an optional note. Imports can record deposits too (see{' '}
          <Ref to="importing-a-bank-csv">Importing a bank CSV</Ref>).
        </P>
        <Table
          head={['On the cycle card', 'Meaning']}
          rows={[
            ['Income', "Deposits recorded this cycle, plus any source whose window has opened but whose deposit you haven't recorded yet."],
            ['Spent', 'Expenses since the cycle started.'],
            ['Still due', 'Subscription charges before the next payday, at the price in effect on each date.'],
            ['To set aside', <>What your set-asides still need this cycle (see <Ref to="set-asides-and-savings-goals">Set-asides and savings goals</Ref>).</>],
            ['Left this pay cycle', 'Income minus spent, still due and to set aside. It can go negative.'],
            ['Per day', 'What is left divided by the days to the next payday.'],
          ]}
        />
        <P>The bar shows spent, then still due or set aside. Its tick shows how much of the cycle has gone.</P>
        <P>
          <B>The forecast</B> looks at your day-to-day pace: average spending over up to the last 7 full days since
          payday. It leaves out payday itself, today, subscription charges and set-aside payments, which are already
          counted. It needs 3 full days; before that it says it&rsquo;s too early and just shows your per-day figure.
          If the money runs out before payday at that pace, it names the day and what to keep to per day. It also
          warns when the share of the paycheck spent runs more than 10 points ahead of the share of the cycle gone.
        </P>
        <P>
          <B>The burn chart</B> draws your running total spent against what the paycheck covers, with your pace
          projected to payday. It adds last cycle&rsquo;s line for comparison when you spent anything then.
        </P>
      </>
    ),
  },
  {
    id: 'set-asides-and-savings-goals',
    title: 'Set-asides and savings goals',
    body: (
      <>
        <P>
          Set-asides are money that leaves each paycheck first. What remains, minus subscriptions, becomes your
          weekly allowance for day-to-day spending. Savings goals track a target that a savings set-aside pays into.
        </P>
        <H3 id="set-asides">Set-asides</H3>
        <P>
          Add them under Income, in <B>Off the top each payday</B>. Each has a name, an amount per paycheck, and one
          of three kinds:
        </P>
        <Shot name="set-asides" alt="Set-asides under Off the top each payday, with what each has received this cycle" />
        <Table
          head={['Kind', 'Use it for']}
          rows={[
            ['Fixed transfer', "Money that goes to someone else every payday, like a partner's share or rent"],
            ['Savings', 'Money moved to savings first, not with whatever is left'],
            ['Reserve', 'Money held for surprises, the card bill or irregular costs'],
          ]}
        />
        <P>
          Tell GastApp which expenses pay a set-aside: text in the expense description (at least 3 characters, like
          the last digits of the account), a category, or both. Matching expenses fill the set-aside instead of
          counting as spending. Each shows how much of it you&rsquo;ve paid this cycle. Whatever isn&rsquo;t paid yet
          shows on the cycle card as <B>To set aside</B>. If you pay in more than planned, the extra comes off your
          allowance too. When an expense matches two set-asides, it counts toward the first one in the list.
        </P>
        <P>
          <B>Weekly allowance.</B> GastApp takes income, minus set-asides and subscription charges, and spreads it
          evenly over the cycle&rsquo;s days. It hands that out week by week, starting on payday. The card shows this
          week&rsquo;s budget and what you&rsquo;ve spent from it. Overspending one week comes out of the weeks left.
        </P>
        <H3 id="savings-goals">Savings goals</H3>
        <P>
          Add a goal on the Savings page with <B>New</B>: a name, a target, what you&rsquo;ve saved so far, optional
          steps on the way (like 1000; 2500), and the savings set-aside that funds it. Only Savings set-asides can
          fund a goal.
        </P>
        <Shot name="savings" alt="The Savings page with a goal, its steps and when each is reached" />
        <Ul>
          <li>
            <B>Progress</B> grows with every expense that pays the linked set-aside after the date you entered the
            balance. Transfers dated on or before that day are already in the balance.
          </li>
          <li>
            <B>Dates</B> for each step use the set-aside&rsquo;s amount as your monthly pace. Without one, they use
            your recent average once you have 4 weeks of history.
          </li>
          <li><B>Update balance</B> resets what is saved, as of today, after a withdrawal, interest or a deposit made some other way.</li>
          <li><B>Changing or removing the set-aside</B> keeps everything saved so far. The same goes when you delete the set-aside itself.</li>
        </Ul>
        <P>
          A step at or above the target is flagged in the form and isn&rsquo;t kept. To enter several steps, separate
          them with a space or a semicolon. The dashboard&rsquo;s Top goal card shows your first goal that still has a
          step to reach.
        </P>
      </>
    ),
  },
  {
    id: 'reports-and-settings',
    title: 'Reports and settings',
    body: (
      <>
        <P>Reports show where your money went this month and how that compares over time.</P>
        <Shot name="reports" alt="The Reports page with the 6-month trend and spending by category" />
        <Table
          head={['Report', 'Covers']}
          rows={[
            ['This month', 'Total spent so far this month'],
            ['6-month trend', 'Spending per month for the last six months'],
            ['This vs last month', "This month's total beside last month's"],
            ['By category', "This month's spending per category, with each one's share in percent"],
            ['Top merchants', "This month's biggest merchants, by total spent"],
          ]}
        />
        <P>
          <B>Settings</B> (the gear icon) hold your timezone, which sets &ldquo;today&rdquo; and &ldquo;this
          month&rdquo; across the app. The sun/moon icon beside it switches between light and dark themes. This guide
          is under the <B>?</B> icon next to them.
        </P>
      </>
    ),
  },
  {
    id: 'good-to-know',
    title: 'Good to know',
    body: (
      <>
        <P>A few limits and habits that keep your numbers right.</P>
        <Ul>
          <li><B>USD only.</B> Every amount is saved as US dollars. Other currencies may come later.</li>
          <li>
            <B>One import per statement period.</B> Imported expenses aren&rsquo;t checked for duplicates, so an
            overlapping statement adds them twice. Deposits are checked.
          </li>
          <li><B>Tracked subscriptions add their own charges.</B> After you track one, skip its lines in later bank imports.</li>
          <li><B>The deposit list shows your 200 most recent deposits.</B> The page says so when it reaches that limit.</li>
          <li>
            <B>The recurring-charge finder</B> looks back about two years. It needs at least 3 charges for weekly to
            monthly plans, and 2 for quarterly or yearly ones.
          </li>
          <li>
            <B>Set your timezone</B> early. Until you do, &ldquo;today&rdquo; is UTC, which can put subscription
            charges and the pay cycle&rsquo;s &ldquo;today&rdquo; a day off from yours.
          </li>
        </Ul>
      </>
    ),
  },
];
