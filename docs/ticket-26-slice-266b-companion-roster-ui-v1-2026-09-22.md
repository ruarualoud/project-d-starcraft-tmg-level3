# Ticket 26 / Slice 266b — Six-companion roster, real portrait states, extensible Tavern catalogue UI

Owner: Kimi (profile `project-d-ui-lead`) · Worktree `.worktrees/ticket-26-slice-266b-companion-roster-ui`
Base: `codex/starcraft-integration-20260921` @ `592bb95` · Date: 2026-09-22
Slice manifest: `coordination/slices/ticket-26-slice-266b-companion-roster-ui.slice.json`

## Invariants honored for the whole slice

- No change to Rules, Authority, room actions, Provider execution, persistence
  implementation, memory implementation, or source data. Backend modules are
  never edited; the browser gate re-proves zero drift of `packages/` and
  `scripts/support/` against the slice base.
- No Provider call, no network use, no source refresh, no credential read, no
  Git push, no dispatched agent. `trainingTruth: false` everywhere.
- Pixels, catalogue labels, and portrait states are presentation-only and never
  become gameplay truth. Canon facts, Project D role configuration, and
  generated visual assets are three separately labelled classes.
- The six communication states are admitted **static keyframes**, not a proven
  continuous animation (2026-09-21 / 2026-09-22 visual audits). The UI never
  plays them as one continuous loop.
- Kerrigan's backend-bound eight-era pack stays the default companion and is
  neither duplicated nor weakened.

## Admitted asset baseline (hashes verified against on-disk files 2026-09-22)

- Raynor / Nova: six-state `*-v1.png` sets, audit
  `docs/ticket-26-slice-266-raynor-nova-visual-audit-v1-2026-09-22.md`.
- Artanis / Zeratul / Zagara: admitted `idle-v2.png` identity baselines plus
  five `*-v3.png` state keyframes, audit
  `docs/ticket-26-slice-266-official-companion-visual-audit-v1-2026-09-21.md`.
- Kerrigan: approved dynamic portrait contract frames
  (`kerrigan-sc1-dialogue-{neutral,blink,speaking,warning,reflect}-v1.png`,
  receipt-bound in `content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs`).
  The six semantic states map onto these five frames; `alert_combat` and
  `damaged_concerned` honestly share the `warning` frame — labelled in UI.

## Ordered frontend sub-slice plan

1. **SS-1 — Companion content roster (content/characters/).**
   Add data-driven presentation-only packs `nova-companion-pack-v1.mjs`,
   `zagara-companion-pack-v1.mjs`, `zeratul-companion-pack-v1.mjs` (canon facts
   carry repository-local official source refs; Project D role configuration is
   explicitly labelled; no verbatim official quotes; no official rules
   authority). Add portrait state contracts `nova-portrait-states-v1.mjs`,
   `zagara-portrait-states-v1.mjs`, `zeratul-portrait-states-v1.mjs` with the
   admitted assetRef + sha256 bindings and an explicit
   `keyframe_only_continuous_animation_not_proven` status. Update
   `raynor-portrait-states-v1.mjs` / `artanis-portrait-states-v1.mjs`
   frameBindings from `PENDING_CODEX_GENERATION` to the admitted committed
   assets (audit hashes). Extend `companion-catalogue-v1.mjs` to six entries —
   Kerrigan (default, backend reference) · Zagara · Raynor · Nova · Artanis ·
   Zeratul — with honest `portraitStatus` and registration-shaped entries so a
   seventh pack is data-only.
2. **SS-2 — Committed-asset binding module and content typings.**
   New `apps/starcraft-tmg-expo/lib/level3/companion-portrait-assets-v1.ts`:
   a registration map keyed by `characterId` resolving each semantic state to
   its committed Metro-bundled asset (lazy static `require` thunks so Node-side
   test mounts never touch binary assets), the audit reference, the
   contentHash, and an availability label (`admitted_keyframe`,
   `shared_approved_frame`, `missing`). Kerrigan's shared
   `alert_combat`/`damaged_concerned` mapping is encoded as data, not copy.
   Update `companion-catalogue-content.d.ts` for the three new packs and three
   new portrait contracts.
3. **SS-3 — Catalogue and floating-window UI.**
   Rework `companion-catalogue-panel.tsx` into a fully registry/data-driven
   roster: six entry cards with real 96px-capable idle portraits (aspect-
   preserving crop, never stretched), per-character explicit six-state controls
   rendering the real committed `Image` (contain inside a square frame,
   reduced-motion static presentation, honest shared/missing labels), Kerrigan
   selected by default with her backend reference pointer intact, and the
   multi-speaker prototype kept visibly blocked. Refresh stale copy: the
   generic companion backend module (`packages/companion-backend-module-v1`,
   headless-verified Slice 266) supports worldbook triggers, layered memory,
   observed relationship state, multi-speaker turn ownership, branches,
   checkpoint/resume, import/export, audit/replay and external Provider ports —
   while the product room binding/persistence adapter stays Codex-owned and is
   shown as **pending**, never as supported. Same pending framing added to the
   `tactical-adutant-panel.tsx` gap cards (codes unchanged). No fabricated
   chat, durability, or model response anywhere.
   Run gate 1 (focused companion component contract) once after the final
   SS-3 code change.
4. **SS-4 — Real-browser journey and claim-to-pixel evidence.**
   New `scripts/verify-ticket-26-slice-266b-companion-roster-browser-v1.mjs`
   (same self-contained harness discipline as the Slice 265 gate): current-
   worktree web export freshness (now also watching `assets/characters`),
   backend parity vs the slice base, real Chromium at 1500×1050 and
   390×844-touch with reduced motion. The journey opens the catalogue, proves
   all six identities, switches at least one non-idle state for every
   character, and for each rendered portrait verifies actual image pixels
   (decoded `naturalWidth === 1254`, canvas luminance variance above a blank/
   glyph threshold, served bytes SHA-256 equal to the audit-pinned content
   hash), checks desktop and 390px containment with zero horizontal overflow,
   and records screenshots plus a claim-to-pixel report under
   `build/ticket-26-slice-266b-companion-roster-browser-v1/`.
   Run gate 2 once after the final SS-4 code change.
5. **SS-5 — Closure.** This document: receipts, commit hashes, changed files,
   screenshot index, unresolved Critical/High concerns.

## Verification receipts

_(filled in as gates run — see below)_

### Gate 1 · focused companion component contract (after SS-3)

Command: `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/character-presentation-mount-v2.test.tsx`

- Run 1 (2026-09-22, after the final SS-3 code change): **exit 1 — 3 failed / 3 passed**.
  All three failures are `CHARACTER_PROJECTION_INVALID:binding_or_hash` thrown
  inside the mount runtime while validating the server fixture projection —
  before any panel behaviour. Root cause re-proven with a scratch Node
  reproduction (not a gate run): the validator's pinned character
  package/catalogue hashes (`EXPECTED_CHARACTER_PACKAGE_HASH ab238d95…`,
  `EXPECTED_PERSONA_CATALOGUE_HASH 2e10ae7f…`, pinned in `61d0fdd`) are stale
  versus current character content (`12d5ed6e…` / `7c4c3a65…`). This is the
  pre-existing Codex-owned High gap `CHARACTER_PACKAGE_HASH_PIN_STALE`
  documented since Slice 264 §7.1: identical at this slice's base `592bb95`
  (all five Kerrigan-chain content files the runtime imports are byte-identical
  to base, and `packages/` + `scripts/support/` carry zero drift). No file this
  slice may edit is implicated; a rerun cannot change the deterministic
  backend-owned outcome, so no rerun was spent (Slice 264 precedent).
- The 3 passing tests are the ones that exercise the panel surfaces touched by
  earlier slices and unchanged semantics here: public fallback without a
  restricted image, sealed cold-offline snapshot, persona selector at the
  default ceiling. SS-3's catalogue changes render only in the floating
  variant, which this contract suite does not mount; the module-level import
  chain (catalogue panel → content packs → asset registry with lazy require
  thunks) evaluates cleanly under vitest.
- Covered sub-slices: SS-3 (as far as the pre-existing backend pin defect
  allows; pixel-level catalogue proof is carried by Gate 2).

### Gate 2 · six-companion real-browser journey and screenshots (after SS-4)

Command: `node scripts/verify-ticket-26-slice-266b-companion-roster-browser-v1.mjs`

- Run 1 (2026-09-22): **exit 1** — `CARD_PORTRAIT_NOT_REAL:sarah_kerrigan`.
  Verifier defect: react-native-web 0.21 `Image` renders a wrapper div
  (data-testid) + inner background-image layer + hidden accessibility `<img>`;
  the probe evaluated the wrapper, where `complete`/`naturalWidth` do not
  exist. Product was correct; probe repaired to target the inner `<img>`.
- Run 2 (repair round 1): **exit 1** — `PORTRAIT_NOT_RENDERED_AS_IMAGE_LAYER`.
  Second verifier defect in the same probe: the rendered background-image
  layer is the inner div, not the testID wrapper. Probe repaired to scan the
  wrapper subtree for the computed `url(...)` layer and to assert
  `backgroundSize` is `contain`/`cover` (never a `100% 100%` stretch).
- Run 3 (repair round 2): **exit 0 — PASSED**, 18 checks, 14 claim-to-pixel
  rows, 14 hashed artifacts, reportHash
  `19b2ce3e1032ffaf3cda3641631a7c43a62ca205063b60a34115b38970075b11`, report
  `build/ticket-26-slice-266b-companion-roster-browser-v1/browser-report.json`
  (git-ignored). Three runs, each repairing a distinct verified probe defect
  and advancing the journey (converging); within the three-cycle budget. No
  further rerun of this gate.
- Web export: the gate verified the served bundle is fresher than every
  frontend source (components/lib/content/characters/**assets/characters**
  watched) and reused the current-worktree export produced with the gate's own
  exact commands after the final SS-3 code change
  (`exported: false, reason: "existing export is fresher than all frontend
  sources"`). Backend parity: all 9 modules `identical` to the worktree; zero
  drift of `packages/` + `scripts/support/` vs base `592bb95`; fixture backend
  verified descended from the slice base.
- Per-character pixel proof (all six): served bundled bytes SHA-256 **equal**
  to the audit/receipt-pinned committed file at the path the UI labels, image
  decoded at the committed 1254×1254, rendered at 126px (≥96), canvas
  luminance stdev 17.8–47.4 (far above the 12.0 glyph/blank threshold), box
  contained in the viewport. Kerrigan `damaged_concerned` additionally proved
  the honest shared-frame badge + "honestly shares the approved alert_combat
  frame" copy.
- Viewports: desktop 1500×1050 (keyboard) and 390×844 touch; zero document
  horizontal overflow with the full catalogue expanded on both; compact-chip
  bounds and plain tap/click board-control hit-testing (no force click) after
  collapse. BYOK exercised with zero server-approved profiles; provider prefix
  saw only `GET …/metadata`; agent prefix only session probes; 0 Provider
  calls / ¥0. All boundary flags true (`portraitPixelsProvenReal: true`,
  `continuousAnimationClaimed: false`, `trainingTruth: false`).
- Covered sub-slices: SS-1, SS-2, SS-3, SS-4.

Screenshot honesty note: `09-desktop-multi-speaker-six.png` and
`10-desktop-capability-status.png` are byte-identical
(`14b43751…`) — no interaction occurred between the two captures and both
surfaces sit below the visible dock scroll window; the distinguishing evidence
is the gate's per-code DOM assertions (speaker text, 14 capability-row
testIDs). This is recorded here rather than claimed as separate pixel
evidence (Slice 265 closure precedent).

## Claim-to-pixel screenshot index

All under `build/ticket-26-slice-266b-companion-roster-browser-v1/browser-evidence/`
(sha256 per file in the report's `artifacts`).

| # | Screenshot | Proves (claimId) |
| --- | --- | --- |
| 01 | `01-desktop-collapsed-chip-board.png` | board_safe_collapsed_chip |
| 02 | `02-desktop-catalogue-six-companions.png` | catalogue_six_companion_identity_distinction (six real idle portraits) |
| 03–08 | `03…kerrigan-shared-state`, `04…zagara-listening`, `05…raynor-alert`, `06…nova-speaking`, `07…artanis-reflective`, `08…zeratul-alert` | roster_*_real_pixels — one state switch per character with decoded-1254px, ≥96px render, canvas variance, and served-sha256-equals-committed-file proof; 03 carries the honest shared-frame badge |
| 09 | `09-desktop-multi-speaker-six.png` | multi_companion_prototype_visibly_pending_binding (DOM-asserted; pixels byte-identical to 10 — see honesty note) |
| 10 | `10-desktop-capability-status.png` | capability_status_surface_pending_binding (DOM-asserted per code) |
| 11 | `11-desktop-collapsed-hit-test.png` | collapsed_chip_board_hit_testing |
| 12 | `12-narrow-catalogue-touch.png` | narrow_touch_catalogue_no_overflow (390px) |
| 13 | `13-narrow-nova-speaking-pixels.png` | narrow_touch_state_switch_real_pixels (390px pixel/hash proof) |
| 14 | `14-narrow-threat-hit-test.png` | narrow_collapsed_chip_hit_testing |

## Commits

| SS | Commit | Content |
| --- | --- | --- |
| Plan | _(this doc's first draft, committed with SS-1)_ | Ordered plan + admitted-asset baseline |
| SS-1 | `fb36db5` | Three new presentation packs (Nova/Zagara/Zeratul), three new portrait state contracts with admitted asset bindings, Raynor/Artanis contracts rebound from PENDING to real assets, catalogue extended to six entries (Kerrigan default) |
| SS-2 | `67b4fb6` | `companion-portrait-assets-v1.ts` registry (lazy Metro-bound sources, honest availability classes) + content typings |
| SS-3 | `f9839c8` | Data-driven six-companion catalogue UI with real keyframes, explicit state controls, reduced-motion honesty, shared-frame badge, refreshed capability/pending-binding copy; adjutant panel gap copy updated; Gate 1 receipt |
| SS-4 | `96b6fa6` | Browser gate + receipt above |
| SS-5 | this commit | This document finalized |

## Changed files

- `content/characters/nova-companion-pack-v1.mjs` (new)
- `content/characters/zagara-companion-pack-v1.mjs` (new)
- `content/characters/zeratul-companion-pack-v1.mjs` (new)
- `content/characters/nova-portrait-states-v1.mjs` (new)
- `content/characters/zagara-portrait-states-v1.mjs` (new)
- `content/characters/zeratul-portrait-states-v1.mjs` (new)
- `content/characters/raynor-portrait-states-v1.mjs` (admitted bindings)
- `content/characters/artanis-portrait-states-v1.mjs` (admitted bindings)
- `content/characters/raynor-companion-pack-v1.mjs` (visualAssets status)
- `content/characters/artanis-companion-pack-v1.mjs` (visualAssets status)
- `content/characters/companion-catalogue-v1.mjs` (six-entry roster)
- `apps/starcraft-tmg-expo/lib/level3/companion-portrait-assets-v1.ts` (new)
- `apps/starcraft-tmg-expo/components/character/companion-catalogue-content.d.ts` (typings)
- `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx` (roster UI)
- `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx` (gap copy)
- `scripts/verify-ticket-26-slice-266b-companion-roster-browser-v1.mjs` (new gate)
- `docs/ticket-26-slice-266b-companion-roster-ui-v1-2026-09-22.md` (this doc)

No file outside the manifest's allowed paths was modified. Backend drift vs
base `592bb95` under `packages/` and `scripts/support/`: zero (re-proven by
Gate 2).

## Unresolved Critical/High concerns

- **High · `CHARACTER_PACKAGE_HASH_PIN_STALE` (Codex-owned, unchanged since
  Slice 264 §7.1).** The pinned character package/catalogue hashes in
  `packages/client-domain/character-presentation-projection-v2.mjs` are stale
  versus current character content; the live Field-comms identity path stays
  fail-closed (`Adjutant · projection withheld`, rendered honestly) and Gate
  1's three projection-dependent tests stay red for that backend-owned
  reason. No frontend workaround is appropriate — substituting stale data
  would violate fail-closed character rights. This slice's catalogue surface
  does not depend on that projection and is fully green in Gate 2.
- No other Critical/High. Medium audit findings stand as recorded:
  per-state keyframes share close head/neck poses (96px semantics rely partly
  on lighting/context), and continuous animation remains unproven — the UI
  labels both and never plays the six states as a sequence.
