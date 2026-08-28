# Ticket 11 Slice 28 — Critical Hit and Kerrigan's Blades

Date: 2026-08-26  
Status: frozen bounded rules slice; Ticket 11 remains in progress  
Training truth: false

## Outcome

Slice 28 promotes the canonical Part 11 `Critical Hit` RuleAtom through the official Runtime/LegalSpace/Preview/Apply/Receipt/Replay path:

> During Resolve Surge, move up to X dice from the Armour Pool directly to the Damage Pool. The transfer bypasses Armour and cannot exceed the Armour Pool.

The rule is an independent parameterized effect, not Kerrigan-specific logic. Kerrigan's current official `Blades` profile supplies `CRITICAL HIT (2)` as the first exact executable consumer. The old v1 profile catalogue had parsed the parameter under the misleading field `additionalHits`; that catalogue remains immutable for historical slices and never gains Critical Hit authority. Catalogue v2 binds every previous profile hash and performs one explicit semantic correction to `bypassArmourDice`, with no silent compatibility.

## Latest official-data revalidation

- Command Center versions remain `units=71 / cards=69 / rules=48`; the versions document update time is `2026-05-26T13:23:51.064119Z`.
- The live Kerrigan record update time is `2026-03-16T21:23:54.477693Z`; its exact current Blades text is Range Engagement, Ground target, RoA 6, Hit 4+, Damage 2, no Surge, `CRITICAL HIT (2)`.
- The live Core Part 11 record update time is `2026-05-18T06:58:44.262941Z`; its exact Critical Hit and Dodge clauses bind the transfer timing and the possible Dodge reduction.
- The live Core PDF is SHA-256 `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`, with `Last-Modified: Tue, 09 Jun 2026`.
- Full live collection comparison found all 26 Army Units, 15 Rules Sections and 37 Tactical Cards exact. Ten of 191 Faction Card documents changed only community-mission `upvotes`; the official gameplay projection did not change.
- The newest accepted gameplay snapshot therefore remains `243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c`, dataset `225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021`. Repository fallback remains forbidden.

## Exact bounded authority

- Attacker: one current official Supply-1 Kerrigan model, HP 9, Armour 5+, Evade 6+, on the official 40 mm base, using Blades.
- Target: one current official Supply-0 Marine model, HP 2, Armour 5+, on the official 32 mm base.
- The pair must be the only active units and have exactly one ground-level engagement edge. Terrain, access points, elevation, shields, upgrades, statuses and additional effects are unsupported.
- Preview commits twelve D6 tickets before Apply: six Hit and six preallocated Armour rolls. The latter remain auditable even when Critical Hit bypasses all resulting Armour Pool dice.
- Natural 1 always fails and natural 6 always succeeds. Critical Hit runs after Hit and before Armour, generates zero additional hits, and moves at most two existing hits directly to Damage.
- The proof fixture rolls two hits. Both bypass Armour, the six preallocated Armour rolls are unused, and two Damage Pool dice at Damage 2 deal four damage to destroy the Marine.
- Marine's Supply value is zero, so casualty processing verifies an unchanged zero-delta Supply-loss ledger rather than inventing a loss entry.
- The separate `DODGE X` interaction is not implemented. A target with Dodge evidence fails closed as `CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED`; the engine does not approximate the reduction.
- Ed25519 replay survives HMAC rotation; receipt-event tampering fails signature verification. Historical Slice 27 runtime and old-rules display remain mandatory and exact.

## Frozen identities

- Historical attack-profile catalogue v1: `b74f20b677feb0c6a2d0814f0b2317cd16eb411f5156f336c9521c3ead11ba11`
- Attack-profile catalogue v2: `f93e700c832c0638407ab0bd2c11a5020781bd27d1d4fb7076da8006211799b4`
- Historical Kerrigan Blades profile: `8f718bc26b4a42fdc369c0d8f1c7f145f4080cd8b137dc316986a2f9be316c97`
- Corrected Kerrigan Blades profile v2: `99cf103a9d14617e693678b4c155b3833fe95b78cf08ff73c6423b2dffdf2b64`
- Critical Hit kernel: `07e851ceb893adc91a177266e0741a98dceeb20135e4990ebe20f8032449304e`
- Slice 28: `bac947b8ca453de6dcfbfcc91ac77deef84625e30f66a476b491e38e3bc7515b`
- Catalogue 28: `64a9b9a717ccbbd69384a07aaeb39e56df0849a304094de92075d6177f5bde6c`
- Runtime 28: `ee255eee5aa16cdccb2ef2ce3ea3b49ae190862419e76a061e0824e7c3405eb6`
- Historical Slice 27 runtime: `17c91887a32c1e8b76aeafbea5f65c7ac2f5b0f4234caf7b468521621f012562`

## Evidence

- Critical Hit catalogue/kernel: `7/7`
- Slice 28 Authority, Chance, signature and replay: `6/6`
- Current Runtime/Authority/Room gate: `10/10`
- Aggregate verifier: `8/8`
- Complete Ticket 11 foundation gate: 87 base reports / 841 assertions; including aggregate, 88 reports / 849 assertions; zero failures.
- Repository `verify:all`: Authority, Room, HTTP, Kerrigan roles, Provider, worldbooks, translation/localization and offline DSH-arm boundaries all pass.

## Current atom and slice denominator

- Frozen slices: `28`
- Canonical RuleAtoms: `1,026`
- Display-only atoms: `114`
- Actionable atoms: `912`
- Executable actionable atoms: `306/912` (`33.6%`)
- Remaining actionable atoms: `606`
- Executable attack-effect handlers: `7/13` — Surge, Long Range, Pierce, Anti-Evade, Burst Fire, Bulky, Critical Hit
- Remaining attack-effect handlers: `6/13` — Indirect Fire, Instant, Locked In, Pinpoint, Sidearm, Specialist

Remaining source ownership is Part 11 `188`, Part 8 `95`, Part 9 `89`, Part 10 `42`, Part 7 `35`, Parts 2 and 5 `28` each, Part 4 `27`, Part 12 `26`, Part 3 `13`, Parts 6 and FAQ `2` each, and Cross-Part `31`, totalling `606`. Parts 11, 8 and 9 account for `372` atoms. The rolling `306 / 28` throughput forecasts about 56 further planning slices, but the authoritative denominator is the remaining 606 atoms, not the forecast.

## Ctx2Skill and harness boundary

- `ctx2skillLoopUsed=true`, target `starcraft-tmg`, route `rule_skill_builder`.
- No Skill was read, generated, promoted, or granted Rules/training authority.
- Harness contracts exercised the existing board-read, LegalSpace, preview, human-confirmed apply, replay and trace seams only.
- This proves the new rule composes with those seams; it does not complete the full agent harness.
- No UI/device trace, memory write, DSH job, MuZero candidate or training candidate was produced.

## Explicit non-claims

This slice does not prove the Dodge interaction, arbitrary Critical Hit weapons, multiple models, multiple targets, general casualty choice, terrain, cover, elevation, shields, modifiers, upgrades, Sidearm or the remaining six attack effects. The complete rules engine still requires all 606 actionable atoms plus interaction/lifecycle and production gates. Ticket 11, production-room eligibility, Skill promotion, MuZero eligibility and `trainingTruth` remain open/false.
