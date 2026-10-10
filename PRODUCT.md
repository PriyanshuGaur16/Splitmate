# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone splitting shared costs with other people — roommates, friend groups, trip companions, one-off outings. No single scenario (household vs. trip vs. night out) is the focus; the product is general-purpose, in the mold of Splitwise.

## Product Purpose

Splitmate tracks shared expenses within a group and tells each member exactly who owes whom, so groups don't have to do the maths themselves or chase each other about who paid for what.

## Positioning

A general-purpose, Splitwise-style expense splitter: create a group, log expenses (equal or exact splits), and see per-member balances and settlements computed directly from those expenses.

## Operating Context

- No sign-up friction for testing: seeded demo accounts exist for manual testing (see `initStorage()` in `storage.js`).
- Members can be invited by email before they've registered (`pending` status), and expenses can reference them immediately; the membership retroactively links to their account once they sign up.
- Everything runs client-side against `localStorage` — no server round-trip, so the UI updates should feel instant.

## Capabilities and Constraints

- Groups have members (own id, email, `active`/`pending` status, optional linked `userId`); expenses reference member ids, not user ids.
- Expenses: paid-by, per-member shares, `equal` or `exact` split type, free-text category, soft-deleted (never hard-removed) for auditability.
- Money is always integer cents, never floats.
- Settlements are computed pairwise per shared expense (not a whole-group min-transfer optimization) — a member's balance should only ever move because of an expense they were actually part of.
- **Local-only persistence (`localStorage`, no backend, plaintext passwords) is the current build stage, not a durable product constraint.** Design and product decisions should not lean into "local-only" as a feature — assume a real backend/auth could replace it later without changing the product's shape.

## Brand Commitments

- Name: **Splitmate**.
- Existing wordmark: a rounded emerald-green square with a white "S", followed by the "Splitmate" wordmark in slate (`src/components/Logo.jsx`).
- Existing accent color in use: emerald (`emerald-600`/`700`) on a white/slate neutral palette. Not yet confirmed as a binding brand decision — treat as incumbent visual evidence, not a locked constraint, until a design pass addresses it directly.

## Evidence on Hand

No real user content, testimonials, or case studies. Four seeded demo accounts (`priyanshu@test.com`, `anshul@test.com`, `aditya@test.com`, `hrishi@test.com`, password `password`) exist purely for manual testing, not as product evidence.

## Product Principles

1. **Correct, auditable money math over cleverness.** Integer cents, soft-deleted expenses, and per-expense (not netted) settlements exist so balances are always traceable back to a real expense — don't optimize this away.
2. **Low friction to get a group started.** Members can be invited and owed money before they ever register; don't add gates that block adding an expense on account creation.
3. **Craft as the point.** This is a portfolio/demo project — success is measured by the quality and polish of the experience itself, not by real-world adoption metrics.
4. **Storage is swappable, product shape isn't.** The localStorage-only persistence is an implementation detail of this build stage; don't design features that assume data can never leave the device.
