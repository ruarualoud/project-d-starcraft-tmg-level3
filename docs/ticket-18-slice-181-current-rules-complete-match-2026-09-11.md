# Ticket 18 / Slice 181 — current-Rules complete-match Harness

Date: 2026-09-11
Status: complete
Ticket progress: `10/11`; project progress: `16/22`

## Outcome

Both directed foundational routes now reach an Authority-declared Round 5
terminal state under the current 912/912 executable catalogue:

- `Terran Armed Forces -> Zerg Swarm`: 81 accepted actions, 33 designated-Agent
  decisions, final score `4-4`, Draw;
- `Zerg Swarm -> Terran Armed Forces`: 81 accepted actions, 30 designated-Agent
  decisions, final score `4-4`, Draw.

Each room loads exactly four accepted objects from the five-Skill pack in order:
general, own Faction, opponent Faction and the matching directed matchup Skill.
These remain advisory; the external Rules runtime owns LegalSpace, Preview,
Apply, chance and terminal state.

This Slice does not create a Terran/Zerg combined Faction Skill. The later
same-Race comparison adds independent `Kerrigan's Swarm` beside the existing
`Zerg Swarm`; the separate Protoss experiment adds independent `Daelaam`.

## Current source and runtime binding

The room now distinguishes the immutable source Rules receipt from the actual
executable runtime identity. The source receipt is
`f069451a...6c13`; the bounded evaluation runtime is
`official_ticket18_complete_match_runtime_v1@1.0.0`, hash
`14ab74df...6f39`, catalogue hash `5b3bd5d6...6d46`. The old compatibility
runtime was not used.

The wrapper composes the unchanged current catalogue and 68-entry FAQ V2
router for the exact Marine/Zergling, Hold Position evaluation fixture. Its
whitelisted LegalSpace covers phase initiative, Hold/Pass, control, scoring,
cleanup, initiative, start-of-round and Round 5 finalization. Unsupported
profiles, statuses and action families fail closed. It is explicitly
`legalSpaceComplete=false`, `productionRoomEligible=false` and
`trainingTruth=false`; it is evidence for this bounded complete-match path, not
a claim that every catalogue executor composes with every army state.

Round 5 follows the current official finalization atoms: highest final VP wins;
the Mission Card tiebreaker applies if defined; otherwise equal VP is a Draw.
Hold Position has no final tiebreaker, so both equal-score fixtures correctly
end as Draws rather than using the between-round initiative Roll-Off.

## Harness evidence

Every accepted action follows:

`read board -> LegalSpace -> exact Skill route -> position assessment -> Preview -> configured human confirmation -> claim control -> Apply -> Replay`.

Checkpointed replay keeps the verification linear enough for full matches while
still proving the final replay state hash equals the current room state hash.
The two trace hashes are `7da63b49...c503` and `a0b85093...597b`.

FAQ 10 is audited when a zero-distance movement intent is represented as Hold.
FAQ 16 is audited during control and scoring so a deactivated marker face is not
mistaken for loss of control eligibility. Battle Workbench snapshots retain
position and score-forecast evidence at each round/phase boundary.

Required Harness fields are present in the report:

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `opponent_prompt`
- `harnessToolsCalled`: board, LegalSpace, Skill route, Preview, confirmation,
  control claim, Apply, Replay, Workbench and Episode trace operations
- `uiTraceEvidence`: Workbench snapshot hashes per round/phase change
- `agentDecisionEvidence`: four-Skill route, LegalSpace and position assessment
  per action
- `memoryTraceEvidence`: no memory promotion in Slice 181
- `trainingTraceCandidates`: empty
- `rollbackOrDemotionRules`: replay mismatch or unsupported scope quarantines the
  trace; the bounded adapter cannot enter production
- `userVisibleChecks`: both directions terminal, supervised actions and
  inspectable Workbench/replay hashes

## Focused verification and limits

Only `node scripts/run-ticket-18-current-rules-complete-match-v1.mjs` was run
after the final Round 5 code change. It passed once with 2/2 terminal matches,
2/2 final replay matches, 2/2 exact routes, FAQ 10/16 evidence and no legacy
compatibility. No previously passing Slice suite was repeated.

The report is
`build/ticket-18-current-rules-complete-match-v1/report.json`, hash
`0e6e78e2...3704`. No source refresh or Provider/model call occurred, and cost
delta is zero. The retained matchup epoch remains `34,120,976` tokens / estimated
CNY `15.721921`; cumulative remains `260,204,060` / estimated CNY `312.143927`.

The actions are deliberately a bounded Hold/Pass baseline, so
`fullGameStrategyEffectivenessProven=false`. Slice 182 must consume these real
complete-match traces for replay-safe reflection, a versioned local SkillOpt
candidate, independent regression, explicit rollback and final separate grades
for Rules correctness, runtime usability, strategy quality and gameplay
evidence.
