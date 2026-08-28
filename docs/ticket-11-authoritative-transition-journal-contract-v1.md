# Ticket 11 — Authoritative Transition and Journal Contract v1

Status: accepted design; implementation in progress  
ADR: `docs/adr/0001-authoritative-transition-journal.md`

## 1. Public seams

Ticket 11 is implemented and verified through four public seams:

1. `AuthorityEngine` — canonical envelopes, LegalSpace, preview, confirmation, apply, receipts, and exact replay.
2. `RoomStore` / `RoomRuntime` — three ledgers, durable aggregate, SeatGrant, ControlLease, idempotency, checkpoints, and recovery.
3. `HTTP Adapter` — server-owned room creation, authenticated seat operations, body limits, and stable error mapping.
4. `ReplayProjectionVerifier` — signatures, hashes, frozen dependencies, replay, public projection, quarantine, and training eligibility.

No caller reaches the rules mutation primitive except through these seams.

## 2. Canonical identities

| Artifact | Canonical content | Identity / proof | Lifetime |
|---|---|---|---|
| Source/data/rules/executor/geometry/action artifacts | RFC 8785 manifest | SHA-256 | immutable |
| MatchBinding | frozen manifest plus referee public identity | SHA-256 + Ed25519 | match lifetime |
| State envelope | binding, revisions, state, private journal head | SHA-256 | one revision |
| LegalSpace | binding, state revision/hash, finite actions, parameter domains | SHA-256 | one revision |
| Preview | proposal, authoritative result, risk, chance commitment, expiry revision | HMAC-SHA-256 seal | short-lived |
| Human confirmation | preview identity, confirming grant, policy, expiry revision | HMAC-SHA-256 seal | short-lived |
| ControlLease | room, seat, session, fencing token, room revision | HMAC-SHA-256 seal | short-lived |
| Accepted receipt | before/after identities, proposal, proofs, journal linkage | SHA-256 + Ed25519 | permanent |
| Checkpoint | frozen binding, state, journal head, sequences | SHA-256 + Ed25519 | permanent |
| Verification report | dependency, signature, replay and projection result | SHA-256 + Ed25519 | permanent |

Authoritative hashes exclude wall-clock time, search scores, UI metadata, client identity, client initial state, and untrusted role/side claims. Audit records may carry wall-clock timestamps outside their signed deterministic payload.

## 3. MatchBinding

Required fields:

```text
matchId
gameId
sourceSnapshotHash
dataSnapshotHash
rulesArtifactHash
executorArtifactHash
geometryArtifactHash
actionSchemaHash
rngSchemeId
rulesVersion
dataVersion
refereeKeyId
refereePublicKeyFingerprint
rulesDisplayBinding
bindingHash
refereeSignature
```

`RulesDisplayBinding` contains `artifactId`, `artifactHash`, `mediaType`, `locale`, `rulesVersion`, and `availability`. The match API resolves this exact immutable display artifact. If the executable rules artifact is missing, replay is quarantined. If only the display artifact is missing, verification reports `HISTORICAL_RULES_DISPLAY_MISSING`; the match remains cryptographically identifiable but the handoff gate fails until the display is restored.

## 4. LegalSpace

```text
LegalSpace
  matchBindingHash
  stateRevision
  stateHash
  finiteActions[]
    actionKey
    actionType
    canonical parameters
    confirmationClass
  parameterDomains[]
    domainId
    actionType
    parameter schema
    rules constraints
    confirmationClass
  legalSpaceHash
```

`searchSuggestions[]`, disabled-action diagnostics, labels, translations, AI scores, and explanation text are response companions and are excluded from `legalSpaceHash`.

### Movement domain

- Coordinates are signed integer milli-inches.
- The start point is rules-owned and implicit; it is not trusted from the request.
- Duplicate points and exactly collinear intermediate points are removed without changing geometry.
- Canonical path maximum: 1,024 points.
- HTTP request maximum: 256 KiB.
- Validation checks board bounds, movement budget, every segment, base sweep, active-piece collisions, terrain, and supported geometry.
- Unsupported geometry fails `RULE_UNSUPPORTED`; it is never approximated silently.
- Over-complex paths fail `PATH_TOO_COMPLEX`; they are never truncated.

## 5. Preview and apply

Preview is non-mutating and may coexist with other previews at the same state revision. It returns an authoritative result, risk classification, deterministic chance commitment if needed, and an HMAC seal. Operational eviction of cached preview material is distinct from semantic staleness.

Apply succeeds only when all of the following hold:

- MatchBinding, state revision/hash, LegalSpace hash, and proposal identity still match.
- The SeatGrant is valid for the bound seat and capability.
- The active ControlLease belongs to that seat and its fencing token is current.
- The confirmation policy is satisfied. Opponent proposals always require a human confirmation issued to a non-model grant controlling that seat.
- The idempotency key either has no prior result or resolves to the byte-identical prior result.
- The chance commitment, when present, reveals exactly once.
- The store atomically commits all ledgers and revisions.

Accepted apply returns a signed receipt. Rejected attempts do not advance state revision and are visible only in the private actor/referee journal.

## 6. Revision and sequence matrix

| Counter | Advances when | Does not advance when |
|---|---|---|
| `roomRevision` | any committed room authority change | preview read, LegalSpace read |
| `stateRevision` | accepted rules transition | rejection, grant/lease housekeeping |
| `privateJournalSequence` | any committed private journal fact | read-only request |
| `publicJournalSequence` | accepted fact creates a public projection | rejection/private-only fact |
| `seatRecoveryRevision` | grant, revoke, lease, or recovery record changes | ordinary state read |
| `leaseFence` | a new controlling lease supersedes the old lease | lease observation |

Counters are monotonic per room. The store compares expected room and state revisions before every atomic commit.

## 7. Three ledgers and projection

| Ledger | Contains | Never contains |
|---|---|---|
| Private authoritative | full accepted receipt, encrypted state facts, actor-scoped rejections, confirmation and lease proof references | raw secret keys |
| Public projection | derived public action/result, public state hash, receipt reference and signature metadata | hands, unrevealed chance, private diagnostics, bearer tokens |
| Seat recovery | grant digest, seat binding, capability set, revocation, lease fence, encrypted recovery cursor | raw bearer token, other-seat hidden state |

Public projection is produced from the accepted private fact in the same transaction. It is not a second client-controlled write.

## 8. RoomStore adapter contract

Both adapters expose the same operations:

```text
createRoom(creationBundle)
loadRoom(roomId)
commit(expectedRevisions, atomicBundle)
readJournal(roomId, view, cursor)
loadReplayBundle(roomId)
health()
```

`commit` is the only mutating storage seam after creation. An atomic bundle may contain an updated aggregate, private events, public events, recovery updates, idempotency records, and a checkpoint. The adapter either persists all fields or none.

SQLite M1 requirements:

- WAL journal mode;
- foreign keys enabled;
- one write transaction uses `BEGIN IMMEDIATE`;
- compare-and-swap update on room and state revisions;
- AES-256-GCM private payloads;
- deterministic adapter conformance behavior.

PostgreSQL production requirements:

- transaction isolation and row locking must preserve the same compare-and-swap behavior;
- unique constraints preserve sequence and idempotency identities;
- private payload encryption contract matches SQLite;
- no additional success path unavailable to SQLite M1.

## 9. Frozen replay and quarantine

Before replay, the verifier resolves every frozen dependency by content hash. There is no fallback to `latest` and no silent compatibility conversion.

Quarantine reasons include:

```text
DEPENDENCY_MISSING
DEPENDENCY_HASH_MISMATCH
REFEREE_KEY_UNKNOWN
SIGNATURE_INVALID
JOURNAL_CHAIN_INVALID
REPLAY_DIVERGED
PUBLIC_PROJECTION_DIVERGED
HISTORICAL_RULES_DISPLAY_MISSING
```

New-rules evaluation is permitted only as a separate `AnalysisLineage` referencing the historical match receipt. It cannot replace a historical state, receipt, signature, or display binding.

## 10. Stable failure classes

```text
AUTHENTICATION_REQUIRED
SEAT_GRANT_INVALID
CAPABILITY_DENIED
CONTROL_LEASE_REQUIRED
CONTROL_LEASE_FENCED
REVISION_CONFLICT
LEGAL_SPACE_STALE
PROPOSAL_INVALID
PATH_TOO_COMPLEX
RULE_UNSUPPORTED
CONFIRMATION_REQUIRED
CONFIRMATION_INVALID
CHANCE_TICKET_INVALID
IDEMPOTENCY_CONFLICT
DEPENDENCY_QUARANTINED
PAYLOAD_TOO_LARGE
```

HTTP maps these classes deterministically without exposing hidden-state details.

## 11. Ticket 11 acceptance matrix

Ticket 11A's authority-kernel vertical slice closes only when verifier evidence covers all fifteen items:

1. server-owned room creation and frozen MatchBinding;
2. finite and parameterized LegalSpace separation from search;
3. arbitrary canonical movement path and complexity failure;
4. preview seal and non-mutation;
5. risk-based confirmation;
6. mandatory human confirmation for Opponent proposals;
7. SeatGrant role/side ownership and hidden projection;
8. one fenced ControlLease per seat with multi-device observation;
9. atomic three-ledger commit and private rejection;
10. idempotent accepted apply;
11. deterministic ChanceTicket behavior;
12. explicit GameClock and wall-clock exclusion;
13. signed receipts, checkpoints, replay, and projection verification;
14. SQLite recovery plus PostgreSQL adapter contract conformance;
15. strict frozen dependency quarantine, historical rule display, and training-ineligible manual adjudication.

Passing these fifteen items does **not** claim a complete atomic rules engine. Ticket 11 remains open through 11B until the rule-atom coverage gate below also closes.

## 12. Ticket 11B rule-atom coverage gate

The complete rules kernel must publish a source-derived `RuleAtomCatalogue`. Each canonical rules clause receives exactly one stable disposition:

- executable atom;
- display-only rule;
- review-required ambiguity; or
- unsupported/quarantined rule.

Every executable atom binds its source hash, version, owner, timing window, typed preconditions, LegalSpace contribution, deterministic effect, chance contract, rejection classes, interaction dependencies, inverse/replay obligations, and focused fixtures. Coverage is computed from the source-derived catalogue rather than a hand-written implementation list.

Product-data precedence is separate from general rule-prose precedence. Unit profiles, card text and costs, points, missions, and deployments bind the latest successfully captured official Command Center snapshot when a room is created. The room then freezes that exact content hash and the official `unitsVersion / cardsVersion / rulesVersion` tuple for its entire lifetime and replay lineage. May 2026 P2P PDFs remain frozen official history and cross-check evidence, not a license to overwrite newer online official data. Repository `RULE_MATRIX`, legacy JSON, Battle Lab calculations, and Expo-bundled values have zero production data authority; a missing or conflicting official value blocks or quarantines the dependent rule rather than falling back to repository values.

The binding contract selects a unique maximal official version tuple, rejects same-version content conflicts and incomparable version heads, and requires a signed four-dimension review over record schema, official/community scope, community isolation, and P2P precedence. The official Adapter deterministically decodes Firestore typed values and binds every normalized payload to its raw response and record hashes. A room freezes both the source snapshot hash and normalized dataset hash, so a parser revision cannot silently alter an existing room. `captured_unreviewed` data may be inventoried but cannot bind a production room. Production review requires externally managed signing material; contract-fixture keys cannot acquire production eligibility by relabeling their environment. Historical resolution requires both exact hashes and fails closed when either is unavailable.

P2P alias review binds every current product record to one or more content-hash/page-kind locators without copying gameplay values into the alias index. These locators support historical display and drift analysis only. When P2P and Command Center differ, the frozen latest Command Center record remains current; when the current record is missing, the dependent operation quarantines without P2P or repository fallback. Machine review produces content hashes for all four review dimensions, but only an externally managed production signature may promote that bundle to room-binding eligibility.

Ticket 11B closes only when:

1. the complete frozen source-clause denominator is addressable;
2. every executable atom has positive, negative, interaction, lifecycle, replay, and source-drift evidence;
3. every parameter domain has completeness and resource-budget evidence;
4. unknown atoms, owners, timings, geometry, RNG, or dependencies fail closed;
5. display-only/review/quarantined rows cannot enter LegalSpace, receipts, AI tools, Skill facts, or training traces;
6. rule dependency cycles and conflicting effects are explicitly diagnosed;
7. the current executor coverage report has zero unclassified clauses and preserves the exact non-executable debt ledger.

Until then, Ticket 11 status remains in progress even if the 11A movement slice passes.

The current mechanical segmentation checkpoint is intentionally below this closure bar. It accounts for all 192 anchor regions and produces hash-only sentence candidates with complete non-whitespace coverage, while identifying four structural-only parent headers. It does not classify sidebars, examples, tables, diagrams, or semantic clause boundaries, so `canonicalClauseCount` remains `null`. FAQ normative candidates may link to relevant core anchors for review, but no FAQ entry may override PDF text or enter an executable atom until exact candidate-clause reconciliation and independent review pass.
