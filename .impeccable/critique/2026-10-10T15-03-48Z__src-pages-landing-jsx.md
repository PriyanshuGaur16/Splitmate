---
target: src/pages/Landing.jsx
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Lenovo\\Desktop\\Splitmate\\src\\pages\\Landing.jsx"
target_fingerprint: "sha256:60432e8c4bac4960f9b4cd1431e49a326719bec332ea11f0041cb001f8c6d70f"
target_path: "C:\\Users\\Lenovo\\Desktop\\Splitmate\\src\\pages\\Landing.jsx"
timestamp: 2026-10-10T15-03-48Z
slug: src-pages-landing-jsx
---
# Critique: src/pages/Landing.jsx
Method: dual-agent. Score 22/32 (heuristics 7 and 10 n/a, Persuade surface).

Priority issues
- [P1] Contrast: paper on orange 3.32:1 fails AA (CTA labels L83, L237; step numerals L153; Tab #04 label L209). Fix: ink on orange, stamp-dark for small orange text.
- [P1] Direction-contract marks missing: no settled stamp, no paid/pending marks.
- [P1] Hero math wrong: +$61.63 is the per-person split, not anyone's net (Maya +0.77, Theo -43.63, Priya +42.87); "you" undefined.
- [P2] Icon-in-box feature rows (L176-178) are the refused cliche; steps/features duplicate content.
- [P3] Emerald Logo beside orange; --font-sans in @theme is global and changes the app font.

Detector: side-tab border-l-4 at L197 (real). Casey: no box-decoration-clone on headline highlight; Sign in tap target ~24px.
