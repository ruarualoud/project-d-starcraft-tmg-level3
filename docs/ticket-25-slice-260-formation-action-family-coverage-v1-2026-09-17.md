# Ticket 25 / Slice 260 — formation action-family coverage

Date: 2026-09-17

Status: implemented. Slice 261 is next.

## Result

`space.solve_formation` is the sole public intent-to-layout operation for every
current parameterized domain that moves or places a complete Unit. The Agent
chooses weighted tactical intent and one complete option; the Host owns bounded
coordinate search; Rules owns final legality. Internal lattices and seeds are
not exposed as fixed formations.

Post-roll Charge also has a rules-proven failure exit. When physical base-edge
distance proves that a declared target cannot be engaged within the rolled
distance, the solver returns the canonical `distance_shortfall` resolution
instead of asking the model to invent an impossible path and formation.

## Coverage matrix

| Family | Current action/effect denominator | Solver behavior | Evidence |
| --- | --- | --- | --- |
| Standard spatial | Deploy, Move, Run, Disengage | Leading path plus every remaining base | Live round and rectangular, single- and multi-model receipts |
| Charge resolution | `resolve_charge` | Declared-target contact/closest position, undeclared-enemy exclusion, remaining-model priorities, or exact failure proof | Live action 58; one new Provider call after 21 historical failed coordinate attempts |
| Relocation | Entry-edge Place, extra Move, direct Place, friendly-anchor Place, non-entry-edge Deploy | Preserves each effect's path/anchor/edge fields while solving one complete Unit layout | Live Burrow Ambush actions 13/15; exact `extra_move` adapter receipt; seven-route contract gate |
| Lifecycle ability | Phase Prism swap, Roachling summon, Respawn | Complete placement plan; Phase Prism/Spawn contact; Respawn binds each returned model to an original surviving model | Live summon action 42; exact two-model Respawn adapter receipt; contract gate |
| Lifecycle consumer | Omega, Pylon, reserve indicator, Shade end-of-round place | Post-placement characteristic projection and complete placement around the authoritative source | Live 18-model Omega action 40; contract gate for Shade; Pylon and indicator share the same source-contact/marker branch |
| Forced relocation | No current parameterized complete-placement domain | Count is explicitly zero. Reaction follow-up metadata is not misreported as an executable coordinate domain | Source denominator audit |

The public coverage contract is exported as
`STARCRAFT_TMG_FORMATION_ACTION_FAMILY_COVERAGE_V1` and is included in every
solver receipt, so a new formation-bearing effect cannot remain invisible to
the coverage report.

## Focused verification

The concrete action-family routing reproducer ran through three permitted
rounds. Round one exposed a duplicated Leading Model slot for `extra_move`;
the authoritative parameters contained both a path endpoint and the complete
placement list. The shared slot projection now recognizes that the placement
list already contains the leader. Round two verified the repair. Round three
added exact official-adapter evidence and passed.

Final result at live authority revision 73:

- direct Place: one option, one slot, no path field;
- extra Move: one option, one slot, path plus complete placements;
- friendly-anchor Place: anchor Unit and model retained;
- non-entry-edge Deploy: edge side retained;
- Phase Prism: target Unit/model and placement plan retained;
- Respawn: two slots, each with original-model contact identity;
- Shade: placement plan retained;
- exact Relocation `extra_move` action hash:
  `c878a7bb94b02497582304997aa479af947c235fde44306bb98a529c22b92cf9`;
- exact Lifecycle `respawn_models` action hash:
  `3466f843b8cf48629846df09b3a5f0d1cce6419b2a7fbbd1272a21133821ae98`;
- Provider calls: zero; training truth: false.

The separate real r57 Charge reproducer returned one exact
`distance_shortfall` option after one candidate and one Rules instantiation.
The Web runner then applied it as action 58 with one new Provider call and
advanced normally through action 74. Subsequent action 60 selected an
18-model Swarmling Run for `control_objective`: among four complete options it
chose the layout covering marker 5 with greater visible-enemy clearance and a
smaller envelope, preserving 18 public placement reasons.

No source refresh, whole-repository gate, historical Slice replay, or new
model-training promotion was performed.

## Remaining spatial work

Slice 261 builds the exact tactical relationship graph used to score these
layouts: nearest physical edges, contacts and arcs, coherency, blockers,
cover/elevation/LoS, action-specific threats and fire-zone exchange, objective
control, lanes and escape restriction. Slice 262 then replaces repeated broad
search with revision-keyed indexes, Pareto diversity and cancellable async
pre-execution. Slice 263 proves the complete Web/Agent/memory/replay/SkillOpt
loop in live H-A and A-A matches.
