# T23 / S248 — prediction-calibration evidence adapter

## Actual failure and scope

In run `20260922172710914`, the paid Terran Planner at authority r16
explicitly cited four calibration hashes before applying Stimpack at r17.
The summary nevertheless reported zero calibrations available and zero cited.
The continuity projection intentionally wraps each record as
`{ recordId, recordHash, sequence, kind, authority, payload }`; the decision
evidence adapter incorrectly read `calibrationHash` from the outer record.
This is a **Medium reporting defect**, not a Rules or decision failure.

The retained journal proves the four cited records existed before that choice:

| Public calibration | Classification | Meaning |
| --- | --- | --- |
| `a97ccc34…` / `396682c7…` | partial | Deploy predicted correctly; Hydralisk actor prediction missed the actual Swarmling |
| `c6643446…` / `d4461d6b…` | expired | Earlier ranged-response horizons expired |

The model received and cited these real records. This proves the loop is
being used, **not that it improved the decision or outperformed a control**.

## Change

`live-flash-decision-port-v1.mjs` now has one pure calibration-evidence
projection used by completed-decision normalization. It reads the canonical
record payload, retains the older direct-payload representation, and counts
only citations of actually supplied calibration hashes. It does not mutate
memory, inject strategy, change model output, relax legality, or invalidate
already-paid decisions through a normalization-version bump.

The live match was not interrupted. Its running process retains the previous
module until its normal checkpoint/restart; old stored trace counters remain
unchanged. This document supplements those counters with the prior-journal
evidence and must not be represented as a newly generated decision.

## Single focused reproduction and verification

The existing combat-estimation/calibration verifier has a concrete-bug mode:

```sh
node scripts/verify-ticket-23-slice-248-combat-estimation-calibration-v1.mjs --calibration-evidence-envelope-only --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914
```

The first run, before the adapter correction, reproduced expected 4 available /
4 cited versus observed 0 / 0 using the real paid Planner and prior journal.
The single post-change run passed at 4 / 4. It also proves a fabricated hash
is not counted, availability differs from citation, absent memory cannot be
inferred from prose, direct payloads remain compatible, and inputs are unchanged.
Both databases are opened read-only. No full Rules/calibration suite, old
passed verifier, frontend build or unrelated test was run.

Provider calls / Room mutations / token increment / cost: **0 / 0 / 0 / ¥0**.

## Retained strategy-review observations (no reroll)

- r17's assessment both acknowledges the actual Swarmling deployment and
  says that all Zerg combat units remain in Reserves. Current query facts
  correctly include the on-table Raptor and Swarmling. Keep this as a
  stale/contradictory public-plan claim for S249; it is not evidence that the
  observation omitted those units.
- r17 activates Stimpack; r18 subsequently activates Combat Shield. At r18
  the public assessment says the current ranged payoff is near zero and
  discusses Stimpack hypothetically even though it has already been used.
  Review buff timing, remaining-resource reasoning and plan continuity against
  the exact resource receipts after the game; do not infer an execution defect
  from the prose alone, or regenerate a preferred action.
- The actual r17/r18 uses are present in `activeAbilityUseHistory`, and their
  accepted transitions are Replay-consistent. Current strategy remains raw,
  non-training evidence. No claim of complete high-strategy acceptance yet.

Harness loop used: true; game: StarCraft TMG; route: `selfplay_agent_prompt`.
Evidence: actual relationship/instantiation queries, paid public Planner,
same-match calibration journal, accepted action and Web screenshots.
Memory scope remains per room/seat; no private reasoning or credentials copied.
Demotion: unavailable or fabricated calibration references never count as
verified use; contradictory strategy remains review material, not promoted Skill.
