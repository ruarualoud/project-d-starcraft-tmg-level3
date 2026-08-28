# Ticket 11 Slice 44 — Stimpack Close Combat Precision relationship closure

## Outcome

Slice 44 uses the derived Rule Relationship Graph to close a real omission: current official Marine `STIMPACK` grants `PRECISION (3)` to all Close Combat Weapons, but the frozen active executor could not preserve the selected Bayonet replacement and the frozen Close Combat consumer did not read the typed grant.

- Slice: `e722cc2e5335e26442fb27c2e068c1ca6dcbf97fbbfbab977dd7832c83c9a3a6`
- Catalogue: `732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649`
- Runtime: `7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc`
- Relationship graph: `b2415d3c9564b5c5e6dcad2a70de8af6d9b79ce0035d3c2f0a41d4b4357477a8`
- RuleAtoms: `421/912` actionable executable, `491` review-required, `114` display-only

The graph remains `derived_audit_evidence_only`; only the verified catalogue, LegalSpace and executor transition own gameplay truth.

## Official-current binding

Live Firestore remains `units=71`, `cards=69`, `rules=48`, with repository fallback forbidden. The exact Marine profiles are:

| Close Combat profile | Mode | RoA | Hit | Damage | Official record hash |
| --- | --- | ---: | ---: | ---: | --- |
| Strike | default Combat weapon | 1 | 5+ | 1 | `b0156a37c3e3890968e8fe1f14932d8ebcc9dd9920d00c1cc7a6e27dc50a039a` |
| Bayonet | replacement for Strike | 2 | 5+ | 1 | `9b0f85969b11da20c6d837f23a06335f8572bfd798460de3083ed124cef9205a` |

The current Stimpack text was revalidated live together with Part 11 Precision semantics, Core PDF `27639c56...ea54` and Terran P2P `afa3f229...109c`. The complete current gameplay bundle is `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.

## Executable composition

`official-close-combat-precision-kernel-v1.mjs` is an independent post-Hit choice module. It commits the whole Chance sequence before revealing the choice and enumerates the empty choice plus every subset of failed Hit-die indices up to Precision 3. Chosen failed dice become Hits for every downstream purpose; the client or Agent cannot invent indices or auto-maximize the result.

Two explicit executors preserve historical behavior:

- `authority.marine-stimpack-active-v2@2.0.0` handles the exact `Bayonet + Stimpack` loadout and delegates to frozen v1 with an explicit version/loadout binding instead of silently broadening v1.
- `authority.stimpack-close-combat-consumer-v1@1.0.0` owns the four exact branches: ordinary Strike, ordinary Bayonet, Stimpack Strike and Stimpack Bayonet.

Ordinary branches never expose a Precision choice. Stimpack Strike commits one Hit die plus one Armour die; Stimpack Bayonet commits two Hit dice plus two Armour dice. The pending `resolve_close_combat_precision` action is content/hash-bound to weapon, loadout, status, marker, ability history, revealed dice and complete selection domain. Cleanup, missing status/marker, unknown weapon, malformed history, stale reveal or altered loadout removes or rejects the old domain.

Only Slice 44 uses Authority action schema `hybrid_legal_space_v13`; Strike/Bayonet replacement fields are retained only when the new executor is present. Slice 43, Slice 42 and every older runtime and rules display remain byte-identifiable and strictly frozen.

## Relationship audit

The graph now contains `5,087` nodes and `19,667` edges across `37` executors. It makes these paths queryable and mandatory:

```text
official Stimpack source
  -> typed Precision status/grant
  -> Strike or Bayonet loadout
  -> exact failed-Hit-die subset domain
  -> Close Combat resolution
  -> ordinary/Stimpack, cleanup, fail-closed and replay tests
```

It also records version ancestry from active v2 to frozen v1 and state read/write/invalidation contracts for both new executors. Declared state contracts rise from `1` to `3`; because the executor denominator also rises from `35` to `37`, `34` historical executors remain explicit contract debt. Structural blocking gaps are zero, but global relationship completion and production eligibility remain false.

## Verification

- Slice 44 focused acceptance: `15/15`.
- Generic executable runtime: `10/10`.
- Ticket 11 foundations: `106` base reports / `1,084` assertions.
- Including aggregate: `107` reports / `1,093` assertions.
- Product compatibility: `verify:all` green.
- Ed25519 replay survives HMAC seal rotation; tampered combat history is rejected.
- Both seats, ordinary/Stimpack branches, Strike/Bayonet, cleanup invalidation and unknown-material rejection are exercised.

No Skill was generated or promoted. DSH was not run. No MuZero, memory or training candidate was produced. `rulesEligible=false`, `productionRoomEligible=false`, and `trainingTruth=false` remain mandatory.

## Next slice

Slice 45 will use relationship impact queries and the latest official Marine record to bound multi-model Close Combat profile batching: exact Strike/Bayonet carrier attribution, mixed loadouts, current-model casualty changes and stale-domain invalidation. It must establish the finite denominator before promotion and must not extrapolate the single-model proof silently.
