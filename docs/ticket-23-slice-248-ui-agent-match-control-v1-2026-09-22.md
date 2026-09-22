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

<!-- Implementation sections, verification receipts, and the claim-to-pixel
     explanation are appended below as the sub-slices complete. -->
