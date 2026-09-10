# Ticket 18 / Slice 176 — online strategy arena closure

Status: complete on 2026-09-11. Ticket 18 is `5/8`; Slices 177–179 remain.
The 22-Ticket project denominator remains `16/22` because Ticket 18 is not yet
complete.

## Outcome

The five exact foundational strategy artifacts now have a separate online
candidate/accepted registry and an opponent-seat loader. Neither registration
nor a newer candidate silently changes the active version. The per-seat load
order is:

1. general rules-and-strategy Skill;
2. own Faction Skill;
3. opponent Faction Skill as a matchup dependency;
4. the exact directed matchup Skill.

This is not a Terran/Zerg combined Skill. The two matchup artifacts remain
directional and independent. The later extra-faction experiment remains one
independent Daelaam Skill plus one second Faction Skill under either Terran or
Zerg; that selection is still pending.

## Delivered boundaries

- The checked-in manifest names exact paths and hashes. Startup does not select
  the highest directory or replay paid production.
- The loader authenticates the five Skills and their adjacent qualification
  reports, then verifies that matchup dependency hashes resolve inside the same
  pack.
- Registration creates candidates only. Explicit evaluation evidence and a CAS
  runtime revision are required to accept versions.
- A rollback creates a new runtime revision from a previous accepted snapshot;
  rooms may continue reading a pinned old accepted revision.
- Online context exposes strategy Skills only to the opponent role. They are
  advisory evidence and cannot replace LegalSpace, Rules or Referee receipts.
- The Agent can choose only a current enabled LegalSpace candidate and can only
  create Preview. A human supervisor owns confirmation, control lease and Apply;
  replay must match the resulting Room state.
- Full Faction artifacts remain retrievable by hash. The prompt contains a
  compact recommendation index rather than injecting both 220+ KB artifacts on
  every turn. Omitted conditions/details must be retrieved before use.

## Acceptance run

Command run once after the final capacity change:

`node scripts/run-ticket-18-online-strategy-arena-v1.mjs`

Report:
`build/ticket-18-online-strategy-arena-v1/report.json`

Report hash:
`9e1498bbd9ff88649270dde724fa60df4b4bd07395ab72a1bec32ec68868eca8`

Results:

- formal offline Skills: `5/5`;
- runtime-accepted exact versions: `5/5`;
- candidate routes executed: `2/2` (Terran→Zerg and Zerg→Terran);
- accepted routes executed: `2/2`;
- real Room state transitions and matching replays: `4/4`;
- stale CAS rejected as `STRATEGY_REGISTRY_RUNTIME_CAS_CONFLICT`;
- rollback to revision 0, restore from revision 1 and pinned revision-1 read all
  passed;
- model confirm/apply calls: `0/0`;
- Provider/model calls: `0`; paid cost and historical token totals unchanged;
- official-source refresh: `false`; training truth: `false`.

The first two runs stopped only on prompt context capacity. Diagnosis measured a
rough 60.6 KB Room projection, 12 KB LegalSpace and initially 78 KB strategy
projection. The final version retains exact full artifacts in the registry but
reduces the prompt projection to about 35.8 KB, with room+LegalSpace+guidance
about 108.4 KB before ordinary prompt framing. The third and final convergence
round passed.

## Honest limitations

The injected deterministic Provider proves the context, authority and Room
wiring; it does not prove that a live language model plays well. Each run is one
transition, not a full match. The current workbench threat overlay remains
explicitly `partial`; it is UI evidence rather than an exact spatial oracle.
Spatial counterfactuals, multi-game reflection and SkillOpt belong to Slices
177–178 and later human-agent/self-play work.

## Next deliverable

Slice 177 reconstructs genuine pre-action traces and actual outcomes into a
postgame review → reflection → versioned SkillOpt candidate. It must preserve
the five accepted live versions, avoid hindsight leakage and keep all memory and
training candidates quarantined until their own gates pass.
