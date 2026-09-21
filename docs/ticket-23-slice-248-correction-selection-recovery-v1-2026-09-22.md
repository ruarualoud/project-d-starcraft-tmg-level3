# Ticket 23 / Slice 248 — correction selection recovery

## Concrete failure

Fork `20260921231542474` replayed the safe authority boundary through revision
8 and entered a new threat-aware Omega decision. The first Action submission
contained a complete asset selection but predicted a second current-phase
Goliath Move. Prompt/validator v23 correctly rejected only that prediction.

The next two paid correction submissions fixed the prediction to a possible
Assault-phase Goliath Ranged Attack, but emitted only the corrected strategic
fields and omitted the already accepted `selection` envelope. The old Host
reported the generic `DECISION_PROPOSAL_ILLEGAL` twice, then stopped under the
three-round convergence rule. No action was Previewed or Applied.

This was not another strategy failure. It was a correction-lane transport gap:
the instruction said to preserve supported fields, but the Host made the model
resend an unchanged exact option instead of retaining it itself.

## Repair

Action normalization v27 may recover only a missing top-level `selection` from
the newest earlier completed Action submission when all of these hold:

- the current decision is already in a semantic-correction round;
- both submissions name the same Planner-selected candidate;
- the current submission omitted `selection` rather than replacing it;
- the earlier submission contains a typed selection.

The recovered selection is marked with its source attempt and
`rulesRevalidationRequired=true`. Formation/asset binding and final Rules
instantiation still run normally, so recovery never makes an old coordinate or
parameter legal by itself. Current corrected intent and opponent predictions
always win; only the missing unchanged selection is inherited.

The existing asset-placement focused verifier now contains the exact
complete-first/partial-correction shape. After the production change it was run
once and passed with `correctionAssetSelectionRecovered=true`, zero Provider
calls and zero paid tokens. No unrelated gate or full suite was run.

## Continuation

Resume this exact failed fork once. Its already-paid completed Action candidate
must be revalidated locally under normalization v27. A new Provider request is
not required unless the recovered selection fails the unchanged Rules-owned
option receipt or another independent semantic defect is found.

## Accounting

The stopped fork used 6 calls, 316,804 reported units and `¥0.448593`, with no
Apply. Recent recovery work is now 76 calls, 3,595,101 units and `¥4.967730`;
including the original invalid-suffix source, 105 calls, 4,941,895 units and
`¥6.820451`. No `¥100` notification boundary was crossed.
