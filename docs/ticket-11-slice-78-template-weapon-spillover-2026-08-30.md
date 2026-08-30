# Ticket 11B Slice 78 — Template weapons and Spillover

Slice 78 promotes the exact 23 Core 8.7.6, Core 11 Spillover, and Quick Reference template-weapon RuleAtoms. The current ledger is `480` executable, `432` review-required, and `114` retained display-only atoms.

## Executable denominator

`authority.template-weapon-v1@1.0.0` executes the rules procedure over a content-hashed template geometry artifact:

- Blast anchors the template centre to the primary target model centre.
- Flamer places the narrow end flush with the attacking model's round base and aims its axis at the primary target.
- Round-base/polygon intersection determines partial or full coverage.
- Same elevation, Flying/target-tag eligibility, and Size 2+ terrain traces filter affected models.
- The primary target Unit receives one main Batch: affected models plus its Rate-of-Attack modifier.
- Every other covered Friendly or Enemy Unit receives a separate Spillover Batch containing only its affected-model count.
- Hit rolls transfer successes to each Batch's Armour Pool. No Surge Die is rolled; the main target's Surge Result equals its affected-model count and Spillover never applies Surge.

State, terrain, pending, source-lock, or geometry drift invalidates the parameter domain. Authority Preview → Confirm → Apply uses Ed25519 receipts; replay succeeds after HMAC rotation and rejects tampering.

## Explicit production quarantine

The sealed latest official Command Center denominator (`71/69/48`) contains 25 current Unit records but no Firebat, Siege Tank, or any current weapon profile with BT/FT. The locked official rules explain the procedure and show those two Units only as visual examples; they do not supply a current carrier profile or physical template dimensions.

The kernel is therefore executable in explicit rules-procedure conformance mode, but current production carrier enumeration is quarantined. No legacy repository profile, invented Unit, client-authored coverage list, or silently substituted template size is accepted. A later official source version may add a carrier and content-hashed geometry asset through a versioned adapter without rewriting this rules kernel.

## Evidence

- focused Judge: `16/16`;
- current runtime gate: `10/10`;
- aggregate gate: `10/10`;
- evidence denominator: `141` base reports / `1,453` assertions; with aggregate, `142` reports / `1,463` assertions;
- strict executor state contracts: `47/47`;
- relationship graph: `8,783` nodes / `27,405` edges;
- slice `77f415c1b6ef8363ecde758d71bd661822ddd9eeedf0156ab7b95e70eee7165b`;
- catalogue `5829d562f56df54b0e57a76ae130fba0c41a2ed57de3e93b7c6147839ee986ee`;
- runtime `d21b5fb901e8b50a9f9e327b3968e7d8340473c158a04c8c628f1d93c16e1e17`;
- graph `3aef268d73670933d979486c2558db6b7a23941db92144648d672a00f099a763`.

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced.
