# Splitmate

Splitmate is a Splitwise-style expense-splitting app for friends and housemates who share costs and want to see, at a glance, who owes whom.

## Features

- Create groups and add members by email; people can be added before they have registered and are linked automatically when they sign up
- Log shared expenses with an equal split or exact custom amounts
- Tag expenses with a category
- See per-member net balances and who owes whom, calculated automatically
- Delete expenses without losing balance history (soft delete)
- Edit an expense safely: the replacement is saved before the original is removed
- Register and log in with email and password; all data stays in your browser

## Tech stack

- React 19
- Vite
- Tailwind CSS v4
- React Router 7
- lucide-react (icons) and Recharts (charts)
- localStorage for persistence (Phase 1)
- Supabase (Phase 2, planned)

## Getting started

1. Clone the repo
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Open http://localhost:5173

Other scripts: `npm run build` (production build), `npm run preview` (serve the build), `npm run lint` (oxlint). There is no test suite.

## Test accounts

These are created automatically on first load, all with password `password`:

- priyanshu@test.com / password
- anshul@test.com / password
- aditya@test.com / password
- hrishi@test.com / password

## Project structure

```
src/
  components/  reusable UI pieces (AppLayout, AddExpenseModal, FormField, route guards, ...)
  context/     AuthContext (useAuth hook)
  pages/       one file per route
  hooks/       useUserGroups
  utils/       balances.js, money.js, dates.js, validation.js
  data/        storage.js (all localStorage access)
```

## Available routes

| Route | Page | Auth required |
| --- | --- | --- |
| `/` | Landing | No (logged-in users are redirected to `/dashboard`) |
| `/login` | Login | No (logged-in users are redirected to `/dashboard`) |
| `/register` | Register | No (logged-in users are redirected to `/dashboard`) |
| `/dashboard` | Dashboard | Yes |
| `/group/new` | CreateGroup | Yes |
| `/group/:id` | GroupDetail | Yes |

Any other path redirects to `/`.

## Data storage

Phase 1 stores everything in localStorage under these keys: `splitmate.users`, `splitmate.groups`, `splitmate.expenses`, and `splitmate.session`. `src/data/storage.js` is the only module that touches localStorage; all other code goes through its exported functions.

Phase 2 will migrate to Supabase. Because access is isolated in `storage.js`, that change should only require rewriting its internals and making its functions async.

Reads are synchronous and not reactive, so components bump a `version` counter after each write to force a re-read (see `src/pages/GroupDetail.jsx`).

## Important notes

- Money is stored as integer cents, never floats, to avoid rounding drift.
- Expenses are soft-deleted (`isDeleted: true`) rather than removed, so historical balance calculations stay auditable. Lists filter deleted expenses out by default.
- `paidBy` and the keys of `shares` use group member record ids, not user ids. This lets someone who has not registered yet be paid or owed money.
- Pending member flow: adding a member by email creates a member with `status: 'pending'`. When someone registers with that email, their pending memberships are linked to their user id and become `active`.
- Settlements are computed pairwise from shared expenses, not minimized across the whole group, so one person's balance never changes because of an expense they were not part of.
- Passwords are stored in plaintext in localStorage. This is a local-only demo, not a security-hardened app.
