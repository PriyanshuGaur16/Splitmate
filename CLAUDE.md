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

Splitmate is a Splitwise-style expense-splitting app: React 19 + React Router 7 + Tailwind v4, built with Vite. There is no backend — everything is persisted to `localStorage`.

### Storage is the only source of truth, and one file owns it

`src/data/storage.js` is the **only** module that touches `localStorage`. Every other file (hooks, pages, components) reads and writes data exclusively through its exported functions (`getUserById`, `createGroup`, `addExpense`, `getExpensesForGroup`, etc.). This is deliberate: swapping localStorage for a real backend (e.g. Supabase) later should only require rewriting this file's internals and making its functions async — callers shouldn't need to change.

Because reads are synchronous and not reactive, components that read storage must manually force a re-read after a write. The established pattern (see `src/pages/GroupDetail.jsx`) is a `version` state counter that's included in a `useMemo` dependency array and bumped after every mutation.

Key domain model notes baked into `storage.js`:
- **Money is always integer cents**, never floats, to avoid rounding drift. See `src/utils/money.js` for parsing/formatting/splitting helpers.
- **Group members vs. users are different ids.** A group member (`group.members[]`) has its own `id`, plus an `email`, a `status` (`'active'` or `'pending'`), and an optional `userId` once that email registers. Expenses reference **member ids** (`paidBy`, keys of `shares`), not user ids — this lets pending (not-yet-registered) members be paid/owed money before they sign up. When a new user registers, `activatePendingMemberships` retroactively links any pending memberships matching their email.
- **Expenses are soft-deleted** (`isDeleted` flag), never removed, so historical balance math stays auditable. `getExpensesForGroup` filters deleted ones out by default.
- Editing an expense is implemented as add-replacement-then-soft-delete-original (see `handleSave` in `GroupDetail.jsx`), specifically so a failed validation never leaves the expense deleted with nothing to replace it.
- `splitType` is `'equal'` or `'exact'`; `category` is a free string. Both fields were added after the initial schema, so older stored expenses may lack them — treat as optional.

### Balance/settlement math (`src/utils/balances.js`)

- `computeNetBalances` gives each member's overall net position in a group (positive = owed money).
- `computeSettlements` computes pairwise debts **directly from shared expenses**, not by minimizing the number of transfers across the whole group. This is intentional: netting debts through third parties would make one person's balance change because of an expense they had nothing to do with. Don't "optimize" this into a min-transfer algorithm without understanding that tradeoff.

### Auth

`src/context/AuthContext.jsx` provides a simple `{ user, login, register, logout }` context backed by `storage.js`. Passwords are stored in plaintext in localStorage (this is a local-only demo app, not a security-hardened one). `toPublicUser` strips the password before it ever reaches React state/UI. `login`/`register` return `{ error }` or `{ user }` rather than throwing, so callers render errors inline (see `ErrorMessage.jsx` usage in pages).

Route gating (`src/App.jsx`) uses two wrapper components around `react-router-dom`'s `<Outlet />`:
- `ProtectedRoute` — redirects to `/login` if not authenticated.
- `PublicOnlyRoute` — redirects logged-in users away from `/`, `/login`, `/register` to `/dashboard`.

Authenticated pages render inside `AppLayout`, which provides the header/nav shell.

### Seed data

`initStorage()` (called once in `main.jsx` before anything else reads storage) seeds four test accounts (`priyanshu@test.com` / `anshul@test.com` / `aditya@test.com` / `hrishi@test.com`, all password `password`) if they don't already exist in localStorage. Useful for manual testing without registering a new account each time.

### Styling

Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js` — v4 is CSS-first, configured in `src/index.css`). Utility classes are used inline throughout; there's no component library.
