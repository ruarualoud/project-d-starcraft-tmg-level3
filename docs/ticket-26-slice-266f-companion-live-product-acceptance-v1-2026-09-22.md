# Ticket 26 / Slice 266f — Companion conversation UI polish + real BYOK product acceptance seam

Owner: Kimi · Worktree `.worktrees/ticket-26-slice-266f-companion-live-product-acceptance`
Base: `fa1c83dc018ef1085b6926ddf1debe24ae65f03b` · Date: 2026-09-22
Slice manifest: `.agent-runtime/slice.json` (`ticket-26-slice-266f-companion-live-product-acceptance`)

> Status: **frozen plan (266f.0).** Sub-slices below are frozen before
> implementation; this file becomes the closure record as each lands.

## Read first (as ordered by the brief)

- 266d Tavern parity closure:
  `docs/ticket-26-slice-266d-companion-tavern-completion-v1-2026-09-22.md`
- 266e final product closure:
  `docs/ticket-26-slice-266e-companion-final-product-closure-v1-2026-09-22.md`
- Ticket 16 secure BYOK/provider contracts:
  `docs/ticket-16-slices-153-162-secure-byok-provider-roadmap-2026-09-03.md`
  (Slices 154 consent/attach, 155 credential Worker isolation, 160 Web BYOK
  product flow, 161 redaction aggregate, 162 bounded live call pattern), plus
  the read-only reused modules
  `packages/client-domain/secure-provider-session-client-v1.mjs`,
  `packages/client-domain/secure-provider-transport-adapters-v1.mjs` and
  `packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs`.
- Current companion browser verifier:
  `scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
  (45/45 on its single 266e run).

## Invariants honored for the whole slice

- No change to Rules, Authority, formal match actions, spatial solving,
  strategy Skills, source snapshots, portrait assets, or any Provider
  implementation. All edits stay inside the manifest `allowedPaths`; the new
  verifier itself path-audits `git diff --name-only <base>..HEAD` against the
  manifest list.
- All existing companion contracts and testIDs are preserved: every
  266c/266d/266e testID, the compact floating launcher chip, the deterministic
  1–6 companion order, @mentions, interruption/explicit-continue, checkpoints,
  branches, persona/worldbook/memory/Author's Note surfaces, import/export/
  restore, audit/replay, the four permission surfaces, package promotion pins.
- No portrait asset is modified or generated. No paid Provider call, no
  credential read, no source-data refresh, no Git push, no dispatched agent.
- **Implementer boundary (binding for this slice):** the implementer does not
  run the single focused gate and does not perform the live paid BYOK call —
  both are reserved for the integrating Codex, exactly as in 266d (gate) and
  per the slice-agent constraint that forbids the implementing agent from
  calling paid Providers or reading credentials. The verifier proves the whole
  seam with the injected deterministic Provider and records the user-authorized
  live acceptance as an explicit, honest reservation (procedure + seam proofs),
  never as executed.

## Frozen numbered sub-slices (one scoped commit each, dependency order)

1. **266f.1 — conversation UI polish** (`tactical-adjutant-panel.tsx`,
   `companion-catalogue-panel.tsx`):
   - StarCraft blue/cyan communications language: a single `COMMS` palette
     (deep-space navy panels, cyan comm accents, ice text) replaces the
     yellow/olive theme in both components; every amber literal moves into a
     `WARN` palette referenced ONLY by warning surfaces (pending human
     confirmation, Provider interruption, risk/decision-risk lines, withheld/
     shared-frame honesty badges, parity gap rows). The verifier asserts both
     the source-level invariant (amber hex literals occur only inside the
     `WARN` constant of each file) and rendered computed colors.
   - Wide desktop focus mode (web, viewport ≥ 1024px): the expanded floating
     body renders as a left-anchored viewport-fixed wide sheet (two columns:
     Field comms + Companion group chat on the left; identity/catalogue/
     memory/session/provider/diagnostics on the right), bounded to ≤ 66% of
     the viewport width so the battlefield stays materially visible on the
     right, with its own close control; the compact launcher chip stays in
     the dock and is never covered. DOM hierarchy and every testID are
     unchanged — only layout/style changes — so the 266c/266d/266e browser
     journey and its gate remain valid.
   - Mobile full-screen sheet (web, viewport < 768px): the expanded body
     renders as a full-viewport fixed sheet with its own close control and
     internal scrolling; zero horizontal overflow; collapsed chip unchanged.
   - Mid widths (768–1023px) keep the current in-dock layout. Native keeps
     the current in-dock layout (fixed positioning is a web presentation
     detail, honestly scoped).
   - No control interception: the sheet only receives events inside its own
     box (`pointerEvents` discipline unchanged at the dock layer).
2. **266f.2 — secure-provider/BYOK product seam** (`tactical-adjutant-panel.tsx`
   provider card; verifier fixture):
   - The provider card gains an explicit state surface derived only from the
     real projection: `attached` / `missing` (no agent session or zero
     approved profiles — honest, never hidden) / `error` (rejection code) /
     `detached` (with `detachReason`), plus the awaiting-secret state.
   - A redacted-receipt block renders only hash-pinned public fields (provider
     id, requested model, profile hash prefix, consent-time budget envelope,
     attach/detach timestamps, `sensitiveMaterialPersisted: false`,
     `automaticRetryAllowed: false`); the raw key is never rendered, stored or
     logged anywhere.
   - A secret-hygiene line restates the real behavior: the password field is
     cleared before the network await and mutable bytes are zeroed afterward
     (existing code path; the verifier asserts it at source level and
     behaviorally headless).
   - The 266f verifier's fixture implements the exact Ticket 16 secure
     Provider HTTP contract deterministically (metadata / prepare / attach /
     read / detach, single-use nonce, octet-stream ingress, safe rejection
     codes) and the gate composes the REAL Ticket 16 session client + REAL
     HTTP transport against it: full state cycle, credential bytes proven
     zeroed after attach, redacted receipts proven free of credential
     material, error and detached surfaces, no persistence.
   - Live acceptance seam: the user-authorized single bounded live Chinese
     BYOK conversation is prepared as an explicit reserved procedure
     (Keychain → isolated Worker via
     `packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs`
     and the Ticket 16 Slice 162 pattern; stop on 401/402/403 or ambiguous
     dispatch; never silently retry; detach at the end; record exact calls/
     tokens/cost; prove credential absence). The verifier ships no
     credential-touching code and records the reservation honestly.
3. **266f.3 — real-content worldbook/persona/memory continuity acceptance**
   (`tactical-adjutant-panel.tsx` continuity card; verifier headless audit):
   - A "Session continuity" card in the group-chat surface renders REAL
     server projections only: per-companion era state (`conversation.
     companions[].eraId`), worldbook origin classification (sealed package
     character tier = formal pack content; persona-derived entry; chat-tier
     session entries; product-global entries labelled by their own
     provenance — the browser fixture's global entry is honestly marked
     fixture-injected), transcript/summary/episodic/relationship counts and
     the Author's Note version. Every unloaded or empty layer renders an
     honest `not loaded` / `not written yet` state — never fabricated data.
   - The verifier audits formal versus fixture worldbook content: Zagara's
     sealed character-tier entries carry package provenance and fire only on
     her assembly; the fixture global entry is labelled fixture in its own
     provenance and never appears inside the sealed package export.
4. **266f.4 — responsive screenshots and closure** (new verifier +
   this doc finalized):
   - `scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`:
     self-contained gate (same harness discipline as the 266c–266e gate):
     current-sources web export, two-seat demo room, mutation-counting room
     facade, deterministic injected Provider for ALL browser cases, real
     companion product module, desktop 1500×1050 and 390×844 touch journeys,
     headless contract phases (deterministic speaker order for 1/3/6
     companions, long-session resume, checkpoint isolation, branches,
     import/export/restore, audit/permissions, BYOK cycle, worldbook formal-
     versus-fixture audit, durable restart honesty), desktop + 390px
     screenshots with a claim-to-pixel index, secret scans over report and
     artifacts, manifest path-scope audit.
   - Run at most once after the final relevant code change by the
     integrating Codex; the implementer's evidence is the headless preflight
     mirror recorded in this closure. Only Critical/High findings block;
     repair stops after three non-converging rounds.

## Verification strategy

`selfVerificationByImplementer: true`; single focused gate
`node scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`.
Per the slice rules the implementer does not execute it (the integrating
Codex runs it exactly once); the implementer validates via `node --check`
plus a headless preflight mirror of the gate's non-browser phases (scratch
script under `build/`, never committed). 0 real Provider calls / ¥0.

> Status: **implementation complete — closed (266f.4).** All four sub-slices
> plus the frozen plan are committed in dependency order on
> `agent/kimi/ticket-26-slice-266f-companion-live-product-acceptance`. Per the
> slice rules the single browser gate run is reserved for the integrating
> Codex (run exactly once); the implementer's evidence is the headless
> preflight mirror (all green) recorded below. The user-authorized single
> live Chinese BYOK conversation is an explicit, honest reservation — the
> implementing agent is forbidden from calling paid Providers or reading
> credentials.

## Evidence, commits, gaps

### Commits (base `fa1c83d` → HEAD, one scoped commit per sub-slice)

| Sub-slice | Commit | Files |
|---|---|---|
| 266f.0 frozen plan | `106eff3` | `docs/ticket-26-slice-266f-companion-live-product-acceptance-v1-2026-09-22.md` |
| 266f.1 conversation UI polish | `f1e2f18` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx`, `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx` |
| 266f.2 secure-provider/BYOK product seam | `c68387e` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx` |
| 266f.3 real-content continuity acceptance | `92ba047` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx` |
| 266f.4 gate + closure | `daddb36` (verifier) · _(this commit)_ (closure) | `scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`, this doc |

`git diff --name-only fa1c83d..HEAD` touches exactly the four files above —
all inside the manifest `allowedPaths`. No push performed. The new gate itself
re-proves this at runtime (`SLICE_SCOPE_VIOLATION_OUTSIDE_MANIFEST_PATHS`).

### What each sub-slice delivers

- **266f.1** — StarCraft blue/cyan communications language (`COMMS` palette)
  in both companion components; every amber literal lives in a `WARN`
  palette referenced only by warning surfaces (pending confirmation,
  Provider interruption, risk lines, shared-frame honesty badge). The
  expanded floating body becomes a left-anchored viewport-fixed wide sheet
  on desktop web (≥ 1024px, two columns, ≤ 66% viewport so the battlefield
  stays materially visible; the compact launcher is never covered) and a
  full-screen fixed sheet on mobile web (< 768px); both sheets carry their
  own Collapse control; the compact chip is unchanged. Mid widths and native
  keep the in-dock layout. DOM hierarchy and every 266c/266d/266e testID are
  preserved — the sections are built once and rendered into the three
  layouts, so the existing browser gate remains valid.
- **266f.2** — the BYOK card gains an explicit state chip derived only from
  the real Ticket 16 projection (`attached` / `missing` / `error` /
  `detached` / `awaiting_secret`), a redacted-receipt block (hash-pinned
  public fields only; `sensitiveMaterialPersisted: false`,
  `automaticRetryAllowed: false`), and the secret-hygiene line (password
  field cleared before the network await, mutable bytes zeroed). The gate's
  deterministic fixture implements the exact Ticket 16 secure HTTP contract
  and the gate drives the REAL session client + REAL HTTP transport through
  the full cycle.
- **266f.3** — the session-continuity card renders per-companion era state
  (`conversation.companions[].eraId`; Kerrigan honestly shows the registered
  package default), worldbook origin classification (sealed package /
  persona-derived / chat session / product global with the honestly-labelled
  fixture class), layered memory counts and the Author's Note version — real
  server projections or honest unavailable states, never fabricated. The
  gate audits formal versus fixture worldbook content (Zagara's three sealed
  pack entries fire only on her assembly with package provenance; the
  fixture global entry is labelled by its own `fixture://` provenance and
  never appears inside the sealed package export).
- **266f.4** — the new single gate
  (`scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`,
  2,492 lines): manifest path-scope audit, current-sources web export,
  mutation-counting room facade, deterministic Chinese Provider responder
  (the transcript is byte-compared against the captured ACTUAL responses),
  deterministic Ticket-16 BYOK fixture, desktop 1500×1050 + 390×844 touch
  journeys, 1/3/6-companion deterministic order + accounting, long-session
  checkpoint isolation, branches, import/export/restore, audit/replay,
  permission surfaces, worldbook audit, durable SQLite process-restart
  resume, BYOK seam, hue-level theme assertions, 11 screenshots with a
  claim-to-pixel index, secret scans over report AND every artifact, and the
  honest live-acceptance reservation record.

### Implementer-side evidence (0 Provider calls / ¥0)

1. **Headless preflight mirror — ALL GREEN (5/5 groups)**, scratch script
   `build/266f-preflight.mjs` (never committed), run 2026-09-22 in this
   worktree:
   - `source_contracts`: amber literals occur only inside each file's `WARN`
     palette; zero olive-theme literals remain; secret input is cleared
     before the network await and bytes are zeroed in `finally`; all twelve
     new 266f testIDs present.
   - `roster_1_3_6_order_accounting`: 1, 3 and 6 companions open with
     `companions.length === count`, `speakerOrder.length === count + 1`,
     per-turn participant order exactly the deterministic speaker order, and
     provider accounting advancing by exactly `count` per roster (the
     accounting counter is module-gateway cumulative — the gate proves
     per-roster deltas against a baseline).
   - `worldbook_formal_vs_fixture_audit`: Zagara era real (Kerrigan honest
     null), character tier = exactly Zagara's three sealed entries with
     package provenance and no `fixture://` refs, global tier = the single
     honestly-labelled fixture entry, character tier fires only on Zagara's
     assembly, shared tiers byte-identical across companions, the sealed
     package export carries the three extension entries and zero fixture
     content.
   - `branches_export_audit_permissions`: swipe reroll + accept appends a
     NEW turn with unchanged history hashes; edit-as-branch accept; wrong
     base-turn-kind rejection; export contains no seat token; tampered
     export rejected (`COMPANION_IMPORT_INTEGRITY_MISMATCH`); independent
     `verifyCompanionAuditExport` passes; four permission surfaces.
   - `byok_full_cycle_states_zeroed_redacted`: REAL Ticket 16 session client
     + REAL HTTP transport against the deterministic fixture —
     `session_required → ready → awaiting_secret → attached → (refresh) →
     detached (explicit_user_detach)`, consent gate
     (`PROVIDER_EXPLICIT_CONSENT_REQUIRED`), credential bytes proven zeroed
     after attach AND after the verifier-armed `provider_ingress_rejected`
     error state, single-use nonce enforced, attach receipt redacted to byte
     length only, no synthetic secret in the client projection or fixture
     receipts.
2. **Syntax/static checks**: `node --check` on the gate; TypeScript
   `transpileModule` syntax check on both UI files (the worktree has no
   `node_modules`, so the full tsc baseline count is honestly deferred to
   the integrating run — the new code introduces no new type constructs
   beyond a guarded `as any` for viewport-fixed positioning).
3. The single slice gate
   `node scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`
   was **not run by the implementer** (slice rules: the integrating Codex
   runs it exactly once).

### Repair-loop record (implementer-side)

Preflight round 1 exposed two real defects, each fixed and re-proven in one
round: (1) `providerAccounting.calls` is module-gateway cumulative — the
roster assertion now proves per-roster deltas against a pre-run baseline;
(2) the session source must expose `connectionEpoch` (the Ticket 16 trusted
reader's shape), not `expectedConnectionEpoch`. Review round 2 found and
fixed `openChatSection` toggling the launcher unconditionally (would have
collapsed the already-expanded sheet); it is now idempotent. Non-converging
rounds: 0 of max 3.

### Live-call receipt (honest reservation)

- User authorization on file: ONE bounded live Chinese BYOK conversation
  acceptance. **Executed in this slice: no.** The implementing agent is
  forbidden from calling paid Providers or reading credentials; the raw key
  therefore never entered the K3 prompt, repository, command line,
  stdout/stderr, screenshots, report, or logs — no live call exists to leak
  it.
- The reserved procedure (recorded in the gate report's
  `liveByokAcceptance` field): the integrating run invokes only the existing
  Keychain → isolated-Worker path
  (`packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs` +
  the Ticket 16 Slice 162 pattern), inspects only redacted product receipts,
  stops immediately on 401/402/403 or ambiguous dispatch, never silently
  retries, records exact Provider calls / reported tokens / estimated cost,
  detaches at the end, and proves credential absence from persistence and
  artifacts. The gate proves the entire seam around that single step with
  the deterministic fixture (0 real Provider calls, ¥0).

### Honest nonblocking gaps (no Critical/High findings open)

- **Browser phase unexecuted by the implementer.** The desktop/390px
  journeys (fixed focus sheet, mobile sheet, theme hues, Chinese
  conversation rendering, continuity card, BYOK card, portrait pixels,
  screenshots) are written into the gate and validated only headlessly /
  statically; their first live-browser execution is the integrating Codex's
  gate run. The viewport-fixed sheet relies on react-native-web's
  `position: fixed` (standard on RNW 0.21; no transforms/filters on any
  ancestor).
- **Full tsc baseline delta** unverified in the worktree (no
  `node_modules`); the integrating run compares against the 31-error
  pre-existing baseline.
- **Live BYOK conversation** remains the explicit reservation above — the
  single authorized paid step is deliberately unspent.
- **Native and mid-width (768–1023px) layouts** intentionally keep the
  in-dock presentation (the sheet modes are web presentation geometry).
- Kerrigan's character-tier worldbook stays empty by data (pre-existing
  pack content; the gate asserts Zagara's three sealed entries and
  Kerrigan's zero explicitly).
