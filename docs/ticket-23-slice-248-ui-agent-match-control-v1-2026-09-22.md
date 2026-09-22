# Ticket 23 / Slice 248 — Formal Agent-match Web control surface (UI)

Owner: Kimi · Worktree `.worktrees/ticket-23-slice-248-ui-agent-match-control`
Base: `fc463d2a4349f16058b1478b7667cf5c69bb9ee9` · Date: 2026-09-22
Slice manifest: `.agent-runtime/slice.json`
(`ticket-23-slice-248-ui-agent-match-control`)

## Scope and invariants honored for the whole slice

- Presentation and browser interaction only. No change to Rules, Authority,
  Client Domain, Provider, memory, source-data, action contracts, Room state,
  or server endpoints. `packages/`, `scripts/serve-*`, and every other backend
  file are untouched; the browser gate re-proves zero backend drift against
  the slice base.
- Codex owns the backend contract; this slice codes defensively against it:
  `GET /__ticket23/a2a/ui-status` → `{ok, job, manifest}`;
  `POST /__ticket23/a2a/ui-drive` queues exactly one authoritative Agent
  action. Both are same-origin, credentials-included, and exist only on the
  local formal-evidence server.
- The UI never recalculates legality, probability, data wiring, strategy or
  cost; it renders server-provided values verbatim (cost micros → ¥ display
  division only). Pixels, colors and labels are never gameplay truth.
- No cookie, token, credential, or raw model chain-of-thought is read or
  rendered. The page never sees a credential; the browser sends the ambient
  same-origin session itself.
- No Provider call, no paid endpoint, no source refresh, no Git push.

## Current-state audit (performed before editing)

- `app/(tabs)/match.tsx` renders four surfaces (Battlefield / Maps / Room &
  rules / Review & Skill). The battle surface stacks
  `AuthoritativeBattleWorkspace` (the board) then
  `HostedOpponentOperationsPanel`.
- The StarCraft UI language: dark navy shells (`#090d14`–`#0f172a`), cyan/sky
  accents (`#38bdf8`, `#0ea5e9`), amber warnings (`#fbbf24`), red failures
  (`#ef4444`), uppercase tracked eyebrows, 44px-min touch targets, zh/en via
  `useI18n()`.
- The formal server (`scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs`,
  read-only reference) exposes the job lifecycle
  `queued → running → completed|failed`, typed `failure.{code,message,severity}`,
  and a manifest with `room.stateRevision`, `state.{round,phase,activeSideKey,
  terminal,gameOver}`, `usage.{providerCalls,totalUnits,estimatedCostCnyMicros}`,
  `recentAcceptedTransitions` (public receipts with `action` +
  `postStateRevision`), model/skill evidence and the data-wiring audit.
- Existing browser verifier pattern (Slice 262 harness): worktree web export +
  read-only demo room + one loopback origin + Playwright Chromium at
  1500×1050 and 390×844 with reduced motion, hashed PNG/report evidence under
  `build/`.

## Frozen numbered frontend sub-slice plan

1. **SS-1 — Audit and plan freeze (this section).** Study the Match page,
   battlefield workspace, hosted-opponent panel, UI language and the Slice 262
   verifier; record the UX design below before any code.
2. **SS-2 — `AgentAgentMatchControl` component + Match-page mount.** New
   `components/battlefield/agent-agent-match-control.tsx` mounted on the battle
   surface directly below the battlefield workspace (board stays first and
   unobstructed). Implements the interaction design below.
3. **SS-3 — Focused real-browser verifier.**
   `scripts/verify-ticket-23-slice-248-ui-agent-match-control-v1.mjs`:
   worktree web export, read-only demo room, same-origin **mocked** ui-status /
   ui-drive endpoint pair driven through every scenario, desktop + 390px
   journeys, hashed screenshots and machine-readable report under `build/`.
4. **SS-4 — Gates, evidence, closure.** Run the two declared verification
   commands once after final relevant code; record receipts, commit hashes,
   changed files and the claim-to-pixel explanation in this document.

## UX design (frozen in SS-1, implemented in SS-2)

**Placement.** The control is a compact command strip rendered inline on the
battle surface immediately below the authoritative battlefield workspace and
above the hosted-opponent panel. It never overlays the board. Desktop
(≥768px) shows the full strip; narrow/touch (<768px) shows a one-line summary
plus an expand toggle that opens the detail zone **inline** (pushing content
down, never covering battlefield interaction).

**Information architecture (progressive disclosure).**

- Always visible (summary row): preflight/data-gate chip, Agent run-state
  chip, round · phase · active side, and the single action button.
- Detail zone (desktop: visible; narrow: on expand): usage
  (Provider calls, total units, estimated ¥), room `stateRevision`, the last
  accepted action (public receipt action + post-state revision), data-gate
  detail (status, blocking finding count, audit hash), and model/Skill
  evidence references (identifiers/hashes only, never raw model content).

**State separation.**

- *Preflight / data gate* is visually separate from *Agent run state*: the
  gate chip answers "is the evidence chain sound?" (passed = cyan; blocker =
  amber/red with the blocking finding count and an explicit banner), while the
  run chip answers "what is the Agent doing?" (idle/ready, queued, running =
  "Agent thinking", applied/completed, failed, match terminal).
- A data-gate blocker (`blockingFindingCount > 0`, a non-passed audit status,
  or a missing audit) visibly prevents execution: the action button is
  disabled and the banner explains why in player language. Fail-closed like
  Rules.
- A terminal/game-over state disables the button with a "match complete"
  explanation.
- A typed job failure renders a visible failure card (code + severity) and
  re-enables the button so the user can deliberately retry — visible recovery.

**Action semantics.**

- One button, stable `testID="agent-agent-drive-next"`, root
  `testID="agent-agent-match-control"`. The label and helper copy state what
  will happen *before* activation: queue exactly one authoritative
  Agent-vs-Agent action for the active side; a Provider call and cost may
  accrue; Apply/Replay stays server-side.
- Each activation sends **one and only one** POST: an in-flight ref guards the
  handler, and the button is disabled while the local request is in flight or
  the server job is queued/running. Status polling (GET every 2.5s) never
  submits; it only reads.
- After a POST the control refreshes status immediately; when the job
  completes, the accepted action and room `stateRevision` visibly advance.

**Hidden on normal servers.** If the initial GET returns 403/404 (normal
product server), the control unmounts itself silently — no banner, no console
noise, no product error — and stops polling. Other transient read failures
keep the last good render with a quiet "status unavailable" note; they never
look like a product fault.

**Accessibility.** No animation at all (reduced-motion safe by construction);
all controls are `accessibilityRole="button"` with disabled/busy state, 44px
minimum targets, keyboard-operable via standard focus; the run-state and
failure zones use polite live regions; zh/en copy via `useI18n()`; the board
remains the visual focus (the strip is low-contrast chrome, not a hero).

---

## SS-2 — Component and Match-page mount (implemented)

`apps/starcraft-tmg-expo/components/battlefield/agent-agent-match-control.tsx`
(new, 516 lines with the mount edit) implements the frozen design exactly:

- Same-origin `fetch` with `credentials: "same-origin"` against
  `GET /__ticket23/a2a/ui-status` (poll every 2.5s, reads only) and
  `POST /__ticket23/a2a/ui-drive` (single action per activation). The
  component never sees a cookie, token, credential, or raw model content; it
  renders server-provided values verbatim (cost micros ÷ 1e6 for ¥ display
  only) and computes nothing about Rules, legality, probability, wiring,
  strategy or Room state.
- **Hidden on normal servers:** the first 403/404 flips a `hiddenRef`,
  unmounts the control silently and stops polling. No banner, no product
  error. Transient read failures keep the last good snapshot with a quiet
  note.
- **Fail-closed data gate:** absent audit, non-passed status, or any
  `blockingFindingCount > 0` disables the drive button and shows the amber
  blocker banner with the finding count. The gate chip (preflight) is a
  separate zone from the run chip (Agent state).
- **Run states:** ready / queued / thinking… / applied / failed /
  Match terminal, each with distinct copy and color; terminal disables the
  button; failure shows code + severity and re-enables the button for a
  deliberate retry (visible recovery).
- **Exactly one POST:** `driveInFlightRef` guard + disabled-while-busy button
  (local in-flight OR server queued/running). After a POST the status is
  refreshed immediately; applied jobs visibly advance `State revision` and
  `Last accepted`.
- **Layout:** inline strip mounted in `match.tsx` between
  `AuthoritativeBattleWorkspace` and `HostedOpponentOperationsPanel` — the
  board stays first and uncovered. Desktop (≥768px) shows the summary row +
  fact chips with a Details disclosure for audit/model/Skill evidence; narrow
  (<768px) starts collapsed to the summary row and expands inline. No
  animation anywhere (reduced-motion safe), 44px targets, button/disabled/
  busy/expanded accessibility states, polite live region on failure, zh/en
  copy. Stable testIDs: root `agent-agent-match-control`, action
  `agent-agent-drive-next` (plus `agent-agent-data-gate`,
  `agent-agent-run-state`, `agent-agent-state-revision`,
  `agent-agent-last-action`).

## SS-3 — Real-browser verifier (implemented)

`scripts/verify-ticket-23-slice-248-ui-agent-match-control-v1.mjs`:
slice-scope assertion (only the four allowed paths changed vs base; zero
`packages/`/`content/` drift), byte-parity hash check of every loaded backend
module (all `identical`), worktree web export, read-only demo room from the
unchanged legacy ticket-14/15/262 factory, and a scenario-driven in-process
**mock** of the two A2A endpoints on the same loopback origin. Real Chromium
(reduced motion, en-US) at 1500×1050 and 390×844-touch drives 13 assertions
and 8 hashed PNG frames into `build/ticket-23-slice-248-ui-agent-match-control-v1/`.

## SS-4 — Verification receipts

| Gate | Command | Result | Covers |
| --- | --- | --- | --- |
| Expo frontend TypeScript contract | `COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec tsc --noEmit` | exit 2 — **49 errors, all pre-existing at the clean base** (see concern C-1); zero errors in slice-owned files | SS-2 |
| Real-browser formal Agent match control | `node scripts/verify-ticket-23-slice-248-ui-agent-match-control-v1.mjs` | **PASS** — 13 checks, 8 artifacts, reportHash `952f5fa4e6af5f5d6ea8d9cb05ffdfc21bfa47ed8d37c0832b18409fe6cc378e`, 0 Provider calls / ¥0 | SS-2, SS-3 |

Browser-gate run history (each failure implicated only the verifier's own
calibration; each repair converged its check, which never regressed):

1. Attempt killed by the 300s tool ceiling during `expo export` — no verdict.
2. `BOARD_NOT_VISUAL_FOCUS`: desktop board-top bound copied from the narrow
   journey (actual 675px, limit 500px). Repair 1 (`9240ae6`) bound it to the
   1050px desktop viewport.
3. `NARROW_EXPAND_MOVED_THE_BOARD`: Playwright's tap center-scrolls its
   target, so the board's viewport box moved while its layout did not.
   Repair 2 (`5c4792c`) measures at the natural scroll top (Slice 262
   lesson) and adds a strip-below-board-bottom geometry assertion.
4. `no_unexpected_browser_errors`: Chromium logs the optional-endpoint 404
   probe as a resource error — that 404 is the asserted normal-server
   behavior. Repair 3 (`a11cd24`) allowlists only that exact probe URL.
5. PASS (13/13). Post-pass diff inspection found the desktop evidence frames
   were first-viewport captures with the strip below the fold (captions
   overstated frame content). Repair 4 (`e8e9c8d`) scrolls the strip into
   every control frame and rewrites the affected captions; one final run
   after that relevant change: **PASS 13/13** (receipt above).

Passed checks: `stable_test_ids_present`,
`ready_state_shows_gate_context_usage_and_last_action`,
`desktop_layout_keeps_board_visual_focus`,
`drive_posts_exactly_once_and_stays_disabled_while_busy`,
`applied_state_refreshes_revision_usage_and_last_action`,
`data_gate_blocker_visibly_prevents_execution`,
`typed_failure_recovers_visibly`, `terminal_state_disables_drive`,
`narrow_layout_compact_with_board_visible_no_overflow`,
`narrow_expand_is_inline_and_preserves_board`,
`narrow_touch_drive_posts_exactly_once`,
`hidden_on_normal_server_without_alarming_error`,
`no_unexpected_browser_errors`.

## Claim-to-pixel explanation

| Claim | Proof |
| --- | --- |
| Control exists only on the formal-evidence server | `hidden_on_normal_server_without_alarming_error` + `08-normal-server-hidden.png`: no control pixels, no A2A copy, no product error after >2 poll cycles on a 404 server |
| Board stays the visual focus (desktop) | geometry assertion (560px board above the 101px strip, zero overlap, first viewport) + `01-desktop-ready-command-strip.png` (the compact strip framed below the workspace) |
| Preflight/data-gate visibly separate from Agent run state | ready/blocked checks + `01` vs `04` frames: gate chip + amber banner are distinct zones from the run chip |
| One activation = exactly one POST, locked while busy | POST counter stayed 1 across force-click + DOM dispatch while running, desktop and touch; `02-desktop-running-thinking.png` shows the disabled busy button |
| Accepted action and room revision refresh after apply | `03-desktop-applied-refresh.png`: revision 9→10, last accepted `omega_network → r9` becomes `ventral_sacs → r10`, usage 20→21 calls / ¥1.338574→¥1.503445 |
| Data-gate blocker visibly prevents execution | `04-desktop-blocked-gate.png`: banner with blocking count + disabled button; forced clicks produced zero POSTs |
| Typed failure recovers visibly | `05-desktop-failed-recovery.png`: failure card with `LIVE_DECISION_ACTION_DID_NOT_CONVERGE` / severity High and the re-enabled retry button |
| Narrow/touch is compact, inline, non-covering | `06-narrow-collapsed.png` (one-line summary) + `07-narrow-expanded.png` (inline detail); geometry proves no horizontal overflow and a pixel-identical board after expansion |

## Commits (scoped, not pushed)

1. `956607d` — SS-1: frozen audit + numbered UX plan (this document).
2. `739e1e4` — SS-2: `AgentAgentMatchControl` + battle-surface mount.
3. `e2f10c6` — SS-3: real-browser verifier with mocked A2A endpoints.
4. `9240ae6` — browser-gate repair 1 (desktop viewport bound).
5. `5c4792c` — browser-gate repair 2 (natural-scroll measurement).
6. `a11cd24` — browser-gate repair 3 (asserted 404-probe allowlist).
7. `e8e9c8d` — browser-gate repair 4 (evidence-frame capture of the strip).
8. final — SS-4: this closure section.

## Changed files (exactly the allowed paths)

- `apps/starcraft-tmg-expo/app/(tabs)/match.tsx` (import + one mount line)
- `apps/starcraft-tmg-expo/components/battlefield/agent-agent-match-control.tsx` (new)
- `scripts/verify-ticket-23-slice-248-ui-agent-match-control-v1.mjs` (new)
- `docs/ticket-23-slice-248-ui-agent-match-control-v1-2026-09-22.md` (this file)

Generated evidence (git-ignored):
`build/ticket-23-slice-248-ui-agent-match-control-v1/browser-report.json` +
8 hashed PNG frames.

## Unresolved concerns

- **C-1 (pre-existing, not caused by this slice, not repairable within the
  allowed paths):** the declared `tsc --noEmit` gate exits 2 with 49 errors in
  `components/character/*` and
  `components/battlefield/authoritative-battle-workspace.tsx`. The failure set
  is byte-identical on the clean base commit `fc463d2` (verified by running
  the same command in the clean main checkout and diffing outputs), so the
  slice introduces **zero** TypeScript errors; repairing the implicated files
  is outside this manifest's allowed paths. Flagged for Codex/integration.
- No Critical/High concern is open against this slice's own files; the browser
  gate proves zero backend drift, 0 Provider calls, no rendered credentials,
  no raw model content, and `trainingTruth: false`.
