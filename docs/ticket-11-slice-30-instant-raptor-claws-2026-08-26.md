# Ticket 11 Slice 30 — INSTANT / Raptor Claws

Date: 2026-08-26  
Status: frozen after focused, runtime, Authority/replay and aggregate gates pass

## Outcome

Slice 30 promotes the Core `INSTANT` reaction prohibition and a deliberately narrow current-data combat path for one remaining unmodified Kerrigan Swarm Raptor using Claws against one unmodified Marine.

The authoritative action is a single `fight` transition. A ready Power Field remains visible state, but its Guardian Shell Reaction is neither declared nor resolved in response to the INSTANT attack. The card remains Ready, no pending reaction window is created, and the v7 Guardian Shell lifecycle remains available through an explicit historical delegate for non-INSTANT Kerrigan Blades attacks.

## Live official evidence

- [Firestore versions](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions) remains `units=71 / cards=69 / rules=48`, `updateTime=2026-05-26T13:23:51.064119Z`.
- Latest gameplay snapshot: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78`.
- Latest normalized dataset: `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a`.
- Same-version community-display-only drift receipt: `46c7e82f34f6a666ebe2b51f0f5b8ff44c20a518ee1b115e19d2a5f446d5b5a4`.
- [Core Rules PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf): `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`.
- [Zerg P2P PDF](https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf): `6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364`.
- Current Raptor source record: `d224df3320b658d3561dfb7c8c155dad267865eeabf18d657d7c41f14f597b5e`; payload `92a658a9e569ed15fcd82a70a94cdcaa3b3563bcc6eabf3c495fbc9e62dabaaa`.
- Current Claws v2 profile: `bde03b02cbf30fbda84d03e406f9937060a1d97f8c24992f77e6b9e351efc21f`; historical v1 profile remains `87c4a830761e9016e29347a735fe85bb04cd2d9da7090cbe7340699e5675e149`.
- Exact INSTANT text hash: `553b151fdb23ffffc94091bededce1faa82f926dbed0a37ceb4e0340df625f99`.
- Repository data/rules fallback is forbidden.

The bounded current profile is engagement range, Ground, RoA 2, Hit 3+, Damage 1, `SURGE: Light, Armoured (D6)`, `INSTANT`; the Raptor is Armour 5+, Evade 4+, HP 2 on a 32 mm round base. The current Marine target is Armour 5+, Evade 5+, HP 2 on a 32 mm round base.

## Atomic contracts

- Canonical RuleAtom promoted: `rule-atom:singleton:core-11-instant-reaction-prohibition:d7dd0a746300`.
- Effect atom executed: `attack-effect:instant-v1`.
- Kernel: `authority.instant-attack-effect-kernel-v1@1.0.0`, hash `8a57819bb3df6db76083912de3b88d52b13fa9e54c0672427ec984a7a8e3a30f`.
- Executor: `authority.close-combat-attack-v8@8.0.0`.
- Exact chance layout: two Hit D6, one Surge D6, and two preallocated Armour D6.
- The INSTANT plan is profile-hash-bound and scoped only from this attack declaration through completion.
- Enemy reaction declaration and resolution are both false; non-INSTANT profiles cannot claim this plan.
- Surge D6 matches the Marine's Light tag, caps bypass at actual hits, then Armour and Damage resolve in the established stage order.
- Unknown, malformed, stale-profile, non-latest, wrong-geometry, shield/effect, or tampered inputs fail closed.

## Slice 29 denominator correction

Slice 29 added contextual `DODGE` to an existing registry of 13 profile effects but reported `13 registered / 8 executable / 5 unimplemented`. Its behavior, slice hash and catalogue hash remain frozen.

Correction receipt `2047a73d600bc2749939a7f15474d212058efc9a8c99cc26abcd7debe8279e71` records the correct pre-INSTANT denominator as `14 registered / 8 executable / 6 unimplemented`. Slice 30 then implements INSTANT, producing `14 / 9 / 5`. No historical slice is rewritten and no silent compatibility is allowed.

The five remaining effect atoms are:

- `attack-effect:indirect-fire-v1`
- `attack-effect:locked-in-v1`
- `attack-effect:pinpoint-v1`
- `attack-effect:sidearm-v1`
- `attack-effect:specialist-v1`

## Frozen identities and counts

- Slice: `b1fc80fc4c3b74e045f961e5b2279eb8a6fead74ca0ca2c947c3185a532921c8`.
- Catalogue: `e289a3b7120eaed2bb282a1f261607300c2f15441b42f81a2c468a77cd078476`.
- Runtime: `28dd32c0b27bda8573171b4ed7008bebde9f919bf954688d0fe30d7f154915fc`.
- Combat-effect denominator: `d564e91dabcc2017ff603fab3f999fd797c70f6834c99f1939d8aefc62d63961`.
- RuleAtoms: `327 / 912` executable, `585` review-required, `114` display-only.
- Frozen vertical slices: `30`.
- Ticket progress: Ticket 11 remains active; project remains `10 / 22` tickets complete.

## Evidence gates

- INSTANT kernel and denominator: `8 / 8`.
- Slice 30 executor/runtime/Authority/replay: `9 / 9`.
- Generic executable runtime: `10 / 10`.
- Foundation aggregate: `92` base reports / `886` base assertions; with aggregate `93 / 894`.
- `verify:all`: green.
- Deterministic fixture `[6,6 | 6 | 1,1]` yields two hits, two Surge bypasses, zero Armour dice and two damage, destroying the Marine while Power Field remains Ready.
- Authority evidence includes seat-scoped LegalSpace, Preview, explicit human Confirm, Apply, Ed25519 accepted receipt, replay after HMAC rotation, and signature rejection after event tampering.

No Skill, DSH, MuZero, memory, prompt-pack or training artifact is promoted. `rulesEligible=false` and `trainingTruth=false` remain mandatory until the wider Ticket 11 gates close.

## Harness boundary

This slice proves more than adapter wiring: the Harness consumes the current rules runtime's observation and LegalSpace, sees the INSTANT action and the absence of a responder reaction window, and replays the accepted receipt. It does not create an agent policy, memory update or training sample.

Future Harness completion still requires game-specific observation redaction, tool/action schemas, Kerrigan behavior evaluation, memory policy, DSH-only offline Skill evaluation/promotion, MuZero observation/action/value lineage, and device UI evidence. Those consumers can reuse the stable Authority seam, but they are not completed merely by wiring an adapter.
