# Ticket 23 / Slice 248 — selected-action effect contract repair

## Defect evidence

The recovered Standard-2000 branch `20260921182729904` legally selected and
applied `Ventral Sacs` at revision 8. Rules identified the selected effect as
`reserve_deploy_indicator`, but the Planner and Action prose described a Creep
Tumor, an ON CREEP speed lane and a Creep network. The action name was correct,
so the earlier ability-name identity gate did not detect the cross-effect drift.
Revision 8 remains non-training defect evidence and will not be continued.

## Repair

The compact Rules-owned selected-action identity now includes a versioned
`effectContract` for every coordinate battlefield-asset family:

- Creep Tumor placement;
- detection Faction Indicator;
- Force Field token placement;
- reserve-deploy Faction Indicator and its End-of-Round Ground Reserve effect;
- Shade token placement and End-of-Round displacement.

Planner and Action central claims are checked against both the selected ability
and its effect family. Cross-family effect language is a typed semantic
contradiction, while rejected alternatives remain valid discussion. Prompt
policy v17 tells the model to preserve the exact placed asset plus immediate
and delayed effects; Planner normalization v10 and Action normalization v20
force older paid candidates through the new local contract before reuse.

## Focused verification

Command:

```text
node scripts/verify-ticket-23-slice-248-selected-action-identity-v1.mjs
```

The concrete name-correct/effect-wrong Ventral Sacs reproducer failed before
the repair (`consistent`) and passed once after it (`contradicted`, six effect
contradictions). Correct reserve-deploy language and an explicit rejected Creep
Spread alternative remain accepted. Provider calls, reported tokens and cost:
`0 / 0 / ¥0`.

## Continuation boundary

Fork the formal match through revision 7 and regenerate revision 8. The new
decision must describe a Faction Indicator more than 10 inches from Enemy
models and the optional End-of-Round Ground Reserve deployment. It must not
claim a Creep Tumor, Creep network or ON CREEP benefit.

## Omega false-positive follow-up

The resource-correct continuation branch `20260921201508356` did not apply an
invalid action. It stopped safely at revision 8 after three Planner correction
rounds. Forensic extraction of the three submitted public purposes showed that
all three described the selected Omega Network contract correctly: an Omega
Worm, Source of Creep and later Entry Edge. The final submission also explicitly
said it was *not* a Creep token and *not* a reserve-deploy Faction Indicator.

The blocker was local classification, not Provider formatting or Rules. The
old cross-effect patterns treated generic `ON CREEP`/Creep-network consequences
as proof of a Creep Tumor action, treated generic Ground-reserve wording as
proof of the separate indicator action, and ignored negation. The classifier
now blocks only high-confidence foreign placed-asset claims and ignores a match
inside an explicit English or Chinese negation. Positive Omega-as-Faction-
Indicator drift remains rejected. Planner local normalization advanced to v13.

The exact persisted Omega wording was added to the existing focused gate. It
failed before the repair and passed once after it; the existing positive drift
controls remained rejected. Provider calls, reported tokens and cost for this
repair: `0 / 0 / ¥0`. The failed live branch cost `5 calls / 242,980 units /
¥0.344920` and remains non-training convergence evidence. Continuation may fork
from the still-valid revision-8 Authority checkpoint without restarting the
match.
