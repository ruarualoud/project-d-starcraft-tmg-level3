# FAQ F2 — 68/68 rule reconciliation

Date: 2026-09-03
Status: classification complete; versioned Rules implementation remains blocked on F3–F5

## Outcome

The 68 entries in official FAQ V1.0 are now reconciled one-for-one against the
frozen Ticket 11 catalogue and RuleGraph. Each tracked row binds the official
question and answer hashes, a short original summary, its existing executable
RuleAtom references, its implementation slice, and whether it affects
Token/Marker behavior. The tracked ledger does not embed the source FAQ prose.

| Disposition | Entries | Meaning |
| --- | ---: | --- |
| `confirm` | 23 | Existing behavior matches, but must be reverified under the new source version |
| `refine` | 26 | Existing RuleAtoms are related but need a stricter or broader contract |
| `supersede` | 0 | No current behavior is silently replaced |
| `conflict` | 0 | No unresolved same-version authority conflict was found |
| `new` | 19 | No current executable RuleAtom fully owns the clarification |

FAQ 56 is a refinement, not a supersede. A target unit with at least one
visible model is in line of sight and therefore receives no off-line-of-sight
Indirect Fire Evade, while its non-visible models may still be casualties. The
frozen rule that a completely unseen Indirect Fire target may Evade remains
valid. F4 must prove both sides of that visibility boundary.

## Implementation routing

| Slice | Entries | Scope |
| --- | ---: | --- |
| F3 | 23 | movement, coherency, battlefield, draft, deployment and Entry Edge behavior |
| F4 | 27 | abilities, tactical cards, keywords and one Specialist lifecycle rule |
| F5 | 18 | shields, attacks, casualties, batches, Morph scoring, templates and spillover |

Twelve entries affect Token/Marker semantics and therefore gate the paused
Ticket 14 Slice 140 write palette: 16, 19, 21–24, 27, 41, 47, 52, 54 and 57.
Token UI work must consume the post-F5 catalogue/runtime/graph and may not bind
the older Ticket 11 hashes as current truth.

## Authority boundary

The base Ticket 11 identities remain immutable: 1,026 RuleAtoms, 912
executable, 114 display-only, 80 executors, 12,292 graph nodes and 33,644 graph
edges. F2 is an agent-prepared reconciliation ledger, not a claim of external
human review. It grants no Rules, production-room, Skill, DSH, MuZero,
self-play or training authority. F3–F5 must implement, judge-test and
cross-time replay the new version before it can become current.

Focused evidence: `npm run verify:faq-f2-rule-reconciliation` passes 14/14;
the adjacent F1 source-lock regression passes 10/10. Reconciliation hash:
Corrected reconciliation hash:
`081f95c49917d8545a36b74a0f4e5479754453349d288ef369d53170195eac68`.
Downstream F3–F5 releases pin it exactly.
