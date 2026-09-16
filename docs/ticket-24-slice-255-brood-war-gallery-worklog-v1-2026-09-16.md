# Ticket 24 / Slice 255 — Brood War gallery worklog v1

Date: 2026-09-16
Status: in progress, `4/10` map candidates
Provider usage: image generation only; DeepSeek `0` calls / `0` tokens / `¥0`

## Visual direction

Each map remains independently recognizable from its cited competitive seed.
The display layer uses a restrained high-resolution Brood War/Remastered-era
top-down 2D vocabulary: clean terrain silhouettes, subdued micro-detail beneath
models, dark indigo/charcoal tabletop values, restrained cyan-violet accents,
and a matte printed-game-mat finish. It must not become modern PBR, isometric,
anime, generic concept art, or a shared four-corner template.

This direction closes the style gap with the existing high-resolution circular
unit pieces without making the background compete with their portrait art.
Decorative resources remain visual-only and are de-emphasized. Rules never read
pixels.

## Current formal candidates

- `lost-temple-display-v2.png`
- `fighting-spirit-display-v2.png`
- `circuit-breakers-display-v2.png`
- `blue-storm-display-v3.png` — default tabletop-adapted passage
- `blue-storm-display-classic-v2.png` — optional classic restricted passage

Earlier `v1` drafts are unpromoted experiments and are not gallery-manifest
entries.

## Blue Storm passage correction

The source-inspired shortcut is `1.5in` wide. Exact current-base coverage is:

- passes: `round_32mm`;
- blocked: `round_40mm`, `round_50mm`, `round_80mm`, and
  `rectangle_40x100mm`.

The default tabletop asset widens the shortcut to `5in`. That exceeds the
`40×100mm` base's approximately `4.241in` diagonal turn envelope, so every
current base can transit and turn. The classic asset preserves the `1.5in`
identity and must be labelled 32mm-only in the future configurator. Both retain
the separate six-inch southern universal route.

Adapter v1.2 and two-layer compilation v1.1 now keep source clearance,
tabletop clearance, straight/broadside/turn coverage, blocked profiles and the
display-only route treatment as separate fields. The prior field that claimed
every lane covered every base solely because no hard blocker intersected it was
removed.

## Focused validation

The single affected gate passed all 20 adapters and all 20 two-layer default
compilations. Blue Storm proved `1.5in -> 5in`, exact source pass/block lists,
universal default straight transit and universal default in-place turning. No
match, Skill, Provider or unrelated suite ran.

## Remaining Slice 255 work

Six Brood War map art/recipe pairs remain. After all ten have the same accepted
style, Slice 255 will add the gallery manifest, final provenance receipts and
one scoped closure validation before its completion commit.
