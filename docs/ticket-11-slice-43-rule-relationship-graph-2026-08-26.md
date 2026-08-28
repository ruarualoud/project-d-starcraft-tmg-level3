# Ticket 11 Slice 43 — Rule Relationship Graph and omission audit

## Outcome

Slice 43 freezes a content-bound, cross-layer relationship graph for the current exact Rules subset. It is derived audit evidence, not a second source of legal actions or state transitions. The authoritative catalogue/runtime remains unchanged.

- Slice: `910f289b54b73dfcd5b69b52a6d9ad500af68a4e531d311fa3c9d5b0a456fd23`
- Graph: `150345cb69a0e1f9a4ebe93efcd336b280dca3013c57d339a2c372e96a26de06`
- Catalogue: `7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede`
- Runtime: `6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c`
- RuleAtoms: `421/912` actionable executable, `491` review-required, `114` display-only

## Deep-module boundary

`rule-relationship-graph-v1.mjs` exposes only three operations:

1. deterministic frozen graph construction from a verified catalogue and declared extensions;
2. bounded, deterministic impact-path queries;
3. coverage and omission auditing.

The graph carries `relationshipAuthority=derived_audit_evidence_only`, `rulesAuthority=false`, `productionTruth=false`, and `trainingTruth=false`. It cannot enumerate or apply an action.

The frozen graph contains:

| Relationship denominator | Count |
| --- | ---: |
| Nodes | 5,058 |
| Edges | 19,494 |
| Source snapshots | 2 |
| Source clauses | 1,093 |
| RuleAtoms | 1,026 |
| Executable RuleAtoms | 421 |
| Executors | 35 |
| Deduplicated evidence fixtures | 2,829 |

Catalogue structure generates source→clause→atom, atom dependency, parameter-domain, executor consumer and six evidence-kind relationships. Four composition executors that are not the direct `atom.effect.executorId` now have explicit runtime lineage:

- `authority.end-of-round-effects-v3`
- `authority.end-of-round-effects-v4`
- `authority.marine-optional-stimpack-move-v2`
- `authority.optical-flare-ranged-consumer-v1`

After those declarations, source-clause, atom-source, executable-atom consumer, executor consumer and six-kind evidence blocking gaps are all zero.

## First declared state contract

The first bounded state contract covers Marine scale-aware optional Stimpack Move:

```text
casualty
  -> pieces[].currentModels
  -> marine.splitSpeedSelection
  -> old optional Move parameter domain invalidated
  -> four Judge-grid tests
```

The four tests are multi-model base4/Stimpack7, initial-single base7/Stimpack10, reduced-to-single rederivation, and stale pre-casualty-domain rejection.

Separate negative-path gates prove:

- physical `baseSize` derives swept movement geometry and constrains the Move domain, but cannot select split Speed;
- printed `Size` derives effective-Size visibility/height semantics, but cannot reach split Speed or the Move domain;
- a base Move writes positions/activation/coherency/plan identity but does not write payment, damage, Buff markers/status or ability history;
- a Stimpack Move writes the exact payment, Non-Lethal Damage, typed Buff/marker/history and movement state.

Impact queries are deterministic under target and relationship input order. A missing consumer, Judge-test edge, invalidation path, slice/catalogue/runtime ancestry edge, unknown endpoint or graph-content change fails closed.

## What the graph found

The declared Move scope is complete, but global relationship coverage is not:

- unified state contracts declared: `1/35` executors;
- executor state-contract debt: `34`;
- remaining actionable RuleAtoms: `491`;
- global relationship coverage: false;
- production eligibility: false.

This distinction is intentional. Existing source/atom/test relationships are machine-auditable, while undeclared historical executor state reads, writes and invalidation propagation remain visible debt instead of being silently treated as complete.

## Verification

- Slice 43 focused relationship acceptance: `18/18`.
- Generic executable runtime: `10/10`.
- Historical Slice 42: `17/17`.
- Ticket 11 foundations: `105` base reports / `1,069` assertions.
- Including aggregate: `106` reports / `1,078` assertions.
- Product compatibility: `verify:all` green.
- Live official revalidation: Firestore versions `71/69/48`; Marine `4/7`; Part 5 split-Speed wording; Core and Terran P2P hashes unchanged; repository fallback false.

No Skill was generated or promoted. DSH was not run. No MuZero, memory or training candidate was produced.

## Next slice

Slice 44 uses the graph to select a previously explicit high-impact composition gap: Marine Stimpack grants Precision 3 to all Close Combat Weapons, but the current close-combat consumer is not yet connected. The slice must add the exact status→Close Combat Precision LegalSpace/result path and a complete state read/write/invalidation/test/version contract without importing ranged-only conclusions or mutating historical runtimes.
