# Ticket 11 Slice 73 — Specialist v2 contract closure

## Outcome

Slice 73 closes the existing Specialist Loadout and Specialist ranged-batch state contracts without adding RuleAtoms. Current rooms use `authority.specialist-loadout-v2@2.0.0` and `authority.specialist-ranged-batch-v2@2.0.0`; both old v1 executors remain byte-frozen for historical runtime, replay and rules display.

The explicit adapter accepts only the latest reviewed official `71/69/48` Goliath/Marine unified bundle, snapshot `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`, dataset `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63` and bundle `bf09bd38b9984cb8f1dbc1f6e83d6ad8d436c469433f05ce1af33ba9636f8133`. It translates the sealed Specialist loadout's gameplay/catalogue hashes in both directions, recomputes the content seal, and keeps the pending sequence's loadout reference consistent. Repository fallback and silent compatibility are forbidden.

## Public contract

- Army-building LegalSpace exposes the current Specialist parameter domain.
- Exact AGG-12 assignment is sealed against the current bundle.
- Assault LegalSpace exposes four first-batch actions: two profiles across two Goliaths.
- C-14 and AGG-12 resolve as distinct sequential batches.
- The intermediate pending sequence and current piece share the exact loadout seal.
- Current data and MissionSetup bindings are restored after every delegated apply.
- Stale domain, action, adapter receipt, source or seal drift fails closed.

## Frozen release

- Slice: `c2e48a0d54a443abe47f0a29f95ef7d2496b220b4ed6c3542855bb2c6d2364d0`
- Catalogue: `aaf2e78b1da4677a41b08192a88a2afe03038a1d8f7be15778323fc7578a7ff7`
- Runtime: `1ca94b751948b8ae21a46f519177433327b1b18cd1065ef14323b38ffbbaa6e6`
- Relationship graph: `dd3ada1f3c9066dc7110b6220d386464a2d4cc748287b273197460e0def992f0`
- Graph denominator: 8,318 nodes / 26,361 edges / 39 scopes.

Ten existing atoms are version-rebound and no atom is added. Coverage moves from `407 strict / 9 partial / 5 none` to `417 strict / 4 partial / 0 none`; declared contracts move from `38/42` to `40/42`.

## Gates

- Specialist public contract: 16 assertions.
- Closure: 7/7.
- Central runtime and manifest: 10/10.
- Ticket aggregate: 9/9, 135 base reports / 1,380 assertions; including aggregate, 136 reports / 1,389 assertions.
- Seven official online endpoints were revalidated with `repositoryFallbackUsed=false`.
- Authority Preview → Confirm → Apply, Ed25519 replay after HMAC rotation, signature tamper rejection and relationship missing-edge rejection pass.
- Frozen v1 source hashes: Loadout `6bc5b048d975436f385245078a56e6fb778bb7f251bc33367df00c6ede4662ac`; ranged batch `8e2a0041c6b511c44ef76f3312040d9978f07e2b6c11744c1e1e356c0e334d56`.

## Promotion boundary

The relationship graph remains derived audit evidence, not Rules authority. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. Ticket 11 remains open: two executor contracts and four non-strict atoms remain for Slice 74, while 491 review-required atoms remain outside this executor-contract route.
