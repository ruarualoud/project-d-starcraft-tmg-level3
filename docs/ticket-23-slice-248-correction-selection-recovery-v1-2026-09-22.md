# Ticket 23 / Slice 248 — correction delta recovery

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

## First repair and recovered structural evidence

Action normalization v27 first recovered a missing top-level `selection` from
the newest earlier completed Action submission for the same candidate and kept
full Rules revalidation. A zero-call resume proved this was necessary but not
sufficient. The two correction submissions had a more general schema-role
drift: `lifecycleAssessment`, `publicDecisionSummary`, `selection` and `speech`
were nested under `intent`, while unchanged intent arrays such as `tradeoffs`,
`risks`, `fallbacks` and `stopOrReplanTriggers` were omitted.

## General repair

Action normalization v28 treats a correction as a typed delta when all of these
hold:

- the current decision is already in a semantic-correction round;
- both submissions name the same Planner-selected candidate;
- the earlier submission contains a complete typed selection;
- any current top-level field wins over the earlier value.

Four known top-level fields misplaced inside `intent` are lifted first. The
current corrected payload is then overlaid on the prior complete submission;
its `intent` is merged field-wise so the new prediction wins while omitted
unchanged arrays survive. Recovery records lifted and inherited fields plus its
source attempt and `rulesRevalidationRequired=true`. Formation/asset binding,
semantic validation and final Rules instantiation still run normally, so an old
coordinate, prediction or parameter cannot become legal merely by inheritance.

The existing asset-placement focused verifier now contains the exact
complete-first/partial-correction shape. After the production change it was run
once after v28 and passed with `correctionAssetSelectionRecovered=true` and
`correctionDeltaMerged=true`, zero Provider calls and zero paid tokens. No
unrelated gate or full suite was run.

Explicit resume also received one bounded control-plane rule: the initial
manifest may temporarily ignore this exact pre-start decision finding while the
authorized retry runs. Any new Critical/High still blocks. A successful
Preview/Apply/Replay marks prior decision findings resolved (never deletes
them); without success they remain active.

## Continuation

The third local attempt reached revision 9 with zero new Provider calls. Rules
Preview/Apply/Replay passed, both historical High findings were marked resolved,
and the selected Omega Worm position and corrected opponent predictions were
valid. The complete strategy audit nevertheless found stale inherited fields:
`tradeoffs`, `risks` and `nextDecisionFocus` still described the first
`(16772,12852)` objective-near option with `2/3` incoming profiles, while the
applied option was `(47250,1600)` with `0/0` profiles. This would contaminate
same-match plan memory.

The branch is therefore Authority-valid but strategy-invalid/non-training and
must not be resumed. Under the three-round convergence rule no fourth repair is
attempted. Normalization v29 closes the safety hole for future work: when a
correction changes selection identity, selection-sensitive intent fields are
never inherited. Missing replacements fail the ordinary Action contract. The
concrete changed-option case passed once with
`changedSelectionStaleStrategyRejected=true`, zero Provider calls.

Future match work must start from the safe revision-8 boundary and obtain one
fresh, complete Action submission under v29. It may not reuse this branch's
stale plan memory.

## Accounting

The stopped fork used 6 calls, 316,804 reported units and `¥0.448593`, with no
Apply. Recent recovery work is now 76 calls, 3,595,101 units and `¥4.967730`;
including the original invalid-suffix source, 105 calls, 4,941,895 units and
`¥6.820451`. No `¥100` notification boundary was crossed.
