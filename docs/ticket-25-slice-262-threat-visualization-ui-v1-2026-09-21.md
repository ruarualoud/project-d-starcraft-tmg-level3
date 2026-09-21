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

## 6. Verification receipts

(filled after the named gates run)

## 7. Unresolved Critical/High concerns

(filled at closure)
