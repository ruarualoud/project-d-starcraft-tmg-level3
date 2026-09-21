# Ticket 23 / Slice 248 — source-card exhaustion transport repair

## Defect

The third Omega Network effect-semantic attempt correctly described the Omega
Worm and passed Rules Apply/Replay at revision 9. Its resource explanation was
still wrong: it claimed the source card was not exhausted, while the official
selected-roster runtime exhausts every zero-resource `card_feature` on commit.

The resource checker itself was operating correctly on its input. The Rules
parameter domain omitted top-level source kind/instance identity, and the
Spatial Action projection did not recover `constraints.sourceCardInstanceId`.
Consequently the selected resource contract incorrectly said
`sourceCardExhaustedOnCommit: false`.

## Repair

- The selected-roster ability Adapter publishes `sourceKind` and
  `sourceInstanceId` on every active domain.
- Spatial Action projection preserves those fields and derives legacy
  card-feature identity from `constraints.sourceCardInstanceId`.
- Resource-contract compilation uses the same fallback, so older frozen domains
  cannot silently turn a card exhaustion into a free reusable action.
- Planner/Action local normalization advanced to v12/v22.

## Focused verification

The existing selected-action resource gate now starts an Omega Network case at
the unprojected legacy-domain shape: no top-level source kind, but a Rules-owned
`sourceCardInstanceId` in constraints. The exact false-no-exhaustion prose failed
before the repair (`consistent`) and passed once after it (`contradicted`), with
the source instance preserved. Existing positive BM, zero-Supply and card-
exhaustion cases remain green. Provider calls, reported tokens and cost:
`0 / 0 / ¥0`.

The revision-9 action remains valid Authority but its resource prose is
non-training defect evidence. Continue only from corrected revision 8.
