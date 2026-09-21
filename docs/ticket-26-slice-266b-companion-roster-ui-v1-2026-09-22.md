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

_(pending)_

## Commits

_(filled in per sub-slice)_

## Changed files

_(filled in per sub-slice)_

## Unresolved Critical/High concerns

_(filled in at closure)_
