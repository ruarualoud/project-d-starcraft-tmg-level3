# Ticket 11 Slice 68 — Current Academy / Medic v2 Contract Closure

Started and frozen: 2026-08-29

## Outcome

Slice 68 closes three existing executor state contracts against the current official StarCraft TMG data bundle:

- `authority.academy-medic-ability-v2@2.0.0`;
- `authority.medic-restoration-reaction-v2@2.0.0`;
- `authority.optical-flare-ranged-consumer-v2@2.0.0`.

The slice adds no RuleAtom and keeps the fixed executable denominator at `421`. Twelve atoms are explicitly rebound from the frozen v1 executors to v2; the v1 source bytes, old catalogue, old runtime and old rules display remain frozen and replayable.

## Explicit current-to-frozen adapter

The v1 executors were bound to the older official gameplay bundle. Slice 68 does not silently make them accept new data. A fail-closed adapter first verifies the exact current unified bundle, mission binding, match binding, profiles and `71/69/48` versions, then creates an explicit frozen semantic view and a content-addressed adapter receipt. Apply rejects missing, stale or tampered receipts and restores the full current state after delegation.

The current Medic source exposes both the zero-cost Medpack and Optical Flare capability while the selected Start v5 loadout records Medpack. The adapter explicitly supplies the frozen v1 ability view without inventing a Start v6 rule. The Optical Flare combat adapter similarly removes current-only `stationary` data only inside its frozen delegate and restores it afterward.

## Atomic state boundaries

The Academy contract owns declaration, reaction payment and resolve windows, active-ability CP reduction, per-round usage and exact-action lineage. Academy is not exhausted by the reaction.

Restoration owns its exact trigger window and removal of the selected Optical Flare debuff. Optical Flare owns its ranged consumer branch, including the eight-inch range cap and loss of long-range eligibility. Reads and writes are declared in the relationship graph; removing a required event-to-write edge fails the graph audit.

## Latest official data and authority proof

The closure revalidated ten live official endpoints with no repository fallback:

- Firestore versions: `71/69/48`;
- source snapshot: `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`;
- dataset: `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63`;
- current unified gameplay bundle: `f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459`;
- frozen v1 gameplay bundle: `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`;
- repository fallback: `false`.

The authority trace covers Start v5, phase initiative, Academy declare/use/resolve, Restoration use and Optical Flare ranged resolution. It records six Preview → Confirm → Apply receipts under `hybrid_legal_space_v25`, verifies content hashes and Ed25519 long-term signatures, replays after HMAC short-seal rotation, and rejects event tampering.

## Coverage movement

Fixed denominators:

- executable RuleAtoms: `421`;
- review-required actionable RuleAtoms: `491`;
- display-only RuleAtoms: `114`;
- executors: `42`.

Coverage movement:

- declared executor contracts: `31 → 34`;
- missing executor contracts: `11 → 8`;
- strict-complete atoms: `288 → 372`;
- partial atoms: `79 → 4`;
- no-contract atoms: `54 → 45`;
- existing non-strict atoms: `133 → 49`.

The three contracts overlap broadly with already-declared ability and ranged consumers. Closing them therefore makes 84 existing atoms strict even though only 12 atom identities change executor ownership.

## Frozen identities and evidence

- slice: `18d162941b3f83c7efed2e52c4dea1b3ec57854878139ed34e3e55723f77efca`;
- previous slice: `17733ad254b5c934673c137966a24e18ddaf7ac679a4754bffb8fb25a2c42c07`;
- catalogue: `4043ad65b05c9f5c8742a7bfffeea36404575f58b10d9c5a51081cd06cfcbf8a`;
- runtime: `0e94d259842feec3fb872bb01ed3e6ba0729f2c53e572c76c6e30578a81f4e6e`;
- relationship graph: `c4aacd18eef0e9d4ed63ef1925eaf84f75af7b728df59cf3a04f152aa82a21e4`;
- graph: `7,970` nodes / `25,373` edges / `33` scopes;
- adapter verifier: `8/8`;
- current public contract: `12/12`;
- focused closure: `9/9`;
- current Runtime/manifest: `10/10`;
- cumulative ledger: `9/9`;
- evidence denominator: `130` base reports / `1,343` assertions; with aggregate `131 / 1,352`.

Primary report:

`build/ticket-11-rule-atoms-v1/official-existing-academy-medic-v2-contract-closure-v1-report.json`

## Boundaries and remaining work

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. `rulesEligible`, `productionRoomEligible` and `trainingTruth` remain false.

Eight executor contracts and `49` existing non-strict atoms remain: Goliath Scatter ranged, Shielded ranged, Medic Life Support, Sidearm/Pinpoint ranged, Specialist ranged, Specialist Loadout, Marine Stimpack Active and Stimpack ranged.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421` existing executable atoms are strict.
