# ADR 0001: Authoritative Transition and Verifiable Journal

- Status: Accepted
- Date: 2026-08-24
- Ticket: 11
- Scope: `starcraft-tmg-level3`

## Context

StarCraft TMG must support the same match across Web and App clients, AI-assisted seats, deterministic replay, expert-readable evidence, and MuZero-compatible training exports. The existing prototype transition code binds a candidate to a state hash, but it does not yet provide durable match identity, server-owned seat authority, cryptographic receipts, projection-safe journals, or production storage parity.

The authority boundary must remain independent from UI search, strategy scoring, model output, client wall clocks, and client-supplied role or side claims.

## Decision

### 1. Authority identity

Every accepted transition is bound to a `MatchBinding`, an authoritative input envelope, the current private state hash, a LegalSpace hash, a canonical proposal, a preview seal, any required human confirmation, and the preceding private journal head.

Canonical content uses RFC 8785 JSON Canonicalization Scheme semantics. Content identities use SHA-256.

Long-lived referee artifacts, including match bindings, accepted receipts, checkpoints, and replay verification results, use Ed25519 signatures. Short-lived preview, confirmation, chance, and control artifacts use server-side HMAC-SHA-256 seals. A seal authenticates a structured server record; it is not a bearer assertion that can grant a role or side by itself.

### 2. Hybrid LegalSpace

LegalSpace is the union of:

- exact finite actions; and
- rules-owned parameter domains.

Movement is a parameter domain. A user may submit an arbitrary path within the domain. The server canonicalizes it to fixed-point milli-inch coordinates and validates the complete swept geometry. Canonical paths are limited to 1,024 points and request bodies to 256 KiB. Excess complexity fails closed with `PATH_TOO_COMPLEX`; the server never truncates a path.

Search suggestions, UI affordances, heuristics, and strategy scores are outside authority identity. They may instantiate a parameterized proposal, but they do not define LegalSpace completeness.

### 3. Three logical ledgers

Each room has three logically distinct ledgers:

- private authoritative journal;
- public projection journal; and
- seat-recovery ledger.

Rejected attempts are recorded only in the private actor/referee view. Public entries are derived from accepted private facts and contain no hidden-state payload. Recovery records contain only the minimum sealed authority required to restore a seat session.

### 4. Storage contract

M1 uses SQLite in WAL mode. Production uses PostgreSQL. Both adapters implement the same `RoomStore` contract and the same transaction boundary:

1. compare the expected room and state revisions;
2. append private authoritative facts;
3. append the public projection derived from those facts;
4. update seat recovery and idempotency state;
5. update the room aggregate and optional checkpoint; and
6. commit all changes atomically, or commit none.

The adapters must preserve monotonic private sequence, public sequence, room revision, state revision, seat-recovery revision, and per-seat fencing tokens. PostgreSQL is not allowed to weaken or reinterpret the SQLite contract.

Private persisted payloads use AES-256-GCM at rest. Key references and public verification material are explicit metadata; secret key bytes are never journal payloads.

### 5. Historical dependency freeze and display

An accepted match freezes the exact source snapshot, data snapshot, rules artifact, executor artifact, geometry artifact, action schema, RNG scheme, and referee verification key lineage used by the match.

Replay must load those exact dependencies. If any dependency is missing or its hash differs, the match is quarantined with an explicit dependency error. The platform must not silently replay historical data using the newest rules or compatibility shims.

Historical rules remain human-readable. Every frozen rules artifact carries a signed `RulesDisplayBinding` pointing to an immutable display artifact and locale metadata. The Web/App API exposes the historical display artifact associated with a match even after newer rules are installed. A new analysis performed under newer rules is stored as a separate analysis lineage and never changes the historical receipt chain.

### 6. Seat and control authority

SeatGrant records are server-owned. Callers cannot choose or override side, role, hidden-state scope, or apply capability. Only one active `ControlLease` may apply for a seat at a time; each lease carries a monotonically increasing fencing token. Other same-seat devices may observe and preview.

Tutor, Commentator, and Companion remain read-only. Opponent may propose only enabled LegalSpace actions and always requires explicit human confirmation before apply. Models never call the mutation primitive directly.

### 7. Time, chance, manual adjudication, and training truth

Rules time uses explicit `GameClock` state. Wall-clock timestamps are audit metadata only and never enter authoritative state hashes.

Random outcomes use deterministic `ChanceTicket` commitments. Preview does not reveal or reroll an outcome. Apply reveals the committed result and advances the deterministic chance state.

Manual adjudication is a typed action, disabled by default in M1, separately authorized, and always marks the affected trace as training-ineligible. No runtime trace is considered training truth until replay, projection, signature, and dependency verification succeed.

## Consequences

- The authority module becomes deeper: callers provide intent and credentials, while canonicalization, geometry validation, confirmation policy, sealing, signing, projection, and revision checks stay behind stable interfaces.
- SQLite and PostgreSQL can be compared with the same adapter conformance suite.
- Historical matches can remain verifiable and readable without silently depending on current rules.
- Missing frozen dependencies cause visible quarantine instead of best-effort compatibility.
- Search and AI quality can evolve without changing the definition of legal authority.

## Rejected alternatives

- Treating a scored candidate list as complete LegalSpace.
- Trusting caller-supplied role, side, state, time, or initial-state fields.
- Hash-only receipts without a verifiable referee signature.
- Using wall-clock timestamps in deterministic state.
- Storing only one journal and filtering it at read time.
- Replaying old matches with the latest compatible-looking rules.
- Truncating over-complex paths.

