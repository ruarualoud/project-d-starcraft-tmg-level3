# Ticket 16 Slice 157 — ProviderAttemptStore and SQLite WAL Adapter

Date: 2026-09-04
Status: complete. Ticket 16 is 5/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 157 adds the common non-secret `ProviderAttemptStore` contract and its
M1 file-backed SQLite Adapter. A Provider request cannot start after only an
in-memory budget check. The server must first open the hash-bound session
budget, atomically persist consent/request/Profile/egress identity hashes and
reserve the maximum units, then commit `attempt_dispatched`. Only the committed
dispatch result carries `egressAuthorized=true`.

Known terminal usage atomically releases the reservation and charges the
reported input plus output units. A dispatched failure with unknown usage
charges the full reservation. Budget state, attempt state, safe Provider
receipt hash and a hash-chained audit event commit in one `BEGIN IMMEDIATE`
transaction. Budget and attempt revisions provide compare-and-swap fencing.

Operation idempotency is result-stable: replaying the same request hash returns
the original byte-equivalent operation result even if the attempt later moved
to another state. Reusing the identity with changed content fails closed.

## Restart and ambiguous-attempt policy

On restart, a committed reservation without a committed dispatch becomes
`abandoned_before_egress` and releases its units with zero charge. A committed
dispatch without terminal settlement becomes `ambiguous`, conservatively
charges the full reservation, and records that the Provider may have received
the request. Recovery itself is idempotent and audit chained.

An unresolved ambiguous attempt blocks unrelated new work under that budget.
The only accepted retry lineage uses a fresh idempotency hash plus a trusted
service-validated same-user approval-receipt hash and a fresh
credential-reattachment-receipt hash. This Slice's store binds those hashes; it
does not issue or authenticate either receipt. The old attempt links to that
one retry and the store never retries by itself. Slice 158 will prove the same
contract with PostgreSQL transactions, multi-connection contention and the
complete recovery/approval composition.

## MTL scheduling lineage

The design was checked against pinned MTL
`codex/mtl-character-agent-repair@50ef5c29c655c015335d76e78fb4a0ecb442252f`,
especially `provider-step-wal-v1.mjs`, `persistent-scheduler-v1.mjs` and the
Level-3 standard template. It adopts intent-before-side-effect, immutable
idempotent results, revision/fencing checks, atomic budgets and conservative
ambiguous recovery.

The StarCraft online path differs deliberately: approval belongs to the same
authenticated user rather than a self-play administrator; the durable budget
uses Ticket 15 Provider units; no online format-repair retry exists; and DSH
remains restricted to later offline Skill generation.

## Storage boundary

The Adapter requires a real SQLite file and enables WAL, `synchronous=FULL`,
foreign keys, strict tables, a five-second busy timeout and startup
`quick_check`. The implementation was checked against the official
[Node 24 SQLite API](https://nodejs.org/docs/latest-v24.x/api/sqlite.html),
[SQLite WAL](https://sqlite.org/wal.html),
[transaction](https://sqlite.org/lang_transaction.html) and
[synchronous PRAGMA](https://sqlite.org/pragma.html#pragma_synchronous)
documentation. Node `v24.14.0` still emits an experimental warning for
`node:sqlite`, so this Adapter is pinned as the M1 implementation rather than
silently treated as the production PostgreSQL implementation.

Persisted identity is limited to hashes for authentication scope, session
binding, consent receipt, Provider Profile, egress policy, Prompt assembly,
response contract, bounded request, safe Provider receipt and idempotency.
Only intent, unit counts, timestamps, state and revisions are stored in clear.
Credential bytes or hashes, API keys, raw Prompt, raw output, raw Provider
headers, reasoning, cookies and access tokens are forbidden.

## Fixed evidence

- Slice contract: `f86c53aac9c132f9acd4c70bcf4c5294d8b9be5cc9c48f60c40d85ad4b8e491f`.
- Slice contract source: `a3094faf3228ef0f53b11184320684db9c305263d515c7bb6e037b45d3d7c5f8`.
- Common store source: `495d47fdbc3bed2764a6329d59da769fee38f72f33a3b444dd8f29a07f9ac605`.
- SQLite Adapter source: `2f2cc918b5c71a7ff26bceb92b9b541604802e9f516f664de247028b54e0c051`.
- Verifier source: `ccc3f00db88193e68177b29363a47eebd1980481b9ed6f24cf58ee5e0c56381d`.
- Slice verifier: 45/45 across 43 real temporary SQLite files and three
  close/reopen sequences.
- Fixed cumulative denominator: 299 predecessor assertions + 45 Slice 157
  assertions = 344 assertions.
- Slice report: `84e579bcd924de42ec2e7be2a2a130561ee2d718782ff8b08623f403274264a5`.

The predecessor-to-current aggregate passed, including Ticket 15's real
Chromium 11/11 gate and every Ticket 16 gate through Slice 157.

## Truth boundary and next Slice

The verifier created only temporary local SQLite files and synthetic hashes.
No Provider transport was invoked and no user credential was accepted. No
official game-data refresh, PostgreSQL connection, Skill generation, DSH,
Memory write, MuZero export, self-play or training promotion occurred.

Slice 158 implements PostgreSQL Adapter parity and proves concurrent budget
reservations, transaction rollback/crash windows, ambiguous-attempt approval,
credential reattachment and no silent retry. A real API key remains required
only for Slice 162 and must be configured locally, never pasted into chat.
