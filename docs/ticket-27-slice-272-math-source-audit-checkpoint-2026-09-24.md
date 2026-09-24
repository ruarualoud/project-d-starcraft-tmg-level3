# Ticket 27 / Slice 272 — revised-plan arithmetic source audit checkpoint

Status: S272 remains open; Ticket 27 is 5/6. This checkpoint does not claim
that a plan is ready for a new Room or that either roster mode has won a match.

## Concrete defect

The saved Standard-2000 locked-plan v4 changed the round-two cumulative VP
target from 3 to 1, but its `scoreRoute.routeText` still said that math receipt
`cca1029bd3916877d56e8d8038daecd06b145ef9b20eacfd7fb6e9b721d0e6aa`
confirmed all deltas were zero. The receipt's original input rows are
`0,3,6,9,12`; the revised plan's target rows are `0,1,6,9,12`. A read-only
assertion on the saved plan and receipt failed at round two (`3 != 1`). The
previous model review did not identify this factual mismatch.

## Scoped implementation and evidence

- `roster-plan-source-audit-v1.mjs` compares cited VP receipt input rows with
  the current plan target rows. It distinguishes a misapplied validation claim
  from an explicitly obsolete historical note; it does not recompute scores,
  decide marker control, change Rules or edit a plan.
- The final-plan reviewer receives the original cited arithmetic rows and
  appends a source-backed High finding for an affirmative but stale validation
  claim. The repair prompt receives the same audit and may remove the stale
  claim or explicitly label it obsolete while keeping the Rules-checked roster
  and arrival schedule fixed.
- Evidence-audit version `1.1.0` causes an old completed model reply to be
  re-audited from its retained public JSON, preserving prior review history.
  This is not another paid model review cycle.
- The single focused saved-case check passed: v4 yields one misapplied receipt
  High; an explicitly obsolete historical note is not blocked. Syntax checks
  passed for the four directly affected modules. The saved v4 workspace was
  re-audited with the retained reply: completed, audit version `1.1.0`, one
  misapplied hash, history retained, **0 new Provider units**.

The current v4 review still has two model-High strategic critiques and the
source-backed High above. It remains quarantined. The next explicit v5 repair
and final independent review are still pending; after that review the
three-cycle convergence limit applies. No Skill is promoted or training trace
admitted by this checkpoint.

## Usage and remaining work

Fixed-preset session remains at **9 Flash calls / 181,048 reported units /
estimated ¥0.373836**. This checkpoint adds 0 calls, 0 units and ¥0. S272
still needs a source-consistent corrected plan, one bounded final review,
actual Bot action/opponent response/replan evidence, matched no-plan versus
locked-plan versus Agent-list comparison, Web handoff and screenshots.

`harnessLoopUsed=true`; `targetGames=[starcraft-tmg]`;
`promptPackRoutes=[ticket27.roster_final_plan_review.v2,
ticket27.roster_strategist.planned_preset.v1]`;
`harnessToolsCalled=[saved workspace read, cited math receipt audit,
retained review replay]`; `uiTraceEvidence=none in this checkpoint`;
`agentDecisionEvidence=saved v4 public route and retained review`;
`memoryTraceEvidence=plan v4 and review history preserved`;
`trainingTraceCandidates=none`; `rollbackOrDemotionRules=source mismatch
quarantines new Room handoff; old outputs stay readable`;
`userVisibleChecks=versioned review finding in workspace projection, no new
Web review control yet`.

`ctx2skillLoopUsed=true`; `roleRoutes=[rule_skill_builder advisory review,
opponent planning pending]`; `skillsRead=[existing same-game general,
Terran faction, Terran-to-Kerrigan matchup routes]`; `skillsGenerated=none`;
`judgeTestsRun=[one focused saved-case source check, directly affected syntax]`;
`crossTimeReplayResult=retained v4 model output re-audited without Provider`;
`promotions=none`; `blocks=[stale VP arithmetic citation, unresolved model
High critiques]`; `remainingRuleGaps=[no new Rules gap asserted; actual marker
control and position/path feasibility remain unproven]`.
