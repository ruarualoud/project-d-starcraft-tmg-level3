# Ticket 24 / Slice 255 — Brood War gallery worklog v1

Date: 2026-09-16
Status: complete, `10/10` default map pairs plus one restricted classic variant
Provider usage: image generation only. DeepSeek increment `0`; the existing
optimized-match ledger remains `144` calls / `6,191,121` reported units /
`¥11.833541`. Image-generation price telemetry is not exposed by the tool.

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

## Formal gallery

| Seed | Scale / table | Default display asset | Distinguishing structure |
| --- | --- | --- | --- |
| Lost Temple | Standard / 54×36 | `lost-temple-display-v2.png` | cliffed naturals, central circulation, island pockets |
| Fighting Spirit | Standard / 54×36 | `fighting-spirit-display-v2.png` | corner macro plateaus, exposed naturals, risky centre |
| Circuit Breakers | Standard / 54×36 | `circuit-breakers-display-v2.png` | open centre, paired bridges and harassment lanes |
| Python | Standard / 54×36 | `python-display-v2.png` | broad jungle centre and python-shaped circulation |
| Blue Storm | Skirmish / 36×36 | `blue-storm-display-v3.png` | ravine, short shortcut, long southern route, basilica control |
| Tau Cross | Standard / 54×36 | `tau-cross-display-v2.png` | three-way frozen river and bridge network |
| Destination | Skirmish / 36×36 | `destination-display-v2.png` | paired natural bridges and central metal crossings |
| Heartbreak Ridge | Skirmish / 36×36 | `heartbreak-ridge-display-v2.png` | staggered parallel ridges and counter-routes |
| Andromeda | Standard / 54×36 | `andromeda-display-v2.png` | pale space platform, open centre and protected pockets |
| Match Point | Skirmish / 36×36 | `match-point-display-v2.png` | opposing plateaus, direct axis and side chicanes |

Blue Storm additionally exposes `blue-storm-display-classic-v2.png` as an
optional restricted presentation. It is never silently selected. The UI must
disclose that its shortcut is 32mm-only before selection.

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

## Gallery contract

`official-brood-war-map-gallery-v1` binds every generated-original display
asset to its cited competitive seed, unique topology hash, assigned tabletop
size, default two-layer compilation and passage audit. It deliberately uses a
simple versioned asset path instead of introducing another runtime file-signing
chain. Content checks for missing, duplicate or wrongly sized PNGs belong to the
build/acceptance gate; they do not make a room or generation flow fragile.

For every map, the default recipe records the complete current base denominator:
32/40/50/80mm round and 40×100mm rectangular. A route is universal only after
its narrow-axis transit, broadside transit and full turn envelope are checked.
Generated pixels remain display-only: the compiled terrain recipe and room
certificate alone govern movement, placement, line of sight and replay.

## Focused validation

The single Slice 255 closure gate passed without retry:

- `10` gallery entries = `6` Standard + `4` Skirmish;
- `10` distinct topology hashes and `10` room-certifiable default recipes;
- `11/11` referenced PNG assets exist, match declared dimensions and have
  distinct build-time SHA-256 values;
- `10/10` default maps have a universal current-base route;
- no unpromoted `display-v1` draft entered the manifest;
- Blue Storm preserves `small_shortcut` as the source-restricted lane, widens
  it in the default asset, and leaves no default restricted lane.

No match, Skill, Provider, browser or unrelated test suite ran. Gallery contract
hash: `95225c996c67b8081ca92159979e75c58696be7cf2474255a2faa8ff7667916a`.

## Closure and handoff

Slice 255 is complete. Ticket 24 is `5/8`. Slice 256 produces the ten equally
map-specific StarCraft II art/recipe pairs; Slice 257 mounts both galleries and
element/passage controls in Web/App; Slice 258 performs the terrain-visible,
low-token Standard-2000 browser acceptance and evidence report.
