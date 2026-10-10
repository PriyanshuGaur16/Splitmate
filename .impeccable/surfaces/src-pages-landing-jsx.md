---
version: 1
slug: "src-pages-landing-jsx"
primary_target: "src/pages/Landing.jsx"
related_targets: []
---

# Surface: src/pages/Landing.jsx

Mode: Persuade. Scope: this route only — Logo.jsx and the authenticated app (Dashboard, GroupDetail, etc.) stay on the existing emerald system untouched.

Audience: general expense-splitters (roommates, friend groups, trip companions) — no single scenario is favored. Job: decide Splitmate is worth signing up for and register. Proof/content: no real testimonials or usage data exist yet; one placeholder quote + stat, clearly ledger-voiced, flagged in a code comment as needing real content before ship. Constraint: color strategy is user-pinned (Committed strategy) — off-white #F8F7F4 ground, orange #EA580C as the single ink accent — no gradients, no shadows, no purple, anywhere on the page.

## Direction contract

THESIS: Splitmate is the running tab a trusted place keeps for its regulars — a page that reads like an open ledger, not a fintech dashboard or generic SaaS hero. Refuses the category default (icon-grid feature cards on a soft gradient hero) outright.

OWN-WORLD: Warm off-white ledger-paper ground (#F8F7F4) with black hairline rules; charcoal ink for body/structure; burnt orange (#EA580C) reserved as the single "stamp ink" — used only for the headline's key phrase, the CTA (styled as a press-stamp), running totals, and status marks. Numerals set in a confident tabular-figure slab/grotesque (ledger-column alignment); names and body copy in a plain workhorse sans — restraint is the source of the ledger's authority. Status reads as a mark, not a color pill: ✓ paid, ○ pending, a stamp for settled. Section dividers are ruled lines, not cards-on-shadow.

STORY: A visitor arrives already living the problem (owes or is owed money in a group) and sees, in the first viewport, an actual illustrative "open tab" — names, what they had, running total — with the real headline stamped across it. They read three ledger-voiced steps (open a tab / log what's owed / settle up clean), skim four feature rows told as ledger capabilities (pending members = credit extended before they've signed the book; smart settlements = one clean settle-up, not a group-wide reshuffle; expense history = nothing is ever erased from the tab; mobile friendly = keep the tab open from your pocket), read one placeholder proof line, and hit a dark closed-ledger-cover CTA strip to register.

FIRST VIEWPORT: Header: wordmark left (unchanged Logo.jsx), "Sign in" link right, thin black rule beneath. Hero: two-column on desktop — left, the stamped headline + subhead + primary CTA (press-stamp button) + secondary sign-in line; right (or beneath on mobile), an illustrative open-tab ledger panel: 3-4 ruled rows of name → item → amount, a running total row, one row stamped "settled" in orange. No gradient, no shadow — the ledger panel sits flat on a ruled border.

FORM: Assigned direction (concept-seed --scope direction --mode persuade, seed key d05ed63c, index 4: corner-store/bodega running-tab). Raised twice before presentation: (1) status-as-mark rather than color-pill, donated by the declined film-cutting-bench challenger (operate-a-cutting-bench-select-rail) whose "state is a mark, not a hue" discipline the ledger lacked; (2) generous confident whitespace between ledger rows/sections, donated by the declined ikebana/ma challenger (growth-metamorphosis-branching-ikebana-ma-arrangement). Weighed challengers: cutting-bench scored competitive (held clarity, lost audience identification) and its raise was taken; ikebana, tensegrity-column, CRT-arcade-pixel, wildstyle-blackbook, and sukeban-dress-code all scored declined on both axes (no audience identification with a finance-adjacent product) and contributed no further raises beyond the two above. User locked the assigned direction directly over "The Table Check" (restaurant-bill pick card, declined for being the category's most obvious/rutted artifact) and the standing-exit standard-SaaS card.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Build path

No image generation available this session (no harness-native image tool, no API fallback) — code-led is the only path, stated per new-work.md's build-path paragraph, not asked. No comp round; ambition is carried by the FIRST VIEWPORT block above and audited at the finish review.
