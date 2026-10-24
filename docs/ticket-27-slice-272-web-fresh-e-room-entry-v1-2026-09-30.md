# Ticket 27 / Slice 272 — fresh Web roster-to-Room acceptance (2026-09-30)

Status: **partial product acceptance, Slice 272 open**. This is the actual Web
product path, not a substitute CLI roster or a completed match.

## What a player can do now

From `/army`, the user can start an AI iterative Terran Armed Forces roster
against Kerrigan's Swarm, obtain a Rules-legal **2000/2000** roster with ten
Units on the frozen Lost Temple / Hold Position context, run the four-round
locked-roster Teach plan, view a seven-shard source review, and click **用此军表开始
AI 对局**. The real Web request returned HTTP 201 and opened authoritative Room
`ticket23-slice248-aa-t27-72c5bb5295d7d9ce2fca96864429dd16-r2`, binding
plan hash `7d6a44b76d6c21ebe16787ba58c95d9ac4c1bb3d563dc61bfb424e25f563c296`.
Both Bot seats were `active/attached_authority_verified`; both Flash Provider
stacks were `open`; data-wiring audit passed with zero blockers. The Room Web
page displayed the board, roster/reserve count and frozen map. One Web click
applied Rules-owned `resolve_mission_start_of_round` (revision 1, no Provider).
A second Web click obtained a genuine Terran model decision to
`choose_first_actor(player1)` and applied/replayed it at revision 2 with zero
blocking findings. Its public trace continued the pregame marker 1/3 and
central-approach plan, anticipated a Zerg reserve deployment, recorded a
counter-response and replan conditions, and cited the general/Terran/matchup
Skills. This is a real plan-guided decision, **not** proof of superior strategy
over the no-plan arm.

## Exact limitations and next delivery

- The Room currently requires a Web click per Agent action. `自动执行: yes`
  means the machine action is applied without human approval, not that the
  full agent-vs-agent match automatically advances. A user-facing continuous
  start/pause flow is still required; the current debug drive control is not
  the complete self-play product.
- Web Room startup took over five minutes, timed out the initial browser
  wait, and eventually succeeded. Return a durable job/progress response
  immediately and perform Room preparation asynchronously; avoid redundant
  data/bridge reconstruction where its source identity is already frozen.
- The source review recorded **0 Critical/High, 54 Medium, 7 Low**. Medium
  findings remain tracked, including unsupported tactical assumptions and
  narrative scoring/route caveats; a clean blocking result is not a strategy
  quality verdict. The page still displays an older iterative-review blocker
  beside the newer clean Teach review, which is misleading UI state.
- The revision-2 public reasoning correctly distinguishes that marker VP
  starts later, but one sentence overgeneralizes this as "No VP is scored in
  round 1"; the official task may score destroyed Supply. The phase-control
  choice was legal, while that explanation needs a later strategy/source
  reflection check instead of a prompt hard-code.
- The new match is only at revision 2, round 1 Movement, score 0:0. No
  complete-match, combat, multi-round plan retention or terminal training
  export claim is made. The separate no-plan arm stopped at round 4 Movement,
  action 48, `LIVE_DECISION_ACTION_DID_NOT_CONVERGE` (High); preserve its
  checkpoint and diagnose that exact decision before continuing it.
- The current Lost Temple Room has nine authoritative tabletop terrains.
  This is one certified route context, not acceptance of all 20 maps or proof
  that every background art contour is Rules geometry. T24 remains 53/75.

## Reproduced engineering faults fixed in this worktree

1. Paid Teach returned source-bound but sparse Foundation revisions. A
   source-bound restoration kept initial Foundation sections, applied each
   challenge's revised text to its exact target, and preserved strict Teach
   semantic validation. Its original paid output then replayed without new
   Provider calls.
2. Failed Teach sessions were undiscoverable by their iterative journey
   because no promoted plan ID existed yet. The projection now exposes the
   frozen baseline plan ID and retained reply count; safe resume uses the
   same Teach session and replays paid replies.
3. A paid `componentPurposes` output used a selected Unit instance ID as the
   record key for 30 composition/upgrade rows. Only exact Unit-parent aliases
   are normalized to that Unit's Rules-locked record key; unrelated IDs stay
   rejected. The saved paid output passed focused revalidation.
4. Web Room preflight incorrectly required `planVersionHistory[0]` for a
   first-pass plan. The valid unrevised history is empty; the existing
   revision-lineage verifier still checks its exact initial hash/version.
5. Room admission expected the retired `missionScoringSourceAudit` field,
   while current V3 review produces `sourceAudit`. Admission now recomputes
   the current source audit from stored tool receipts and compares the
   plan's mission scoring profile hash with official Rules authority. The
   saved review's source audit matched; it had 0 unresolved High.
6. A failed Room startup had left an unrecoverable launch key. The same key
   now retains the failed attempt and retries in a distinct directory only
   after the failed child is no longer live. The successful attempt is `r2`;
   failed `r1` data was not overwritten.

Focused verification: the exact retained paid Teach reply and 30-row
parent-alias case were checked once at their changed seams; then the real Web
UI generated/resumed/reviewed the preserved session, clicked Room launch, and
performed the two Room actions. No full unrelated suite or duplicate paid
generation was run. The first launch failed at the empty-history preflight;
the second exposed the retired review field at Room admission; the third
passed with the safe attempt-2 retry. No fourth review/repair cycle was used.

## Evidence and accounting

- Web clean review and launch affordance:
  `build/ticket-27-slice-272-web-fresh-e-v1/launch-button-visible.png`
- Web launch success: `build/ticket-27-slice-272-web-fresh-e-v1/after-launch-review-fix-click.png`
- Room visible: `build/ticket-27-slice-272-web-fresh-e-v1/room-authority-visible.png`
- Revision 2/first actual model decision:
  `build/ticket-27-slice-272-web-fresh-e-v1/revision-2-first-ai-decision.png`
- Room launch registry: `build/ticket-27-slice-272-web-fresh-e-v1/workspace-data/room-launches/72c5bb5295d7d9ce2fca96864429dd166ca20738ec6f023d55edad4aeaeda1c2.json`
- C (fresh iterative writing): 9 paid retained replies, estimated **¥0.353**
  under the frozen off-peak pricing snapshot. D (Teach + source review): 11
  paid replies, 214,862 input + 48,361 output units, conservative all-miss
  estimate **≤¥0.490**. E (new Room): 4 Flash calls, 237,272 units, current
  Room estimate **¥0.328407**. These are separate internal estimates, not
  Provider invoices. The older no-plan A arm's current incremental estimate
  is **¥34.085749**, separately accounted; none has reached its next +¥100
  notification threshold.

## Harness evolution record

- `harnessLoopUsed`: true; `targetGames`: `starcraft-tmg`.
- `promptPackRoutes`: iterative roster Foundation/Teach/V3 source review;
  live Room `selfplay_agent_prompt` with general-rules, Terran faction and
  Terran→Kerrigan Swarm matchup Skill references.
- `harnessToolsCalled`: Web roster/session/launch, authoritative Room
  manifest, Web Agent drive, Rules Apply/Replay and read-only trace/receipt.
- `uiTraceEvidence`: the four screenshots above; `agentDecisionEvidence`:
  revision-2 `choose_first_actor` public trace and verified Apply receipt.
- `memoryTraceEvidence`: the first model plan revision explicitly carries the
  pregame marker/arrival route, opponent hypothesis and replan triggers;
  multi-round persistence is not yet proven.
- `trainingTraceCandidates`: none promoted; the match is nonterminal and
  `trainingTruth=false`.
- `rollbackOrDemotionRules`: preserve failed startup and no-plan High
  checkpoint; do not promote Skill/training data or auto-retry a failed model
  action without a cited, Rules-checked correction.
- `userVisibleChecks`: Web 2000-point roster, plan, source review, Room
  launch, two active seats, board, first deterministic and first live model
  action passed; continuous self-play and match completion remain open.
