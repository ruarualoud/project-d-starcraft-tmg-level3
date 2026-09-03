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
| `refine` | 25 | Existing RuleAtoms are related but need a stricter or broader contract |
| `supersede` | 1 | New FAQ behavior must replace the current behavior only in a new version |
| `conflict` | 0 | No unresolved same-version authority conflict was found |
| `new` | 19 | No current executable RuleAtom fully owns the clarification |

The single explicit supersede is FAQ 56. The frozen Core-derived atom says an
off-line-of-sight Indirect Fire target may Evade; FAQ V1.0 says the unseen
target does not receive Evade. F4 will introduce a new source-versioned
behavior while leaving the pre-FAQ runtime available to historical rooms and
Replay.

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
`3cc2da9532c43dfbbf85cf831b7f4a9fb4f89555658af27d1687fe72b555f85b`.
