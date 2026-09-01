# Ticket 11B Slice 98 — Status / STAY IN PLAY rules

Date: 2026-09-01
Rule vertical: 88/101
Route assignment: 12 exact atoms
Result: `729 executable / 183 review-required / 114 display-only`

## Scope closed

This slice promotes the fixed route-v2 group for Status, `STAY IN PLAY`,
Shielded dependencies, SIEGE MODE, and ON CREEP. It does not refresh source
data. The sealed `71/69/48` development-tranche lock remains the sole input,
with repository fallback disabled.

The source bundle pins the current official Core Part 11 record and exact
clause/source-text/candidate-sequence hashes for all 12 atoms. It also compiles
the 12 current Ground Zerg unit profiles, ten current ON CREEP-dependent
definitions, the exact Omega Worm `Source of Creep` definition, and the model
base geometry bundle.

## Executable behavior

- Cleanup preserves Status by default. Status-mode/effect markers and explicit
  `STAY IN PLAY` material persist; a specific `cleanup_and_refresh` removal
  condition still removes only the matching status, ability effect, token, or
  marker.
- ON CREEP is derived dynamically for an active current Ground Zerg Unit from
  base-edge geometry to a friendly or enemy current Omega Worm Source of
  Creep. The kernel adds and removes only the derived `on_creep` keyword and
  exposes the ten exact dependent definitions.
- Current official data has no SIEGE MODE carrier, so the generic rules harness
  is executable but production use is quarantined. Its hash-bound profile set
  blocks Move, Disengage, Run, Charge, and Close Ranks in SIEGE MODE; only
  siege profiles are then eligible, while other weapons are disabled. Returning
  to Reserves removes the status and matching mode marker.
- Losing Shielded consumes a hash-bound shield-loss event and ends only effects
  or markers whose contract explicitly requires `shielded`; unrelated effects
  remain. No current named dependent-ability carrier is inferred.

The current lock does not contain authoritative physical geometry for a Creep
Tumor token. A Tumor-only ON CREEP decision therefore fails closed instead of
inventing a token size or measurement.

## Runtime and relationship closure

`authority.status-stay-in-play-rules-v1@1.0.0` is executor 67. Its single
parameterized action opens a rules-owned, state/source/match-bound plan and
applies exact piece/token/marker mutations. Authority action schema advances
explicitly from v35 to v36. Historical runtimes and rule displays remain frozen;
there is no silent compatibility.

The relationship extension connects the 12 atoms to source/data, state reads
and writes, derived cleanup/Shielded/Siege/ON CREEP values, Judge tests, and the
frozen current Cleanup, Shielded, Reserve, Move, Disengage, Run, Charge, and
Close Ranks consumers. The audited graph is valid at 10,792 nodes and 30,897
edges with 67/67 declared state contracts.

## Frozen identities

- Slice: `e6c13284ab2062d6f850d68f765e3b4722b0f7ece89c234f376adbe89ebb5279`
- Catalogue: `b611b4d670c9fce7322d7d65025b949e0d6a752febe400a1d9d17a65bae6646b`
- Runtime: `1f646eb170278090bfc7ac77e35d579fb7a13cb148ac90c53ed72fa9d90d69b9`
- Relationship graph: `ee6a354cf18f93784b508648019817d84c84f0f8627a95e18cb321bab5549a32`
- Data bundle: `088ee125508854928763f78801821f67cdc05081916ada89563fc362294cf865`

## Gates

- Slice 98 focused verifier: `45/45`
- Slice 97 historical regression: `40/40`
- Current executable runtime: `10/10`
- Ticket 11 foundation aggregate: `10/10`
- Evidence denominator: 162 base reports / 2,171 assertions; 163 reports /
  2,181 assertions including the aggregate
- Ed25519 receipt replay after HMAC seal rotation passes; tampering is rejected

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play,
memory, or training truth was produced.

## Next fixed slice

Slices 99–111 leave 13 rule verticals and 183 actionable atoms. Slice 99 is the
18-atom Hidden/Burrowed lifecycle, targeting, movement, and combat group, with
target counts `747/165/114`.
