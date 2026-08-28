# Ticket 11 Slice 37 — Academy reaction and Optical Flare status lifecycle

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 37 promotes nine reusable RuleAtoms for zero-cost abilities, temporary card resources, debuff/status markers and Cleanup removal. It composes them through the current official Academy reaction, Medic `OPTICAL FLARE`, typed range mutation and round lifecycle. The rules engine remains incomplete: `403 / 912` actionable RuleAtoms are executable (`44.2%`), `509` remain review-required and `114` remain display-only.

The bounded current-official path is:

- a Medic declares Medpack or Optical Flare, opening a distinct reaction decision before resolution;
- a ready Academy may use Advanced Training once per round to reduce that ability's CP cost by one, but the reaction does not exhaust Academy;
- Medpack changes from 1 CP to zero and therefore pays no card;
- Optical Flare changes from 2 CP to 1 CP, after which Academy may independently exhaust to supply that Tactical CP;
- no generated resource is retained after the immediate payment window;
- Optical Flare targets one visible enemy Unit within 12 inches and adds a typed Debuff/status marker;
- every ranged-weapon Range characteristic on that Unit is reduced by 4 to a floor of zero and Long Range is unavailable while the Debuff applies;
- the explicit “Until End of Round” status persists through End-of-Round effect resolution, then Cleanup removes its status/marker and refreshes supported cards.

Pass-reaction, repeated Academy use, out-of-range, blocked-LoS, unpaid cost, resource retention, Long Range, stale pending hashes, source drift and action tampering fail closed.

## Exact atomic boundary

The nine promoted RuleAtoms are:

1. `rule-atom:singleton:core-10-1-zero-cost-free:e0ae6a9abe7d`
2. `rule-atom:singleton:core-10-5-1-generated-resource-not-retained:a6ddc937bf21`
3. `rule-atom:tactical-card-resource-field`
4. `rule-atom:singleton:core-11-debuff-duration:5903db472def`
5. `rule-atom:singleton:core-11-debuff-value:84706dc86b4d`
6. `rule-atom:singleton:core-11-status-definition:78de5e813bfb`
7. `rule-atom:singleton:core-11-status-effect-markers:cd44cf1e9d23`
8. `rule-atom:singleton:core-7-3-2-buff-debuff-marker:42d5602d6e12`
9. `rule-atom:end-round-effect-cleanup-removal`

The generic `active-ability-default-end-round-expiry` candidate is deliberately not promoted. Optical Flare has explicit duration text, so using this example to infer a universal default would be an unsupported generalization. That atom remains review-required.

`authority.characteristic-status-kernel-v1@1.0.0` owns typed Optical Flare status/marker semantics, the `max(0, printedRange - 4)` calculation and Long Range prohibition. `authority.academy-medic-ability-v1@1.0.0` owns the `declare_ability -> use/pass reaction -> resolve_ability` transaction, Academy ledger and exact resource payment. `authority.end-of-round-effects-v3@3.0.0` and `authority.cleanup-refresh-v3@3.0.0` preserve the status through End of Round and remove it only during Cleanup; historical v2 executors remain registered for frozen old catalogues.

## Live official evidence

- Firestore remains `units=71 / cards=69 / rules=48`; versions hash `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Medic / Marine: `35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35` / `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Academy / Terran Armed Forces: `0a1a205eabe0a9b2989fd879365096e295c31ef3e0f4983018b4249cd00d1695` / `832aabd98a5ebad69458c9fd111f0d1fea469634a16cffdcd6ac3d3e86438daa`.
- Parts 5 / 10 / 11: `cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.
- Core Rules / Terran P2P: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden and was not used.

## Authority and Harness contract

Only Slice 37 advances to `hybrid_legal_space_v7`. Action identity retains pending ability, reaction card, original/modified costs, reduction, exact payment cards, status-effect hash, effective range and Long Range eligibility. `LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` covers every stage. The Ed25519 receipt chain survives HMAC seal rotation; source, pending action and receipt tampering reject. Slice 36 v6 and every older schema/runtime remain exact, and old rules remain displayable.

This is a verified Harness contract, not complete Harness delivery. Browser/App device traces, view redaction, live Kerrigan decisions, prompt/tool evaluation, memory policy, Skill generation with DSH, self-play and MuZero lineage remain separate work. No current trace is promoted to training truth.

## Frozen identities, counts and evidence

- Slice: `9e1fef200fda7faaac81faca0a945be7470e5f91ad56a7e95c526306a611e26e`.
- Catalogue: `3900f94952042d1b9fa44b7147fee81ac138079d0c7ae28021e14c05113a8a57`.
- Runtime: `27437fb6976ce3d4ead8b2257123f3d61d320e6a52c87bcb165b17add1238673`.
- Historical Slice 36 runtime: `acead33c1486645a149466848b7d276c54c99c51261c641786e9633dafde815d`.
- Combat-effect denominator remains `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- RuleAtoms: `403 / 912` executable (`44.2%`), `509` review-required, `114` display-only.
- Frozen vertical slices: `37`; planning-only forecast: about `47` further slices.
- Slice verifier: `13 / 13`; generic runtime: `10 / 10`.
- Ticket 11 foundation: `99` base reports / `973` assertions; with aggregate, `100 / 981`; zero failures.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- Project: `10 / 22` Tickets complete; Ticket 11 remains active.

ctx2skill used `rule_skill_builder`, `referee` and `opponent`, ran six named Judge groups, and passed Slice 36/37 cross-time replay. `skillsRead=[]`, `skillsGenerated=[]`, `promotions=[]`; remainingRuleGaps is `509`. Harness used referee/opponent prompt routes and the legal-action, preview, confirmed-apply and replay contracts. It recorded separate declaration/reaction/resolution, zero/full resource payment, status marker/range mutation and Cleanup removal evidence. It wrote no memory or training candidate. DSH was not run because this is a rule-executor slice, not Skill generation.

`rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory.
