# Ticket 16 — secure BYOK and direct Provider roadmap

Date: 2026-09-03  
Status: active; Slices 153–155 complete, 3/10
Project progress before this Ticket: 14/22 Tickets complete; Ticket 14 device
acceptance remains deferred  
Source refresh: not performed

## Outcome

Ticket 16 supplies the production-shaped direct Provider implementation behind
Ticket 15's credential-free Gateway. It owns explicit BYOK consent and detach,
a credential-isolated child Worker, server-owned Provider/model/egress policy,
durable attempt and budget recovery, safe receipts, Web controls and one
user-authorized live call. It owns no Rules, room, RNG, Confirm/Apply, Skill,
DSH, Memory-promotion or training authority.

A real API key is not needed for Slices 153–161. Slice 162 requires the user to
configure a key locally through the secure ingress or process environment. The
key must not be pasted into chat. Without that call, all implementation may be
complete but Ticket 16 remains open at 9/10.

## Existing-code audit

The Ticket 13 Provider V1 is useful evidence for bounded OpenAI-compatible JSON,
one physical attempt, shared header/body timeout, response limits and safe
receipts. It is not the production runtime: the raw key enters the main process,
is held in a session `Map`, reaches the direct transport as a string and is
exposed by the historical Character HTTP route.

Ticket 15 fixed the Agent-facing side. Its Gateway request contains only sealed
Provider/prompt/response references, a bounded request, a budget reservation
and an abort signal. It already owns per-session single-flight, cancellation,
timeout, conservative unknown-usage charging and late-result fencing. Its
budget and turn ledgers are process-memory-only, and its injected Gateway makes
no external call. Ticket 16 composes behind this seam and does not rewrite it.

The five predecessor modules and their byte hashes are frozen in the Slice 153
contract. The old implementation and verifier remain available as labelled
historical evidence. There is no silent compatibility or relabelling.

## MTL comparison

The audit used the requested MTL branch
`codex/mtl-character-agent-repair` at commit
`50ef5c29c655c015335d76e78fb4a0ecb442252f`, including the standard design
document, child-process BYOK broker, Provider isolation supervisor and
Provider-step WAL.

The StarCraft runtime adopts these proven ideas:

- a scrubbed child process owns the session-memory credential;
- the Agent/Rules/room processes never receive raw credential material;
- a non-secret attempt intent is durable before a billable call;
- an interrupted, possibly billed attempt becomes ambiguous and cannot retry
  automatically;
- Provider/model/Harness/budget identities and safe usage are receipted;
- raw Provider material never enters public replay or training artifacts.

It does not copy the MTL implementation. MTL's current code is shaped around
two self-play seat processes, a Rules tool bridge and bounded internal retries.
Ticket 16 instead plugs into Ticket 15's four online role modes, permits no
automatic retry, uses one credential Worker per attachment, and implements the
chosen SQLite-M1/PostgreSQL-production storage contract.

This lineage is required for every later StarCraft Agent scheduling mode:
online role sessions, offline Skill generation, durable Skill jobs and
self-play orchestration must pin the MTL scheduling inputs they adopt and state
their StarCraft authority differences. Online modes retain the four-role,
human-confirmation and no-DSH boundaries; later offline modes cannot silently
inherit online authority or publish generated output.

## Target deep module

`packages/secure-provider-runtime` will expose a small control plane plus one
`complete` Gateway operation. The control plane owns attachment consent,
dedicated credential ingress, status/detach, explicit ambiguous-attempt retry
approval and recovery. `complete` keeps the Ticket 15 input free of credentials
and resolves only server-owned Provider profiles and prompt artifacts.

Attaching is two-stage. First, an authenticated client creates a non-secret,
hash-sealed consent intent binding principal, room, online session,
Provider/profile/model, budget and disclosure policy. Second, a single-use
short-lived nonce accepts only bounded credential bytes at a dedicated secure
route. The parent forwards the buffer to the child and zeroes it after the
child acknowledges. Only an opaque attachment ref and safe status remain in
the parent. Detach, session end, logout/revocation, expiry or Worker exit kill
the credential. A server restart loses it and requires explicit reattachment.

Only the credential Worker may make external Provider connections. Remote
connections require HTTPS, exact registered host/port/path/model, globally
routable DNS results, TLS verification, no redirects, no proxy or custom auth
header, strict request/response/time bounds and exactly one physical attempt.
Online DSH is rejected.

The common `ProviderAttemptStore` has SQLite WAL for M1 and a transactional
PostgreSQL production Adapter. Neither persists prompts, responses, reasoning,
credentials or credential hashes. Consent, attempt intent and budget
reservation commit before egress; terminal outcome, usage/conservative charge,
remaining budget and safe receipt hash settle atomically. A crash after intent
is explicitly ambiguous: Provider cost may have occurred, so another billable
call needs a new same-user approval and a reattached credential.

## Fixed slices

| Slice | Scope | Closure evidence |
| --- | --- | --- |
| 153 | **Complete.** Audit/freeze the old implementation, compare MTL and fix the 10-Slice denominator. | Hash-sealed boundary `241c8a35...6cbe5`; exact old-file hashes; MTL commit and adapted principles; focused 15/15, report `8c03cff4...57e7e`; no key or call. |
| 154 | **Complete.** Authenticated consent, attachment lifecycle and dedicated secure ingress. | Principal/session/profile/budget binding; one-use expiry nonce; Buffer-only synthetic-key path with zeroing; status/detach/revocation/concurrency tests; focused 27/27, report `30bf5825...c0fd`; no user key or Provider call. |
| 155 | **Complete.** Child-process credential Worker and IPC isolation. | Scrubbed environment/stdio; parent and child buffer zeroing; per-attachment process; crash/detach kill; no restart; MTL scheduling lineage; focused 25/25 with 14 actual children, report `8749348f...faf5`; no user key or Provider call. |
| 156 | Provider registry, egress allowlist and bounded transport. | Exact host/path/model; public DNS/TLS/no redirect; body/time bounds; one attempt; typed failures; no arbitrary endpoint. |
| 157 | Common attempt-store contract and SQLite WAL Adapter. | Non-secret schema; intent-before-egress; atomic budget reservation/settlement; idempotency/CAS; restart replay. |
| 158 | PostgreSQL Adapter parity and ambiguous-attempt recovery. | Same conformance suite; concurrent reservations; crash windows; explicit retry approval; lost-key reattach. |
| 159 | Ticket 15 Gateway/prompt/provider receipt integration. | Real Worker behind `complete`; current prompt/profile resolution; abort/budget/fence semantics; safe model/usage/cost receipt. |
| 160 | Web and Battle Lab BYOK product flow. | Consent disclosure; Provider/model/budget selection; password input; attached/missing/error/detached states; no cache/log persistence. |
| 161 | Redaction fuzz, real-browser and Worker-failure aggregate. | Credential echo/error/encoding corpus; HTTP/DOM/artifact scans; cancel/timeout/crash/recovery; four role modes with deterministic Provider. |
| 162 | One user-authorized minimal live call and Ticket closure. | Local-only key injection; reported Provider/model/version, usage/cost, response fingerprint, browser-visible safe state and full aggregate. |

## Non-negotiable gates

- The client cannot supply a base URL, headers, Provider authority or arbitrary
  model name.
- Human-human play never triggers a Provider call.
- Tutor, Commentator and Companion stay read-only. Opponent may select only a
  current enabled LegalSpace candidate and still cannot Confirm or Apply.
- Raw keys, prompts, responses and reasoning never enter room replay, public
  Agent traces, Skill inputs or training exports.
- DSH remains reserved for Ticket 17 offline Skill generation. No large-scale
  Skill production is permitted without the user's later explicit approval.
- No official game-data refresh occurs during this Ticket unless the user
  separately commands it.

Slice 153's Harness round is boundary-only: no prompt route, tool, UI trace,
Agent decision, Memory write or training candidate ran. Its rollback is the
already-proven Ticket 15 injected Gateway; any future credential/egress failure
detaches and disables the affected profile, and an ambiguous billable attempt
never retries without explicit same-user approval.

## Slice 153 fixed evidence

- Focused boundary and adjacent historical gates: 15/15 boundary assertions,
  Ticket 15 boundary 11/11 and direct Provider V1 5/5.
- Full predecessor-to-current aggregate: pass, including Ticket 15's real
  Chromium 11/11 and closure 11/11.
- Fixed cumulative denominator: 192 predecessor assertions + 15 Slice 153
  assertions = 207 assertions.
- Boundary hash: `241c8a35fef6cc0a4e851070d891b0deda7f273557b061a1e266a184b576cbe5`.
- Slice report hash: `8c03cff43ba3b5c9a32e852014767eda47f5406107db1068c9cf468d76257e7e`.

## Slice 154 fixed evidence

- New deep control module: authenticated explicit consent, a 32-byte
  single-use nonce stored only as a digest, bounded Buffer handoff, safe status,
  explicit detach, session/principal revocation, expiry sweep and close.
- Dedicated HTTP module: TLS by default, explicit loopback development only,
  exact JSON consent and `application/octet-stream` ingress, strict body
  length/size/encoding gates, no-store security headers and credential-safe
  response projections.
- Behavior verifier: 27/27 assertions, including cross-principal/room/session
  denial, stale/current reconnect fencing, expiry, replay, wrong nonce,
  client-authority rejection, unsafe Worker acknowledgement cleanup, detach
  failure retry, detach-during-ingress and capacity fail-closed behavior.
- Focused adjacent gates: Slice 153 15/15, Ticket 15 session lifecycle 21/21
  and Provider supervisor 24/24.
- Fixed cumulative denominator: 207 predecessor assertions + 27 Slice 154
  assertions = 234 assertions.
- Contract hash: `6e7d243bcbd766b2f7eb52dbf3b46fbe1dc0f0cf6e5bef823c1d68cd5f03027f`.
- Slice report hash: `30bf5825dbb6aaec7ceb7d04d6f1701e596e492cdd6da34624370929a88bc0fd`.
- Only a byte-array synthetic sentinel crossed the injected port. No user API
  key was accepted, no external Provider was called and the port is not yet a
  child process; Slice 155 owns that isolation step.

## Slice 155 fixed evidence

- A real fixed child process now owns each attached synthetic credential in
  session memory; the parent and received IPC buffers are zeroed.
- Child launch uses no shell, ignored stdin/stdout/stderr, one IPC channel and
  a scrubbed environment. The child imports no Provider, Rules, room, Agent,
  Skill, Memory or DSH capability.
- Detach waits for exit with SIGKILL fallback. Unexpected exit is observable,
  never automatically restarted and cannot reuse the old Worker reference.
- The contract pins five exact MTL scheduling inputs at commit
  `50ef5c29c655c015335d76e78fb4a0ecb442252f` and freezes both adopted flow and
  StarCraft-specific authority differences.
- Behavior verifier: 25/25 assertions with 14 actual child-process launches;
  focused Slice 154, Slice 153 and Provider-supervisor regressions pass.
- Fixed cumulative denominator: 234 predecessor assertions + 25 Slice 155
  assertions = 259 assertions.
- Contract hash: `e4aa950759f896d14223206f371225526efa728e80a38254ed248c4f03350b3a`.
- Slice report hash: `8749348f18774bd374c9015fdb1458f745fd12e23a3946e663f3afe3c5ddfaf5`.
- Only synthetic bytes ran. No user key, external Provider call, source refresh,
  Skill/DSH/MuZero/self-play/Memory/training work occurred. Slice 156 owns the
  exact allowlisted Provider transport.
