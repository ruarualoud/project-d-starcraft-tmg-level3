# Ticket 27 — Teach roster-planning real-Flash checkpoint

Status: **Teach strategy revision accepted offline; final roster not generated.**
The three paid attempts below did not converge end-to-end, so the paid lane is
stopped under the user's three-cycle rule. There is no automatic fourth call.
This is not Slice 271/272 closure, product acceptance, or training truth.

## Frozen experiment boundary

- Game/source: StarCraft TMG Level-3 current frozen official development
  tranche, source-lock `1adbdb65…1757a1`, Standard 2000, Hold Position.
- Advisory inputs: accepted General + Terran Armed Forces + Terran→Kerrigan's
  Swarm strategy Skills; route receipt `f584e4e7…430c3`.
- Model: DeepSeek-V4.1-Flash (`deepseek-flash`), disabled thinking,
  Keychain→isolated structured Worker, strict JSON schema, one physical
  attempt per round, no automatic retry. The separate roster-Teach profile
  raises only this experiment's output allowance; frozen match profiles are
  unchanged. The [official model table](https://api-docs.deepseek.com/quick_start/pricing/)
  documents a service limit above the chosen 16,384 Student output units.
- Rules/Room/source mutation authority: none; all outputs
  `canAffectRules=false`, `trainingTruth=false`.

## Paid and retained sequence

| Attempt | New calls | Result | New units | Estimated CNY |
| --- | ---: | --- | ---: | ---: |
| `20260923170053073-2efe4221` | 2 | Foundation and Challenger strict outputs accepted; a malformed Challenger probability query exposed an untyped laboratory failure before Student. | 55,640 | ¥0.095244 |
| `resume-20260923171729375-01830d23` | 1 | Foundation/Challenger body and output hashes replayed exactly; Student hit the local 8,192-output cap and returned incomplete. | 41,721 | ¥0.079406 |
| `resume-20260923172704537-453bae2b` | 1 | Original two rounds replayed; Student returned a complete strict output. It cited the delivered underlying laboratory receipt hash rather than only the Teach wrapper hash; local citation verifier stopped before Proposals. | 41,581 | ¥0.039747 |
| Total | **4** | No Proposals/Comparison call and no roster selection. | **138,942** | **¥0.214397** |

Each attempt has its own `build/ticket-27-roster-teach-live-v1/<attempt>/`
report, send WAL, redacted Provider receipts and public decoded output. No
credential, raw Provider request or hidden chain-of-thought is persisted.
The incomplete Student still has a usage receipt and is included in cost.

## Actual strategy signal, bounded claim

The Challenger found a real internal inconsistency: the initial declared VP
line `0/3/6/9/12` did not match its stated emphasis on flipping a 2-VP
opponent-affinity marker while holding two 1-VP own-affinity markers. The
Student revised the conditional line to `0/4/8/12/16` and explicitly stated
that this assumes holding those three markers; it did **not** infer a 10-VP
lead without an opponent schedule. It also downgraded roster-budget fit,
Creep-charge probability and the opponent-opening branch to unresolved
claims with replan triggers. This is evidence that Teach altered a public
pre-unit-selection plan, **not** evidence that the route is reachable, the
army is legal or the policy wins games.

The original math receipt calculates exactly over model-supplied inputs, not
over a Rules-certified roster. A budget-fit query before roster selection is
therefore typed unknown. A charge-reach request with no named attacker/target
and a branch asking the laboratory to auto-execute an unnamed first action
are also typed unknown rather than fabricated forecasts. The laboratory's
source-state mutation count remained zero.

## Local repair and stop boundary

The source laboratory hash and its outer Teach hash were both delivered to
Student. The verifier now accepts either **only when it maps to the same
challenge and receipt**. A Student may revise a question under the same
logical need ID; the runtime records old/new need hashes and both query
receipts rather than rejecting iterative planning as ID reuse. One focused
zero-Provider replay of the retained Foundation, Challenger and Student
passed the full Teach semantic gate, revised-Foundation validation and new
information-need execution, then reached Proposals at round index 4.

No fourth paid attempt was made. A recovery entry may later include the
complete retained Student output and compare each regenerated request-body
hash with its original WAL before paying for Proposals/Comparison. That
recovery option is code-present but has only a syntax check, **not** an
end-to-end resumption proof. Do not treat a new paid roster as authorized by
this checkpoint alone; first review the three-cycle stop and perform the
recovery-only focused gate.

## Harness evidence

`harnessLoopUsed=true`; `targetGames=[StarCraft TMG Level-3]`;
`promptPackRoutes=[strategy_foundation, teach_challenge, teach_revision]`;
`harnessToolsCalled=[pregame_math, pregame_probability_unknown,
pregame_scenario_unknown]`; `uiTraceEvidence=none`;
`agentDecisionEvidence=initial and revised public score routes plus cited
challenge answers`; `memoryTraceEvidence=none`;
`trainingTraceCandidates=none`; `rollbackOrDemotionRules=reject ungrounded
claims, preserve paid outputs, never promote this plan to Skill or training`;
`userVisibleChecks=none yet`.
