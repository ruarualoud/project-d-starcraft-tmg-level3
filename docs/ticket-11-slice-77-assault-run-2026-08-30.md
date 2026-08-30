# Ticket 11B Slice 77 — Assault Run

## Outcome

Slice 77 promotes exactly six planned RuleAtoms and makes `Run` a current Rules-owned Assault action. The ledger advances from `451/461/114` to `457/455/114` (`executable/review_required/display_only`). All `46/46` current executors have strict declared state contracts for their bounded denominators.

The executor accepts a current official Marine only when its Movement-side activation marker is present, its Assault-side marker is absent, it is unengaged, and the sealed Slice 75 source lock is exact. It explicitly projects the Assault state into the byte-frozen Standard Move v1 kernel, uses the live Marine model count to select Speed (`7` for one model, `4` for more than one), then restores current state, preserves the Movement marker, writes the Assault marker and settles alternating activation.

## Promoted atoms

- `rule-atom:singleton:core-11-unengaged-action-permissions:2ca966d92d94`
- `rule-atom:singleton:core-12-4-run-action-summary:744d8ba4de15`
- `rule-atom:singleton:core-8-6-1-assault-action-choice:55a40f973065`
- `rule-atom:singleton:core-8-7-1-run-action-definition:7462efd93e26`
- `rule-atom:singleton:core-8-7-1-run-move-procedure:1164c0f98ad5`
- `rule-atom:singleton:core-8-7-1-run-move-restrictions:e9b7030d76e4`

The relationship contract exposes Run, Hold, Charge and Ranged Attack as separate Assault choices. It binds source/data/mission/Supply/initiative/piece/model/status/activation/board reads, model/status/Assault-marker/log writes, stale invalidation and Judge/Authority evidence. Removing the Run→Assault-marker write makes the graph gate fail.

## Exact boundary

Supported geometry is the inherited GAUNTLET Standard, round 32mm Ground Marine, no terrain/Access Points/elevation/other movement modifiers denominator. Single-, two- and seven-model fixtures prove that model count is not limited by UI slots and that only the official single-vs-multi Speed split changes distance. Engaged, missing Movement-marker, over-Speed, stale actor position, source drift and unsupported geometry fail closed.

The source lock remains `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`; no network refresh or repository fallback occurred. Frozen Standard Move v1 remains byte-exact at `e7c349f74524883e8205502d3afbe586737c0c938ce644fd3113916f86dfe56f`. Old rules display is retained and silent compatibility is forbidden.

## Evidence

- focused Slice 77 Judge: `13/13`;
- current runtime gate: `10/10`;
- Ticket 11 aggregate: `10/10`;
- cumulative evidence: `141` reports / `1,447` assertions;
- slice: `01bde989318c5641849c737f88e4a8635b718068d3da7bb8c2a0c7041bcb7293`;
- catalogue: `45ab1dfde093421722ba3103b88cca3d869cea5cf0f81bcd5b38a428b5932716`;
- runtime: `f5ee9e1257369765fc33979491904eecb5f8dd41e67fedd413c8ff8c8973bad0`;
- graph: `9611e56d98e60c118b8df0398857525af2c2caf96e1fb6cab94c6b7cde76fce2` (`8,627` nodes / `27,165` edges).

Authority Preview→Confirm→Apply uses an Ed25519 long-term signature. Replay succeeds after HMAC short-seal rotation and rejects tampering. No Skill was generated or promoted, DSH was not invoked, and no MuZero, self-play, memory or training-truth candidate was produced.

Slices 78–111 remain: `34` planned slices. Slice 78 owns the exact 23-atom Blast/Flamer template and Spillover cluster.
