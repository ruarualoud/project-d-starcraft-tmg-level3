# Ticket 12 Slice 116 — translation review-store Adapters v1

Status: implemented; Ticket 12 remains open at 5/7 planned slices.

SQLite M1 and PostgreSQL production storage now implement one strict translation
review-store contract.

## Shared behavior

- Only an intact, current-format machine candidate with a sealed direct-Provider
  receipt may enter persistence. Missing receipt dependencies, candidate drift,
  and any credential material fail before a database write; older incompatible
  drafts remain displayable elsewhere but are not silently upgraded.
- Candidate write is idempotent by a hashed key. Reuse for different content is
  a conflict. Review starts at `pending@0` and uses status/revision CAS.
- Approval, correction, and rejection reuse the sealed translation-sidecar
  review contract. Every successful write adds an immutable event to a global
  content-hash audit chain.
- SQLite uses STRICT tables, WAL, `synchronous=FULL`, and `BEGIN IMMEDIATE`.
  File restart must reproduce candidates, corrections, and the exact audit hash.
- PostgreSQL uses JSONB/TIMESTAMPTZ, SERIALIZABLE transactions, candidate row
  locks, a singleton locked audit head, unique idempotency, and revision CAS.
  The same lifecycle and replay produce the same semantic hashes on both
  Adapters.

`npm run verify:translation-review-store-adapters` runs both complete contracts,
SQLite file restart, deterministic PostgreSQL protocol restart, tamper and
credential rejection, CAS/idempotency conflicts, correction, and cross-time
audit replay.

No PostgreSQL server or DSN exists in this development workspace. The production
SQL Adapter is implemented and protocol-tested, while live PostgreSQL migration
and integration stay an explicit deployment gate; `productionReady` is false.

Reviewed translations remain display sidecars and training-ineligible. ctx2skill
is fact-probe only with zero Skill generation/promotion; no DSH, MuZero,
self-play, memory, or training promotion runs here.
