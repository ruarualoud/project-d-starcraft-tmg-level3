# Ticket 16 Slice 156 — Provider registry and egress allowlist

Date: 2026-09-04
Status: complete. Ticket 16 is 4/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 156 adds the server-owned Provider/Profile registry and the only allowed
online Provider network path. A client can reference a registered Profile by
exact id/version/hash but cannot submit the base URL, hostname, port, path,
model, headers or retry policy. The resulting egress binding hash-seals the
exact HTTPS authority, model, sampling/output bounds and transport policy.

The transport resolves every address for the registered DNS name, rejects the
entire set if any answer is non-global, then pins the connection lookup to one
verified address while retaining the registered hostname for HTTP authority,
TLS SNI and certificate verification. It uses no reusable Agent, proxy input,
redirect handling, custom client header or compression. Request bytes,
response bytes, response headers and total time are bounded. Every operation
performs at most one physical HTTPS request and never retries internally.

A new combined credential/egress child is still one process per attachment.
It receives the server-owned egress binding at initialization, keeps the
credential only in its existing child Buffer, and accepts bounded complete,
cancel and shutdown messages. The trusted parent imports no HTTPS/DNS
transport and validates every success/failure IPC shape and hash before use.
Rules, room, role-Agent, Skill, Memory and DSH capabilities are not in the
child import graph.

## MTL scheduling lineage

The implementation continues from the pinned MTL branch and commit
`codex/mtl-character-agent-repair@50ef5c29c655c015335d76e78fb4a0ecb442252f`:
only the credential broker owns Provider transport; the parent forwards
bounded non-secret request packets; lifecycle cancel/shutdown aborts work; and
Provider attempt, identity and usage become safe receipts.

StarCraft deliberately omits MTL's online DeepSeek-specific DoH bypass,
automatic retry and contract-repair rounds. Online Tutor, Opponent,
Commentator and Companion remain separate Ticket 15 modes; no model can
Confirm/Apply, and DSH remains limited to later offline Skill generation.

## Standards and conservative address policy

The address boundary was checked against the IANA IPv4/IPv6 special-purpose
registries and Node's HTTPS/TLS API. The embedded classifier is deliberately
conservative: it can deny special blocks containing individual public
exceptions, but it cannot turn a known local, private, link-local,
documentation, benchmark, multicast or reserved sample into an eligible
destination. IPv6 is limited to conservative global-unicast space with known
special/transition/documentation blocks removed.

This policy is code-frozen for the Slice rather than downloaded at runtime.
Changing it requires a new version and new SSRF regression evidence.

## Failure and abuse coverage

The 40 fixed assertions cover:

- exact Profile resolution, no fallback, endpoint-free public listing and
  rejection of HTTP, userinfo, query, fragment, IP literal, localhost,
  unlisted port/provider, placeholder model, online DSH, retry and ambiguous
  paths;
- public IPv4/IPv6 positive samples and non-global/special negative samples;
- mixed public/private DNS rejection before HTTPS, empty/unbounded answers and
  typed resolver failure;
- exact host/port/path/model, DNS pin, SNI, verified TLS, fixed headers, no
  proxy/redirect/compression and one physical attempt;
- safe structured output plus model/usage/request-id/response/DNS fingerprints;
- redirect, auth, rate-limit, upstream, response contract, content-length,
  stream overflow, timeout, in-flight abort and synchronous transport failure;
- actual credential-child attach/preflight/crash/detach, parent Buffer zeroing,
  safe/unsafe child result validation and Slice 154 consent composition.

## Fixed evidence

- Slice contract: `642425b38dbd6dd4041d2a17e21ad95cc2324a905c0ccb5c800cf786f35df817`.
- Egress contract source: `af545195d47e2e38bf44fcccdef59649e4eeb6f75a752af1a297a6cabece4033`.
- Registry source: `adf801fb80a38f04b6f96ba4f6ba36c202a79f8b4d8b4db91938ebe956c69080`.
- HTTPS transport source: `d3f84d7905a0ae74df7f2f4b85d8718819c3d1774e94ae65d15054758dea5391`.
- Combined child source: `2cbb007017e05f5df414841364c62d4331d69aa4395ad8706bb159ed76bbf876`.
- Parent port source: `4915b2b1e60fc586ee0f26ab5c0b4ff3b3f4029b89b6be5f8b9a25235948e133`.
- Verifier source: `b5d44b713d508ffcb3e9b3f29047a5d168489cd548be46cb48eeba02d8607263`.
- Slice verifier: 40/40; four actual credential-child launches and 17 injected
  HTTPS requests.
- Focused adjacent gates: Slice 155 25/25, Slice 154 27/27 and Ticket 15
  Provider supervisor 24/24.
- Fixed cumulative denominator: 259 predecessor assertions + 40 Slice 156
  assertions = 299 assertions.
- Slice report: `732d3a59344fed858253c4bf47c9f6b7058a978e585c428861be5c205b4d801e`.

The implementation ran on Node `v24.14.0`. The predecessor-to-current
aggregate passed, including Ticket 15's real Chromium 11/11 gate and every
Ticket 16 gate through Slice 156.

## Truth boundary and next Slice

All DNS and HTTPS success/failure fixtures were injected in memory. Actual
credential children performed no DNS lookup or network request. Only a
synthetic byte-array sentinel was accepted. No user key, external Provider
call, official game-data refresh, Skill generation, DSH, Memory write, MuZero
export, self-play or training promotion occurred.

Slice 157 adds the common non-secret `ProviderAttemptStore` contract and SQLite
WAL Adapter: consent/intent/budget reservation before egress, idempotency/CAS,
atomic terminal settlement and restart replay. A real API key remains required
only for Slice 162 and must be configured locally, never pasted into chat.
