# Ticket 11 Slice 27 — Bulky and Raynor's Default Commando Rifle

Date: 2026-08-26  
Status: frozen bounded rules slice; Ticket 11 remains in progress  
Training truth: false

## Outcome

Slice 27 promotes the canonical Part 11 `Bulky` RuleAtom through the official Runtime/LegalSpace/Preview/Apply/Receipt/Replay path:

> A weapon with Bulky cannot make a Ranged Attack while its Unit is engaged.

The rule remains atomic and composable. Current official profile data identifies `BULKY` on Jim Raynor's default `Commando Rifle`, but profile data alone cannot grant authority. Attack kernel v5 owns the parameterless Bulky handler, consumes a hash-bound `OfficialEngagementGraphV2` result, and rejects an engaged attacker before Chance allocation. Authority executor v6 then exposes only the proven unengaged default-weapon action and delegates every frozen v5 action without changing v5 code.

## Exact bounded authority

- Current official source tuple remains `units=71 / cards=69 / rules=48`.
- Live Firestore revalidation preserved the current versions document update time `2026-05-26T13:23:51.064119Z`. Raynor and Marine retained their frozen update times and exact field hashes.
- Live Core PDF remains SHA-256 `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`; live Terran P2P remains `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- The newest accepted same-version capture remains snapshot `243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c` and dataset `225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021`. Its two changes are display-only community upvotes; official product and rule prose changes remain zero. Repository fallback is forbidden.
- The executable v6 example is one Supply-1 Raynor model on a 40 mm base with no selected upgrades against one unmodified Supply-0 Marine model on a 32 mm base, with no terrain, elevation, access, shield, status, or extra modifier.
- The empty-upgrade loadout includes the official default `Commando Rifle` and excludes replacement `C-14 rifle`. The selected C-14 path remains a frozen v5 delegate.
- Official Commando Rifle is Range 18, RoA 3, Hit 3+, Damage 1, with Surge Armoured D3, Bulky, and Pierce Armoured 3 as independent effects.
- An unengaged action commits seven D6 tickets during Preview: three Hit, one Surge, three Armour, zero Evade.
- An engaged Raynor is omitted from enabled LegalSpace with `ATTACK_BULKY_ENGAGED_PROHIBITION`; the prohibition is evaluated before any Chance ticket exists.
- Ed25519 replay survives HMAC rotation. Action tampering invalidates the signature. Historical ranged v5 remains exact at runtime `36aa2c6d931f3002fb5ca2651f727da6f47b348b186b4edbfdb64b7fd6dbd388`, and old-rules display remains mandatory.

## Frozen identities

- Attack-profile catalogue: `b74f20b677feb0c6a2d0814f0b2317cd16eb411f5156f336c9521c3ead11ba11`
- Raynor Commando Rifle profile: `0fa6eb192876d3cda244d90850df04fea4c5c1875a1ae49bf04523713ee0550e`
- Attack kernel v5: `31a733c2a06f114c8fcf8880ae4b0e55c55cc88c7c23407be631a12e37eab058`
- Slice v6: `56589aa766e66ee68578c8b1c74d21814b5f04e19f75cdcdedbda0b22183ef55`
- Catalogue v6: `21927d9dcd022212d96f974249fba99e618076914076ed6b02e5046245989b3a`
- Runtime v6: `17c91887a32c1e8b76aeafbea5f65c7ac2f5b0f4234caf7b468521621f012562`

## Evidence

- Bulky effect kernel: `9/9`
- Slice 27 Authority, Chance, signature and replay: `6/6`
- Current Runtime/Authority/Room gate: `10/10`
- Aggregate verifier: `8/8`
- Complete Ticket 11 foundation gate: 85 base reports / 828 assertions; including aggregate, 86 reports / 836 assertions; zero failures.

## Current atom and slice denominator

- Frozen slices: `27`
- Canonical RuleAtoms: `1,026`
- Display-only atoms: `114`
- Actionable atoms: `912`
- Executable actionable atoms: `305/912` (`33.4%`)
- Remaining actionable atoms: `607`
- Executable attack-effect handlers: `6/13` — Surge, Long Range, Pierce, Anti-Evade, Burst Fire, Bulky
- Remaining attack-effect handlers: `7/13` — Critical Hit, Indirect Fire, Instant, Locked In, Pinpoint, Sidearm, Specialist

The remaining source ownership is now Part 11 `189`, Part 8 `95`, Part 9 `89`, Part 10 `42`, Part 7 `35`, Parts 2 and 5 `28` each, Part 4 `27`, Part 12 `26`, Part 3 `13`, Part 6 and FAQ `2` each, and Cross-Part `31`, totalling `607`. Parts 11, 8 and 9 account for `373` atoms. The rolling `305 / 27` throughput projects about 54 more planning slices, but the authoritative remaining denominator is 607 atoms; the slice forecast is not an acceptance target.

## Ctx2Skill and harness boundary

- `ctx2skillLoopUsed=true`, target `starcraft-tmg`, route `rule_skill_builder`.
- No Skill was read, generated, promoted, or granted rule/training authority.
- Cross-time replay preserves the exact v5 Runtime identity.
- Harness contracts exercised: read board, list legal actions, preview, human-confirmed apply, replay, and trace write.
- No UI/device trace, memory write, DSH job, MuZero candidate, or training candidate was produced.

## Explicit non-claims

This slice does not prove arbitrary armies or formations, multiple models, terrain, cover, elevation, shields, casualty choice, general upgrade purchase validation, Sidearm, target splitting, or the remaining seven attack effects. The full rules engine is not complete merely because this atom is executable. Production-room eligibility, Skill promotion, MuZero eligibility, and `trainingTruth` remain false.
