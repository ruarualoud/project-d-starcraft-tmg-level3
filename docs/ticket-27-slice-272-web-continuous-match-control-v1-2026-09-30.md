# Ticket 27 / Slice 272 — Web continuous Agent match control (2026-09-30)

Status: **focused product flow passed; full match and Slice 272 remain open**.
This extends the fresh-E Web journey in
`ticket-27-slice-272-web-fresh-e-room-entry-v1-2026-09-30.md`.

## Player-facing change

The authoritative Room now has a primary **自动对局至终局 / 暂停自动对局**
control. A fresh Web `用此军表开始 AI 对局` launch asks its Room process to
auto-start after the Room and both Agent seats are ready. An already-running
Room may be resumed with the primary Web button. The previous one-action
control remains under **详情** for debugging, not routine match play. Pausing
lets the current paid decision finish through Apply/Replay, then queues no
further action. A failed action, no revision advance, data-wiring blocker or
terminal Room stops the loop; there is no automatic retry of an ambiguous
paid call. The Room authority, legal action selection and Provider budget
remain in the existing orchestrator.

## Actual Web acceptance in the same Room

- The updated Web bundle exported successfully once. The existing fresh-E
  2000/2000 Terran roster and reviewed plan were not regenerated. One Web
  click on the saved journey returned HTTP 201 and resumed **the same** Room
  `ticket23-slice248-aa-t27-72c5bb5295d7d9ce2fca96864429dd16-r2`,
  with plan hash
  `7d6a44b76d6c21ebe16787ba58c95d9ac4c1bb3d563dc61bfb424e25f563c296`.
  It remained at revision 2 and 4 previous Provider calls before auto-start.
- One click of the actual Room Web auto button returned HTTP 202. Without
  further clicks, the Room advanced revisions **2 → 3 → 4 → 5**: Terran
  Goliath deploy, Terran finish activation, Zerg 18-model Raptor deploy.
  All three normal jobs completed with zero blocking findings and sealed
  Apply/Replay; this is not a simulated sequence.
- The Web pause click returned HTTP 202 while job 3 was running. Status was
  `pausing` with exactly that job in flight, then `paused` with
  `USER_PAUSED_AFTER_CURRENT_ACTION`. The Room stayed at revision 5 with
  job 3 completed and no job 4 after a later read. The page displayed
  `自动对局: 已暂停` and revision 5.
- E cost rose from ¥0.328407 / 4 calls / 237,272 units at revision 2 to
  **¥2.214038 / 22 calls / 1,670,887 units** at revision 5; this is an
  estimate from Room receipts, not an invoice. The auto-control experiment's
  incremental cost was ¥1.885631. C, D and no-plan A remain separately
  accounted; no lane crossed its next ¥100 notice threshold.

Evidence screenshots:
`build/ticket-27-slice-272-web-autoplay-v1/auto-control-before.png`,
`auto-control-started.png`, `auto-control-pausing.png`, and
`auto-control-paused-r5.png` in the same build directory. The authoritative
Room manifest has revision, status, accepted transitions, seat/Provider
usage and receipt counts. The browser harness had a selector typo **after**
the launch HTTP 201 response; it did not alter or repeat the product launch.

## Remaining delivery

This proves continuous Web control and safe pause, **not** a terminal
2000-point match. Fresh-launch auto-start is wired in the process host but
the runtime proof used a resumed Room and its Web start button. The Room
startup is still synchronous and slow, and the no-plan A arm still has a
High `LIVE_DECISION_ACTION_DID_NOT_CONVERGE` at round 4/action 48. Finish
the plan/no-plan matches, inspect strategy and training export, then close
S272 only after the entire roster→plan→match path is genuinely usable.

## Harness evolution record

- `harnessLoopUsed`: true; `targetGames`: `starcraft-tmg`.
- `promptPackRoutes`: unchanged live Flash Room planner/action route with
  general, Terran and Terran→Kerrigan Swarm Skills; no prompt text changed.
- `harnessToolsCalled`: Web roster resume, Web Room auto start/pause,
  authoritative manifest, ordinary orchestrator action and Rules Apply/Replay.
- `uiTraceEvidence`: the four screenshots above, plus Web HTTP 201/202
  responses; the pause screenshot shows the live operation panel.
- `agentDecisionEvidence`: accepted Terran deploy/finish and Zerg 18-model
  deploy at revisions 3–5; strategy quality is not inferred from legality.
- `memoryTraceEvidence`: the original reviewed pregame plan hash and Room
  continuity were retained; no new long-term memory promotion claimed.
- `trainingTraceCandidates`: revisions 3–5 are candidates only; the match
  is nonterminal and `trainingTruth=false`.
- `rollbackOrDemotionRules`: on a failed/no-progress/high action, stop and
  retain checkpoint/receipts; no retry or training promotion. User pause
  waits for the current action's sealed receipt.
- `userVisibleChecks`: same Room ID, 2000-point saved plan, primary automatic
  control, three successive revisions without further clicks, paused stable
  revision, visible per-Room cumulative cost.

## Same-Room continuation after this checkpoint

The earlier r5 pause was resumed with the primary Web control. It reached
r21 in round 1 Movement before a High decision stop. A saved paid Planner
reply was falsely rejected because our outgoing Goliath fire was treated as
incoming enemy fire; the targeted local proof failed first and then passed
after the incoming-target check required an own/allied target. At r21 the
Action reply predicted a generic Zerg reserve deployment but incorrectly
filled its exact actor field with the already-on-table Swarmling. A second
saved-reply proof failed first and then passed: the generic prediction keeps
its text and counter-plan, while only the impossible exact actor is cleared
when the model itself acknowledges that actor is on table and authoritative
observation contains other opponent reserves. A prediction explicitly naming
the impossible actor in its action text remains blocked. The same proof found
that three earlier Planner corrections were exhausting Action's first
correction; the live budget now uses its stage-local counter, retaining the
global counter for audit and the legacy fallback.

The old E Room process was stopped only when idle, and the same saved Web
journey relaunched **the same Room ID and r21** through `/army`. The actual
Room Web auto button returned HTTP 202. Local revalidation accepted the six
previously paid r21 attempts (no seventh attempt for that decision), then
sealed Rules Apply/Replay for **r21→r22**, a Terran Marine Stimpack active
ability with a tactical-card payment. The automatic queue immediately moved
to its next ordinary action. This proves the repair in a live Web Room, not
terminal match completion or the strategic merit of Stimpack. E's cumulative
cost immediately before continuation was ¥17.053633 / 83 Provider calls /
7,192,346 units; subsequent calls belong to later decisions, not the r21
local replay. No training truth is promoted. The independent no-plan A Room
also resumed from its saved r49 Action after a focused, zero-Provider
reason-reconciliation repair and advanced to r50; its continuous Web runner
remains separate.
