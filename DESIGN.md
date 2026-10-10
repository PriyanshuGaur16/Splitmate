---
name: Splitmate (Landing surface)
description: A warm ledger-paper landing page where orange is the single stamp ink.
colors:
  ledger-paper: "#f8f7f4"
  ink: "#221f1b"
  ink-soft: "#58524b"
  rule: "#ddd5c5"
  stamp: "#ea580c"
  stamp-dark: "#b8460a"
  cover: "#1c1712"
typography:
  display:
    fontFamily: "Zilla Slab, ui-serif, Georgia, serif"
    fontSize: "3.25rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.15em"
components:
  button-stamp:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.ink}"
    padding: "12px 24px"
  button-stamp-hover:
    backgroundColor: "{colors.stamp-dark}"
    textColor: "{colors.ledger-paper}"
---

# Design System: Splitmate (Landing surface)

Scope: this describes the landing route (`src/pages/Landing.jsx`) only. The authenticated app still runs on its own emerald/slate system and is not documented here.

## Overview

**Creative North Star: "The Running Tab"**

Splitmate's landing page reads like an open ledger kept by a trusted corner shop. The ground is warm paper, structure is drawn with hairline rules and two-pixel ink rules, and one burnt orange acts as stamp ink. It is flat on purpose. Authority comes from restraint, aligned numerals and marks that mean something, not from cards, gradients or shadows.

The direction was chosen by the user over a restaurant-bill concept and a standard SaaS layout. Those are the only confirmed rejections. The page refuses the icon-grid-on-soft-gradient default outright.

**Key Characteristics:**
- Flat, ruled, paper-and-ink surfaces; no shadows, no gradients, no purple.
- Orange is rare and means something: the headline phrase, the CTA, the dark total row, status marks.
- Numerals in a monospace ledger face; names and copy in a plain sans; headings in a slab.
- Status is a mark (check, open circle, stamp), not a colored pill.

## Colors

A warm off-white ground with charcoal ink and one orange.

### Primary
- **Stamp Orange** (#ea580c, `stamp`): headline key phrase, CTA fills, status marks on dark. At 3.32:1 on paper it only passes as large text; for small text on paper use Burnt Stamp.
- **Burnt Stamp** (#b8460a, `stamp-dark`): small orange text on paper, CTA hover fill, the "Settled" stamp. 5.0:1 on paper.

### Neutral
- **Ledger Paper** (#f8f7f4): page ground.
- **Ledger Ink** (#221f1b): body structure, 2px rules, CTA label on orange (4.6:1).
- **Faded Ink** (#58524b): secondary text. 7.2:1 on paper.
- **Ruled Line** (#ddd5c5): hairline dividers and panel borders. Decorative only; 1.36:1, never the sole boundary of a control.
- **Cover Black** (#1c1712): the dark closed-ledger CTA strip.

### Named Rules
**The One Ink Rule.** Orange is the only accent. If a second hue seems needed, the element is probably meant to be a mark or a rule.
**The Orange Text Rule.** Orange text on paper is Burnt Stamp unless it is display-size. Labels on Stamp Orange fills are Ledger Ink, not paper.

## Typography

**Display Font:** Zilla Slab (Georgia fallback)
**Body Font:** Public Sans
**Label/Mono Font:** Courier Prime

**Character:** A confident slab for headings, a neutral workhorse sans for reading, and a typewriter mono reserved for amounts, labels and ledger furniture.

### Hierarchy
- **Display** (600, 2.25–3.25rem, 1.08): hero headline only.
- **Headline** (600, 1.5–1.875rem): section headings.
- **Title** (600, 1.25rem): step titles.
- **Body** (400, 1.125rem, 1.6): copy, kept to about 28rem in the hero.
- **Label** (Courier Prime, 0.75–0.875rem, 0.1–0.15em tracking, uppercase): ledger headers, feature labels, attributions.

### Named Rules
**The Column Rule.** Money is always set in the mono face so figures align like ledger columns.

## Layout

A single 64rem (max-w-5xl) column with 1rem side gutters. The hero is two columns from `lg` (headline, then ledger panel) and stacks on mobile. Sections are separated by hairline rules and generous vertical padding (4–5rem), with tight spacing inside groups. Steps go three-across from `sm`; feature rows are ruled list rows, not cards.

## Elevation & Depth

None. The system is flat, and depth comes from rules, a 2px ink top-rule, and one inverted dark strip. Entrance motion is a single 0.6s "stamp-in" (rise and fade) that is disabled under `prefers-reduced-motion`.

### Named Rules
**The No-Shadow Rule.** Nothing on this page casts a shadow.

## Shapes

Square. No border radius anywhere; borders are 1px hairlines, with 2px ink for emphasis (CTA, step tops, "Settled" stamp). The stamp mark is a slightly rotated (-2deg) outlined box.

## Components

### Buttons
- **Primary (stamp):** Stamp Orange fill, 2px ink border, Ledger Ink slab label, 12px 24px padding, trailing arrow.
- **Hover:** fill shifts to Burnt Stamp with paper text; the arrow nudges 2px.
- **Final CTA:** same fill on Cover Black, inverting to transparent with orange text on hover.
- **Secondary:** underlined text link with a rule-colored underline that turns orange on hover.

### Ledger Panel (signature)
A flat bordered panel: a mono caps header, ruled rows of name, item and amount, and a dark Ledger Ink total row with an orange figure. Each row carries a status mark: check for paid, open circle for pending, and a rotated outlined "Settled" stamp.

### Navigation
A header with the wordmark left and a "Sign in" text link right, over a hairline rule. The tap target is padded to at least 40px.

## Do's and Don'ts

### Do:
- **Do** keep orange to the headline phrase, CTAs, totals and status marks.
- **Do** set every amount in Courier Prime.
- **Do** mark status with a check, circle or stamp.
- **Do** keep illustrative numbers arithmetically true (the sample net balances must come from the sample rows).

### Don't:
- **Don't** add gradients, shadows, purple or a second accent hue.
- **Don't** put paper-colored text on a Stamp Orange fill, or small orange text on paper.
- **Don't** use a colored side-border on quotes or cards.
- **Don't** replace ruled rows with same-size icon cards.
