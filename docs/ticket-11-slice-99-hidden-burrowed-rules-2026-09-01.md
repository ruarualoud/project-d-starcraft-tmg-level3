# Ticket 11B Slice 99 — Hidden / Burrowed rules

Date: 2026-09-01
Rule vertical: 89/101
Route assignment: 18 exact atoms
Result: `747 executable / 165 review-required / 114 display-only`

## Scope closed

This slice promotes the fixed route-v2 Hidden/Burrowed group without refreshing
official data. The sealed `71/69/48` development-tranche lock remains the sole
input and repository fallback remains disabled.

The source bundle pins all 18 Core Part 11 clause, source-text, and candidate
sequence hashes. It indexes five current product definitions that mention
`HIDDEN`: Stalker's `Path of Shadows` plus Omega Worm, Observer, Orbital Command,
and Overseer detection/removal definitions. No current definition grants
`BURROWED`; generic Burrowed execution is therefore available only in the rules
harness and is quarantined from production carrier claims.

The locked Core PDF includes the Start-of-Round Hidden grant for Burrowed while
the current Command Center Part 11 payload omits it. The bundle records that
difference explicitly and selects the Core PDF as the primary normative rule
source. It does not silently merge or rewrite either historical source.

## Executable behavior

- Gaining Burrowed also grants Hidden. A Burrowed Unit regains Hidden at Start
  of Round. Removing Burrowed removes Hidden. Deploy, Move, Disengage, Run, and
  Close Ranks remove both; Hold preserves them. Other actions fail closed.
- Hidden ranged and line-of-sight Special Ability targeting uses the exact
  acting-model-to-target-base edge distance. Four inches is legal; beyond four
  is illegal and not Visible regardless of positive LoS. A Special Ability that
  does not require LoS is not incorrectly blocked.
- Every content-hashed targeting-attack event receives at most one Evade
  opportunity, even when the Unit is both Hidden and Burrowed. A separate attack
  receives a separate opportunity. Hidden suppresses all IMPACT damage.
- Other models may cross a Burrowed model's base, but the endpoint must remain
  outside its one-inch Engagement Range. The certificate does not bypass other
  movement geometry owned by the frozen movement consumer.
- Burrowed derives effective Size 0 and Current Supply 0 for Disengage, the exact
  six-action whitelist, default Special Ability permission, and the already
  executable mission-control prohibition.
- A Burrowed Unit engaged at Combat start must activate and cannot attack while
  still Burrowed. A hash-bound Close Ranks receipt that removed Burrowed permits
  the following Close Combat Attack. Engaged enemies may attack it normally,
  subject to the per-attack Evade evaluation.

## Runtime and relationship closure

`authority.hidden-burrowed-rules-v1@1.0.0` is executor 68. Its six procedures
use a rules-owned Pending → LegalSpace → explicit confirmation → Apply contract.
Trigger and attack events, source/data, geometry, state projection, action
lineage, and mutation are content-hash bound. Authority action schema advances
from v36 to v37 only when this executor is present.

The relationship extension connects all 18 atoms to status, event, base
geometry, targeting, visibility, defense, movement, combat, Judge, and state
contracts. Start of Round, Move, Disengage, Run, Ranged Attack, Close Combat,
IMPACT, terrain/LoS, and mission-control consumers are graph-linked and frozen;
they require explicit future versioned composition rather than silent changes.
The audited graph is valid at 10,927 nodes and 31,148 edges with 68/68 declared
state contracts.

## Frozen identities

- Slice: `16fca9616ade33959b13cfd58805ae5e44ccc94ff082cf07f5d0a7b50d4df2ed`
- Catalogue: `887e44baa78c679041a9f60b5c4d47b3992cfe96fb3cae009177e5f444aa6990`
- Runtime: `f27befcc6168ce08c8f192f5b1a6364cfff47e8d9c419e61470afd3fa7c5ded0`
- Relationship graph: `53c2007c387b84243a904e50b259edc20f774ac4b65a7b118b4a4964f3f6ca66`
- Data bundle: `dfbc402bbae29fc2ffed266db78af46517a72e7468724213e099018be8cef7ca`

## Gates

- Slice 99 focused verifier: `52/52`
- Slice 98 historical regression: `45/45`
- Current executable runtime: `10/10`
- Ticket 11 foundation aggregate: `10/10`
- Evidence denominator: 163 base reports / 2,223 assertions; 164 reports /
  2,233 assertions including the aggregate
- Ed25519 receipt replay after HMAC seal rotation passes; tampering is rejected

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play,
memory, or training truth was produced.

## Next fixed slice

Slice 100 is the exact 13-atom Summon army-list, Supply, placement/coherency,
activation, scoring, Zone of Influence, friendly-status, and reserve-boundary
group. Its target is `760 executable / 152 review-required / 114 display-only`.
