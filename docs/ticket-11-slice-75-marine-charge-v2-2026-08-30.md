# Ticket 11 Slice 75 — Marine Charge v2

## Outcome

Slice 75 promotes the 24 reviewed Charge RuleAtoms from Core 8.7.7 and Quick Reference 12.4. The ledger moves from `421/491/114` to `445/467/114` executable/review-required/display-only, and the executor-contract registry moves from `42/42` to `43/43` closed contracts.

This is not a rewrite of Charge from zero. `authority.marine-charge-v1@1.0.0` remains byte-exact historical evidence and supplies reviewed bounded path/placement geometry through an explicit adapter. Current rooms use `authority.marine-charge-v2@2.0.0`, which replaces the incomplete source, pending, Apply, settlement, relationship, and Authority seams without silently treating v1 as current authority.

## Development-tranche source lock

One explicit official-source capture was performed before implementation and is now replayed offline:

- tranche: `ticket-11-slices-75-111`;
- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`;
- source snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`;
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`;
- official versions: `units=71`, `cards=69`, `rules=48`;
- source-lock audit: `57e74ea2a2fd771899e189326b10224c1f4b5a826575f4f4128a1feefeaca983`.

The capture contains 83 official product records, 15 official rule-prose review records, and 173 community display-only records. Two same-version additions are isolated to community display; neither official product data nor official rule prose changed. Automatic refresh and repository fallback are disabled. A later refresh requires an explicit user command and creates a new immutable lock.

## Exact supported contract

The current bounded denominator is GAUNTLET Standard, 32mm round Ground Marines, and no terrain, Access Points, battlefield tokens, or effect markers. The active Unit's live model count selects official split Speed (`4` for multiple models, `7` for one), then a hidden D6 produces the Charge Roll Distance.

The declaration domain permits any positive number of distinct target Units; it does not encode an eight-slot or other UI maximum. One target model is selected per target Unit, and all targets are committed before the hidden roll is revealed. A v2 pending state binds the source lock, current gameplay data, exact declaration, roll, state revision, and the byte-exact v1 adapter receipt.

Resolution is a separate exact action. A successful resolution validates the submitted actual path and placements, applies final model positions, marks the Unit's Assault activation complete, clears pending state, and hands settlement back to the alternating runtime. A failed resolution moves no model, completes the activation, clears pending state, and requires a Rules-owned certificate; the client cannot turn an invalid submitted path into an authoritative failed Charge.

Current failure certificates cover:

- `distance_shortfall`: even the minimum straight-line distance to a declared target exceeds the rolled allowance;
- `declared_target_spread`: no Leading Model position can be within Engagement Range of every declared target because at least two selected target models are too far apart.

Other obstacle, terrain, base, elevation, Flying, remaining-model priority, and general continuous-geometry impossibility proofs are outside this denominator and remain fail-closed. They are not silently classified as successful or failed Charges; the later geometry slices own those wider proofs.

## State and relationship contract

The 43rd executor contract declares the exact phase, seat, Unit/model geometry, source/data, pending, activation, active-side, and log reads/writes/invalidations. Source binding and historical adapter edges are explicit. Score, mission, resources, Supply, terminal state, and unrelated status fields are protected.

The current graph contains `8,520` nodes, `26,841` edges, and `43/43` executor state contracts. Removing a required Charge edge makes the focused Judge fail. The graph is audit evidence; the executor and Authority remain the rules-owning boundary.

## Verification evidence

- source-lock verifier: `4/4`;
- Charge v2 focused Judge: `19/19`;
- current runtime/manifest verifier: `10/10`;
- Ticket 11 targeted aggregate: `10/10`, comprising `138` prior reports / `1,410` prior assertions and `139` reports / `1,420` assertions including the aggregate;
- Slice hash: `e85b759217d748fd1701441317037a664cdd0bdb348726b9ec9c8904d042af9e`;
- catalogue hash: `f64ec51e5c15a34d290bd764cc4f0c9b0f4579b7a03fae505380126781f94aed`;
- runtime hash: `0d794f82236ed4486a7c8405a3eb46775a84299ce36d2d8dc2a7a4b164562161`;
- relationship-graph hash: `730a0f55f17c16a46a4dc2f8ac955a42a80c8889485bc802bbd488055f5e568e`;
- frozen v1 executor artifact hash: `8bba00cefa8305403c587eb8bbf14b35714cf440b992444017552833341105f5`.

The Judge covers declaration-before-roll, single/multiple split Speed, three declared targets, success movement and settlement, certified failure and rejection of unproved failure, stale target/state/source rejection, collision/overlap rejection, Flying rejection, relationship-edge mutation, exact v1 file freezing, Authority Preview→Confirm→Apply, Ed25519 replay after HMAC rotation, and signature/action tamper rejection.

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training-truth artifact was produced. Next planned work is Slice 76, the Impact-after-successful-Charge pipeline, with six atoms. Thirty-six planned RuleAtom slices remain.
