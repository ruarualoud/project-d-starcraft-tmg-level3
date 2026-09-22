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

> Status: **implementation complete — closed (266f.4); 266f.5 live acceptance
> executed once (2026-09-22, truncated at the 64-unit budget); 266f.6 repair +
> second authorized live call executed once (2026-09-22) — product acceptance
> ACHIEVED; 266f.7 multi-companion memory-continuity live acceptance executed
> once (2026-09-22, 4 physical calls) — ACHIEVED.** All four sub-slices plus
> the frozen plan are
> committed in dependency order on
> `agent/kimi/ticket-26-slice-266f-companion-live-product-acceptance`. The
> focused browser gate has ACTUALLY run (first complete run 2026-09-22,
> after three honest repair rounds exposed by its first-ever executions) and
> passed 28 checks / 10 claims / 12 artifacts with 0 Provider calls / ¥0.
> The user-authorized single live Chinese BYOK conversation was then executed
> exactly once through
> `scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs`: one real
> physical Provider call was made and its redacted receipt retained, but the
> reply exceeded the Ticket 16 profile's 64-unit output budget, so the run
> stopped with `LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED`, zero retry, and
> the one-call lock permanently claimed. See the 266f.5 section below.
> The user then explicitly authorized the repair and ONE further live call:
> the exact truncation was reproduced offline fail-first, a general versioned
> output-budget + truncation classification/recovery contract landed
> (`companion_output_budget_v2`, character-agnostic), the focused gate gained
> the concrete fail-first phase and passed 29 checks, and the epoch-2 call
> rendered the ACTUAL Chinese persona/worldbook-grounded reply end-to-end.
> See the 266f.6 section below.

## Evidence, commits, gaps

### Commits (base `fa1c83d` → HEAD, one scoped commit per sub-slice)

| Sub-slice | Commit | Files |
|---|---|---|
| 266f.0 frozen plan | `106eff3` | `docs/ticket-26-slice-266f-companion-live-product-acceptance-v1-2026-09-22.md` |
| 266f.1 conversation UI polish | `f1e2f18` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx`, `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx` |
| 266f.2 secure-provider/BYOK product seam | `c68387e` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx` |
| 266f.3 real-content continuity acceptance | `92ba047` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx` |
| 266f.4 gate + closure | `daddb36` (verifier) · `797960b` (closure) | `scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`, this doc |
| 266f.5 live runner + gate scope/reservation | `0b5ca25` | `scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs`, verifier (manifest path list + reservation text) |
| 266f.5 repair: sheet portal (gate run 1) | `e520eea` | `tactical-adjutant-panel.tsx`, verifier + runner page-scope selectors |
| 266f.5 repair: gate ordering (gate run 2) | `41a6f8e` | verifier (provider-status hue asserted after chat section opens) |
| 266f.5 repair: report assembly scope (gate run 3) | `3feb37b` | verifier (`durableProbe` hoisted to function scope) |
| 266f.5 closure record | `92d71b6` | this doc |
| 266f.6 output-budget/truncation contract | `f93432b` | `packages/companion-backend-module-v1/provider-output-budget-v1.mjs` (new), `packages/companion-backend-module-v1/index.mjs` |
| 266f.6 live runner repair | `03fbb13` | `scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs` |
| 266f.6 gate fail-first phase | `a9c2a3a` | `scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs` |
| 266f.6 epoch-2 pre-dispatch repairs | `b8c7fb5` | `scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs` |
| 266f.6 closure record | `f13252f` | this doc |
| 266f.7 continuity live seam + gate phase | `f7c29b6` | `scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs`, `scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs` |
| 266f.7 pre-dispatch repairs | `5c69957` | `scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs` |
| 266f.7 closure record | _(this commit)_ | this doc |

`git diff --name-only fa1c83d..HEAD` touches only the files in the table
above plus the pre-existing `.kimi-code/agents/project-d-live-acceptance.md`
authorization commit (`a910689`) — all inside the manifest `allowedPaths`. No
push performed. The gate re-proves this at runtime
(`SLICE_SCOPE_VIOLATION_OUTSIDE_MANIFEST_PATHS`; its manifest path list now
includes the agent profile and the live runner).

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
  keep the in-dock layout. Every 266c/266d/266e testID is preserved; after
  the first real gate run exposed the RNW ScrollView `translateZ(0)`
  containing-block trap, the web sheet is portaled to `document.body` (see
  266f.5), so sheet-mode DOM ancestry — but no testID or behavior — differs
  from the in-dock layout.
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

## 266f.5 — real BYOK live acceptance: execution record (2026-09-22)

User authorization on file: ONE bounded live Chinese BYOK conversation, hard
maximum ONE physical Provider call. Executed exactly once; never retried.

### Focused gate (prerequisite) — PASSED on its first complete run

The 266f gate had never actually executed before this slice (the 266f.4
closure recorded only the implementer's headless preflight mirror). Its
first-ever runs exposed and repaired three real defects, one round each:

1. **Run 1 — `FOCUS_SHEET_NOT_LEFT_ANCHORED` (product defect).**
   react-native-web 0.21 gives every ScrollView base
   `transform: translateZ(0)` for compositing; the floating dock's ScrollView
   therefore became the containing block for the sheet's `position: fixed`,
   anchoring it to the shrink-wrapped dock (measured box x=1060, y=993,
   h=21) instead of the viewport. The dock chrome file is outside the
   manifest, so the expanded sheet is now portaled to `document.body` on web
   (`portalSheetToBody`, EXPO_OS-guarded literal `require("react-dom")`,
   shaken out of native bundles). Every testID is unchanged; gate and live
   runner sheet selectors moved to page scope accordingly. Native and
   mid-widths keep the in-dock layout.
2. **Run 2 — `COMMS_ACCENT_NOT_CYAN_BLUE` (gate ordering bug).** The gate
   asserted the chat provider-status hue before the chat section was opened;
   the element only exists once the section renders. The assertion now runs
   immediately after `openChatSection`.
3. **Run 3 — `ReferenceError: durableProbe is not defined` (gate report
   assembly bug).** Every browser and headless phase had already passed; the
   durable-fixture call counter was block-scoped inside `try` but referenced
   by the post-`try` report. Hoisted to function scope.

Run 4 (final): **passed — 28 checks, 10 claims, 12 artifacts**, report
`build/ticket-26-slice-266f-companion-live-product-acceptance-v1/browser-report.json`,
reportHash `6fc71a64f9823377d7694f1c594a3dba5cef9a244db7a3fa0197eda38f28b2ab`,
22.7s (the current-sources export from run 1 was still fresh and reused;
run 1 itself performed the full export). 0 real Provider calls / ¥0. All
browser screenshots under
`build/ticket-26-slice-266f-companion-live-product-acceptance-v1/browser-evidence/`
(`01-…-11-*.png`, sha256-indexed in the report).

### Live runner

`scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs` (requires the
explicit flag `--authorize-live-byok-companion-once`; refuses to run when a
prior success report or a prior dispatch lock exists). Offline preflight
before the live run (scratch `build/266f-live-preflight.mjs`, uncommitted,
0 Provider calls): the adapter's Provider request passes the REAL egress
transport normalization (wire body: model `deepseek-v4-flash`,
`max_tokens: 64`, `response_format: json_object`, thinking disabled), a fake
socket 401 maps to `PROVIDER_AUTHENTICATION_FAILED` with
`physicalAttempts: 1 / automaticRetries: 0`, and the REAL companion product
stack (module + session service + gateway) renders the reply with honest
accounting (1 external network attempt / 1 paid inference) while a second
turn is refused with zero dispatch.

### Executed live run (the one authorized physical call)

- Run id `e9aedc0e-def4-411c-aa19-9cab74e23c19`, started
  2026-09-22T09:15:22Z. Credential read exclusively via the existing macOS
  Keychain → isolated-Worker path
  (`keychain-credential-ingress-v1.mjs` → `provider-egress-worker-port-v1.mjs`;
  attested `/usr/bin/security`, no shell, empty environment, secret never in
  arguments/environment/files/logs/screenshots/stdout). Parent credential
  buffer asserted zeroed immediately after attach; the Keychain module zeroes
  its own stdout buffer.
- Real product path: two-seat room → real companion product module → session
  service → provider gateway → isolated Worker → one HTTPS POST to
  `api.deepseek.com` (TLS verified, DNS pinned, no proxy, no redirect).
  One companion (Zagara, real sealed package worldbook), one bounded Chinese
  prompt, pre-send denominator proven (exactly 1 companion, 0 calls).
- **Outcome: the physical call succeeded (HTTP 200) but the reply exceeded
  the profile's 64-unit output budget** (`outputUnits: 64`, finish-reason
  truncation → not the sealed channel JSON), so the adapter returned
  `LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED`, the UI rendered the explicit
  interrupted card (accepted history preserved, no fabricated reply), and the
  run stopped with **zero retry**; the one-call dispatch lock
  (`build/ticket-26-slice-266f-live-byok-companion-v1/one-call-attempt.lock.json`)
  is permanently claimed and a rerun requires new user authorization.
- **Redacted receipt** (report
  `build/ticket-26-slice-266f-live-byok-companion-v1/live-report.json`):
  status 200; requestedModel `deepseek-v4-flash`; **reportedModel
  `deepseek-flash` — a model-reporting drift recorded honestly** (the pinned
  pricing snapshot therefore refuses an authoritative pricing receipt);
  usage 118,911 input units (0 cache-hit / 118,911 cache-miss) + 64 output
  units = 118,975 total; physicalAttempts 1; automaticRetries 0;
  providerSystemFingerprintHash `09af7682…0c4602`; responseFingerprint
  `343aed86…f88d5`; receiptHash
  `603bebde253d74f6bb465cc7ac2ab7464c8cf8720c54e9610a214313297b29ee`.
- **Estimated cost (non-invoice): $0.05240532** — arithmetic at the pinned
  snapshot's peak-window rates (118,911 × 440 + 64 × 1,320 nano-USD); the
  Provider invoice remains authoritative.
- **Screenshots:**
  `build/ticket-26-slice-266f-live-byok-companion-v1/browser-evidence/live-01-desktop-session-open.png`
  (desktop 1500×1050: one-companion session open, provider status honestly
  declaring `isolated_worker_https_egress`, 0 calls) and
  `…/live-failure-interrupted.png` (the explicit interrupted card after the
  single call). The 390px resume shot was not reached (the run correctly
  stopped at the interruption).
- **Detach/zero-persistence:** the runner's `finally` detached the Worker
  (`explicit_user_detach`; the port requires the child's
  `sensitiveBytesZeroed` shutdown acknowledgement) and re-zeroed the parent
  buffer; nothing was persisted by the runner (`rawCredentialPersisted:
  false`, `credentialHashPersisted: false`); report and artifacts were
  scanned for credential-shaped material. Honest evidence gap: the failure
  path writes its report before the tombstone read, so the worker-tombstone
  proof is structural (finally-path detach + port enforcement) rather than a
  recorded tombstone field; the success path records the full tombstone.
- Zero Room mutations (mutation-counting facade) and the Room state revision
  never moved.

### What this means

The secure seam worked end-to-end against the real Provider (Keychain →
isolated Worker → pinned TLS → redacted receipt → detach), the stop rules
fired exactly as specified, and the hard maximum of one physical call was
kept. The product-level acceptance of a RENDERED live Chinese reply is
**not** achieved: the Ticket 16 profile's 64-unit output budget cannot carry
the companion channel JSON plus Chinese reply text. A productive retry needs
new user authorization AND a larger output budget in the Provider profile —
Provider infrastructure outside this slice's manifest and untouched here.
**(Superseded by 266f.6 below: the user authorized the repair and one further
call; the budget was repaired through the versioned contract with the Ticket
16 profile untouched, and the epoch-2 call achieved the rendered acceptance.)**

### Honest nonblocking gaps (no Critical/High findings open)

- **Browser phase: now executed.** The focused gate's desktop/390px journeys
  ran for the first time in this slice and passed (28/28) after the three
  repair rounds above. The viewport-fixed sheet is portaled to
  `document.body` on web (the RNW ScrollView compositing transform traps
  `position: fixed`); mid-width (768–1023px) and native keep the in-dock
  layout by design.
- **Legacy 266c/266e gates:** their dock-scoped sheet selectors
  (`companionChip(page).getByTestId("companion-chat-section")` etc.) would
  need the same page-level rescoping if they were ever rerun against this
  branch, because the portaled sheet no longer sits under the dock in sheet
  modes. Their passed runs remain valid historical evidence of their own
  integrated state; they were not rerun here (out of this manifest's scope).
- **Live BYOK conversation: ACHIEVED on the second authorized call (epoch 2,
  266f.6).** Epoch 1 returned HTTP 200 but truncated at the Ticket 16
  profile's 64-unit output budget (zero retry; dispatch lock claimed). Epoch 2
  (the single user-authorized repair call) rendered the actual Chinese reply
  with the versioned 475-unit budget. The Provider again reported
  `deepseek-flash` against the requested `deepseek-v4-flash` — the drift is
  recorded in both live reports; the pinned pricing snapshot refuses an
  authoritative receipt for the drifted model, so the epoch-2 cost figure is
  an explicitly-labelled snapshot-rate estimate (`estimateOnly: true`), not an
  invoice. See 266f.6.
- **Full tsc baseline delta** unverified in the worktree (no local install;
  `node_modules` was symlinked from the main checkout for the export step);
  the new code's only typing accommodation is the guarded `as any` for
  viewport-fixed positioning plus the EXPO_OS-guarded react-dom require; the
  pre-existing baseline is 31 errors.
- **Native and mid-width (768–1023px) layouts** intentionally keep the
  in-dock presentation (the sheet modes are web presentation geometry).
- Kerrigan's character-tier worldbook stays empty by data (pre-existing
  pack content; the gate asserts Zagara's three sealed entries and
  Kerrigan's zero explicitly).

## 266f.6 — output-budget repair + second authorized live call (2026-09-22)

User authorization on file: repair the recorded 64-unit truncation and run
exactly ONE further Chinese BYOK call, zero retry. Executed exactly once;
never retried. Slice-wide physical-call total is now 2 (epoch 1 + epoch 2),
the hard maximum the runner enforces (two epoch-scoped O_EXCL dispatch locks;
epoch 2 refuses unless epoch 1's lock and failure report prove the exact
recorded truncation context).

### Fail-first offline reproduction (0 Provider calls / ¥0)

Scratch `build/266f-truncation-repro.mjs` (uncommitted, same discipline as
the 266f preflight mirrors) drove the REAL egress transport
(`provider-egress-transport-v1.mjs`) against the REAL Ticket 16 profile
binding with a fake socket returning the exact captured shape (HTTP 200,
`finish_reason: "length"`, 118,911 input / exactly 64 output units, sealed
channel JSON cut mid-string):

- the wire body carried `max_tokens: 64` — the profile `outputBudget` cap is
  the concrete bug condition;
- the transport DID classify the truncation
  (`providerTurn.issue === "output_truncated"`); the runner adapter then
  flattened it into the generic `LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED`
  with no typed classification, no budget diagnostics and no recovery
  (fail-first: the repaired-contract assertions all failed pre-fix);
- post-fix the same scratch is fully green: typed
  `LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED`, mid-string cut never recovered,
  terminated-string envelope recovered byte-exact, budget 475 > 64.

### The general versioned contract

`packages/companion-backend-module-v1/provider-output-budget-v1.mjs`
(`starcraft_tmg_companion_provider_output_contract_v1`,
`companion_output_budget_v2`):

- **Output budget**: derived from the response contract itself — serialized
  sealed-envelope bytes (≈4 bytes/unit + 16 units/channel structure margin)
  plus a bounded 448-unit reply-text floor, clamped to [64, 1024]. For the
  `companion_reply` contract: 475 units. Character-agnostic (channel names
  only); records the superseded flat 64-unit v1 budget and its defect.
- **Classification**: `channel_text` / `output_budget_truncated` /
  `response_json_invalid` / `provider_tool_turn` / `contract_missing_channel`
  / `empty_output`, with truncation diagnostics (budget units, content bytes,
  recovery outcome).
- **Recovery**: strictly structural — an escape-aware JSON string scan
  extracts a channel `text` value only when the string literal is fully
  terminated (outer envelope closers may be budget-cut); a mid-string cut is
  NEVER recovered and nothing is fabricated. Recovery is honestly marked
  (`recoveredFromTruncatedEnvelope`).

No Rules/Authority/match code, no Provider infrastructure file and no
character-specific code was touched. The runner derives the egress profile
through the SAME sealed `createProviderProfile` factory with `outputBudget`
as the ONLY delta (Ticket 16 profile untouched; both hashes recorded in the
report). The epoch-1 flat rejection path is preserved for genuine
non-truncation contract violations (gate phase 4 proves no
misclassification).

### Focused gate (after the final relevant code change) — PASSED

`node scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`
ran once after the verifier phase landed (29 checks / 10 claims / 12
artifacts, reportHash `ea5d3359…d0c7`), and once more after the two epoch-2
pre-dispatch runner repairs changed the hash-recorded runner file (29 checks
/ 10 claims / 12 artifacts, reportHash
`60feabf70651b047a1807597331d43b85bb26f4548bc543db3f932dca5c6a08d`, 39.2s).
Both runs: 0 real Provider calls / ¥0. The new phase
`headless_output_budget_truncation_contract` reproduces the concrete bug
fail-first through the REAL transport + REAL runner adapter and proves: the
64-unit wire cap, typed truncation with budget diagnostics, zero-retry
denominator (second `complete` refused with zero Worker dispatches),
byte-exact terminated-string recovery, no misclassification of non-truncated
invalid JSON, and the live request now carrying the resolved 475-unit budget.

### Epoch-2 pre-dispatch repairs (0 physical calls; lock never claimed)

Two local defects surfaced before any dispatch and were repaired in one round
each: (1) the derived profile version used `+`, which the egress contract's
ID alphabet rejects (`providerProfileRef.version is invalid`); (2) the
runner's failure report swallowed the local error message — it now records a
redaction-checked message. Neither attempt dispatched anything:
`physicalProviderCalls: 0`, the epoch-2 lock file was never created, and no
credential left the Keychain→Worker path. These were pre-dispatch local
repairs, not Provider retries.

### Executed epoch-2 live run (the one authorized repair call)

- Run id `05589b9c-12a2-49cc-bbaf-5381236fd4b1`, started
  2026-09-22T10:17:43Z; report
  `build/ticket-26-slice-266f-live-byok-companion-v1/live-report.second.json`,
  reportHash
  `cf2e24de29e6cfa80216d4f99e1258deda94e268604c1a4616b8a67564de156e`.
  Same secure path as epoch 1: Keychain (attested `/usr/bin/security`, empty
  environment, no shell) → isolated Worker → one HTTPS POST to
  `api.deepseek.com` (TLS verified, DNS pinned, no proxy, no redirect).
  Parent credential buffer asserted zeroed after attach.
- **ONE physical call, HTTP 200, zero retry** (`physicalAttempts: 1`,
  `automaticRetries: 0`, `dispatchAttempts: 1`; the second in-adapter
  dispatch guard and the epoch-2 lock make another call impossible without
  new user authorization).
- **Actual Chinese persona/worldbook-grounded reply**, byte-identical across
  the isolated-Worker output, the server transcript and the rendered DOM on
  desktop AND the 390px resume:
  「指挥官，当前我方Marine与Marauder已部署于左翼，敌方Zergling与Roach在右翼对峙，双方尚未接战；建议先让Marine与Marauder保持距离、利用射程优势待机，同时尽快部署Medic与Goliath以巩固阵线。」
  — grounded in the real two-seat room state (Marine/Marauder vs
  Zergling/Roach dispositions) and Zagara's sealed package worldbook: all
  three character-tier entries fired (`zagara.wb.char`,
  `zagara.wb.swarm_attrition`, `zagara.wb.tmg_context`, `scopeTier:
  "character"`, depth 0). Honest note: the session was fresh, so the
  memory layers had nothing written yet (`layersIncluded: ["worldbook"]`;
  transcript tail carried in the messages) — no memory content was
  fabricated.
- **Usage/cost**: 118,912 input units (896 cache-hit + 118,016 cache-miss) +
  78 output units = 118,990 total. The Provider again reported
  `deepseek-flash` vs the requested `deepseek-v4-flash` (the drift first
  recorded in epoch 1 recurs), so the pinned pricing snapshot refuses an
  authoritative receipt and the report carries an explicitly-labelled
  off-peak snapshot-rate estimate: **$0.026021272 (estimateOnly, not an
  invoice)**; the Provider invoice remains authoritative. Server accounting:
  exactly 1 external network attempt / 1 paid inference
  (`providerAccountingAfter`).
- **Output classification**: `channel_text`, `recoveredFromTruncatedEnvelope:
  false` — the 475-unit budget carried the full sealed envelope (78 output
  units used); no recovery was needed.
- **Detach / no residual worker / zero persistence**: explicit
  `explicit_user_detach` with the `sensitiveBytesZeroed` shutdown
  acknowledgement; worker tombstone `state: "exited"`,
  `credentialPersistence: "none_after_process_exit"`; the worker PID is
  provably gone (`workerProcessExited: true`); parent buffer re-zeroed;
  `rawCredentialPersisted: false`, `credentialHashPersisted: false`; report
  and every artifact scanned for credential-shaped material.
- **Evidence**: `browser-evidence/epoch-2/live-01-desktop-session-open.png`,
  `live-02-desktop-chinese-reply.png` (desktop 1500×1050, the actual reply
  rendered), `live-03-narrow-mobile-resumed.png` (390×844 touch resume,
  zero horizontal overflow) — sha256-indexed in the report.
- **Room safety**: zero Room mutations (mutation-counting facade), state
  revision 0 → 0.

### Honest nonblocking notes (no Critical/High findings opened by 266f.6)

- The Provider-side reported-model drift (`deepseek-flash` vs requested
  `deepseek-v4-flash`) recurred; it is recorded in both live reports and
  degrades pricing to a labelled snapshot-rate estimate. It is a Provider
  reporting fact, not a product-path defect; resolving it belongs to Provider
  profile/pricing-snapshot governance outside this manifest.
- Fresh-session memory layers were honestly empty (nothing written yet);
  layered-memory content was proven in the deterministic gate phases instead.
- Slice accounting: epoch 1 = 1 call, 118,975 units, $0.05240532 snapshot-rate
  estimate; epoch 2 = 1 call, 118,990 units, $0.026021272 snapshot-rate
  estimate; two pre-dispatch local failures with 0 calls. Total live: 2
  physical calls, 237,965 units, ≈$0.0784 estimated. No ¥100 threshold
  crossed. Kimi CLI exposes no token/currency telemetry; no Kimi cost is
  inferred.

## 266f.7 — multi-companion layered-memory continuity live acceptance (2026-09-22)

Manifest continuation from clean `f13252f`: the 1/3/6-companion orchestration
and layered memory had only been proven with the injected deterministic
Provider, and the real BYOK run used one fresh Zagara session with empty
memory layers. This sub-slice closes that gap with ONE bounded real Chinese
TWO-companion conversation (Kerrigan + Zagara, both sealed packages), two
user turns, hard maximum FOUR physical Provider calls, each separately
locked, separately costed, zero automatic retry. User authorization on file
(manifest taskBrief); executed exactly once; never retried.

### Offline seam proofs (0 Provider calls / ¥0)

- Scratch `build/266f-continuity-preflight.mjs` (uncommitted) drove the REAL
  runner adapter (four-call denominator, per-call lock indices) through the
  REAL product stack over REAL durable SQLite: turn 1 (2 calls), chat-tier
  codeword worldbook entry + summary + episodic + relationship writes,
  checkpoint, full companion server/session restart (HTTP listener closed,
  SQLite connection closed, every module/session-runtime structure
  recomposed — the sealed SQLite file is the only companion state carrier),
  byte-identical transcript restore, turn 2 (calls 3–4) with the restored
  layers and the chat-tier entry in BOTH assemblies, fifth dispatch refused
  with zero further Worker calls. It also exposed the one real design
  finding: the room match binding hash is referee-keyed per engine, so a
  recomposed room is a DIFFERENT match and the persisted binding correctly
  refuses it (`COMPANION_MATCH_BINDING_STALE`, proven as a negative check).
  The restart therefore preserves the Room authority instance (a separate
  service) and restarts the companion server/session stack completely.
- New gate phase `headless_live_multi_companion_continuity_seam` proves the
  same seam inside the focused gate with a deterministic fake Worker port.
- Focused gate `node scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs`
  ran once per final relevant code change: 30 checks / 10 claims / 13
  artifacts (reportHash `7c6d09d3…d0c7`→`6d48187b…`→final
  `3eca10014f7597988ad82005d5999e8fe59b52f15735dba5f3474a7d0a9944a4`), each
  0 real Provider calls / ¥0; the report's epoch-3 record is read dynamically
  from the runner's own report (absent → honestly "reserved"; after the live
  run it cites status passed, 4 calls, reportHash `ec11d50c…a371d`).

### Pre-dispatch repair rounds (0 physical calls; no lock ever claimed)

Three local attempts failed BEFORE any dispatch and were repaired one round
each: (1–2) `PRE_SEND_READ_FAILED` — the runner drove its API read while the
chat-section bootstrap was still in flight; the failure report then lacked
diagnostics, so failure reports now carry redaction-checked error details and
raw response excerpts, and a provably pre-dispatch previous failure
(`physicalProviderCalls: 0`, no continuity locks) clears its stale durable
store before a rerun; (3) the instrumented run surfaced the shared root cause
one assertion earlier — the provider-status card was read during its
`loading…` bootstrap state (`LIVE_PROVIDER_STATUS_NOT_HONEST`); the runner
now waits out the bootstrap before reading. All three: 0 dispatches, 0
physical calls, no credential egress, no lock claimed. Run 4 (the first
dispatching attempt) passed end-to-end. The exact run-1/2 server response
body was not captured (instrumentation landed with run 3) — recorded
honestly; the bootstrap-wait repair eliminated the class.

### Executed live run (the four authorized physical calls)

- Run id `fb27f99b-99bb-4074-97b1-15aa0eb4273e`, 2026-09-22T12:24:33Z →
  12:25:12Z; report
  `build/ticket-26-slice-266f-live-byok-companion-v1/live-report.continuity.json`,
  reportHash `ec11d50c9bed274e451951c5656c72049ac14b8a5b1f005b5c62e1db203a371d`.
  Same secure path as epochs 1–2: Keychain (attested `/usr/bin/security`,
  empty environment, no shell) → isolated Worker → four HTTPS POSTs to
  `api.deepseek.com` (TLS verified, DNS pinned, no proxy, no redirect).
  Parent credential buffer asserted zeroed after attach.
- **FOUR physical calls, all HTTP 200, zero retry** (`physicalAttempts: 1`,
  `automaticRetries: 0` per call; dispatch indices locked separately in
  `continuity-call-1..4.lock.json`, O_EXCL, claimed immediately before each
  egress). A rerun now refuses with `LIVE_BYOK_COMPANION_SUCCESS_ALREADY_RECORDED`
  (exit 2).
- **Turn 1** (calls 1–2, deterministic order Kerrigan → Zagara, via the real
  browser UI): the user published the distinctive public plan — codeword
  「霜刃-9」, dawn deployment of two Marine squads to the northern ridge pass
  with Medic escort. Both companions acknowledged AND grounded against the
  real room state (both noted Medic is still in the reserve and must be
  deployed first — a real two-seat room observation). Zagara's three sealed
  character-tier entries fired only on her assembly
  (`zagara.wb.char/.swarm_attrition/.tmg_context`); Kerrigan honestly has
  none. Honest Provider-behavior note: the two turn-1 acknowledgments
  happened to be byte-identical prose; the assemblies were still distinct
  (assemblyHash `151499f2…` vs `9e3912aa…`, worldbook fired differs) and the
  required character-distinctness proof is on the turn-2 recall replies,
  which differ.
- **Memory writes** (real product contracts): the plan as a chat-tier
  worldbook entry `plan-frostblade-9` (keyword 「霜刃-9」, conversation://
  provenance, via the UI), rolling summary v1 (UI, append-only,
  coversTranscriptThrough 3), one episodic fact (UI, authenticated-seat
  provenance), one typed observed relationship event (`personal_shared`,
  trust +1, via the real HTTP memory contract — the UI is intentionally
  read-only there). Counts and provenance recorded in the report.
- **Checkpoint + full restart**: checkpoint `sessckpt-1-f367bfc61536` via the
  UI; HTTP server closed, SQLite connection closed, every companion structure
  recomposed (new listener origin 61393 → 61411); the restarted stack resumed
  the conversation active at turn 3 with the transcript BYTE-IDENTICAL
  (participantId/content/turnHash per message), checkpoint count 1, and all
  memory layers intact. The Room authority instance is provably preserved
  across the restart (match binding hash stable, state revision 0 → 0).
- **Turn 2** (calls 3–4, post-restart, via a fresh desktop page that
  auto-resumed the conversation): both companions recalled and applied the
  plan from the restored layers — Kerrigan: 「霜刃-9」要点 + Medic-then-ridge
  execution; Zagara: same codeword + details with distinct prose. Recall
  assertions per reply: codeword echoed, plan-detail keyword present,
  character-distinct (not byte-identical), assembly layers include
  `rolling_summary` + `episodic_facts` + `relationship_state` + `worldbook`,
  the chat-tier `plan-frostblade-9` entry fired for BOTH companions (scopeTier
  chat), Zagara's three sealed character entries fired again, and each
  assemblyHash advanced past its turn-1 counterpart (memory materially
  entered the context).
- **Byte-identity**: every reply byte-matches across the isolated-Worker
  output, the server transcript and the rendered DOM on desktop AND the
  390×844 touch resume (six messages, zero horizontal overflow).
- **Usage/cost** (per call, DeepSeek-reported): call 1: 118,255+66 units,
  $0.02605966; call 2: 119,135+66, $0.026062412; call 3: 119,243+71,
  $0.026253056; call 4: 120,120+68, $0.026444016. Totals: 476,753 input +
  271 output = 477,024 units, **$0.104819144** — explicitly-labelled
  snapshot-rate estimate (`estimateOnly: true`): the Provider again reported
  `deepseek-flash` against the requested `deepseek-v4-flash` (the drift first
  recorded in epoch 1), so the pinned pricing snapshot refuses an
  authoritative receipt; the Provider invoice remains authoritative.
  Server accounting: 2+2 per composition (module-gateway cumulative honestly
  resets across the restart); the run-level denominator is the adapter
  completion record (4/4).
- **Detach / no residual Worker / zero persistence**: explicit
  `explicit_user_detach` with the `sensitiveBytesZeroed` shutdown
  acknowledgement; tombstone `state: "exited"`,
  `credentialPersistence: "none_after_process_exit"`; worker PID 40410
  provably gone; parent buffer re-zeroed; `rawCredentialPersisted: false`,
  `credentialHashPersisted: false`; the report, all five screenshots and the
  encrypted SQLite artifact scanned for credential-shaped material (and the
  report/artifacts proven free of the per-run SQLite key, which was random,
  memory-only, never persisted).
- **Room safety**: zero Room mutations on the shared mutation-counting facade
  across both compositions; state revision 0 → 0.
- **Evidence** (sha256-indexed in the report):
  `browser-evidence/epoch-3/live-01-desktop-two-companion-session-open.png`,
  `live-02-desktop-turn1-both-replies.png`,
  `live-03-desktop-turn1-checkpoint.png`,
  `live-04-desktop-turn2-recall-after-restart.png`,
  `live-05-narrow-mobile-resumed.png`, plus the encrypted durable store
  `continuity/companion-product.sqlite` (73,728 bytes).

### Slice accounting after 266f.7

Epoch 1 = 1 call, 118,975 units, $0.05240532 estimate; epoch 2 = 1 call,
118,990 units, $0.026021272 estimate; epoch 3 = 4 calls, 477,024 units,
$0.104819144 estimate (all snapshot-rate estimates under the recorded
reported-model drift; invoices authoritative). Slice live total: 6 physical
calls, 714,989 units, ≈$0.1832 estimated. No ¥100 threshold crossed. No open
Critical/High finding. Kimi CLI exposes no token/currency telemetry; no Kimi
cost is inferred.
