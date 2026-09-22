# Ticket 26 / Slice 266e — Companion final product closure (acceptance repair + last product gaps)

Owner: Kimi · Worktree `.worktrees/ticket-26-slice-266e-companion-final-product-closure`
Base: `7f504c970a0c065a39254b1a62e48d9ba37782a1` (merged 266d closure + acceptance stabilization) · Date: 2026-09-22
Slice manifest: `.agent-runtime/slice.json` (`ticket-26-slice-266e-companion-final-product-closure`)

> Status: **implementation complete — closed (266e-SS-6).** All six sub-slices
> are committed in dependency order on
> `agent/kimi/ticket-26-slice-266e-companion-final-product-closure`. The single
> focused browser gate was run exactly once after the final relevant code
> change (manifest `selfVerificationByImplementer: true`) and **passed 45/45
> checks**; evidence, receipts and honest gaps are recorded below.

## Invariants honored for the whole slice

- No change to Rules, Authority, battle actions, formal match strategy,
  replay/Skill evolution, source snapshots, credentials, Provider production,
  or the Codex main match. All edits stay inside the manifest `allowedPaths`.
- No paid Provider, no source-data refresh, no credential read, no image
  generation (only committed approved assets are bound), no Git push, no
  dispatched agent, no real Provider calls and no formal Room mutation.
- The companion path keeps the full Tavern-equivalent contract proven in
  266c/266d: durable long-session roleplay, versioned seat-bound persona,
  deterministic four-tier Worldbook with bounded recursion and provenance,
  layered transcript/summary/episodic/relationship memory, rollback-safe
  summary, Author's Note depth/frequency, swipe/reroll/edit-as-branch,
  checkpoints, import/export/restore, public audit/replay, seat isolation,
  the four permission surfaces (opponent-private always denied, never any
  Preview/Confirm/Apply), and 1–6 deterministic companions in one
  conversation. All six companions stay data-driven and extensible (a seventh
  is a content + registry append).
- Read first, as ordered by the brief: the merged 266d closure
  (`docs/ticket-26-slice-266d-companion-tavern-completion-v1-2026-09-22.md`)
  and the current verifier
  (`scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`).

## NOTE_REQUESTS_NOT_CAPTURED diagnosis (drives 266e-SS-2)

The integrating browser run passed 28 checks and stopped at
`NOTE_REQUESTS_NOT_CAPTURED` with `captured: 1`, expecting 2.

**The product emitted the correct number of Author's Note-injected Provider
requests; the verifier indexed its capture window with the wrong counter.**

- The conversation under test binds two companions (Kerrigan + Zagara) and the
  note is saved with `frequency: 1`, so one `/turns` send produces exactly two
  Provider requests, both note-injected. The immediately preceding assertion
  (`AUTHORS_NOTE_INJECTION_FLAGS_WRONG`) already proved **both** replies carry
  `authorsNoteInjected` with the correct depth/frequency/position — the
  product side of the contract is real.
- The capture window was computed as
  `providerProbe.requests.slice(providerProbe.calls)`. `calls` counts every
  responder invocation, but `requests` records only *completed* invocations:
  the one verifier-armed deterministic outage earlier in the journey
  (`providerProbe.failNext = 1`, interruption asserted as `calls === 5 &&
  interruptions === 1`) throws **before** the request is recorded. From that
  point on `requests.length === calls - 1`, so slicing `requests` at the
  `calls` index silently dropped the first of the two note-injected requests
  → `captured: 1`.
- Repair (the real contract, not weaker evidence): index the capture window
  by `providerProbe.requests.length`. The expected denominator stays 2
  (two companions × frequency 1) and both captured requests are still
  position-proven against the exact reported injection position. No product
  code changes were needed for this defect.

## Frozen numbered sub-slices (one scoped commit each, dependency order)

1. **266e-SS-1 — this frozen plan** (docs only).
2. **266e-SS-2 — Author's Note capture repair**
   (`scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
   only): capture window indexed by `providerProbe.requests.length`; the
   two-request denominator and the per-request position proof are unchanged.
3. **266e-SS-3 — six-state portrait animation binding (real service/UI
   behavior, committed assets only).**
   - `content/characters/companion-portrait-animation-binding-v1.mjs` (new,
     server-safe): a hashed, data-driven binding document derived from
     `COMPANION_PORTRAIT_ASSET_REGISTRY_V1` (all six companions × six states;
     incomplete coverage fails closed to `idle`), plus the pure deterministic
     state machine `resolveCompanionPortraitAnimationStateV1(signals)` —
     `sessionError → damaged_concerned`, `interrupted → alert_combat`,
     `thinking (explicit continue/send drain in progress) → reflective`,
     `companion utterance just accepted → speaking`, `human composing →
     listening`, otherwise `idle` — and per-state deterministic transition
     descriptors with a reduced-motion static fallback.
   - `tactical-adjutant-panel.tsx`: the live chat speaker portrait is bound to
     that state machine (real session signals: `chat.error`,
     `chat.interrupted`, `chat.busy` + `lastOperation`, accepted transcript,
     composer draft) with a deterministic fade transition between the
     committed keyframes (no generated frames; reduced motion renders the
     single static frame, exactly as the state contracts prescribe). The
     current state is exposed as `companion-chat-speaker-portrait-state` for
     the gate; the existing pixel-proof structure
     (`companion-chat-speaker-portrait-img` single image layer) is preserved.
   - `companion-catalogue-panel.tsx` + `companion-catalogue-content.d.ts`:
     the state preview shows the real transition descriptor; the
     `COMPANION_PORTRAIT_CONTINUOUS_ANIMATION` parity row and summary flip to
     the honest connected claim — deterministic six-state animation *binding*
     over committed keyframes (transition animation only; no new/looped
     frames are pretended).
4. **266e-SS-4 — package-to-backend promotion (backend sealing + hash pins,
   durable).**
   - `companion-room-session-service-v1.mjs`: `promotePackage` (seals the
     registered package through the generic backend contract and persists the
     sealed contract under a promotion namespace with its SHA-256 integrity
     hash as the pin; idempotent on the same pin, conflict fails closed) and
     `readPackagePromotions` (live re-verification of every pin against the
     persisted contract and the registry; fail closed on mismatch).
   - `companion-product-module-v1.mjs`: routes `POST packages/promote` and
     `GET packages/promotions`; on the first authenticated request of each
     composition the module reloads persisted promotions, re-verifies every
     pin against the contract integrity hash and re-registers the sealed
     packages — a pin mismatch or version conflict fails closed
     (`COMPANION_PACKAGE_PROMOTION_PIN_MISMATCH`); `status` reports the
     promotion surface honestly (durable flag from the persistence
     declaration, never invented).
   - `packages/client-domain/client-domain-v1.mjs`: `package_promote` /
     `package_promotions` operations, endpoint mapping and facade methods;
     the four-operation interface, trusted ingress and credential handoff are
     untouched.
   - `client-domain-provider.tsx` typing + `tactical-adjutant-panel.tsx`: a
     real "Backend pack promotion" chat card (load + per-pack promote +
     live verified/pin rows).
   - `companion-catalogue-panel.tsx`: the
     `COMPANION_PACK_BACKEND_PROMOTION` parity row, parity summary and the
     pack-detail visual-asset copy flip to the honest connected claim.
5. **266e-SS-5 — verifier extension**
   (`scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`):
   headless 266e proofs (state-machine mapping/priority/fail-closed idle,
   reduced-motion static descriptors, six-companion coverage; promote →
   duplicate → unknown-package rejection → live-verified listing → status
   surface; durable restart reload of promotions with pin verification and a
   tampered-pin fail-closed composition), browser proofs (promotion card
   driven at desktop; speaker-portrait state asserted `alert_combat` on the
   interrupted turn and `speaking` after explicit continue; promotions card
   present at 390px), parity-row assertions updated to the new honest
   connected labels, machine-report 266e fields. Every 266c/266d check is
   retained.
6. **266e-SS-6 — single gate run + this closure finalized**: exact files,
   commits, gate receipt, passed denominator, screenshots, remaining honest
   gaps and zero-cost accounting.

## Verification strategy

`selfVerificationByImplementer: true`. Single focused gate:
`node scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
— run at most once after the final relevant code change (266e-SS-6); a failed
run may be repaired and re-run, stopping after three non-converging rounds.
Only Critical/High findings block. 0 Provider calls / ¥0.

## Evidence, commits, gaps

### Commits (base `7f504c9` → HEAD, one scoped commit per sub-slice)

| Sub-slice | Commit | Files |
|---|---|---|
| SS-1 frozen plan + diagnosis | `ed34a42` | `docs/ticket-26-slice-266e-companion-final-product-closure-v1-2026-09-22.md` |
| SS-2 Author's Note capture repair | `62e2496` | `scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs` |
| SS-3 six-state portrait animation binding | `7b83028` | `content/characters/companion-portrait-animation-binding-v1.mjs` (new), `apps/starcraft-tmg-expo/components/character/companion-catalogue-content.d.ts`, `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx`, `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx` |
| SS-4 package-to-backend promotion | `6fcab1d` | `packages/product-composition/companion-room-session-service-v1.mjs`, `packages/product-composition/companion-product-module-v1.mjs`, `packages/product-composition/index.mjs`, `packages/client-domain/client-domain-v1.mjs`, `apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx`, `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx`, `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx` |
| SS-5 verifier extension | `2901c17` | `scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs` |
| SS-6 this closure | _(this commit)_ | `docs/ticket-26-slice-266e-companion-final-product-closure-v1-2026-09-22.md`, `docs/ticket-26-slice-266d-companion-tavern-completion-v1-2026-09-22.md` (resolution addendum only) |

Honesty note on SS-4: the implementing session was interrupted by a network
loss mid-sub-slice; the recovered work was committed as
`wip(ticket26-slice266e): recover package promotion after network loss`
(`6fcab1d`). The diff is exactly the SS-4 scope and was validated before SS-5
by a 27-check implementer preflight over the real service/module/binding
contracts (scratch script under `build/`, not committed). The commit message
is kept as-is — no history rewrite — and this row is its canonical record.

`git diff --name-only 7f504c9..HEAD` touches exactly the 12 files above, all
inside the manifest `allowedPaths`. No push performed.

### Gate receipt (run exactly once, after the final relevant code change)

- Command: `node scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
- Result: **`ok: true` — 45/45 checks, 15 claim-to-pixel rows, 21 hashed
  artifacts**, elapsed 177.2 s, report
  `build/ticket-26-slice-266c-companion-product-binding-v1/browser-report.json`,
  reportHash `ec6e261bfd70545436cf69886bcbbfc25e953137f237166414686645c174ecba`,
  worktreeHead `2901c17`.
- **NOTE_REQUESTS_NOT_CAPTURED resolved at the real contract**: the capture
  window is indexed by `providerProbe.requests.length`; the passed denominator
  is **2 captured / 2 expected** (two companions × frequency 1), with the
  per-request position proof intact. All 28 previously passing checks still
  pass, unchanged.
- The gate re-ran the current-sources web export itself
  (`exported: true, elapsedSeconds: 147.11`) — the served bundle is provably
  current, never a stale export.
- New 266e checks: `desktop_266e_speaker_portrait_state_machine_live`
  (alert_combat on the verifier-armed interrupted turn → speaking after
  explicit Continue), `desktop_266e_package_promotion_live_pins` (UI-driven
  promote, verified+registered pin row, screenshot
  `20-desktop-266e-pack-promotion.png`),
  `headless_266e_portrait_animation_binding_state_machine` (priority,
  fail-closed idle, reduced-motion static, six-companion coverage, hashed
  binding document), `headless_266e_package_promotion_seal_hash_pins`
  (idempotent same-pin, unknown package rejected, honest status surface),
  durable restart reload of the persisted promotion with pin re-verification
  inside `headless_266d_durable_sqlite_process_restart_resume_fail_closed_keys`,
  and `headless_266e_tampered_promotion_store_fail_closed` (pin swap →
  `COMPANION_PACKAGE_PROMOTION_PIN_MISMATCH` on every request; forged contract
  with the original pin → `CONTRACT_INTEGRITY_MISMATCH`).
- Boundaries re-proven: zero Room mutations and unchanged `stateRevision`,
  no Preview/Confirm/Apply authority, opponent-private denied on all four
  permission surfaces, no persisted seat tokens, no hidden chain-of-thought,
  no fabricated replies, request-log hygiene intact.
- Screenshots (sha256-hashed in the report): the full 266c/266d set plus
  `20-desktop-266e-pack-promotion.png`; the 390px sweep now includes the
  promotions card with zero horizontal overflow.

### Repair-loop record

- Gate runs this slice: **1** (passed first run). Non-converging rounds: 0 of
  max 3.
- Pre-gate implementer validation: 27/27 preflight checks (SS-3 state machine
  + SS-4 promotion incl. durable restart and both tamper fail-closed paths)
  on the first attempt; no repair needed.
- Environment note: the gate's project-d root resolution was made robust
  (adapter + data file both required) because `.worktrees/scripts` is a
  symlink that false-matches an adapter-only check; the gate now runs
  identically from the main checkout or a nested worktree. This hardens the
  harness without touching any assertion.
- tsc on the Expo app: 31 errors before the slice, 31 after — the identical
  pre-existing baseline; no new type errors.

### Honest nonblocking gaps (no Critical/High findings open)

- **Kerrigan character-tier worldbook** remains empty by data (pre-existing
  pack content; unchanged by this slice and asserted explicitly by the gate).
- **Third-party extension marketplace** remains unimplemented (explicit
  contract exclusion) — the catalogue parity matrix now lists it as the only
  missing row.
- **Portrait motion scope**: the binding is transition animation only
  (bounded deterministic crossfade on state change); continuous frame loops
  and generated in-between frames are deliberately not pretended. All pixels
  are the committed audit/receipt-pinned keyframes.
- **SS-4 commit message** retains its `wip(...)` prefix from the interrupted
  session (see the honesty note above); content is complete and gate-proven.
- **`verify-ticket-14-client-domain-module-v1.mjs`** still fails on the
  pre-existing baseline (missing local
  `.worktrees/starcraft-tmg-local/data/starcraft-tmg-data.json` in nested
  worktrees) — a pre-existing environment issue, not introduced here.
- The integrating Codex may rerun the gate at the merge boundary; this
  closure's receipt is the implementer-side run recorded above.

### Zero-cost accounting

- Real Provider calls: **0**. Paid inference: **0**. Cost: **¥0**.
- Fixture Provider calls: 13 (verifier-controlled deterministic in-process
  responder; no network, no credentials), 1 verifier-armed deterministic
  interruption.
- No source-data refresh, no image generation, no credential read, no Room
  mutation, no Git push, no dispatched agent. `trainingTruth: false`
  everywhere. Kimi CLI exposes no token/currency telemetry, so no Kimi cost
  is inferred.
