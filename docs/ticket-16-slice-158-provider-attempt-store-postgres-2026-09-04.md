# Ticket 16 Slice 158 — PostgreSQL parity and ambiguous retry recovery

Date: 2026-09-04
Status: complete. Ticket 16 is 6/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 158 adds the production-pool PostgreSQL Adapter for the exact
`starcraft_tmg_provider_attempt_store_v1` contract. It does not import or own a
specific driver: production supplies a standard pool with `connect()` and
`query()`, while pool shutdown remains an explicit ownership option.

All mutations use `BEGIN ISOLATION LEVEL SERIALIZABLE`. Budget, attempt and
audit-head rows use `SELECT ... FOR UPDATE`; every state transition also keeps
its explicit revision predicate. Initialization is protected by a transaction
advisory lock and rejects either metadata drift or any unexpected table-column
layout instead of silently treating an older schema as compatible.

The implementation follows the official PostgreSQL documentation for
[Serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html),
[explicit row locking](https://www.postgresql.org/docs/current/explicit-locking.html)
and [INSERT conflict behavior](https://www.postgresql.org/docs/current/sql-insert.html).
Serialization/deadlock errors are surfaced as a stable store conflict; the
Adapter performs zero internal database retry and zero Provider retry.

## Concurrency and crash windows

The same lifecycle was executed through the file-backed SQLite Adapter and a
deterministic multi-connection PostgreSQL transaction protocol. Their complete
results, materialized budget/attempt state, audit pages and replay are
hash-identical.

Two concurrent reservations using one budget revision produce exactly one
winner. The second transaction observes the advanced revision and fails before
it can reserve units. An injected failure after attempt and budget mutation but
before audit completion rolls the entire transaction back.

The verifier also distinguishes a failed transaction from a lost COMMIT
acknowledgement. If reserve, dispatch or recovery committed but its response was
lost, replaying the exact request returns the stored original result. Changed
content conflicts. In particular, egress is not authorized merely because a
dispatch COMMIT might have happened: the caller must first observe the exact
stored dispatch result carrying `egressAuthorized=true`.

## Signed ambiguous retry

The recovery control derives from the pinned MTL sequence:

`Persist intent → Commit dispatch → Execute once → Persist safe receipt → Recover/replay → Explicit replan`

An ambiguous attempt blocks unrelated requests. Its sole retry requires a
same-user approval bound to budget, attempt, principal, session and the new
reservation idempotency identity. The approval carries a canonical content
hash, Ed25519 long-term signature and HMAC-SHA256 short seal. A rotated HMAC
invalidates current execution authority, while the Ed25519 proof remains valid
for historical audit.

The control then reads the current authenticated credential attachment. It
requires a new consent receipt, attachment after ambiguity recovery, the same
session and Provider Profile, and the exact original egress policy, Prompt,
response contract, request, intent and unit bounds. It persists only approval
and attachment hashes. The signed receipt, room/session request context and all
credential material remain outside the store. The retry is only reserved;
dispatch remains a separate durable commit.

This sequence is now the required scheduling baseline for every later
StarCraft Agent mode: the four online roles, offline Skill generation, Skill
scheduler, self-play and MuZero export. Their authorities and payloads differ,
but none may bypass persisted intent, fencing, receipts and recovery.

## Fixed evidence

- Slice contract: `246b3e81dc75518b6182d1d6eeeffdd1abec6d08856827155c16b4d43882cc48`.
- Slice contract source: `71b3b0d6da4340598117e74bd23eb144196dfda3c3e163468baa5b7429e36001`.
- PostgreSQL Adapter source: `beb29d21e39396b4cc27b05fa18cb4aa5e9085f82e2430f1bd47f9ee104c089a`.
- Retry approval authority source: `71d9c9a831e16406040e5d79fc6b4f0938467a7944cf4886338aad1d633265c2`.
- Recovery control source: `dc46842cc0f264c4ff25a6febb0a7d90bfb5c394a3a38a890ae7f36cb3b814dc`.
- Verifier source: `e6923a7d1796b4789116dc4db8b7fc4d71a96fbf6f0034f92c492cf4f6df7202`.
- Slice verifier: 42/42; eleven PostgreSQL protocol connections and two real
  temporary SQLite parity files.
- Fixed cumulative denominator: 344 predecessor assertions + 42 Slice 158
  assertions = 386 assertions.
- Slice report: `b55d070304dc96a7f39afc839a33dedfcbad8bcecd1e6645ce55043fdba834a7`.

The predecessor-to-current aggregate passed, including Ticket 15's real
Chromium 11/11 gate and every Ticket 16 gate through Slice 158.

## Truth boundary and next Slice

No real PostgreSQL server was started: the production Adapter was exercised
through a deterministic transaction-aware pool double, following the existing
repository Adapter-conformance pattern. This proves its SQL protocol and
cross-Adapter semantics, not deployment connectivity; production database
provisioning and multi-instance acceptance remain Ticket 21 work.

No Provider transport, user credential, official source refresh, Skill, DSH,
MuZero, self-play, Memory write or training operation occurred. Slice 159 now
connects the current Ticket 15 Gateway to Prompt assembly, the credential/egress
Worker, this durable attempt store and safe Provider receipts. A real API key
is still required only for Slice 162 and must be configured locally.
