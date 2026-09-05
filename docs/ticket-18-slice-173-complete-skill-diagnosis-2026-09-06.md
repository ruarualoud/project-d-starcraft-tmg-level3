# Ticket18 / Slice173 — actual complete-Skill diagnosis

Status: full source production complete; quality admission blocked, not formally usable yet. No official-source refresh, Codex subagent, blind regeneration or Rule-kernel change.

## Immutable actual baseline

- Production: `overall-v3-cdf99e843cad9297a084`, all37 reading packets,522 claims.
- Candidate: `b68272f9678e0bbacccc7a9e5266dd438e862b9b967eba9ac1c65c4bddb667cc`.
- Whole-Skill14 source controls:14/14; result `9bd1bdf5917987bc772d04bb6db57bce46cb01ba833b7390a85317cb72c13e5e`.
- Actual105 rule cases:99/105, split64/69 fresh and35/36 legacy; result `b71ddf6822f44dcecaa5cd5cbfffe8253bb8071ccf168b951d3f67e81f60f0c3`.
- Additional8 known-risk controls:5/8; result `3bbb286ef6f46ff2b0240881ffeca6880f54407bc89fb89667038e484caf8af0` in `overall-audit-5c101d0a8a2800d15653`.

These are bounded rule-reading results, not a whole-game success rate, strategy effectiveness or evidence of five playable Skills. Full raw answers, source-bound expected values and paid receipts remain in SQLite. The completed-production gate has now actually reconstructed/reverified all37 packets and rescored the119 base answers; default admission rejects the negative result, while explicit diagnostic mode allowed collecting the additional8.

## Observed failures and source checks

| Area | Actual wrong answers | Current evidence |
| --- | --- | --- |
| Enemy Coherency Link | `production-heldout.enemy_link.4`, `.8`, `.16` returned false instead of true | Reader returned false for all16 inputs. Frozen FAQ07 permits links through enemies **this Unit is currently engaged with**, provided placement is open and coherent. Existing15.7/15.11 and31.2 preserve the engaged-enemy exception;31.11 strategy overstates that gaps need not be worried about. Clarify precise condition/scope before attributing everything to missing prose. |
| Directly towards/away | `production-heldout.direct_move.1`, `.4` accepted1.5 when maximum legal distance is2.5 | Frozen FAQ11 explicitly requires the maximum possible distance.16.1,16.13,31.6 and especially31.14 already state this;31.14 explicitly says a shorter distance cannot be chosen. These failures are not evidence that this rule was absent. |
| Self range exception | `heldout.abilities.1` returned true | Input is the same source/subject Unit with `explicitSelfExclusion=true`; the bound FAQ35 kernel returns false for this self-inclusion check.34.0 already includes the explicit-rule exception. Do not misdescribe this as the different-Unit case or invent a rule that all other Units are outside range. |
| Every base point's Speed cap | `boundary.movement.base-point` returned false | Confirmed literal omission: complete draft has no equivalent statement. Core `...items.5.subItems.2/p2` explicitly applies Speed to every part of the leading base.18.0 cites that span but omits this condition. |
| Reserves effect clock | `boundary.reserves.effect-clock` returned false | Confirmed literal omission: Core `...items.5.subItems.4/p2` says active timed buffs/debuffs/mission effects remain and their clock does not pause off-table.18.5 omits this, and the complete draft search found no equivalent. |
| Reserves activation | `boundary.reserves.no-second-activation` returned true |18.5 explicitly says a Unit already activated in the current phase remains activated on returning to Reserves and cannot act again that phase. Core `...items.5.subItems.4/p3` agrees. The reader ignored an existing condition; not a demonstrated omission. |

`...` in the table denotes `core.iuUyObNTQ2M8xK4IUqzC`; persisted source addresses are full, not abbreviated.

## Ranked diagnostic hypotheses

1. Some generated statements omitted or overgeneralized material conditions. Prediction: direct source/draft comparison shows a missing or contradictory clause, and a source-bound local content patch fixes that defect without unrelated rewrites. **Confirmed for the two literal omissions above**, not for every operational error.
2. The full-Skill reader did not reliably select/apply explicit conditions from522 claims. Prediction: with the same complete candidate, cases and model, a distinct bounded diagnostic requiring relevant claim IDs plus concise condition checks before answers will expose whether the necessary statement was found and whether an exception/input was ignored. No old scores, expected answers or correct-case feedback may enter that diagnostic. Do not silently replace the original99/105 score with its result.
3. A fixture's field semantics or oracle may be incorrect/ambiguous. Prediction: the independently read frozen FAQ and the explicit question/input scope contradict the expected answer. Current source checks support the maximum-distance and explicit-self-exclusion expectations; link/placement semantics still need a carefully scoped decision trace, not an automatic full-action legality assertion.

Next work: preserve the two source-omission findings for precise18.0/18.5 editing, run a bounded full-context readability/condition diagnostic for the other four areas, distinguish content errors from evaluator/Harness failures, then apply targeted repairs and rerun the old and added tests. Do not regenerate37 packets, weaken the oracle, remove tests, inject expected answers, publish a candidate or edit Rules to fit model predictions. The existing generic external-packet repair primitive supports arbitrary packet IDs; its old CLI is first-five-specific and will need a versioned complete-Skill repair/assembly path when the findings are ready.

## Work and cost state

Both live handles have ended (`5695` main and `90817` supplemental). No live paid request, ambiguous intent or402. Main continuation used98 new calls /11,544,494 tokens /estimated¥2.013756; supplemental used1/74,960/¥0.015944. Global known lower bound29,635,331 Provider tokens, estimated cost plus historical reserve¥41.778819. Original main ancestry was66 calls /8,321,604 tokens /¥1.274291 and its six-hour start was not reset.

Ticket18 stays1/8, project16/22. Generated complete candidate1 (overall), formal first-five accepted0/5. Still required: verified corrected overall Skill, two factions, directed matchups, actual Room use, real replay/reflection/versioned local upgrade and regression/rollback, and scheduler/store conformance. This long goal is active, not complete or blocked.
