# Ticket 27 / Slice 271 — Teach workspace integration checkpoint

Status: code integration checkpoint; **S271 remains open (High)**. Ticket 27
is 4/6; S271 and S272 remain. Ticket 23 is 33/36. This work is isolated on
`codex/ticket-27-slice-271-fresh-plan`, based on mainline `cbe4816` plus the
committed K3 S271 branch; no K3 files or dirty mainline work were overwritten.

## Product sequence

K3's original workspace used only the old three-round Roster Strategist:
Foundation → proposals → comparison/selection. That did produce a public
RosterPlan, but did **not** invoke the independent Teach Challenger/Student.
The mainline runtime already had explicit Teach ports and planned-preset v2;
the workspace service did not pass them. New Agent sessions now select
`agent_teach_v1`: Skill/mission/Rules menu → small victory route Foundation →
independent Teach challenge and evidence → revised small plan → Rules-checked
model/composition/card proposals → comparison, component purposes, deployment
and final RosterPlan. Persisted old sessions without `planningMode` retain
`agent_legacy_v1` for byte-identical replay.

An existing Builder list can enter `sessions/preset` and becomes a Rules-
verified immutable list with a new `no_pregame_plan` baseline. Its route is
Foundation → Teach → `preset_plan_deepening`: no model reselection. After a
manual edit to an Agent-built list, the old plan is historical; a separate
`lock-and-replan` session uses the exact current Rules-legal list, linked by
`sourcePlanHash`. No model call occurs when creating that session. V1 and
planned-preset v2 plans are parsed/serialized by their own frozen contracts.
The Web/App screen exposes both routes and the Teach round names. The preset
paste entry currently accepts Builder candidate JSON; a polished native
builder-to-workspace transfer remains product work.

## Concrete bug and local evidence

Retained K3 paid draft `rws-2ecdd28c-1b9b-45c3-80f4-e1201b72aca1`:
structured plan 5 units, audit `c7239c1e…`; edited working list 4 units,
audit `dcd5fc4c…`. Old `revisePlan` only changed text but cleared stale.
New `workingMatchesPlan` compares the Rules audit and exact candidate input;
`revisePlan` refuses a stale list **before** Provider availability/dispatch.
The legacy plan remains intact. A locked replan uses the already verified
Builder bridge. A planned-preset locked list is immutable in this workspace;
switching its composition requires a new session.

The bug-specific regression used the retained 247 KB draft against the real
official-source Builder and frozen laboratory. It passed: stale=true,
prose-only revision rejected, 4-unit lock created, secret-free locked-draft
export/import round-trip, direct preset entry, new Agent Teach default.
Evidence: `build/ticket-27-slice-271-codex-integration/
stale-roster-teach-route-regression.json`. **0 Provider calls, 0 new model
units, ¥0.** Service/HTTP/verifier JavaScript syntax and the two changed
TypeScript file syntaxes passed. Full Expo `tsc --noEmit` was unavailable in
the isolated worktree because dependencies are absent there; no install was
performed. No unrelated gate was rerun.

## Open High acceptance items

1. The normal Web server mounts the workspace with
   `deliberationFactory:null`. K3's live Keychain→Worker factory exists in
   its isolated browser verifier, not in the product server. Therefore the
   normal Web/App Generate control honestly says unavailable; S271 cannot be
   called user-ready until a secure production adapter is attached.
2. Run one **fresh** Flash Teach Agent list and one locked-list plan through
   the Web UI, then inspect the actual round order, Rules audit, plan/list
   semantic consistency, public strategic quality, redacted receipts and
   cost. No retained old three-round reply can prove the new five/four-round
   route. The old verifier's historical acceptance assertions must not be
   reused as closure for this changed behavior.
3. Builder upgrade selections using
   `purchasableUpgradeProfileId`/explicit nominated-model fields are not yet
   representable in the frozen preset recipe (`upgradeNames` only). The
   bridge rejects these typed instead of silently dropping an upgrade;
   extend the versioned recipe before claiming arbitrary prebuilt rosters.
4. Browser check the new stale/replan control, Teach timeline and locked
   roster presentation at desktop and mobile widths. A focused local service
   regression does not prove UI usability.

S272 remains the fresh roster/strategy-quality A/B comparison and a real
Room→TurnPlan battle carryover, not merely a retrospective document.

## Harness/evolution boundary

- `harnessLoopUsed`: S271 local Rules+Skill+Teach integration checkpoint;
  no training promotion.
- `targetGames`: StarCraft TMG Standard-2000; official frozen source cache.
- `promptPackRoutes`: Agent Teach default, locked-preset Teach/deepening;
  legacy historical replay unchanged.
- `harnessToolsCalled`: read-only Army Builder and frozen pregame laboratory;
  regression created no live Room and no Provider calls.
- `uiTraceEvidence`: old K3 screenshots are historical; new UI route awaits
  a fresh browser trace.
- `agentDecisionEvidence`: retained old three-round plan is invalid for the
  edited list; new route not yet model-executed.
- `memoryTraceEvidence`: sourcePlanHash preserves lineage; TurnPlan battle
  memory is not tested here.
- `trainingTraceCandidates`: none; retained stale prose must not train.
- `rollbackOrDemotionRules`: keep old sessions on legacy replay; do not
  attach stale plans to Bot/Room or promote them as Skill evidence.
- `userVisibleChecks`: typed stale warning, fresh locked-replan action,
  preset paste entry, Teach round labels; browser verification pending.
