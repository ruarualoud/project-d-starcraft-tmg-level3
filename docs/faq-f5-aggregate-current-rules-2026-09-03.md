# FAQ F5 — attack rules and current-rules aggregate

Date: 2026-09-03
Status: FAQ Rules truth complete; Ticket 14 production-room rebind pending

## Outcome

F5 implements the final 18 FAQ entries as 40 atomic rules. It covers Shields,
non-lethal damage, destroyed-unit return, Evade/Surge ordering, target-number
clamping, ranged casualty eligibility, Close Ranks, multi-enemy engagement,
sequential weapon batches, batch-scoped PRECISION/SURGE/CRITICAL, Morph Supply
scoring, model-less Blast abilities, regular Spillover, Guardian Shield per
batch and main-target-only weapon modifiers.

The F3/F4/F5 aggregate now closes all 68 FAQ entries with 137 new executable
atomic rules. Composed with the immutable Ticket 11 base, the current catalogue
has 1,163 atoms: 1,049 executable, 114 retained display-only and zero
review-required. The runtime has 83 executors (80 base plus three FAQ kernels).

## Current identities

- FAQ source lock: `2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226`
- Reconciliation: `081f95c49917d8545a36b74a0f4e5479754453349d288ef369d53170195eac68`
- Aggregate: `cc3ab3d151d96af101aecb249422c816076ee251f66326659830743fbe6b4d2e`
- Catalogue: `c2ed9b51482c2d83767fd1e2d41b5cfc5a3f9db97e6c408e4579d7ee2aab208f`
- Runtime: `82d436a60751a82dfb1a2ad7686cb47d6855883709460128e50baa72c1dbb6fd`
- Relationship overlay/composition graph: `ac3b6d556cca6ec0ae42bef78c276289954084c248e996a6d00d7d1261d1659a`
- F5 release: `1257721414ee269e6b117b41a2734d71e1299dc0b7d411e189a25629a7f1ffa7`

The 567-node/1,308-edge FAQ composition graph references, rather than copies,
the immutable 12,292-node/33,644-edge Ticket 11 graph. It contains every FAQ
entry/atom/behavior/state edge plus current catalogue/runtime consumer edges.

## Token/Marker handoff

The current aggregate freezes a content-addressed Token/Marker contract with
12 FAQ entries and 27 atomic rules. It binds the exact current catalogue,
runtime and graph and requires Rules-owned writes with unknown actions rejected.
Contract hash:
`f42f79c57d7fda3581a678b14a9d603d9630c1f7178aecf9f08acbb40f912c49`.
Ticket 14 Slice 140 must use this contract and must remove its temporary binding
to the pre-FAQ Ticket 11 identities.

## Version and authority boundary

Current FAQ rooms and historical pre-FAQ rooms have separate exact bindings.
A room mixing old and new source/catalogue/runtime/graph hashes is quarantined;
there is no fallback. Historical rule display and Replay remain available.

F5 verification passes 17/17 with 18 positive, 15 negative/boundary and seven
interaction groups. The aggregate is Rules truth and eligible for the Ticket14
rebind. It is not yet production-room truth because Slices 140–143 must wire
and verify the Web/App client. It is not Skill or training truth: no Provider,
Skill generation, DSH, MuZero export, self-play, memory or training promotion
ran in the FAQ addendum.
