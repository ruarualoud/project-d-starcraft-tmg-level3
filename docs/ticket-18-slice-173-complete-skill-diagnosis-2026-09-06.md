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

Next work: apply targeted repairs and rerun the old and added tests. Do not regenerate37 packets, weaken the oracle, remove tests, inject expected answers, publish a candidate or edit Rules to fit model predictions.

## Actual diagnostic and implemented local-repair path

The bounded diagnostic uses all522 claims, the same model/profile, original case inputs and four groups totaling25 cases. The intervention requires existing claim IDs and a short condition justification; it does not request lengthy private reasoning. Host validation checks citation existence, not automatically whether its prose entails the answer. Correct answers, scores, original source text and old predictions never enter the reader. Wrong valid answers remain immutable and do not trigger regeneration. This is a known-failure diagnostic, not fresh held-out evidence or a replacement score.

First actual attempt `overall-audit-60a6979a6a207b914428` stopped after one paid response: the model requested `read faq-v1:07`. The underlying generic production protocol still illustrated read/query/probe despite the reader declaring no tools. No tool executed. Failure `COMPREHENSION_DIAGNOSTIC_TOOLS_FORBIDDEN`, report `6d48b76dbe3c5a3039d452ac2c5defa30b97d8a948ca8158ee0c1ee75feeb5c4`;75,794 tokens /estimated¥0.132828 retained.

Added an explicit, recipe-bound `finish_only` command policy to the accounted Model port. It presents only the finish schema, refuses tool declarations before egress, and retains/rejects any forbidden action after committing usage without automatic command retry. The historical default production-tools protocol remains byte-identical. DSH generation retains its tools; independent readers do not receive them. This fixes an actual protocol mismatch, not a test oracle.

Completed actual diagnostic `overall-audit-ba426f97fb69080769cf`: **21/25**, split enemy_link15/16, direct_move4/6, abilities1/2, reserves1/1. Report `2f68c97bd5397b42327d5cd9451492697a20223c10a68f3aa555848767331f2a`. Four physical calls /300,600 tokens /estimated¥0.166573. Original99/105 and5/8 are not overwritten; the result does not prove a general causal improvement from citing claims because the protocol boundary also changed.

The actual concise explanations distinguish defects:

- enemy_link.4 cites31.2 but reasons about crossing an unengaged enemy although `linkCrossesEnemy=false`.
- direct_move.1/.4 cite16.1 and31.6 and correctly quote the maximum-distance requirement, then incorrectly conclude that a smaller attempted distance is valid because it does not exceed the maximum. This is an application contradiction, not missing maximum-distance text.
- abilities.1 cites34.0 including the exception, but ignores `explicitSelfExclusion=true` in the case input.
- The reserves case now cites18.5 and correctly rejects a second activation. The original failure remains a valid reader reliability observation.

Thus hypothesis2 is supported more specifically as input/condition application failure; simply finding a relevant passage is insufficient. Do not rewrite correct source rules to accommodate the reader. Actual battle legality must still be checked by Rules/LegalSpace/Preview; a raw LLM boolean cannot authorize Apply. Further reader work must handle explicit input conditions and exceptions, retain full context and prove its behavior independently, not merely re-sample the same test.

The new complete-Skill local-repair workflow binds the exact original candidate and two developer source findings, invokes the existing full-source DSH editor/fresh-review loop only for packet018, preserves all36 untouched packets and520 unflagged claims, rejects no-ops/unflagged changes, and reassembles the entire37-section candidate. Its independent post-edit14+8+105 checks use the finish-only reader. New candidate and repair/evaluation receipts go into a new run; the old candidate, failures and accounting remain intact. Fresh reviews or reassembly alone do not grant formal Skill acceptance.

Engineering checks: diagnostic12, reader command policy8, complete-source repair10 (injected workflow, using actual parent material), plus adjacent output-capacity8, context-cap5, production-v3 ten groups, full-DSH-context two actual local sessions with zero Provider calls, and production accounting/readiness18. These are engineering checks, not paid model-quality results.

Actual complete-source repair started as `overall-repair-05a5ac464028e464918e` (recipe `05a5ac464028e464918e0bdadb2f3c0a83db1fefe5e6a3f24fde011cb680e27a`), bounded80calls/8Mtokens/¥5/1hour. At this checkpoint it is running; do not restart or claim that its two corrections or127 post-edit cases have already passed.

## Work and cost state

Original live handles ended (`5695` main and `90817` supplemental). Main continuation used98 new calls /11,544,494 tokens /estimated¥2.013756; supplemental used1/74,960/¥0.015944. After both diagnostics, known cumulative lower bound30,011,725 Provider tokens, estimated cost plus historical reserve¥42.078220, before the new local repair's further usage. No402 was observed. Original main ancestry was66 calls /8,321,604 tokens /¥1.274291 and its six-hour start was not reset; the new local repair is a separately bounded changed task with all global cost retained.

Ticket18 stays1/8, project16/22. Generated complete candidate1 (overall), formal first-five accepted0/5. Still required: verified corrected overall Skill, two factions, directed matchups, actual Room use, real replay/reflection/versioned local upgrade and regression/rollback, and scheduler/store conformance. This long goal is active, not complete or blocked.
