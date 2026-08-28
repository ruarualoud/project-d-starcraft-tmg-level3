# StarCraft TMG Level-3 domain context

This file records the product vocabulary used by code and contracts under `starcraft-tmg-level3/`. It does not grant source, rules, production, or training authority.

## Authority vocabulary

### MatchBinding

The signed immutable identity of one match. It freezes the exact source, data, rules, executor, geometry, action-schema, RNG, historical-display, and referee-key lineage. A client cannot supply or amend it.

### OfficialLatestDataSnapshot

The newest successfully captured and contract-verified official Command Center snapshot at room-creation time. It is the only candidate authority for current unit, card, points, mission, and deployment data. A room freezes its exact source snapshot hash, normalized dataset hash, and `unitsVersion / cardsVersion / rulesVersion`; a later official update or parser revision applies only to newly created rooms. P2P PDFs remain official historical/cross-check sources, while repository `RULE_MATRIX`, legacy JSON, Battle Lab, and Expo-bundled values are compatibility evidence only and can never silently fill an official-data gap.

Every current product record may carry hash-bound P2P page aliases for provenance and historical display. Those aliases contain no gameplay payload and cannot override or replace the Command Center record. A difference keeps the frozen Command Center value and records drift; a missing current record quarantines instead of reading P2P or repository data.

### StateEnvelope

The private normalized rules state together with its `MatchBinding`, state revision, state hash, and private journal head. It is the only state accepted by `AuthorityEngine`.

### LegalSpace

The complete rules-owned union of enabled exact finite actions and parameter domains at one state revision. Search suggestions, labels, disabled diagnostics, UI controls, strategy scores, and model rankings are outside its authority identity.

### OfficialExecutableRuleRuntime

The catalogue-bound Rules module behind the AuthorityEngine seam. Its small interface is `descriptor / enumerate / apply`: the descriptor freezes the exact RuleAtom catalogue, executor manifest, runtime hash and completeness state; `enumerate` may expose only actions backed by resolved executable RuleAtoms; `apply` dispatches only to their exact executor versions and preserves RuleAtom lineage in Preview, Receipt and Replay.

An incomplete catalogue fails closed by default with `RULE_RUNTIME_INCOMPLETE`. An explicitly enabled development subset may exercise already-promoted atoms for Judge/replay evidence, but its MatchBinding, LegalSpace and room projection must all say `legalSpaceComplete=false`, `productionRoomEligible=false`, and `trainingTruth=false`. The legacy transition is named `legacy_compatibility_fixture`, remains non-production, and can never silently fill a missing official action.

### ActivationPass

A Rules-owned Movement or Assault turn choice. Passing is optional while an eligible Unit activation remains and mandatory when none remains. The first passer receives the First Player Marker for the next phase and cannot activate another Unit in the current phase; the opponent then completes its remaining activations consecutively. Phase advancement is a deterministic Rules effect after that completion, never a client-authored `advance_phase` action. Movement/Assault LegalSpace and apply must use the same reserve-aware activation-availability predicate.

### AssaultHold

A Rules-owned Assault activation that performs no action and marks only the selected on-field Unit's Assault activation complete. It preserves position, status, damage, resources and score. The runtime—not the client—combines the resulting activation state with `ActivationPass`: ordinary Hold hands initiative to the other eligible seat, while the last Hold after an opponent Pass deterministically advances to Combat with phase-specific RuleAtom lineage in Preview, Receipt and Replay.

### PhaseFirstActorChoice

The finite Rules-owned choice made by the current First Player Marker holder at the start of Movement, Assault and Combat. The holder may select either seat—not necessarily itself—to take the phase's first activation. Until the choice is applied, no Unit activation or Pass is exposed. The choice is recorded under the exact round/phase, carried by Preview, Receipt and Replay, and must be made again after every phase handoff.

### EngagementGraph

A deterministic Rules-owned graph derived from frozen room geometry at model granularity. Callers provide model coordinates, exact base footprints, elevation/combat tags, board bounds and terrain geometry; they never provide an authoritative `engaged` flag. Unit engagement is propagated from qualifying model-to-model edges, and the graph hash is carried into decisions and receipts.

Historical v1 deliberately supports only round bases on ground level plus axis-aligned rectangle/circle terrain: size 0–1 terrain does not block engagement and size 2+ terrain may block it. That input schema and its catalogue/runtime hashes stay immutable for historical replay.

Current v2 additionally derives ground/mid/high elevation from explicit terrain surfaces, verifies declared model support terrain against footprint intersection, and derives Access Point adjacency from exact Access Point geometry. Same-elevation models engage normally; ground/high never engage; ground/mid and high/mid engage only when both models are adjacent to the same Access Point connecting those elevations. Flying ignores elevation and remains unengaged. Missing or mismatched model/base/terrain/elevation/access declarations and non-round footprints fail closed instead of reading a repository default or estimating geometry. This bounded scope is Rules evidence for the supported cases, not a complete geometry engine or training truth.

### CombatPass

A Rules-owned mandatory Combat action exposed only when the active seat has no remaining unactivated Engaged Unit according to the exact `EngagementGraph`. The first Pass hands the active seat to the opponent; the second consecutive Pass advances Combat to Cleanup. Preview, AcceptedReceipt and Replay retain the exact RuleAtom lineage and engagement-graph hash. Combat activations and attacks remain unavailable until their own exact executors are promoted.

Current v3 also requires the current round's valid Combat `PhaseFirstActorChoice` and exact-matches public Apply input against the server-enumerated action, including executor identity and RuleAtom lineage; extra or altered fields fail closed. Frozen v2 remains available only through its exact historical catalogue/runtime and rules-display dependencies. It is never a silent compatibility path for a current room.

### MissionMarkerControl

A Rules-owned Cleanup transition that derives control of all five Mission Markers from the frozen official Mission/setup binding, exact model and marker geometry, Unit coherency, eligibility and Current Supply. Flying, Burrowed, out-of-coherency and Reserve Units do not contest; higher eligible Supply takes control, ties do not transfer control, and an uncontested marker retains its current Faction Indicator. Mission affinity is bound for later scoring but never grants control.

Current v3 exposes only the exact server-enumerated executable action and rejects caller-authored lineage, resolution, diagnostics or additional fields. Apply writes only marker control, Cleanup progress and its event log before VP scoring. Frozen v2 remains byte-exact for its historical catalogue/runtime and old-rules display and is never a silent current-room compatibility path.

### VictoryPointScoring

A Rules-owned Cleanup transition that consumes the exact current official Hold Position binding and completed Mission Marker Control result. The current bounded subset scores all five controlled markers with Mission affinity and a zero-loss Supply ledger, commits both seats' round gains simultaneously, and then opens the separate end-game condition check. It does not infer missing control, source, Supply or lifecycle state.

Current v2 exposes only the exact server-enumerated executable action and rejects caller-authored lineage, resolution, diagnostics or additional fields. Apply writes only scores, Victory Point history, Cleanup scoring progress and its event log. Frozen v1 remains byte-exact for historical catalogue/runtime/replay and old-rules display dependencies and is never a silent current-room compatibility path.

### HoldPositionEndGame

A Rules-owned Cleanup transition immediately after committed Victory Point scoring. The current bounded subset implements only Hold Position's rounds 2–4 special-lead check while both seats retain a live army: a lead below ten continues to End-of-Round Effects, while a lead of ten or more records the leading seat, terminal reason and terminal summary. Army Elimination, final-round scoring, ties and multiple simultaneous terminal reasons remain separate fail-closed work.

Current v2 exposes only the exact server-enumerated executable action and rejects caller-authored lineage, diagnostics or additional fields. Apply writes only terminal/active-side fields, end-game history, Cleanup progress and its event log. A terminal result has an empty post-state LegalSpace. Frozen v1 remains byte-exact for historical catalogue/runtime/replay and old-rules display dependencies and is never a silent current-room compatibility path.

### EndOfRoundEffects

A Rules-owned Cleanup transition immediately after a nonterminal end-game check. Its executable lineage is derived from the exact current effect queue: an empty queue uses the two frozen base atoms, Optical Flare uses its three lifecycle atoms, and Stimpack uses the five-atom union. End-of-Round Effects records history and advances Cleanup progress, but status effects, effect markers and non-lethal damage persist until the separate Cleanup transition.

Current v5 exposes only the exact server-enumerated action and rejects caller-authored lineage, additional fields, stale progress, wrong-seat use, unknown statuses, or source/data/MatchBinding drift. Frozen v2/v3/v4 source, catalogue, runtime, replay and rules-display identities remain queryable; v3/v4 reject current latest-official dependencies instead of silently adapting to them. Current rooms use v5 with `hybrid_legal_space_v18`; historical rooms retain their exact prior action schema.

Historical replay evidence distinguishes deterministic rules identity from per-run signing identity. A replay state hash that includes an Ed25519-key-bound MatchBinding must verify within its own signed run, but is not hard-coded as a cross-key rules hash. Cross-time freezing instead binds source/runtime/action-schema semantics, receipt cardinality and successful signature/replay verification.

### CloseCombatActivation

A pending Rules-owned Combat transition for an Engaged Unit. Official Part 8.8 requires every Engaged Unit to activate and execute a Close Combat Attack; it does not define a Combat Hold action. Close Ranks is an optional step before the attack, not a replacement for it. This transition remains unavailable until attacker ranks, weapon selection, dice, casualty state, post-combat movement and lifecycle interactions have exact executors and replay evidence.

### Proposal

A canonical request that either selects an exact finite action or instantiates one parameter domain. The server derives actor seat and capability from SeatGrant; role, side, current state, and rules version are not trusted proposal fields.

### Preview

A non-mutating authoritative evaluation of one proposal at one state revision. It includes the canonical proposal, result hashes, confirmation policy, optional ChanceTicket commitment, and an HMAC seal. Multiple previews may coexist; cache eviction is not semantic staleness.

### ConfirmationReceipt

A short-lived HMAC-sealed record that a human authority confirmed a particular preview under a particular policy. Opponent proposals always require this receipt. It cannot be issued by a model-facing grant.

### AcceptedReceipt

The permanent Ed25519-signed fact linking one accepted before-state, proposal, preview, confirmation, after-state, events, and prior journal head. It is the unit of exact replay.

### ChanceTicket

A deterministic, state/proposal/counter/version-bound commitment whose outcome remains hidden during preview, reveals once during apply, and cannot be rerolled by repeated preview.

### RoundInitiative

The Rules-owned end-of-round decision that assigns the First Player Marker for the next round. In Hold Position rounds 2–4, the lower-VP seat receives it; tied VP triggers a fresh 2D6-per-seat Roll-Off using hidden `ChanceTicket` commitments, and every tied result requires a new committed attempt. A winning result increments the round and enters `start_of_round` with no active seat. Movement and `PhaseFirstActorChoice` remain unavailable until the separate Start-of-Round effect/supply window is resolved; the engine never silently skips that window.

Current v2 consumes the exact current Cleanup v5 history and current official gameplay bundle, then uses an explicit validated adapter to the frozen v1 initiative semantic kernel. Apply accepts only the complete server-re-enumerated v2 action; forged lineage, extra fields, stale scores, Cleanup history drift, source/data drift or MatchBinding drift fail closed. Frozen v1 stays byte-exact for its historical catalogue/runtime/replay and old-rules display, rejects current Cleanup v5 state, and is never a silent current-room compatibility path. The structural action schema remains `hybrid_legal_space_v19`.

### RoundSupplyState

The hash-bound Rules-owned Supply observation established during the supported Start-of-Round window. For Hold Position rounds 2–4, each seat's pool is mission starting Supply plus its per-round escalation for every elapsed round; Round 5 is explicitly unlimited. The state separately records current on-table Supply, Reserve Supply and Available Supply, binds the current official gameplay bundle and runtime, and rejects a finite over-cap battlefield. Reserve Supply remains visible but is never counted against the on-table total.

### StartOfRoundResolution

The deterministic transition between `RoundInitiative` and Movement for an exact supported data subset. It requires the signed initiative handoff, resolves mandatory effects in First-Player-then-Opponent order, grants Stationary to every live on-table or Reserve Unit, begins supported cards Ready, establishes `RoundSupplyState`, and records all proof hashes before opening `PhaseFirstActorChoice`. Unknown Unit/card/Mission triggers, Burrowed/Hidden interactions or unsupported records fail closed. The current subset supports Hold Position rounds 2–5 with Marine, Academy and Terran Armed Forces only; it is not the Round 1 start window or a general effect engine.

Current v3 consumes the exact latest official bundle and MatchBinding together with Cleanup v5 and current Determine Initiative history. LegalSpace exposes one exact action to the First Player; Apply must exact-match a fresh server enumeration. In addition to the frozen v2 resolution semantics, v3 creates the current round's empty, runtime-bound `SupplyLossLedger` and binds its hash into the action, resolution, event, history and state before Movement opens. Frozen v1/v2 remain byte-exact for their historical catalogue/runtime/replay and old-rules display and are never silent current-room compatibility paths. Current Movement authority uses structural action schema `hybrid_legal_space_v22`.

### ReserveDeploy

A Rules-owned parameterized Movement activation that moves one exact eligible Unit from Reserve onto the battlefield. The current bounded executor supports only the current official GAUNTLET Standard deployment and Marine profile with 32mm round Ground bases and no terrain, Access Points, tokens, effect markers, upgrades or special deployment abilities. Command Center owns current product identity, image, Speed and Supply; the latest official Terran P2P supplies only the missing base-size field.

The active seat chooses a continuous coordinate along its assigned Entry Edge, a Leading Model path no longer than the applicable Speed, and an ordered final placement for every remaining model. Rules verify current Available Supply, whole-base containment, swept collision, final overlap, enemy engagement, opponent Zone of Influence and direct unblocked coherency. Apply removes Stationary, marks Movement activated, recomputes `RoundSupplyState`, and settles alternating activation. The phase's `PhaseFirstActorChoice` remains the historical first actor while `activeSideKey` alternates; the two identities must not be conflated. Unsupported geometry or source drift fails closed.

Current v3 requires the exact Start-of-Round v3 action/resolution/event/history, its empty `SupplyLossLedger`, Movement `PhaseFirstActorChoice` provenance, and one hash-contiguous Supply lineage whose mutations use only current v3 executor identities. Multiple deployments consume the preceding mutation state; an unwitnessed reset, mixed v2/v3 identity, forged ledger/action/event hash or forged marker holder fails closed. Apply exact-matches a freshly re-enumerated v3 action before using an explicit adapter to the byte-frozen v1 geometry/transition semantic kernel. Frozen v1/v2 remain queryable only through their historical runtime and rules display. Current Movement authority uses `hybrid_legal_space_v22`.

### StandardMove

A Rules-owned parameterized Movement activation for an eligible Unit already on the battlefield. The current exact subset is the official GAUNTLET Standard battlefield and Marine profile with 32mm round Ground bases, no terrain, Access Points, tokens, effects, upgrades or special movement. Only the active seat's live, Movement-unactivated and Unengaged Unit receives a domain.

The player selects any model as Leading Model, submits its actual path up to the Unit's split Speed, and supplies the ordered final position of every remaining model. The Leading Model may pass through models in its own Unit but not another Unit; the remaining models are set rather than moved. Rules own board containment, overlap, enemy Engagement Range, Wholly Within 3-inch placement and Coherency Link validation. Apply removes Stationary, marks Movement activated, preserves `RoundSupplyState` and settles alternating activation. Human direct gestures do not need a redundant second confirmation; Opponent/Agent control still requires the Authority's explicit post-preview confirmation policy.

Current v3 consumes the same shared Start v3, Phase Initiative and current v3 Supply/SupplyLoss lineage as Reserve Deploy and Disengage. Unit size remains contract material: the live model denominator selects the official split Speed (`4` for multiple Marines, `7` for one) and fixes the exact remaining-placement count. Apply exact-matches a freshly re-enumerated v3 action, then invokes the byte-frozen v1 geometry/transition semantic kernel only through an explicit adapter with `silentCompatibilityUsed=false`. Frozen v1/v2 remain available only through exact historical catalogue/runtime/rules-display bindings. Current Movement authority uses `hybrid_legal_space_v22`.

### Disengage

A Rules-owned parameterized Movement activation for an Engaged Unit withdrawing from melee. The current exact subset uses the same frozen GAUNTLET Standard / Marine / 32mm round Ground / no-terrain binding as `StandardMove`, but exposes a domain only to a live Movement-unactivated Engaged Unit. The Leading Model follows an actual standard-move path and all remaining models are set in order; a successful supported result must leave every model strictly outside every Enemy Unit's Engagement Range while preserving battlefield containment, non-overlap and Coherency.

At declaration, Rules freeze the distinct engaged Enemy Units and their Current Supply, sum that Supply, and compare the disengaging Unit's Current Supply using strict greater-than. Tactical Mass removes the following Assault Phase's Ranged Attack and Charge prohibition; otherwise the two prohibitions are persisted as a hash-bound restriction for later Assault executors.

The current v3 domain requires an explicit `placed` or `casualty` outcome for the Leading Model and every remaining model. For the bounded fixed-point subset, Rules permit ordinary-model removal only after proving that no legal placement exists within three inches of the successfully moved Leading Model. Leading-Model failure is permitted only when no legal endpoint exists even in a conservative Speed-disk superset; failure leaves the other models at their original positions, removes the leader and ends the Movement activation. Unnecessary or unproved casualty proposals fail closed. Casualties immediately update Current Supply and RoundSupplyState and append a runtime-bound `SupplyLossLedger` entry whose action hash and pre-ledger causal-event hash are exact. Later Reserve Deploy and Standard Move must consume that ledger and every ordered Supply mutation. Declaration-time Tactical Mass still uses the pre-casualty Supply. Historical v1/v2 remain replayable and displayable only under exact frozen dependencies; current rooms do not silently accept either identity.

### RangedAttack

A Rules-owned Assault activation that selects a legal attacker, target and current official attack profile, then resolves only from Authority-committed chance material. The current v3 executor preserves the exact Marine C-14 and Goliath Autocannon subsets and adds one unmodified Ground Marauder with Quad K12 against one unmodified Armoured Ground Roach, without terrain, Access Points, elevation, shields, statuses, selected upgrades or profile modifiers. Official P2P evidence supplies the 32mm/50mm/80mm base sizes. Rules derive engagement, no-terrain line of sight and base-gap range.

The C-14 commits two Hit, one Surge and two Armour D6; Light(D3) uses `ceil(D6/2)` and bypasses Armour only up to actual hits. The Autocannon commits nine Hit and nine Armour D6; it uses Hit 4+ through its normal 12-inch profile, and the LONG RANGE handler changes the 12–18-inch extended band to Hit 5+. Quad K12 commits three Hit, one Surge and up to three Armour D6; `Pierce [Armoured] 2` replaces its base Damage 1 with Damage 2 per unsaved or Surge-bypassed hit only when the target has the Armoured tag. Damage Marker and casualty state are applied atomically. A persisted post-Disengage prohibition without Tactical Mass removes Ranged Attack from LegalSpace. A permitted attack or Assault Hold v2 consumes and archives that following-Assault restriction. Historical ranged v1/v2, attack kernel v1, Assault Hold v1 and every prior rules/executor/display binding remain replayable only under exact frozen dependencies.

### OfficialAttackProfile

A hash-bound compilation of one current official weapon row into identity, phase, base Range/Target/RoA/Hit/Damage characteristics and a list of parameterized effect references. The room freezes the complete current catalogue. Numeric source changes create a new catalogue for new rooms; they do not alter historical rooms or grant new rule authority.

### AttackEffectAtom

A stable effect identifier plus validated parameters compiled from Surge or a weapon keyword. Recognition and execution are separate: the current catalogue recognizes twelve direct keyword kinds plus Surge, while attack kernel v2 implements only Surge armour bypass, LONG RANGE and `Pierce [Tag] X`. An unknown syntax quarantines catalogue creation; a known effect without a handler remains displayable but fails closed when a Profile tries to enter LegalSpace. Kernel v2 uses the official fixed stage order declaration, hit, effects, armour, evade and damage; frozen kernel v1 retains its historical descriptor unchanged. This lets later handlers be added without duplicating complete weapon executors or silently changing historical games.

### GameClock

Rules-owned logical time stored in state. Host wall time is audit metadata only and never participates in deterministic state identity.

## Room vocabulary

### SeatGrant

A server-issued, revocable capability binding a principal/session to one seat, role mode, visibility scope, and operation set. Raw bearer material is returned only to the intended client and never stored; persistence uses a digest. Callers cannot choose or override side or role.

### ControlLease

The single active apply authority for a seat. It has a monotonically increasing fencing token so a superseded Web/App session cannot apply. Other valid same-seat sessions may continue observing and previewing.

### PrivateAuthoritativeJournal

The append-only encrypted ledger containing complete accepted receipts and actor/referee-scoped rejection facts.

### PublicProjectionJournal

The append-only ledger deterministically derived from accepted private facts. It contains only public information and never rejected attempts or hidden state.

### SeatRecoveryLedger

The minimum encrypted, per-seat authority needed to restore grants, revocations, cursors, and lease fences without exposing bearer tokens or another seat's hidden state.

### RoomStore

The storage port owning atomic creation, compare-and-swap commit, journal reads, replay bundles, and health. SQLite WAL and PostgreSQL must implement the same observable contract.

## Historical and learning vocabulary

### RulesDisplayBinding

A signed reference from MatchBinding to the immutable human-readable rules artifact and locale actually used by the match. Old rules remain displayable after newer releases are installed.

### DependencyQuarantine

The fail-closed state entered when any exact frozen dependency is missing, unknown, or hash-mismatched. Quarantine forbids replay and training eligibility. The platform never substitutes the newest rules or a silent compatibility shim.

### AnalysisLineage

A separately identified analysis of a historical match, potentially using newer tools or rules. It references but never rewrites the historical receipt chain, state, signature, or rules display.

### TrainingTruth

A downstream approval state, never an automatic property of a runtime trace. Ticket 11 artifacts remain `trainingTruth=false`; manual adjudication always makes the affected trace training-ineligible.

## Role boundaries

- Tutor, Commentator, and Companion are read-only.
- Opponent may read its scoped projection, inspect LegalSpace, and propose an enabled action; it cannot confirm or apply.
- Human player/supervisor authority is separate from model-facing authority.
- Rules and Referee fail closed and cannot be overridden by character lore, memory, Skills, translation, UI, or Provider output.
