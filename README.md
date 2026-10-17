# Splitmate

Splitmate is a Splitwise-style expense-splitting app for friends and housemates who share costs and want to see, at a glance, who owes whom.

## Features

- Create groups and add members by email; people can be added before they have registered and are linked automatically when they sign up
- Log shared expenses with an equal split or exact custom amounts
- Tag expenses with a category
- Add optional notes to an expense, shown under its description in the group
- See per-member net balances and who owes whom, calculated automatically
- Delete expenses without losing balance history (soft delete)
- Edit an expense safely: the replacement is saved before the original is removed
- Settle up: record a payment on any debt that involves you; it disappears from the group's balances and your dashboard totals update (settlements cannot be undone)
- Group settings for the group creator: rename the group, or remove a member who has no expenses in it
- Export a group's expense history as a CSV file
- Reports page with spending over a date range and a CSV download
- Register and log in with email and password; data is saved to your account so it is there on any device

## Tech stack

- React 19
- Vite
- Tailwind CSS v4
- React Router 7
- lucide-react (icons) and Recharts (charts)
- Supabase (Postgres and Auth) for persistence and sign-in

## Getting started

1. Clone the repo
2. Install dependencies: `npm install`
3. Create a `.env` file in the project root with your Supabase project details:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   ```
4. Start the dev server: `npm run dev`
5. Open http://localhost:5173

Other scripts: `npm run build` (production build), `npm run preview` (serve the build), `npm run lint` (oxlint). There is no test suite.

## Test accounts

These accounts exist in the Supabase project, all with password `password`:

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
  hooks/       useUserGroups, useDocumentTitle
  utils/       balances.js, money.js, dates.js, validation.js, csvExport.js, groupExport.js, monthlyReport.js
  data/        storage.js (all data access, backed by Supabase)
  lib/         supabase.js (Supabase client)
```

## Available routes

| Route | Page | Auth required |
| --- | --- | --- |
| `/` | Landing | No (logged-in users are redirected to `/dashboard`) |
| `/login` | Login | No (logged-in users are redirected to `/dashboard`) |
| `/register` | Register | No (logged-in users are redirected to `/dashboard`) |
| `/dashboard` | Dashboard | Yes |
| `/reports` | Reports | Yes |
| `/group/new` | CreateGroup | Yes |
| `/group/:id` | GroupDetail | Yes |
| `/group/:id/settings` | GroupSettings | Yes (group creator only; others are redirected to the group) |

Any other path redirects to `/`.

## Data storage

Data and accounts live in Supabase. `src/data/storage.js` is the only module that reads or writes app data; all other code goes through its exported functions. Sign-in uses Supabase Auth, and `src/lib/supabase.js` creates the client from the two `VITE_SUPABASE_*` variables in `.env`.

After sign-in, `loadData` fetches the user's profiles, groups, expenses and settlements into an in-memory cache, so reads stay synchronous. Writes update the cache immediately and are sent to Supabase one at a time in order; if one fails, the cache is reloaded from the server.

Reads are not reactive, so components bump a `version` counter after each write to force a re-read (see `src/pages/GroupDetail.jsx`).

## Important notes

- Money is stored as integer cents, never floats, to avoid rounding drift.
- Expenses are soft-deleted (`isDeleted: true`) rather than removed, so historical balance calculations stay auditable. Lists filter deleted expenses out by default.
- `paidBy` and the keys of `shares` use group member record ids, not user ids. This lets someone who has not registered yet be paid or owed money.
- Pending member flow: adding a member by email creates a member with `status: 'pending'`. When someone registers with that email, their pending memberships are linked to their user id and become `active` (this is done server-side).
- Settle up is stored in an append-only `settlements` table (member ids and integer cents). Recorded payments are subtracted from the pairwise debt between exactly those two members.
- Settlements are computed pairwise from shared expenses, not minimized across the whole group, so one person's balance never changes because of an expense they were not part of.
- The group creator is the admin. A member can only be removed if they have no expenses in the group, as payer or in any share, including deleted ones.
- Only profiles of people who share a group with you are visible.
