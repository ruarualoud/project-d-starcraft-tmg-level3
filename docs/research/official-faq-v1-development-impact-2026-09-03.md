# StarCraft TMG FAQ V1.0 development-impact audit

Status: planning audit only; no source refresh, RuleAtom promotion, or runtime
change was performed.

## Decision

The official FAQ V1.0 adds real development work. It does **not** imply 68 new
RuleAtoms: many of its 68 answers clarify semantics already represented in the
current Core-derived catalogue, while others change or combine behaviours that
are not yet proved by the frozen executable corpus.

The current immutable baseline remains valid for rooms pinned to its exact
source lock. It is not the complete latest official rules authority until the
FAQ is frozen into a new source version, reconciled item by item, implemented,
and passed through the aggregate and cross-time gates. The old source version
and its readable rules must remain available; no silent compatibility or
replacement is allowed.

## Official source and observed denominator

- The official [Downloads page](https://starcraft-tmg.com/downloads) lists
  `StarCraft-TMG-FAQ_EN`.
- The linked [FAQ V1.0 PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf)
  is a five-page rules FAQ with 68 question entries.
- Observed PDF SHA-256:
  `eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c`.
- The 68 entries divide into eight sections:

| Section | FAQ entries |
| --- | ---: |
| Units and Characteristics | 4 |
| Measuring and Movement | 10 |
| Battlefield | 5 |
| Deployment and Entry Edges | 8 |
| Attack | 6 |
| Abilities and Tactical Cards | 19 |
| Keywords | 12 |
| Templates and Spillover | 4 |
| **Total** | **68** |

This audit paraphrases the source for engineering analysis. It does not copy or
redistribute the FAQ.

## Current executable baseline

Ticket 11 closed its frozen Core-derived denominator at:

- 912/912 actionable RuleAtoms executable;
- 114 display-only records retained;
- 80/80 executor state contracts complete;
- 101/101 planned rule verticals complete.

The earlier count of 421 was an intermediate executable count, not the final
catalogue denominator. FAQ reconciliation must therefore map against the exact
912-atom catalogue and its relationship graph, not against 421.

## Static impact findings

### Existing semantics that still require FAQ-bound regression evidence

The repository already has executable coverage for several FAQ families,
including the shield threshold/first-model/healing lifecycle, Wobbly placement,
Surge versus Evade, target-number clamping, excess-resource loss, reaction and
REPEATABLE timing, Life Support total-damage handling, PINPOINT, LOCKED IN,
Indirect Fire, HIDDEN/Burrowed, Specialist loadouts and ranged batches, and
template/spillover primitives.

That is not enough to declare those FAQ entries closed. Each entry still needs
an exact source node, semantic mapping, positive and negative witnesses, and a
cross-time proof against both the old and new source bindings. Some entries may
close without adding an atom; they still add source, graph, and verifier work.

### Confirmed behaviour/version work

At least one concrete mismatch is visible before a full reconciliation: the
current standard-move path contract rejects paths over the maximum distance but
does not require a positive distance. FAQ V1.0 says a zero-distance Move or Run
is not a Move/Run and is treated as Hold. The current executor must remain
available for its frozen source version; a FAQ-bound version must reject the
zero-distance action and expose the correct Hold route.

Other FAQ clarifications that are not presently proved as exact end-to-end
interactions include:

- last completed movement versus later casualty changes for objective
  coherency;
- gap clearance against models as well as terrain, high-ground edges, and
  links that cross engaged models or access points;
- the maximum-possible constraint for directly-toward/away movement;
- deactivated marker control and physical-card-copy blocking;
- special Entry Edge ownership, denial immunity, Zone-of-Influence exclusion,
  activation consumption, and end-of-round marker deployment failure;
- Reserve restrictions, deployment nomination, and deployment-speed handling;
- weapon-batch declaration order, visible casualty selection, Close Ranks, and
  all-enemy engagement preservation;
- self-range, named Active limits, reaction priority, synonymous select/target
  language, and named ability interactions;
- morph supply reduction scoring and Specialist weapon removal;
- template elevation/tag spillover, Guardian Shield per-batch reduction, and
  main-pool-only Precision/Critical behaviour.

Some items in this list may reuse current primitives. Until each item has an
exact ledger row and executable witness, reuse cannot be counted as closure.

## Planning estimate, not an acceptance denominator

A defensible implementation estimate is:

| Impact class | Estimated FAQ entries | Meaning |
| --- | ---: | --- |
| Existing semantics; add FAQ source/graph/regression proof | 18–24 | Likely no new transition primitive, but new evidence is mandatory. |
| Existing executor needs a source-versioned rule or interaction extension | 24–32 | Reuse the primitive, add or change orchestration and witnesses. |
| Likely new carrier, interaction, or RuleAtom implementation | 12–20 | Missing or currently unproved product-specific semantics. |

These ranges deliberately overlap at classification boundaries and must not be
summed. The exact count can only be frozen after a 68-row semantic ledger maps
every FAQ entry to zero, one, or multiple existing/new atoms and relationship
edges.

## Recommended five-slice FAQ addendum

The FAQ should not be inserted into Ticket 14 Slices 135–138: those slices close
the shared client migration and browser/device evidence. It should be a separate
rules-source maintenance addendum completed before Ticket 15 live role-Agent
sessions are allowed to claim current official rules, and before any self-play
or MuZero export is eligible for training truth.

| Proposed slice | Scope | Closure evidence |
| --- | --- | --- |
| FAQ-F1 | Explicit source refresh into a new immutable lock; retain the old lock and old-rule display. | Exact PDF bytes/hash, provenance, rights/use label, source precedence, no mutation of prior rooms. |
| FAQ-F2 | Reconcile all 68 entries against the 912 atoms and relationship graph. | Fixed 68/68 ledger; each entry classified as confirm, refine, supersede, conflict, or new; unresolved count explicit. |
| FAQ-F3 | Movement, geometry, battlefield, mission, draft, deployment and Entry Edge deltas. | Source-versioned executors; positive/negative/interacting witnesses; historical replay unchanged. |
| FAQ-F4 | Reserve, ability, Tactical Card and keyword deltas. | Named carrier matrix, timing/target/payment/placement proofs, missing carriers fail closed. |
| FAQ-F5 | Attack, casualty, batch, template, spillover and scoring deltas; aggregate closure. | New-version aggregate, relationship graph, cross-time replay, viewer-safe room gate, Ticket 15/19 handoff. |

The five slices are a planning proposal, not yet a frozen denominator. F1 must
not start until the user explicitly authorizes the source refresh. F2 can be
prepared as a review ledger without promoting the FAQ to runtime authority, but
its final hashes still depend on the new immutable source lock.

## Schedule impact

- Ticket 14 remains at 7/11 with exactly four fixed slices remaining:
  135–138.
- If the FAQ addendum is accepted, near-term known work becomes four fixed
  Ticket 14 slices plus five proposed FAQ slices: nine slices.
- Tickets 15–22 remain ticket-level roadmap items and have not yet been split
  into frozen slice denominators. A truthful whole-project slice total therefore
  does not yet exist.
- Nine Tickets are unfinished including active Ticket 14; after Ticket 14
  closes, eight Tickets remain.

## Evidence consulted

- `docs/research/official-latest-data-audit-2026-09-03.md`
- `docs/ticket-11-closure-2026-09-02.md`
- `docs/ticket-11-slice-111-dispute-resolution-rules-2026-09-02.md`
- `packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs`
- `packages/rule-atoms/official-standard-move-executor-v1.mjs`
- `scripts/verify-official-combat-tag-shielded-rule-slice-v1.mjs`
- `scripts/verify-official-medic-medpack-rule-slice-v1.mjs`

No source capture/import script, Provider, Skill, DSH, MuZero, self-play, or
training process ran during this planning audit.
