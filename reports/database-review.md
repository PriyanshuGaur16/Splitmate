# Settle Up database review

Scope: `src/data/storage.js`, `src/pages/GroupDetail.jsx` (lines 1-170), `src/utils/balances.js`, `src/hooks/useUserGroups.js`. `GroupSettings.jsx` and `groupExport.js` were not read. The live schema was not inspected, so every RLS and constraint statement is unverified.

## Critical

None found in code. One item needs confirmation:

- **Needs confirmation: `settlements` RLS and constraints.** `addSettlement` inserts `created_by`, `from_member_id` and `to_member_id` from the client (`src/data/storage.js:387-397`). If the insert policy lacks a `with check`, any authenticated user could write settlements into other groups or forge `created_by`.
  - Required check: `created_by = auth.uid()` AND caller is an active member of `group_id` AND both member ids belong to that group.
  - Confirm constraints `amount_cents > 0` and `from_member_id <> to_member_id`.
  - Confirm RLS is on with select and insert policies only (append-only; no update or delete).
  - Verify via the Supabase MCP.

## High

1. **Failed settlement write leaves the UI stale and silent** (`src/data/storage.js:142-161`, `src/pages/GroupDetail.jsx:127-151`).
   - `addSettlement` pushes to the cache optimistically; on failure `enqueue` re-fetches but never notifies the UI. `GroupDetail` bumps `version` after a fixed 700ms, before the write resolves, and `try/catch` only catches synchronous validation errors.
   - Scenario: RLS rejects the insert or the network drops. The "owes" row disappears and the user thinks they settled; the resync later restores the debt without any re-render.
   - Fix: return a promise from `enqueue`/`addSettlement` (or add `onError`/subscribe). `handleSettle` awaits it, shows the error, bumps `version` after resync, and resolves `settlingKey` from the result instead of a timer.

2. **Settlements not scoped to the underlying expenses** (`src/utils/balances.js:45-48`).
   - Scenario: A owes B 50, A settles 50, the expense is edited so the debt is 20. The settlement still subtracts 50, giving a phantom "B owes A 30".
   - Fix: add a void mechanism (`voided_at`, filtered like `is_deleted`) or warn/block editing or deleting expenses with settlements on the same pair.

3. **Resync after sign-out can repopulate the cache with the old user's data** (`src/data/storage.js:150-159` vs `clearData` at 123-127).
   - Scenario: a write fails, the user signs out during the resync, `clearData()` empties the cache, then the pending `fetchAll()` resolves and overwrites it. A second user signing in could see that data.
   - Fix: capture a generation token or `loadedFor` before `fetchAll()` and discard stale results. Same for `loadData`.

## Medium

1. **`removeGroupMember` ignores settlements** (`src/data/storage.js:440-446`). The delete may hit an FK from `settlements.from_member_id`/`to_member_id`, and `23503` is mislabelled "member has existing expenses". If the FK cascades, settlement history is silently erased. Fix: check settlements with their own message; make the FK `on delete restrict`.
2. **`useUserGroups` memoizes on `[userId]` only** (`src/hooks/useUserGroups.js:23`). Dashboard balances can go stale after writes. Add a version/refresh dependency or confirm the page always remounts.
3. **Over-fetching with `select('*')` and unscoped loads** (`src/data/storage.js:71`, 89-92). Relies entirely on RLS for scoping; tighten select lists. Every failed write triggers a full `fetchAll()`.
4. **Rapid-click guard is per-tab and timer-based** (`src/pages/GroupDetail.jsx:127-146`). The `setTimeout` calls `setState` after unmount; two tabs or a reload can write duplicate settlements. Make `addSettlement` idempotent or settle via an RPC that verifies the amount against the actual debt.

## Low

- `isDeleted` handling is consistent (`fetchAll` filters `is_deleted = false`; the member-removal check deliberately counts deleted expenses).
- Member vs user ids are used correctly in the settlement path.
- `computeSettlements` drops payments referencing removed members while `computeNetBalances` still counts them, so the two views could disagree.
- `src/pages/GroupDetail.jsx:76` has a lint-suppress comment.
- Only `storage.js`, `AuthContext.jsx` and `lib/supabase.js` import supabase; no storage-layer violations.
- `addSettlement` validates integer cents; `addExpense` does not validate integer amounts/shares.
- `splitType`/`category` can be null from the DB (`toExpense`, lines 56-57); add a comment.

**Verdict:** Settlement math and member-id/`isDeleted` handling are sound. Main risks: silent failed settlement writes, cache repopulation after sign-out, and unverified `settlements` RLS/constraints.
