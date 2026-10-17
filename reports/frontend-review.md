# Frontend review: Settle Up

Scope: `GroupDetail.jsx`, `GroupSettings.jsx`, `App.jsx`, `src/components/*`. Read-only review.

Clean: no inline `style={{}}`, no gradients, no hardcoded test data, hooks called before early returns, list keys use ids, `.sort` at GroupDetail.jsx:74 doesn't mutate the cache. `App.jsx` has no issues.

Design note: no design-system section in CLAUDE.md. `DESIGN.md` and `src/index.css` define `--color-paper: #f8f7f4` and `--color-stamp: #ea580c`, unused by the Settle Up UI (emerald/slate). DESIGN.md: flat surfaces, no shadows or gradients.

## Critical
None.

## High
1. **Off-palette colours** across changed UI: emerald (GroupDetail.jsx:32,42,167,180,215,228; AddExpenseModal.jsx:354), slate, blue hover (GroupDetail.jsx:278). Spec: primary #EA580C, bg #F8F7F4, border #E8E4DE. Use `stamp`/`paper` tokens consistently.
2. **Low-contrast action text.** GroupDetail.jsx:278,286 `text-slate-400` on white (~2.6:1). Use `slate-600` (min `slate-500`).
3. **Settle buttons indistinguishable to screen readers** (GroupDetail.jsx:14-20). Add `aria-label` with payer, payee and amount.
4. **Settle up irreversible, no confirmation** (GroupDetail.jsx:127-151). Add inline Confirm/Cancel before `storage.addSettlement`.
5. **Remove member has no confirmation** (GroupSettings.jsx:99-106). Use the inline confirm pattern.

## Medium
6. **Shadows** violate design system: GroupDetail.jsx:17, AddExpenseModal.jsx:147,269; also AuthCard.jsx:11, Dashboard.jsx:75.
7. **Uncaught error on save** (GroupDetail.jsx:117-120): `storage.addExpense` has no try/catch; modal stays open with no message.
8. **Failed settlements disappear silently** (GroupDetail.jsx:132-150); only synchronous throws are caught.
9. **Long descriptions don't truncate at 375px** (GroupDetail.jsx:225-226): add `min-w-0` to the span.
10. **Ambiguous confirm button** (GroupDetail.jsx:257-262): add `aria-label`, move focus to it.
11. **Fieldset legend not first child** (AddExpenseModal.jsx:254-256).
12. **Modal focus not trapped or restored** (AddExpenseModal.jsx:142-148).
13. **Cramped two-column grids at 375px** (AddExpenseModal.jsx:170,203): `grid-cols-1 sm:grid-cols-2`.
14. **Status message contrast** (AddExpenseModal.jsx:325,327): use `-700` shades.
15. **Remove member: no error handling** (GroupSettings.jsx:39-46): `busyId` can stay set; use try/catch/finally.

## Low
16. Disabled Export button `title` hint unreachable (GroupDetail.jsx:169-175).
17. "Group settings" link position shifts when header wraps (GroupDetail.jsx:167).
18. Key `${from}-${to}` not an item id (GroupDetail.jsx:310).
19. Blank paid-by name for removed member (GroupDetail.jsx:249): use `memberName()`.
20. Magic 700ms timeout, no cleanup (GroupDetail.jsx:143-146).
21. `void version` hack; name initialised once (GroupSettings.jsx:19,12).
22. Remove button lacks `disabled:cursor-not-allowed` and busy label (GroupSettings.jsx:99-104).
23. Layout inconsistencies `max-w-lg`, full-width submit (GroupSettings.jsx:49,70).
24. `text-slate-300` dash, decorative (AddExpenseModal.jsx:309).
25. "All settled" `text-slate-400` (components/BalanceLabel.jsx:11).
26. Save button has no pending state; double-submit possible (AddExpenseModal.jsx:352-357).
27. "$" prefix spans read aloud; add `aria-hidden` (AddExpenseModal.jsx:176,296).
