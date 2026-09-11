# Ticket 18 / Slice 178 — SkillOpt upgrade regression and replay acceptance

Status: complete on 2026-09-11. Ticket 18 is `7/8`; Slice 179 remains. The
22-Ticket project denominator remains `16/22` because Ticket 18 is not yet
complete.

## Outcome

The two Slice 177 patch proposals are now materialized as complete versioned
matchup Skills rather than loose notes. Each candidate preserves its exact
accepted parent and source/dependency bindings, remains advisory, and starts as
`skillopt_candidate` with no Rules, live-runtime, publication or training
authority.

This slice does not create a Terran/Zerg combined Skill. It upgrades the two
independent directed artifacts:

- `Terran Armed Forces → Zerg Swarm`;
- `Zerg Swarm → Terran Armed Forces`.

The later extra-faction experiment remains a separate Protoss `Daelaam` Skill
plus the second Zerg Faction Skill, `Kerrigan's Swarm`, beside `Zerg Swarm`.
`Raynor's Raiders` is outside this experiment.

## Regression design

- Reuse all four original Rules-executed initiative cases as predecessor
  regressions.
- Retain the historical Zerg→Terran held-out preference failure as an explicit
  failure input rather than deleting or relabelling it.
- Compile four new held-out cases with new state hashes and family IDs. Each
  direction contains one player1-first and one player2-first objective, so a
  faction-fixed policy cannot pass by chance.
- Execute both legal branches in every compiled case through
  Preview→Confirm→Apply→Replay. Across the eight regression cases this is 16
  applied-and-replayed branches.
- Evaluate each good candidate on four direction-specific cases. Both pass
  `4/4`.
- Evaluate an intentionally bad fixed-first-actor candidate per direction on
  the two new held-out cases. Each passes `1/2` and fails `1/2`, producing a
  High regression finding and `quarantined_regression`.

The decision consumer is deterministic and bounded to this initiative drill.
It proves that the gate distinguishes the intended conditional policy from a
known bad fixed policy; it does not prove model strength or win-rate gain.

## Exact routing and rollback

The online registry now accepts an explicit set of candidate Skill hashes for
evaluation snapshots. This prevents a later registration with the same
`skillId` from silently becoming the evaluated artifact.

An isolated registry performed the following sequence:

1. accept the existing foundational five at runtime revision 1;
2. route parent, good candidate and negative control by exact hash;
3. simulate explicit acceptance of the two good candidates at revision 2;
4. roll back to the revision-1 parent set, creating revision 3.

The negative controls were never accepted. The final active hashes are the
original five parent hashes. The good candidates are only
`promotable_manual_approval_required`; no live publication occurred.

## Evidence

- Report:
  `build/ticket-18-skillopt-upgrade-regression-v1/report.json`
- Report hash:
  `33792bc949313e9e45fefbd6773b22fab77ed01afbf39ea20e25eb3c21430daa`
- Good candidate hashes:
  `449d4281de792f106de9d7e2b979cb89c9c0c33775422713c1ef6db870b5be27`,
  `a9d81b552db20d812639b41e764260808a543831c1ddb0ba572bc32f15b8e00d`
- Negative-control hashes:
  `8457ed77bb2aee76008a78602425276f1b0bf6bdc17213dd44c672ae8440accd`,
  `1a274b345cef03e6323d31d6385a17f84088fba7361a58a8b7c24e1876125ccb`
- Candidate Critical/High findings: `0`
- Candidate Medium non-blocking findings: `2`, both recording that only bounded
  initiative transitions—not full games—were evaluated.
- Provider/model calls: `0`; paid cost increment: `0`; source refresh: false.

## Focused verification

Only code changed by this slice was checked. No passed predecessor suite or
unrelated slice gate was rerun. The first focused run passed, but direct review
then found a High integration omission: the exact candidate artifact was routed
while its new advisory was absent from compact prompt guidance. After that code
change, each affected command was run one final time and passed.

- The syntax command checked the modified registry and three new modules after
  each actual code revision: passed both times, never repeated without a code
  change.
- `node scripts/run-ticket-18-skillopt-upgrade-regression-v1.mjs`: initial pass;
  final post-fix pass. The final run also proves the candidate advisory hash is
  present in compact prompt guidance while the parent has none and the negative
  control has its own distinct advisory hash.

## Remaining boundary

Slice 179 must make the production/evolution records durable under the SQLite
M1 and PostgreSQL production Adapter contract, including leases, attempts,
budgets, recovery and predecessor regression. It also owns the final Ticket 18
aggregate. The current build-path manifest portability limitation remains open
for that slice.
