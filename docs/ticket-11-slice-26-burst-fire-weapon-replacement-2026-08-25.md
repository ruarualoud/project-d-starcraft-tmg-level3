# Ticket 11 Slice 26 — Burst Fire and Weapon Replacement

Date: 2026-08-25  
Status: frozen bounded rules slice; Ticket 11 remains in progress  
Training truth: false

## Outcome

Slice 26 promotes five canonical RuleAtoms through the official Runtime/LegalSpace/Preview/Apply/Receipt/Replay path:

1. Core 5.2 replacement selection.
2. Core 5.2 upgrade selection.
3. Part 9.1.7 replacement removes the linked weapon.
4. Part 9.1.7 selected upgrade applies to the whole Unit.
5. `BURST FIRE X/Y` changes effective Rate of Attack by range band.

The implementation is deliberately compositional. Raynor does not receive a bespoke hard-coded attack branch: the authority layer first resolves the selected `C-14 rifle` replacement loadout, the attack-profile layer provides the parameterized Burst Fire effect, and attack kernel v4 executes that effect before the versioned ranged executor resolves Chance and damage.

## Exact bounded authority

- Current official source tuple remains `units=71 / cards=69 / rules=48`.
- Live Core PDF hash remains `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`.
- The newer same-version capture changes only display-only community upvotes. It is bound as snapshot `243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c` and dataset `225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021`; current official product content is unchanged and repository fallback remains forbidden.
- Raynor's current official document canonical hash is `4d03fae1fbe5ed539c0beaad587a3f64add95d649b50dd35298959bedc5135cd`; Marine's is `ed87862a674fe7b6cbc9f6692185d8f53df9048eda46d4823d51a87f7a237498`; both match the frozen reviewed records.
- The executable v5 example is one Supply-1 Raynor model on a 40 mm base with exactly the `C-14 rifle` upgrade selected against one unmodified Supply-0 Marine model on a 32 mm base, unengaged, with no terrain, shield, elevation, access, or extra modifier.
- Selecting `C-14 rifle` removes its linked `Commando Rifle` from the effective weapon list. Without that exact selected-upgrade receipt, the C-14/Burst Fire action is not legal.
- At base-edge distance at most 8 inches, Burst Fire makes effective Rate of Attack 9. Beyond 8 and through Range 12 it makes effective Rate of Attack 6. Beyond Range 12 rejects.
- Preview preallocates every hidden D6 ticket: 19 tickets for the close band and 13 for the outer band. Apply cannot request extra randomness.
- Historical ranged v4 remains exact at runtime `99510a4d31ccfe8f84f7ec97df35c85d758111a2fed283cd6bcd51c79f0c7683`; old-rules display remains mandatory. Ed25519 replay survives HMAC rotation, while content or signature tampering rejects.

## Frozen identities

- Attack-profile catalogue: `b74f20b677feb0c6a2d0814f0b2317cd16eb411f5156f336c9521c3ead11ba11`
- Raynor C-14 profile: `a5f5beda031eacdbaeba5949b4dd03cff662432a1acfb35b908bab56165e3ac3`
- Attack kernel v4: `820d1b7b7ebb1e7d6a5cf0bf5e6f8be5f300c14af0c1711e9e08b273e4fc8afe`
- Selected loadout: `48364d8c02f5a2dec53044467523c19dbd18d4f6e631a15e0b59b420cfb85bf9`
- Slice v5: `44cdf6abfe325d8934e999a9b78e20732b17148da3b81500b6d10e6b1f574a0b`
- Catalogue v5: `e6d616c079b627d80a626bb747bd37d8c5fa807e3db8fd2c3bf0d0af6389cb22`
- Runtime v5: `36aa2c6d931f3002fb5ca2651f727da6f47b348b186b4edbfdb64b7fd6dbd388`

## Evidence

- Burst Fire kernel: `8/8`
- Weapon replacement/loadout: `6/6`
- Slice 26 Authority and replay: `7/7`
- Current runtime: `10/10`
- Aggregate verifier: `8/8`
- Complete Ticket 11 foundation gate: 83 base reports / 813 assertions; including aggregate, 84 reports / 821 assertions; zero failures.

## Current atom and slice denominator

- Frozen slices: `26`
- Canonical RuleAtoms: `1,026`
- Display-only atoms: `114`
- Actionable atoms: `912`
- Executable actionable atoms: `304/912` (`33.3%`)
- Remaining actionable atoms: `608`
- Executable attack-effect handlers: `5/13` — Surge, Long Range, Pierce, Anti-Evade, Burst Fire
- Remaining attack-effect handlers: `8/13`

The remaining 608 are fine-grained semantic atoms, not 608 independent subsystems and not 608 future slices. Their primary source ownership is:

| Source area | Remaining atoms | Typical content |
| --- | ---: | --- |
| Part 11 | 190 | glossary definitions and keyword semantics |
| Part 8 | 95 | activation/combat timing, targeting, attacks and damage |
| Part 9 | 89 | Units, weapons, abilities, upgrades and replacement rules |
| Part 10 | 42 | terrain, elevation, access and battlefield interactions |
| Part 7 | 35 | round/phase and activation structure |
| Part 2 | 28 | general concepts, ownership and measurement |
| Part 5 | 28 | deployment and setup |
| Part 4 | 27 | army construction and pre-game state |
| Part 12 | 26 | quick-reference-derived rules retained as canonical atoms |
| Part 3 | 13 | components and game objects |
| Part 6 | 2 | remaining mission/setup transitions |
| FAQ | 2 | current official supplemental rulings |
| Cross-Part | 31 | atoms whose evidence and dependency span multiple Parts |
| **Total** | **608** | |

Parts 11, 8 and 9 account for 374 atoms, or 61.5% of the remaining denominator. Many will be closed together by one vertical slice because one executor normally owns several prerequisites, rejection paths, timing clauses and replay facts. The rolling `304 / 26` throughput projects about 52 more planning slices, but this is a scheduling forecast rather than an acceptance denominator.

## Explicit non-claims

This slice does not prove general upgrade handling, other linked weapons, arbitrary Raynor formations, other bases/targets, terrain, cover, elevation, shields, Sidearm, mixed bands, multi-target attacks, or the remaining eight attack effects. It creates no Skill, DSH, MuZero, memory, or training promotion. Production-room eligibility remains false.
