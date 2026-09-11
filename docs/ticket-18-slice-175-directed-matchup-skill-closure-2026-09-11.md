# Ticket 18 / Slice 175 — directed matchup Skill closure

Date: 2026-09-11

## Outcome

Both directed matchup artifacts are now formal offline advisory Skills. Together
with the already finalized general, Terran Armed Forces and Zerg Swarm Skills,
the foundational pack is `5/5` offline and `0/5` runtime accepted.

| Direction | Skill id | Content hash |
| --- | --- | --- |
| Terran Armed Forces → Zerg Swarm | `starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm` | `3ddf4221b8e21e36ddc0a59991aae536fe397eaf9107ec61ca70b73bef8fafee` |
| Zerg Swarm → Terran Armed Forces | `starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces` | `f843dd8a3493c0db6a004274c2febd8a179e720cd319ff004e5cba2ccc990a19` |

Both bind the accepted general Skill plus the exact two faction Skill hashes.
They are `offline_candidate`, cannot affect Rules, are unpublished, and are not
training truth.

## Independent checks

The independent Host audit re-resolved `110/110` declared strategy fields over
two directions, five axes per direction and eleven fields per axis against the
frozen Core, FAQ and current-data bundle. Model review produced no remaining
open or uncertain item, but that does not prove full-game optimality.

Four synthetic player-view cases were executed through Rules-owned LegalSpace,
Preview, explicit confirmation, Apply and Replay: two development and two
held-out cases. All four selected a legal candidate, followed the declared
one-transition objective, supplied comparisons/opponent response/replan
conditions and replayed successfully. These cases exercise only
`opening_branches`; opponent profile, counterplay, resource exchange and endgame
remain source-reviewed prose rather than battle-tested strategy.

## Concrete recovery and consumer correction

The last saved Zerg→Terran response was HTTP 200 and content-complete. Its only
schema issue was an array-valued `reviseIf` where the contract requires one
string. Versioned local recovery preserved all five strings and their order,
joined them with newlines, retained the original quarantine and wire, and wrote
separate recovered candidate/runtime/transition receipts with zero Provider
calls. The old comparison wrapper now rethrows non-applicable schema failures
instead of replacing their real error.

The recovered choice was legal but failed its explicitly declared objective.
The common decision-consumer instruction had allowed a broader tactical goal to
displace the case objective. Protocol v2 now makes the supplied one-transition
objective and ordered metrics binding without exposing an expected candidate.
Three already-passed cases were read from their sealed results. Only the failed
case was executed once under v2; it passed legality, objective preference,
rationale structure and Rules replay. No fourth review cycle occurred.

## Accounting

- Matchup production and finalization epoch: `34,120,976` tokens / estimated
  CNY `15.721921`.
- Last objective-bound call: `313,230` tokens / estimated CNY `1.104358`.
- Historical cumulative ledger retained: `260,204,060` tokens / estimated CNY
  `312.143927`.
- Payment-required count: `0`; the next matchup-epoch notification remains CNY
  `100`.

The production report hash is
`7e7fe13b0f54821554776e73ab6c75b97627c7c2c74124ca72562e3c37e95bf9`.
The finalization report hash is
`d39f30f979bf52aa242e336adb0ab84717a75d80740955e44ef29a22f575469a`.

## Scope clarification and next gate

There is no Terran/Zerg combined faction Skill. The later comparison adds one
independent Protoss `Daelaam` Skill and, separately, the second Zerg Faction
Skill `Kerrigan's Swarm` beside the existing `Zerg Swarm`. The latter is a
same-Race, two-Faction comparison. `Raynor's Raiders` is not selected for this
experiment.

Slice 176 must now prove an isolated arena, version registry and online loader
through the real room action chain. Nothing in this closure grants online play,
full-game strategy effectiveness, automatic publication or training admission.
