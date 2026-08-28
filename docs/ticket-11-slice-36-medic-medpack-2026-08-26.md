# Ticket 11 Slice 36 — Medic Medpack active ability and Heal

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 36 promotes the current official Medic `MEDPACK` ability and the reusable active-ability, resource-payment, distance and Heal contracts it composes. It is not a unit-name shortcut: 29 RuleAtoms move together behind one exact executor and an independent Heal kernel. The rules engine is still incomplete: `394 / 912` actionable RuleAtoms are executable and `518` remain review-required.

The bounded current-official path is:

- one activating Medic Unit is on the battlefield and chooses Hold;
- Medpack may resolve before or after that Hold action, but never during an action;
- the target is another Friendly Biological Unit, represented by the current Marine fixture, Within 4 inches and visible through a clear base-to-base trace;
- one ready Terran Armed Forces card pays the full matching 1 CP cost and becomes exhausted;
- `HEAL (X)` uses the number of Medic models Within 4 inches of the target Unit; the exact fixture proves `X = 2`;
- Heal reduces the target's damage marker, never returns destroyed models and never restores a previously lost Shielded status;
- the named active ability may be used by that Unit only once per round.

Reserve, mid-action, enemy, out-of-range, blocked-LoS, unpaid, repeated, stale-action, stale-source and tampered-card cases fail closed. Academy's Advanced Training cost-reduction reaction is not executed: the bounded fixture keeps Academy exhausted and its reaction atoms remain review-required.

## Live official evidence

- Firestore versions remain `units=71 / cards=69 / rules=48`; canonical versions SHA-256 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Medic / Marine document hashes: `35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35` / `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Academy / Terran Armed Forces document hashes: `0a1a205eabe0a9b2989fd879365096e295c31ef3e0f4983018b4249cd00d1695` / `832aabd98a5ebad69458c9fd111f0d1fea469634a16cffdcd6ac3d3e86438daa`.
- Part 2 / Part 4 / Part 5 / Part 10 / Part 11 document hashes: `32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929` / `bd4ad276a2ea528824be4501faedf0249fc164ab8918c0c240f692a1a0a98424` / `cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact Medic gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.
- Core Rules / Terran P2P PDF hashes: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden.

## Atomic contracts

The 29 promoted RuleAtoms form five reusable groups:

- active ability structure, activation, before/after-action windows, reserve prohibition, no mid-action use and per-Unit/per-round named-use limit;
- ability target range, line of sight, Friendly ownership and Friendly/Enemy definitions;
- faction-card resource type, matching CP payment, full-cost requirement, exhaustion and resource production;
- model/Unit `Within` definitions, including partial base overlap and “at least one model” Unit semantics;
- Heal damage reduction, destroyed-model/respawn prohibition and forbidden restoration of lost Shielded.

`authority.heal-resolution-kernel-v1@1.0.0` owns Heal state transitions independently of Medic. It reduces the damage marker by at most X while preserving the current/destroyed model denominator and Shielded lifecycle.

`authority.medic-medpack-active-v1@1.0.0` owns the exact `use_ability` LegalSpace and composes Hold, timing, target geometry, full CP payment, Heal and the named-use ledger atomically. Current source-record, payload, card, state, distance, action and plan hashes are mandatory. Data cannot invent executable authority.

The combat-effect denominator remains `14 registered / 14 executable bounded subsets / 0 known-unimplemented`; Medpack and Heal are ability/state authorities, not weapon EffectAtom kinds.

## Authority and Harness contract

Only the Slice 36 runtime advances to `hybrid_legal_space_v6`. Action identity now retains `abilityWindow`, `cardResourceId`, `resourceType`, `resourceCost`, `contributingModelIds`, Heal amount, LoS state, target range/distance and `abilityPlanHash`. Slice 35 remains frozen on v5 and all earlier schemas remain exact; historical rules display is retained and missing dependencies quarantine rather than silently substitute current logic.

The verifier exercises `LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` through the Authority boundary. The two timing windows produce distinct previewable actions. A receipt replays after HMAC rotation under its long-lived Ed25519 signature, while receipt/action/source/card tampering fails closed.

This is Harness contract evidence, not completed Web/App Harness behavior. Browser/App device traces, player-view redaction, live Kerrigan decisions, memory policy, Skill generation/DSH evaluation, self-play and MuZero lineage remain separate gates.

## Frozen identities and counts

- Slice: `5ab56efe43938ac9458310be15886309218485f5e551dfdde734b9bf8f2871ec`.
- Catalogue: `49edf13886590b2539669a5881bab442113166e29edb5e0194d6197f850f2049`.
- Runtime: `acead33c1486645a149466848b7d276c54c99c51261c641786e9633dafde815d`.
- Combat-effect denominator: `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- Historical Slice 35 runtime: `4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93`.
- RuleAtoms: `394 / 912` executable (`43.2%`), `518` review-required and `114` display-only.
- Frozen vertical slices: `36`.
- Planning-only forecast: about `48` further slices; the authoritative remaining denominator is `518` atoms.
- Ticket progress: Ticket 11 remains active; the project remains `10 / 22` tickets complete.

## Evidence gates

- Slice 36 official data, Heal kernel, Medpack LegalSpace, payment, timing, Authority and replay verifier: `12 / 12`.
- Generic executable runtime: `10 / 10`.
- Ticket 11 foundation gate: `98` base reports / `960` base assertions; with aggregate `99 / 968`.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory while `518` actionable RuleAtoms are open.

ctx2skill used the `rule_skill_builder`, `referee` and `opponent` routes, ran five named Judge groups and replayed Slice 35 plus Slice 36. It read, generated and promoted no Skill; DSH was not run. Harness used the referee/opponent prompt routes and called legal-action, preview, confirmed-apply and replay contracts. It observed the two ability windows, CP card, range/LoS, Heal amount and once-per-round lockout, but wrote no memory, MuZero or training candidate.
