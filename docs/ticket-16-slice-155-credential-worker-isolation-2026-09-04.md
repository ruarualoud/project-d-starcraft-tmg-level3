# Ticket 16 Slice 155 — credential Worker isolation

Date: 2026-09-04
Status: complete. Ticket 16 is 3/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 155 replaces Slice 154's injected attachment seam with a real child
process per authenticated credential attachment. The parent launches a fixed
Node child with no shell, ignored stdin/stdout/stderr, one IPC channel and an
environment reduced to `NODE_NO_WARNINGS`. The child imports no modules and
accepts only one bounded initialize message followed by one bounded shutdown.

Credential bytes are copied into child-session memory, then the received IPC
buffer and the caller-owned parent buffer are zeroed. Shutdown, disconnect,
SIGINT, SIGTERM and fatal-process handlers scrub the child buffer. Detach waits
for process exit and falls back to SIGKILL. Unexpected exit becomes an
observable tombstone and is never restarted; a new explicit attachment gets a
new Worker reference and process.

This is process separation, not an OS sandbox. The Worker intentionally has no
Provider transport in this Slice, so it cannot perform a live call. Slice 156
owns the exact outbound transport and egress allowlist.

## MTL scheduling lineage

The contract pins the requested MTL repository, branch and exact commit
`50ef5c29c655c015335d76e78fb4a0ecb442252f`, plus byte hashes for the standard
design document, isolation supervisor, workflow Worker, credential broker and
step WAL. StarCraft adopts its content-addressed Harness, parent-mediated IPC,
bounded lifecycle/tool budgets, revision/LegalSpace binding, deterministic
revalidation, stop-and-replan boundaries and safe attempt/usage/recovery
receipts.

The adaptation is explicit: Tutor, Opponent, Commentator and Companion retain
separate online capabilities; only Opponent may select a current enabled
LegalSpace candidate; no online Agent can Confirm/Apply or automatically replay
a model-authored plan; human-human never schedules a model; DSH is offline
Skill-generation-only. Every later StarCraft Agent scheduler or orchestration
mode must start from this pinned MTL scheduling lineage and declare its
StarCraft-specific authority differences rather than inventing an unrelated
flow.

## Failure and abuse coverage

The behavior verifier uses actual child processes and injected hostile process
doubles to prove:

- one process per attachment and distinct process identity after reattach;
- parent-buffer zeroing after success, validation failure, capacity failure,
  spawn failure, timeout and polluted acknowledgement;
- exact scrubbed child environment and ignored application stdio;
- graceful detach, close idempotency and SIGKILL fallback;
- unexpected crash observability with no automatic restart or reference reuse;
- placeholder model and online DSH rejection before process launch;
- unknown child messages fail closed without Provider, Rules, room or Agent
  capability;
- Slice 154 consent/ingress hands synthetic bytes to this real port and
  lifecycle detach terminates their child lifetime.

## Fixed evidence

- Slice contract: `e4aa950759f896d14223206f371225526efa728e80a38254ed248c4f03350b3a`.
- Child source: `be2fc5cad1f77914f2c2944eb806f52c36fcf55ce40a87a216ce32f55ccd8f5b`.
- Parent port source: `43755e74a6058db16df88cc519d4dcb301938adf8de4ba4c4c9c341ed3c8fcf5`.
- Slice verifier source: `1cb6bc1cbe99651a8d484a78575337f61583f73317149b96a08b6449c9c3f717`.
- Slice verifier: 25/25 with 14 actual child-process launches.
- Focused adjacent gates: Slice 154 27/27, Slice 153 15/15 and Ticket 15
  Provider supervisor 24/24.
- Fixed cumulative denominator: 234 predecessor assertions + 25 Slice 155
  assertions = 259 assertions.
- Slice report: `8749348f18774bd374c9015fdb1458f745fd12e23a3946e663f3afe3c5ddfaf5`.

The predecessor-to-current aggregate passed, including Ticket 15's real
Chromium gate. Generated reports remain ignored evidence; contracts,
implementation, verifiers and this handoff are tracked.

## Truth boundary and next Slice

Only a synthetic byte-array sentinel exercised the Worker. No user key was
requested or accepted; no official source refresh, external Provider call,
Skill generation, DSH, Memory write, MuZero export, self-play or training
promotion occurred. A real API key remains unnecessary until Slice 162's one
user-authorized minimal call and must be configured locally, never pasted into
chat.

Slice 156 adds the server-owned Provider registry and exact HTTPS egress
transport: fixed host/port/path/model, globally routable DNS, verified TLS, no
redirects/proxies/custom auth, bounded request/response/time and exactly one
physical attempt.
