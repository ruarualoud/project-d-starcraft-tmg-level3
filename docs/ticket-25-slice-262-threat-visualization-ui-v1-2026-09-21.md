# Ticket 25 · Slice 262 · Threat visualization UI — frontend closure document

Slice manifest: `coordination/slices/ticket-25-slice-262-threat-visualization-ui.slice.json`
Owner: Kimi (profile `project-d-ui-lead`) · Base: `codex/starcraft-integration-20260921` @ `78fa68d`
Allowed paths: `apps/starcraft-tmg-expo/`, `scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs`, this document.
Date: 2026-09-21

## 1. Scope and invariants

Presentation-only threat-visualization sub-slice. This slice:

- preserves every current capability and every backend interface (Rules,
  Authority, Client Domain, Provider, memory, source-data, room and action
  contracts are untouched; `git diff 78fa68d -- packages/ scripts/support/`
  must stay empty);
- never calculates gameplay truth in the UI: threat geometry, distances,
  probabilities and charge envelopes are rendered verbatim from the existing
  client-domain workbench projections (`battle-workbench-threat-v1`,
  `battle-workbench-probability-v1`, composed by `battle-workbench-v1`);
- never infers range from pixels, never turns unknown into zero, and never
  implies an action is legal or applied because it is visualized;
- keeps threat layers **off by default**, keeps every mode reachable in one or
  two interactions, and keeps overlays from blocking model selection
  (`pointerEvents="none"` on all overlay glyphs);
- supports reduced motion (no new animation is introduced; the layer is
  static), keyboard operation (all controls are real buttons), and touch
  (44dp targets), and keeps the battlefield as the visual focus on desktop
  Web and narrow/touch layouts;
- reuses existing StarCraft tokens (`#020617/#0f172a/#07111f` panels,
  `#38bdf8/#22d3ee/#67e8f9` cyan, `#ef4444` enemy red, `#fbbf24` charge amber)
  and existing map/unit art; adds no new assets.

## 2. Audit of the actual state (pre-change)

### 2.1 Current product threat surface

- `components/battlefield/authoritative-battle-workspace.tsx` already renders
  `view.battleWorkbench.threat` regions as SVG circles
  (`battlefield-authoritative-threat-${index}`) behind model glyphs when the
  "Show threat" display toggle is on, plus a printed-range reference circle
  (`battlefield-threat-reference-v1`) fallback. Mode state
  (`WorkbenchThreatMode`) lives in the workspace and is changed only from the
  Threat read panel.
- `components/battlefield/battle-workbench-read-panels.tsx` threat panel has
  five mode chips (stationary / move+fire / charge / friendly union / enemy
  union), per-weapon layer chips, a coverage-dependencies card and a matchup
  probability sheet (`ProbabilitySheet`).
- Identified gaps versus the ticket:
  1. **Mode reachability**: changing the threat mode takes three interactions
     (display toggle → Threat tab → mode chip). No mode control is adjacent
     to the board.
  2. **Legend**: the only threat legend is one muted line ("Threat reference
     defaults off; projected printed range only"). No source/side/mode/
     precision legend, no overlap explanation.
  3. **Overlap/aggregation treatment**: every region is drawn at a fixed
     ~4% alpha; coincidence is invisible rather than legible.
  4. **Precision honesty**: region `coverage` ("exact" solid vs "partial"
     dashed) is rendered but never explained; there is no "unknown" board
     state when the workbench or the selection has no projected regions
     (e.g. all units in reserve) — the board silently shows nothing.
  5. **Per-weapon / contributing-model facts**: the panel shows weapon chips
     but not the projected per-mode radii, printed range, split-speed branch,
     contributing model count or unresolved-assumption list that the
     projection already supplies.
  6. **Predicted-interaction comparison**: probability rows exist only inside
     a collapsed sheet keyed by attacker; there is no compact per-target
     comparison joining the threat relationship receipts
     (`baseEdgeDistanceMilliInches`, `stationaryWeaponIds`,
     `moveThenFireWeaponIds`, `chargeCandidate`) with the attack-probability
     receipts (`expectedDamage`, `probabilityAtLeastOneDamage`,
     `casualtyProbability`, per-row `coverage`) and the LegalSpace-derived
     `sourceActionRefs`.
  7. **Backend projection gap (documented, not repaired here)**: the
     fire-zone-exchange comparator lives in the agent-side runtime
     (`packages/online-agent-session/combat-estimation-runtime-v1.mjs`,
     query kind `fire_zone_exchange`) and is **not** exposed by the
     client-domain workbench snapshot. The UI must therefore show an honest
     "not exposed by the current client projection" state for
     fire-zone-exchange detail instead of inventing numbers.

### 2.2 Projection shapes relied on (read-only contracts)

- `threat.perUnit[]`: `{ unitId, sideKey, currentModels, speed{printed,
  speedInches, branch, exactForPrintedProfile}, weapons[{ weaponId,
  weaponName, printedRangeInches, maximumRangeInches, longRangeChoice,
  stationaryRadiusInches, moveThenAttackRadiusInches, stationaryRegions[],
  moveThenAttackRegions[], unresolved[] }], charge{ minimumRadiusInches,
  maximumRadiusInches, regions[], coverage, unresolved[] }, coverage }`.
  Region: `{ geometryType:"circle", unitId, modelId, sideKey, mode, weaponId,
  centerXMilliInches, centerYMilliInches, radiusMilliInches, coverage }`.
- `threat.relationships[]`: `{ attackerUnitId, targetUnitId,
  baseEdgeDistanceMilliInches, stationaryWeaponIds, moveThenFireWeaponIds,
  chargeCandidate, coverage, unresolved }`.
- `threat.aggregates.{friendly,enemy}`: `{ unitIds, regions, coverage }`;
  `threat.dependencies`, `threat.sourceActionRefs`, `threat.coverage`,
  `threat.coverageReason`.
- `probability.rows[]`: `{ queryId, attackerUnitId, targetUnitId, weaponId,
  weaponName, result{ expectedDamage, probabilityAtLeastOneDamage,
  casualtyProbability|null, mathematicalCoverage, rulesCoverage, unresolved },
  assumptions, coverage }`.
- All regions currently carry `coverage: "partial"` (advisory); no region is
  "exact". The precision legend must say so rather than implying exactness.

### 2.3 Harness audit

- `scripts/verify-ticket-14-web-browser-v1.py` /
  `verify-ticket-15-browser-aggregate-v1.py` (Python Playwright) spawn a child
  fixture server and capture hashed screenshots + a hashed JSON report under
  `build/` (git-ignored).
- `scripts/verify-ticket-20-product-web-user-journey-v1.mjs` (Node Playwright
  1.59, real Chromium) drives the exported Expo Web product through a recovery
  URL and includes the proven UI deploy flow for `player1-goliath-1`.
- `scripts/serve-ticket-20-human-agent-web-v1.mjs` (non-live mode) creates the
  deterministic Standard-2000 demo room (no Provider calls), auto-drives the
  hosted bot seat, serves the Level3 HTTP adapter, hosted-bot API,
  `/__ticket20/*` diagnostics, and the Expo web export from
  `apps/starcraft-tmg-expo/dist` when present.
- **Worktree constraint**: `packages/authoritative-engine/transition-v1.mjs`
  imports the legacy read-only adapter input `scripts/starcraft-tmg-rules-v0.mjs`
  via `../../../scripts/`, which resolves only from the main checkout
  (`project-d/scripts/`), not from a nested `.worktrees/<name>` worktree. The
  verifier therefore spawns the unchanged backend fixture from the resolved
  main checkout (byte parity for the loaded backend modules is hash-recorded)
  and serves the **current worktree's** freshly exported web bundle through a
  loopback static+API proxy, so the browser exercises current product frontend
  code against unmodified backend code. Backend modules are never edited.
- Environment: Node Playwright 1.59.1 resolves from the parent
  `project-d/node_modules`; pinned chromium headless shell is under
  `~/Library/Caches/ms-playwright`; system Chrome is the fallback.

## 3. Frozen numbered sub-slice plan

One scoped local commit per sub-slice, in order. No backend contract, testID,
SVG id, or capability is removed anywhere.

- **SS-1 · Threat overlay presentation module + board integration.**
  New `components/battlefield/threat-overlay-v1.tsx`: pure presentation
  helpers — `projectThreatOverlapIntensityV1` (counts how many *projected*
  regions intersect each region; a display weight, never a rules value),
  `ThreatOverlayLayer` (SVG circles verbatim from projection geometry;
  side/mode/precision styling; `pointerEvents="none"`; stable
  `battlefield-authoritative-threat-${index}` ids), and
  `ThreatOverlayLegend` (source/side/mode/precision/overlap legend with the
  "advisory, not legality" boundary line, bilingual zh/en).
  Workspace: render the layer through the new module; add a compact threat
  mode pill strip directly under the board display controls (visible when
  threat is on) so every mode is ≤2 interactions (toggle → pill, or Threat
  tab → chip); honest board empty states ("workbench not loaded", "no
  projected regions for this selection", "all units off the battlefield");
  legend card under the board while threat is visible. Default remains off.
- **SS-2 · Threat read-panel depth and predicted-interaction comparison.**
  Rework the threat panel in `battle-workbench-read-panels.tsx`: precision
  legend (exact/advisory/unknown with the fact that current regions are
  advisory bounds); per-weapon fact rows (printed/max range, stationary and
  move-then-fire radii, split-speed branch, contributing model count,
  unresolved assumptions) for the selected unit; charge envelope facts
  (min/max radius, chance boundary "d6 not rolled by read query"); and a
  progressive-disclosure **Predicted interactions** card for the selected
  unit that joins, per enemy target, the relationship receipt (base-edge
  distance, stationary/move-fire weapon ids, charge candidate, coverage) with
  the attack-probability receipts (E[dmg], P(≥1 dmg), casualty %, per-row
  coverage), lists the LegalSpace-derived `sourceActionRefs` count, shows the
  current sealed-preview action type as a receipt line when one exists
  (explicitly "prediction ≠ confirmation"), and shows the honest
  fire-zone-exchange gap line ("not exposed by the current client
  projection"). All not-loaded/unknown branches render explicit states.
- **SS-3 · Self-contained real-browser verifier + evidence + closure.**
  New `scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs`
  adapting the ticket-14/15/20 harness patterns: export current web bundle,
  spawn the unchanged deterministic Standard-2000 fixture from the main
  checkout, proxy static+API on one loopback origin, drive real Chromium
  (desktop 1500×1050 and narrow/touch 390×844, reduced motion) through:
  threat-off default → honest unknown state → UI deploy of one friendly unit
  (proven ticket-20 flow) → bot auto-reply → stationary, move+fire, charge,
  friendly aggregate, enemy aggregate mode assertions (user-visible legend
  text + rendered overlay glyph changes) → predicted-interaction card +
  fire-zone unknown state → overlay-does-not-block-selection board tap →
  keyboard activation of a mode pill → narrow-viewport captures keeping the
  battlefield visible. Writes `build/ticket-25-slice-262-threat-visualization-browser-v1/`
  (git-ignored) report JSON + PNG set with sha256 hashes and per-screenshot
  explanations; records them in §5/§6 below.

## 4. Verification policy

Named gates (manifest `selfVerificationByImplementer: true`), each run at most
once after the last relevant code change; a failed command gets at most one
rerun after repair of the implicated frontend path; stop after three
non-converging rounds.

| Gate | Command |
| --- | --- |
| Expo frontend TypeScript contract | `COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec tsc --noEmit` |
| real-browser threat visualization journey and screenshots | `node scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs` |

Environment prep (not a verification gate): `pnpm install --frozen-lockfile
--prefer-offline` in `apps/starcraft-tmg-expo` (offline store reuse; no
lockfile change) — done once before SS-1.

## 5. Implementation log (filled as sub-slices complete)

| SS | Commit | Files | Summary |
| --- | --- | --- | --- |
| plan | (this commit) | this doc | Audit + frozen numbered plan; no code changed. |
| SS-1 | `692e5a3` | `threat-overlay-v1.tsx`, `authoritative-battle-workspace.tsx`, `battle-workbench-read-panels.tsx` | Overlay layers, board-adjacent mode strip, legends, predicted-interaction panel. |
| SS-2 | `87eabb4` | `scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs` | Self-contained real-browser verifier. |
| SS-R1 | `9d06223` | `battle-workbench-read-panels.tsx` | Many-to-one incoming threat relations in the predicted-interaction card. |
| SS-R2a | `869794a` | `authoritative-battle-workspace.tsx` | Narrow battle-table focus: board-first 390px layout (presentation-only reorder; desktop byte-identical). |
| SS-R2b | `bfc5402` | `scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs` | Harness evidence closure: grid/median pixel proofs, many-to-one + precision + narrow-mode captures, base-commit backend materialization. |
| SS-R3 | (this commit) | this doc | Screenshot index, pixel-assertion values, verification receipts; close. |

## 6. Reopen 2026-09-22 — evidence and interaction gap closure

### 6.1 Reopen reason and re-audit findings

The slice was reopened because the only retained positive browser image was an
unselected empty-page probe (`build/.../probe.png`); the committed browser gate
had never produced its passing report and named screenshot set, and several
promised proof points were missing entirely. Re-audit of the committed
implementation (`87eabb4`) found these concrete gaps:

1. **UI gap — many-to-one**: `PredictedInteractionCard` only renders outgoing
   relations (`attackerUnitId === selected`); incoming relations
   (`targetUnitId === selected`) that the projection already publishes are
   never displayed, so "many-to-one" cannot be visibly proven.
2. **Harness gap — pixel assertions**: the verifier asserts only DOM
   attributes; no pixel-level measurement proves overlap intensity
   brightening, so "both-side overlap intensity" is unproven.
3. **Harness gap — precision labels**: exact/advisory/unknown legend copy is
   rendered but never asserted.
4. **Harness gap — narrow coverage**: no 390px move+fire or charge captures.
5. **Doc gap**: no screenshot index with hashes and pixel-assertion values.
6. **UI gap — narrow battle-table focus** (found during SS-R2 execution): on
   a fresh 390×844 session the battlefield rendered at y=942, below the
   match-contract card, flow subtitle, map contract line and the threat mode
   strip — outside the first viewport, contradicting the promised
   "battlefield stays inside the first viewport" capture.

No backend/Rules contract is touched by this reopen; all repairs are
presentation-only UI or harness code.

### 6.2 Numbered reopen sub-slice plan (executed in order)

- **SS-R1 · Many-to-one incoming relations UI.** Extend
  `PredictedInteractionCard` in `battle-workbench-read-panels.tsx` with a
  labelled "Outgoing (one → many)" header and an "Incoming (many → one)"
  section that lists every projected relationship whose `targetUnitId` is the
  selected unit (attacker name, base-edge distance, reachable weapon counts,
  charge candidate, coverage — verbatim projection receipts), with an honest
  empty state ("unknown, not zero"). Presentation-only; no new gameplay truth.
- **SS-R2 · Harness evidence closure + narrow battle-table repair.** Extend
  `scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs`:
  assert the precision legend labels (solid = exact / dashed = advisory bound /
  dotted = unknown); assert per-weapon stationary facts ("by weapon"); add a
  named many-to-one desktop screenshot; add pixel-level overlap-intensity
  assertions for the friendly union and the enemy union (per-bucket median
  rendered luminance over coverage-0/1/≥2 sample sets planned from the
  projected circle geometry, with measured values recorded in the report);
  add 390px move+fire and charge captures with radius assertions; record a
  `pixelAssertions` section in the report JSON. Repair the narrow layout in
  `authoritative-battle-workspace.tsx` (presentation-only reorder: board
  first; contract copy and mode strip below the board; disabled pan arrows
  hidden at zoom 1) so the whole battlefield sits inside the first 390px
  viewport and enabling a layer never pushes the table down.
- **SS-R3 · Closure document.** Extend §6 with the screenshot index (name →
  explanation → sha256), the pixel-assertion values, and the verification
  receipts (§7), then close.

## 7. Verification receipts

Run on 2026-09-23 after the last relevant code change (commits `9d06223` →
`bfc5402`). `git diff 78fa68d -- packages/ scripts/support/` remains empty.

| Gate | Command | Exit | Covered sub-slices |
| --- | --- | --- | --- |
| Expo frontend TypeScript contract | `COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec tsc --noEmit` | 0 (pass; also passed earlier after SS-R1, exit 0) | SS-R1, SS-R2a |
| real-browser threat visualization journey and screenshots | `node scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs` | 0 (pass) | SS-R1, SS-R2a, SS-R2b |

Browser-gate repair rounds (each failure diagnosed from its own failure.png /
error JSON plus out-of-band geometry probes, one repair per concrete failure;
probes were git-ignored `build/` copies, never the declared gate):

1. `FRIENDLY_UNION:OVERLAP_PIXEL_POINTS_UNRESOLVED` — geometry probe of the
   exact fixture projection proved no same-color single-coverage or
   background point exists near any owner circle (formation ≈1.5 in vs radii
   up to ≈17 in). Repair: board-wide screen-space grid scan converted to
   projection world units, bucketed by projected coverage.
2. `FRIENDLY_UNION:OVERLAP_PIXEL_NOT_BRIGHTER_THAN_SINGLE` (median overlap
   luminance 0) — the app scrolls in an inner container, so the board
   (y 730–1288) extended below the 1050px viewport and out-of-bounds canvas
   reads silently returned black. Repair: scroll board into view before
   planning; full-page readback with scroll-offset; loud out-of-bounds
   failure; per-bucket median luminance (rejects portrait/name-plate/
   grid-line/charge-amber contamination).
3. `NARROW_BATTLEFIELD_NOT_FIRST_VIEWPORT_FOCUS` (board y=942 on 390×844) —
   genuine product gap. Repair (SS-R2a, presentation-only reorder): board
   moved to y=569, fully inside the first viewport; threat mode strip below
   the board. Check calibrated to whole-board visibility; a scroll-invariant
   strip-below-board assertion replaced absolute-y comparison (Playwright
   auto-scroll had moved the viewport, not the layout).

Final browser-gate result: **22 checks passed, 14 named artifacts, report
`build/ticket-25-slice-262-threat-visualization-browser-v1/browser-report.json`,
reportHash `14f1b35a21b8c9e2651aeb49256d586ad29189c33fdda43af44772051aa9b5ba`**,
Chromium 151.0.7922.34, 24.6s, zero Provider/paid calls, zero backend edits.

### 7.1 Screenshot index (report `artifacts`, sha256)

| File | sha256 (full) | Proves |
| --- | --- | --- |
| `01-desktop-threat-off-default.png` | `262f6f4994e7270c2494c4ab074bc5f1a959b7a5af052e1792be6340d97f2bd8` | Threat off by default; no glyphs; unobstructed table. |
| `02-desktop-unknown-no-selection.png` | `328eee779c96e54adcb02aee403087b7abb14f01c9efb5b03b319e6731e81b6d` | Honest unknown: 0 projected regions with select-a-unit guidance; fire-zone "not exposed" line. |
| `03-desktop-stationary-fire.png` | `77e9b14789acfe859e18b91253b6596d62c5987af077125be1d8939f0b7d3602` | Stationary fire by weapon; per-weapon fact rows; precision legend. |
| `04-desktop-move-fire.png` | `0092a363ad161ab40753732232bd1d1d1c0a083d33be7e8a72618e46faf62bed` | Move+fire envelope radius grows vs stationary (rendered `r` assertion). |
| `05-desktop-charge.png` | `e25219c61aa678ecb90d457a02b71047d854f60c8a17c66de3cafd0d09ade4fa` | Charge/engagement: amber dashed advisory envelope; d6 never rolled. |
| `06-desktop-friendly-aggregate.png` | `0672b7a3309d249bcef4fd2c37e19892968c5d9a56b66ce00c5d5c6361cac00c` | Friendly union + median-luminance pixel proof of overlap intensity. |
| `07-desktop-enemy-aggregate.png` | `c9dc9fe3e642934c3b101e0aa16b6c16edd5b4c694fa54fb32dc69992c133a77` | Enemy union + same pixel proof on the enemy side. |
| `08-desktop-predicted-interactions.png` | `b1766a504a67e195a96fbf1f95fecfe81bcf4c0b3032bb3ff0348e9b2fd89831` | One-to-many predicted interactions: relationship + attack-probability receipts, LegalSpace refs, no-sealed-preview note, honest fire-zone gap. |
| `09-desktop-many-to-one.png` | `dc9f7094f03272ba2cd5f2903743e580ae5b0c211293e0bef47c6e2ecf5b3386` | Many-to-one incoming relations targeting the selected unit. |
| `10-narrow-enemy-aggregate.png` | `9debded4a2b0cc1d5f65ff12da2ace4efd82ef7bfab51f5cbe3d2e02eed4ca98` | 390px: whole battlefield inside first viewport with enemy union visible; strip below board. |
| `11-narrow-stationary-selected.png` | `9700e65569babcf1d77ae81b61f6405c7446e586bb2d3424cad7e2d80fdc0b71` | Narrow: model selected from accessible list; stationary regions on. |
| `12-narrow-move-fire.png` | `fdc56a57e91f7c912209579b92baa124873b339b769e111122f84ba32e36b65e` | Narrow move+fire; rendered radius larger than narrow stationary. |
| `13-narrow-charge.png` | `93b22c951297ef165cb61fd770d539d758709cd1f44faaf70bfdff7f517e6f94` | Narrow charge envelope. |
| `14-narrow-predicted.png` | `69c51f48fd4bdec6063cf7871b3cf52e6fc979aeb5a2dfb4bb32778dfe84cfc4` | Narrow predicted-interaction card reachable below the board. |

### 7.2 Pixel assertions (report `pixelAssertions`; display-only, never gameplay truth)

| Layer | Projected regions | Max coincident coverage | Bucket populations (overlap/single/background) | Median luminance overlap | Median single | Median background |
| --- | --- | --- | --- | --- | --- | --- |
| Friendly union | 40 | 33 | 10639 / 827 / 24428 | **160.3** | 69.3 | 25.7 |
| Enemy union | 51 | 36 | 8050 / 1001 / 26843 | **146.7** | 55.3 | 24.3 |

Both layers satisfy overlap > single + 6 and single ≥ background + 2 on 48
evenly spread samples per bucket, planned from the projected circle geometry
(no range is ever inferred from pixels; pixels only evidence the
translucent-fill display weight).

## 8. Unresolved Critical/High concerns

None. Known documented (non-Critical) limitation, unchanged from §2.1 item 7:
the fire-zone-exchange comparator is not exposed by the client-domain
workbench projection (`packages/online-agent-session/combat-estimation-runtime-v1.mjs`,
query kind `fire_zone_exchange`, agent-side only); the UI and both journeys
render the honest "not exposed by the current client projection" state and
screenshots 02/08 prove it. No gameplay truth is synthesized anywhere in UI
or fixtures.
