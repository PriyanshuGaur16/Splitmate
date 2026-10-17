# Reports: spec

Status: draft, not built.

## Purpose

Let a signed-in user see their expense history across all of their groups over time, and download it as a CSV. Today history is only visible per group (`GroupDetail`) and the only export is the per-group `groupExport.js`. Reports adds a cross-group, time-based view.

## Scope

In scope: a read-only `/reports` page, a monthly spending chart, a filtered expense table, and a CSV download of the filtered table.

Out of scope (v1): editing or deleting from this page, settlements in the chart or table, currency conversion, PDF export, saved filters, sharing a report.

## Route and navigation

- Route: `/reports`, inside `ProtectedRoute` and `AppLayout`, like `Dashboard`.
- Nav: a "Reports" link in `AppLayout` next to the existing nav items.
- All data is read synchronously through `storage.js` (`getGroupsForUser`, `getGroup`, `getExpensesForGroup`). The cache is already loaded after sign-in, so there is no loading state beyond what the app shell already has. No new Supabase access outside `storage.js`.

## Page layout

Top to bottom, single column, `max-w-4xl`, same card style as the rest of the app.

1. **Header row:** page title "Reports", and a "Download CSV" button on the right (wraps below the title at 375px).
2. **Controls card** (see Controls).
3. **Summary strip:** three figures for the current filter (see Summary).
4. **Chart card:** "Spending by month" bar chart.
5. **Table card:** "Expenses" table of every expense matching the filter.

At 375px width the page must not scroll horizontally. The table collapses to a stacked list (see Table).

## Controls

All controls are client-side filters. Changing any control recomputes the summary, chart, table and CSV together. State lives in the URL query string (`?from=&to=&group=&view=`) so a filtered view survives reload and can be bookmarked.

| Control | Type | Default | Notes |
| --- | --- | --- | --- |
| Date range | preset select + two date inputs | Last 6 months | Presets: This month, Last 3 months, Last 6 months, This year, All time, Custom. Choosing Custom reveals the two date inputs; editing either date switches the preset to Custom. |
| Group | select | All groups | Lists only groups the user belongs to. |
| Show | segmented toggle | My share | "My share" or "Group total" (see Calculations). |

Rules:
- `from` must be on or before `to`. If not, show an inline error (`ErrorMessage`) and keep the previous valid results.
- Dates are inclusive and compared as ISO `YYYY-MM-DD` strings (expense dates are already ISO; see `groupExport.js`).
- Every control has a visible `<label>`. The toggle is a `radiogroup` with a legend.

## Data and calculations

### Source rows

For each group from `getGroupsForUser(user.id)`, take `getExpensesForGroup(group.id)`. That already excludes soft-deleted expenses (`isDeleted`). Attach the group's id and name to each row. Settlements are not included.

### The user's member id

Expenses reference **member ids**, not user ids. In each group, find the member whose `userId === user.id`; call it `me`. If a group has no such member (should not happen for groups the user belongs to), skip that group.

### Per-expense figures (integer cents, never floats)

- **Total:** `expense.amount`.
- **My share:** `expense.shares[me.id] ?? 0`.
- **I paid:** `expense.paidBy === me.id ? expense.amount : 0`.

### "Show" modes

- **My share (default):** every amount in the summary and chart is My share. This is what the user actually spent. Expenses where the user has a zero share (they weren't part of it) are still listed in the table but contribute 0.
- **Group total:** every amount is the expense Total, for all expenses in the selected groups, whether or not the user was part of it.

### Month bucketing

- Bucket key is `expense.date.slice(0, 7)` (`YYYY-MM`). Dates are not parsed through `Date`, so there is no timezone drift.
- The chart shows every month from the first to the last month of the selected range, including months with zero expenses (rendered as an empty slot with a 0 label), so gaps are visible. For "All time", the range runs from the earliest matching expense month to the current month.
- Month totals are the sum of the per-expense figure for the active "Show" mode.

### Summary strip

For the current filter:
- **Total spent:** sum of the active mode's figure across matching expenses.
- **Expenses:** count of matching expenses (all of them, including zero-share ones).
- **Average per month:** Total spent divided by the number of months in the chart axis, rounded to the nearest cent with `Math.round` on integer cents. Money is only formatted at the edge via `src/utils/money.js`.

## Chart

- Vertical bar chart, one bar per month, month label on the x axis ("Jan 2026"; just "Jan" if all months are in one year and there are more than 6, to save space), amount on the y axis.
- Single series. If the group filter is "All groups" the bars are not split by group in v1 (keeps it legible at 375px).
- Built with plain SVG or CSS bars; do not add a charting dependency for v1 without approval. Colours follow the app's current primary colour.
- Each bar shows its value on hover and keyboard focus (title/tooltip), and the same data is available as a visually hidden table or an `aria-label` per bar, so the chart is not the only way to read the numbers. Do not rely on colour alone.
- Bar heights are scaled to the largest month; a month with 0 renders no bar.
- At 375px, if there are more than 6 months the chart scrolls horizontally inside its own card (the page itself does not).

## Table

One row per matching expense, sorted by date descending (ties: by creation order, newest first). The CSV uses ascending order (see CSV); the on-screen order is for reading recent activity first.

Columns (desktop): Date, Description, Group, Category, Paid by, Total, My share.
- "Paid by" shows the member name, or "You" when `paidBy === me.id`; unknown member falls back to "Unknown".
- Category is blank if the expense has none (older expenses may lack `category`).
- Total and My share are formatted with `formatMoney`.
- In "Group total" mode the My share column is still shown, so the user can compare.
- Description links to `/groups/:groupId` so the user can open the group.

Below `sm` the table becomes a stacked list: description and amount on the first line, date, group and paid-by beneath. No horizontal scrolling.

Pagination: show the first 50 rows with a "Show more" button that adds 50 at a time. The CSV always contains all matching rows, not just the visible ones.

## CSV

Triggered by "Download CSV". It exports exactly what the current filter matches, in the current Show mode, regardless of how many rows are paged in.

- **Filename:** `splitmate-report-YYYY-MM.csv`, where `YYYY-MM` is the year and month the file is downloaded (taken from the local date at click time). The name is the same whatever the filters are, so two downloads in one month get the browser's usual `(1)` suffix.
- **Encoding and format:** reuse the existing builder in `groupExport.js`: RFC 4180 quoting, `\r\n` line endings, UTF-8 BOM, and a leading `'` on text cells beginning with `=`, `+`, `-`, `@`. Extend the neutralising check to also cover leading tab and carriage return (see `reports/security-review.md` finding 4). Extract the shared CSV helpers so both exports use the same code instead of duplicating them.
- **Order:** date ascending (plain ISO string sort), ties by creation order, matching the per-group export.
- **Columns**, in order:

| Column | Content |
| --- | --- |
| Date | `YYYY-MM-DD` |
| Group | Group name |
| Description | Expense description |
| Category | Category or blank |
| Paid By | Member name |
| Total | Expense total, as a decimal in the major unit, e.g. `12.50` |
| My Share | The user's share, same format |
| Split Between | Names of members with a non-zero share, `; `-separated |
| Notes | Expense notes or blank |

- **Amounts:** formatted from integer cents with no currency symbol or thousands separator, `.` as decimal separator, so spreadsheets parse them as numbers. Amount cells are generated from integers and therefore are not subject to formula neutralising.
- **Always both Total and My Share** are included, independent of the Show toggle, so the file is complete. The toggle only changes the on-screen figures.
- **Not included:** settlements, deleted expenses, member ids/emails.
- The button is disabled when the filter matches no expenses.

## Empty states and edge cases

| Situation | Behaviour |
| --- | --- |
| User belongs to no groups | Whole page shows an empty state: "No groups yet" with a link to create a group. Controls, chart and table hidden; CSV disabled. |
| Groups exist but have no expenses at all | "No expenses yet" with a link to the dashboard. CSV disabled. |
| Expenses exist but none match the filter | Controls stay visible. Summary shows 0. Chart axis still renders with all-zero months and the message "No expenses in this period." Table shows the same message. CSV disabled. Suggest "Try a wider date range." |
| Selected group no longer exists (stale `?group=`) | Fall back to "All groups" silently and update the URL. |
| Invalid or malformed query params | Ignore the bad param and use its default. |
| Custom range with `from` after `to` | Inline error, keep previous results (see Controls). |
| Expense with `date` outside the range boundaries | Included only if `from <= date <= to` inclusive. |
| Expense where user's share is 0 | Listed in the table; contributes 0 in My share mode; counted in Expenses. |
| Pending (not yet registered) members | Shown by name or email like elsewhere; they never equal `me`. |
| Removed member referenced by an old expense | Name falls back to "Unknown". |
| Expense missing `category` / `splitType` | Treated as optional; blank in table and CSV. |
| Very large histories (thousands of rows) | Table is paged; chart and summary compute in a single pass; CSV built in memory. No server calls. |
| Writes elsewhere while the page is open | Reads are synchronous and not reactive; the page re-reads on mount and when a control changes. A `version` counter is only needed if this page ever performs writes (it does not). |
| Multiple currencies | Not supported; all amounts are treated as one currency, as in the rest of the app. |
| Text with commas, quotes, newlines, or leading formula characters in descriptions, notes or names | Handled by the CSV builder (quoting and neutralising). |

## Accessibility

- Page has one `h1`; card titles are `h2`.
- Controls have labels; error messages use `ErrorMessage` (`role="alert"`) and are linked to the offending input.
- Chart has a text alternative (the per-bar labels or hidden table) and is keyboard focusable per bar.
- Text contrast meets 4.5:1 (avoid `slate-400` for text; see `reports/frontend-review.md`).
- Touch targets at least 44px high on mobile.
- Table uses real `<table>` markup with `<th scope="col">` on desktop.

## Implementation notes (for the build step)

- New files: `src/pages/Reports.jsx`, `src/utils/reports.js` (pure functions: collect rows, filter, bucket by month, summarize, build CSV rows), and a small chart component. Add the route in `src/App.jsx` and the nav link in `AppLayout.jsx`.
- `src/utils/reports.js` should be pure and unit-testable, even though the project has no test suite yet. Put the calculations there, not in the component.
- Reuse `src/utils/money.js` for all parsing and formatting; no floating-point money.
- No new `storage.js` functions are strictly required; if a helper `getExpensesForUser` is added, it must still read only from the in-memory cache.

## Open questions

1. Should "Group total" mode exist in v1, or is "My share" enough?
2. Should the default range be "Last 6 months" or "All time"?
3. Should settlements ever appear in Reports (e.g. a "Payments" series)?
4. Which palette do the chart and controls use: the current emerald/slate or the orange/paper tokens in `src/index.css`? This is the same open design decision as in `reports/frontend-review.md`.
