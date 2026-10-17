# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev       # start Vite dev server on fixed port 5173
npm run build     # production build (vite build)
npm run preview   # preview the production build
npm run lint      # oxlint
```

There is no test suite configured in this project.

## Architecture

Splitmate is a Splitwise-style expense-splitting app: React 19 + React Router 7 + Tailwind v4, built with Vite. Data and auth live in Supabase (Postgres + Supabase Auth); the client talks to it directly via `@supabase/supabase-js` (`src/lib/supabase.js`). There is no custom backend and no longer any `localStorage` persistence of app data (the Supabase client only keeps its auth session in the browser).

### Storage is the only source of truth, and one file owns it

`src/data/storage.js` is the **only** module that talks to Supabase for app data (`AuthContext.jsx` is the one other consumer of `supabase`, for Auth only). Every other file (hooks, pages, components) reads and writes data exclusively through its exported functions (`getUserById`, `createGroup`, `addExpense`, `getExpensesForGroup`, etc.). Reads stay synchronous: `loadData(userId)` fetches profiles/groups/expenses into an in-memory cache after sign-in (must finish before rendering anything that reads storage), and `clearData()` empties it on sign-out. Writes update the cache immediately and go through a serial write queue to Supabase; if a write fails, the cache is re-fetched from the server once the queue drains. Expense creation uses the `add_expense` RPC.

Because reads are synchronous and not reactive, components that read storage must manually force a re-read after a write. The established pattern (see `src/pages/GroupDetail.jsx`) is a `version` state counter that's included in a `useMemo` dependency array and bumped after every mutation.

Key domain model notes baked into `storage.js`:
- **Money is always integer cents**, never floats, to avoid rounding drift. See `src/utils/money.js` for parsing/formatting/splitting helpers.
- **Group members vs. users are different ids.** A group member (`group.members[]`) has its own `id`, plus an `email`, a `status` (`'active'` or `'pending'`), and an optional `userId` once that email registers. Expenses reference **member ids** (`paidBy`, keys of `shares`), not user ids — this lets pending (not-yet-registered) members be paid/owed money before they sign up. When a new user registers, pending memberships matching their email are linked server-side (there is no client-side `activatePendingMemberships` any more).
- **Expenses are soft-deleted** (`isDeleted` flag), never removed, so historical balance math stays auditable. `getExpensesForGroup` filters deleted ones out by default.
- Editing an expense is implemented as add-replacement-then-soft-delete-original (see `handleSave` in `GroupDetail.jsx`), specifically so a failed validation never leaves the expense deleted with nothing to replace it.
- `splitType` is `'equal'` or `'exact'`; `category` is a free string. Both fields were added after the initial schema, so older stored expenses may lack them — treat as optional.
- **Settle up is persisted** in a `settlements` table (append-only, integer `amount_cents`, `from_member_id`/`to_member_id` are member ids, `created_by` is a user id). `addSettlement` writes it via the serial queue with an optimistic cache push; `getSettlementsForGroup` reads it; `handleSettle` in `GroupDetail.jsx` records one pairwise payment for the full amount owed. Settlements have no soft-delete/void flag, so they can't be undone.

### Balance/settlement math (`src/utils/balances.js`)

- `computeNetBalances` gives each member's overall net position in a group (positive = owed money).
- `computeSettlements` computes pairwise debts **directly from shared expenses**, not by minimizing the number of transfers across the whole group. This is intentional: netting debts through third parties would make one person's balance change because of an expense they had nothing to do with. Don't "optimize" this into a min-transfer algorithm without understanding that tradeoff.

### Group history export (`src/utils/groupExport.js`)

- `exportGroupHistory(groupId)` is synchronous and reads only through `storage.js` (`getGroup`, `getExpensesForGroup`), so the cache must already be loaded. It returns row objects keyed by `GROUP_EXPORT_COLUMNS` (Date, Description, Category, Amount, Paid By, Split Between, Notes), sorted by date ascending (plain string sort — assumes ISO dates), deleted expenses excluded, member names instead of ids. It covers expenses only, not settlements.
- `downloadGroupHistory(groupId, groupName)` builds the CSV via the shared `buildCsv`/`downloadCsv` in `src/utils/csvExport.js` and downloads `splitmate-<slug>-history.csv`. It's triggered by the "Export history" button in `GroupDetail.jsx`, disabled when the group has no expenses.

### CSV utility (`src/utils/csvExport.js`)

- `buildCsv(columns, rows, rawColumns = [])` produces RFC 4180 quoting, `\r\n`, UTF-8 BOM, and neutralises formula injection (leading `'` on text cells starting with `= + - @ \t \r`). Columns listed in `rawColumns` (numeric amounts like `Amount`, `Total`, `My Share`) skip neutralisation so negatives stay numbers. `downloadCsv(filename, csv)` triggers the download.

### Reports (`/reports`, spec in `specs/reports.md`)

- `src/pages/Reports.jsx` shows expense history across all groups: summary cards, a CSS-bar monthly chart, and a paged table (50 rows), plus Download CSV. State lives in URL params: `range` (default `last-6`), `from`/`to` (custom), `group`, `view` (`total` or default personal share). Custom dates keep the last valid range and show an inline error.
- `src/utils/monthlyReport.js` is pure (no storage imports except what callers pass in): `resolveRange`, `collectRows`, `filterRows`, `buildMonthlyReport`, `toCsvRows`, `reportFilename(today)` → `splitmate-report-YYYY-MM.csv` (download month, not data range). Expenses only; settlements are excluded.

### Page titles

`src/hooks/useDocumentTitle.js` sets `document.title` to `"<title> | Splitmate"` (`{ full: true }` for the landing page's full title). Every routed page calls it; group pages use the group name. `/profile` has no page yet, so no title.

### Auth

`src/context/AuthContext.jsx` provides a `{ user, login, register, logout }` context backed by Supabase Auth (`signInWithPassword` / `signUp` / `signOut`, session persisted and auto-refreshed by the client). Registration requires a password of at least 6 characters. Only profiles of people who share a group with you are visible. `login`/`register` return `{ error }` or `{ user }` rather than throwing, so callers render errors inline (see `ErrorMessage.jsx` usage in pages).

Route gating (`src/App.jsx`) uses two wrapper components around `react-router-dom`'s `<Outlet />`:
- `ProtectedRoute` — redirects to `/login` if not authenticated.
- `PublicOnlyRoute` — redirects logged-in users away from `/`, `/login`, `/register` to `/dashboard`.

Authenticated pages render inside `AppLayout`, which provides the header/nav shell (paper `bg-paper` ground, `border-rule` header border, Reports link). Routes: `/dashboard`, `/group/new`, `/group/:id`, `/group/:id/settings` (`GroupSettings.jsx`, creator-only member removal with inline confirm), `/reports`.

### Seed data

`initStorage()` is now a no-op kept so `main.jsx` doesn't change; nothing is seeded client-side. The test accounts (`priyanshu@test.com` / `anshul@test.com` / `aditya@test.com` / `hrishi@test.com`, all password `password`) exist in the Supabase project and are useful for manual testing; `priyanshu@test.com` logs in and has two groups (Goa Trip, Flat 402) with data.

### Styling

Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js` — v4 is CSS-first, configured in `src/index.css`). Utility classes are used inline throughout; there's no component library.

Design tokens live in `@theme` in `src/index.css`: `paper` (#F8F7F4), `ink`, `ink-soft`, `rule`, `stamp` (#EA580C), `stamp-dark`, `night`; fonts `font-display` (Zilla Slab), `font-ledger` (Courier Prime, used for amounts), `font-sans` (Public Sans). The "ledger" look is flat: square corners, no shadows, no gradients, orange as the only accent. `GroupDetail.jsx` is redesigned in this style (two-column from `lg`: expenses left, balances + members in a 19rem right column; stacked on mobile; red-700/emerald-700 only for owe/owed amounts, always with `+`/`−` and text labels; wrapped in `.ledger-surface` for orange focus rings). Other pages (Dashboard, Reports, forms) still use emerald/slate and are not yet migrated, so they look mismatched on the paper ground. `DESIGN.md` still describes only the landing page.

### Environment and config

- `.env` (gitignored) must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `src/lib/supabase.js` reads them.
- `.mcp.json` (untracked) configures the Supabase MCP server for the project, used for inspecting tables/logs.

### Review subagents

`.claude/agents/` holds read-only reviewers (e.g. `database-reviewer`: Supabase queries, RLS, `isDeleted`, member-vs-user ids, N+1). They only see what's in the repo — the schema, RLS policies and RPCs are not checked in (no `.sql`/migration files), so inspect the live project via the Supabase MCP for those.

Review reports from the settle-up pipeline are in `reports/` (database, security, frontend). Reviewers can't write files; the main agent saves their findings. `fix-implementer` applies approved fixes.

### Known issues (from database review of settle up, unverified against the live schema)

- `settlements` RLS `with check`, `amount_cents > 0` / `from <> to` constraints, and foreign-key delete behavior are unconfirmed. Also unconfirmed: `created_by` forging on settlements/expenses, `group_members` insert trust, and settlement void. Deliberately not changed client-side; inspect via Supabase MCP and get approval before drafting migrations.
- `enqueue`/`addSettlement` now return `{ ok: true }` or `{ error }` and a `generation` counter (bumped by `clearData`) stops stale loads/resyncs after sign-out, so a failed settlement surfaces an error in `GroupDetail.jsx` instead of vanishing.
- Shell cwd can drift into `src/`; `cd` to the repo root before `npm run lint`/`build` (otherwise "No files found" / missing package.json). `npm run build` once failed with a transient memory allocation error; a retry succeeded.
- Settling then editing/deleting the underlying expense can leave a phantom debt; the double-click guard is local to one tab.

### Manual UI verification

Verified in a browser (Playwright MCP) that login works and the dashboard ("Your groups") renders with no horizontal overflow at 375px width. If the Playwright MCP disconnects, reconnect with `/mcp`. `.playwright-mcp/` is gitignored; screenshots saved to the repo root (e.g. `dashboard-375.png`) are not, so don't commit them.
