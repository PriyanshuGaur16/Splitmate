# Security review: Splitmate (Settle Up and related changes)

Scope: `storage.js`, `GroupDetail.jsx`, `GroupSettings.jsx`, `balances.js`, `groupExport.js`, `App.jsx`, `AuthContext.jsx`, `supabase.js`, `.mcp.json`, `.claude/settings.json`, `.gitignore`, `.env` (key names only).

Limits: RLS policies, RPCs and constraints are not in the repo and the live project was not inspected; anything "depends on RLS" is unverified. Whether `.env` is tracked by git was not checked (`.gitignore` lists it).

**Result:** no Critical findings and no hardcoded secrets in source. Nearly all authorization is client-side and trusts client-supplied ids, which is safe only if RLS is strict.

## Critical
None found.

## High

1. **Client-supplied `created_by` / `deleted_by` trusted** (`src/data/storage.js:355,395,255`; `src/pages/GroupDetail.jsx:117,119,138,154`).
   - `userId` flows from the client into `settlements.created_by`, `expenses.deleted_by`, `groups.created_by`. Authorship can be forged. Any member can also write a settlement between any two member ids; `from_member_id`/`to_member_id` are not restricted to the caller.
   - Fix: set these columns server-side (`default auth.uid()` or trigger) and drop them from payloads. Add an RLS `with check` on `settlements` (caller is a group member, both member ids belong to `group_id`, `from <> to`, `amount_cents > 0`). Make `deleted_by` trigger-set. Move settle-up into an RPC like `add_expense`.

2. **Client-controlled `user_id` and `status` on `group_members` inserts** (`src/data/storage.js:224-239,260-269`).
   - If RLS lets the group creator insert these columns unvalidated, a user could add an arbitrary `user_id` as `active` without consent.
   - Fix: insert only `email` with status `pending`; let server-side linking set `user_id`/`status`. RLS: `user_id` null or `auth.uid()`.

3. **Authorization is client-side only for edit, delete, admin settings, member removal** (`GroupDetail.jsx:167,272`; `GroupSettings.jsx:21`; `storage.js:406-409,429-464`).
   - `createdBy === user.id` and `isGroupAdmin` are UI conveniences. The comment at `storage.js:403` claims RLS enforces admin-only rename/delete; unverified. Expense soft-delete (`storage.js:351-358`) has no `group_id` filter. The "member has expenses" check in `removeGroupMember` is a check-then-act race and relies on FK error 23503.
   - Fix: verify RLS on `groups` update, `group_members` delete, `expenses` update. Add `ON DELETE RESTRICT` FKs. Ideally move remove-member and delete-expense into RPCs.
   - Related unconfirmed: `settlements` constraints and `with check` (CLAUDE.md Known issues).

## Medium

4. **CSV injection filter incomplete** (`src/utils/groupExport.js:45-47`). Regex `^[=+\-@]` misses leading tab/CR and whitespace-prefixed formulas; member names/emails are attacker-controlled. Fix: `/^[\s=+\-@]/` (or `/^[=+\-@\t\r]/`) and prefix `'`; apply to header and all text columns. Amount is safe (integer cents). BOM, RFC 4180 quoting, slugged filename and blob URL revocation are correct.
5. **Unvalidated input reaches the DB** (`storage.js:219-275,288-341,414-424`). No length caps on names/descriptions/notes/category; no email validation on `memberEmails`; `addExpense` doesn't check integer `amount > 0`, non-negative integer shares, that `paidBy`/share keys belong to the group, or date validity. Fix: validate in `storage.js` and enforce with DB `CHECK`s and in the `add_expense` RPC.
6. **Settlement amount computed on the client** (`GroupDetail.jsx:127-139`). Stale caches and concurrent settles can overpay and flip the debt. Fix: validate `amount <= owed` in an RPC, or add an idempotency key/unique constraint.
7. **Failed writes silently swallowed** (`storage.js:142-161`). Only `console.error` plus resync; the user is never told, and Supabase error objects may be logged. Fix: surface a generic user-facing error; log short message and code only.

## Low

8. **Raw Supabase error messages shown** (`AuthContext.jsx:71,92`; `storage.js:456,462`); registration reveals taken emails (`AuthContext.jsx:96-98`). Map to generic messages; rate-limit / CAPTCHA in Supabase Auth.
9. **Weak password policy and shared test credentials** (`AuthContext.jsx:86`, CLAUDE.md). Minimum 6; test accounts use `password`. Raise minimum to 8+, enable leaked-password protection, rotate or isolate test accounts.
10. `GroupSettings.jsx:21` admin check is a UX guard only (see High 3).
11. **`.mcp.json`** (untracked) holds a Supabase `project_ref` (not secret) but enables broad write-capable tools. Use `read_only=true`, restrict `features`, and add it to `.gitignore`.
12. **`.claude/settings.json` hooks** (`:14,24,35`) run `node` scripts in `.claude/hooks/`; `log-prompt.js`/`log-bash.js` may log secrets. Confirm output location is gitignored.

## Env vars and secrets (verified)

- `.env` defines only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; no service_role/secret key; gitignored.
- `src/lib/supabase.js:6-7` is the only reader of `import.meta.env`.
- Publishable key is public by design, so data security depends on RLS.
- No hardcoded keys/tokens in `src`.
- Hardening: add `.env.*` and `.mcp.json` to `.gitignore`; commit a `.env.example`.

## Clean checks

- No `dangerouslySetInnerHTML`/`innerHTML`; user text rendered through React escaping.
- No `console.log` of user data.
- `App.jsx` wraps app pages in `ProtectedRoute`.
- `balances.js` math is integer-only.
