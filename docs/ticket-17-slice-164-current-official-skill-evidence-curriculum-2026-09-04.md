# Ticket 17 Slice 164 — current-official Skill evidence and curriculum

Status: complete. Ticket 17 is 2/9; Slices 165–171 remain. Overall project
status remains 15/22 because Ticket 17 is not yet closed. Ticket 14 physical
device acceptance remains 15/16 and is not waived.

## Delivered

Slice 164 replaces the legacy Skill fixture with an offline-replayable,
task-materialized evidence catalogue derived from the already captured current
Command Center `71/69/48` dataset and the reconciled current FAQ V1.0 Rules
aggregate. It performs no network refresh.

Every staged row carries an exact content hash and a separately sealed locator.
Every RuleAtom also carries a sealed current Rules receipt. A worker receives
only the evidence IDs required by one selected task; it does not receive the
raw source registry or a mutable Rules runtime.

The current evidence denominator is:

- 83 official product source records: 26 units, 37 tactical/faction cards,
  10 missions and 10 deployment maps;
- 1,163 current RuleAtoms: 1,026 base atoms incorporated under the current FAQ
  composite receipt plus 137 current FAQ overlay atoms;
- 1,049 executable RuleAtoms and 114 display-only RuleAtoms;
- 15 review-required raw rule-section records and 173 community display-only
  records explicitly excluded from generation evidence.

Historical pre-FAQ identities remain available for labelled display and pinned
replay. They cannot be supplied as standalone current Skill input. A base atom
is accepted only when its evidence row is rebound to the current composite
catalogue/runtime/graph receipt.

## Registry-driven curriculum

The four families expand from the current registries rather than a handwritten
small cap:

| Family | Current tasks | Generation eligible | Derivation |
| --- | ---: | ---: | --- |
| `how_to_play` | 1,163 | 1,049 | one visible task per current RuleAtom |
| `mission` | 10 | 10 | one per official mission, with compatible deployment maps |
| `faction` | 6 | 6 | one per current official faction/archetype card |
| `matchup` | 36 | 36 | complete directed 6×6 matrix, including six mirrors |
| **Total** | **1,215** | **1,101** | 114 display-only rule tasks remain visible but blocked |

The question tree contains one root, four family nodes and 1,215 task leaves:
1,220 nodes total. Each leaf binds its task hash, evidence count, family prompt
and the Tutor→Student→Challenger→Reasoner→Fact Judge→Proposer→Generator→
Cross-Time role sequence. Slice 165 implements those roles; this Slice does not
run them.

Task materialization was exercised for an executable RuleAtom, Hold Position,
Kerrigan's Swarm, and directed Raynor's Raiders→Kerrigan's Swarm. Hold Position
receives exactly the five Standard deployment maps, while its Skirmish peer is
derived separately. Unknown tasks, tampered evidence and display-only rule
generation fail closed.

## Verification

- focused Slice 164 checks: 15/15;
- Slice 163 boundary regression: 15/15;
- full Ticket 15→Ticket 16→Slice 163→Slice 164 aggregate: exit 0;
- predecessor browser evidence: Ticket 15 Chromium 11/11 and Ticket 16
  Chromium 16/16;
- no second external Provider request: the aggregate only verifies the sealed
  Ticket 16 HTTP 200 receipt.

Artifact identities:

- evidence catalogue:
  `8fa844c497429c416fcff354da8707341812cdb7190570175a472eee4846fecd`;
- curriculum:
  `fa8602b4e18c27e79c89f05ad6dfdd2b21f3d1ee4eb931da684e45fc920eeb48`;
- question tree:
  `2ea00d190e9ffc9054a3112cac730dc899cea91f27da7ec6b2f578214c67a68e`;
- focused report:
  `ffa5422c76f0cf9ac940bb184efbc82ec78db1f9e61a1349201340c6f8cb27dc`.

No DSH install/run, Provider call, Skill candidate, promotion, Memory write,
MuZero export, self-play or training-truth mutation occurred. Slice 165 is
next: implement the typed Teach/Ctx2Skill role graph, correction lineage and
single candidate-emission boundary.
