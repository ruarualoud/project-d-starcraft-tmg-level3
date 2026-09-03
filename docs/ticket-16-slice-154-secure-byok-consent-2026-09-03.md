# Ticket 16 Slice 154 — secure BYOK consent and ingress

Date: 2026-09-03
Status: complete. Ticket 16 is 2/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 154 adds the first production-shaped BYOK boundary behind Ticket 15's
credential-free Provider Gateway. An authenticated player first accepts the
current disclosure notice and selects a server-owned Provider-profile
reference. The server binds the consent to the principal, room, online-session
binding, current connection, exact Provider/model profile and current budget
policy, then returns a 32-byte, short-lived, one-use ingress nonce.

The key route accepts only `application/octet-stream`. The caller-owned bounded
Buffer is handed to an injected attachment port and zeroed after success or any
failure, including HTTP rejections. The control plane stores the nonce digest,
but stores neither the credential nor a credential hash. Its public projection
contains only safe attachment status and hash-sealed receipts; it contains no
raw principal reference, nonce after consent, key, key hash or opaque Worker
reference.

No external Provider call occurs in this Slice. The injected attachment port is
an explicit seam, not an isolation claim; Slice 155 replaces it with one
scrubbed child process per attachment.

## Deep-module interface

The player-facing control interface has four operations:

- `prepareAttachment`
- `attachCredentialBytes`
- `readAttachment`
- `detachAttachment`

Trusted service lifecycle adds `revokeSession`, `sweepExpired` and `close`.
Dependencies are injected: Ticket 15 session lifecycle, Ticket 15 budget
supervisor, server-owned Provider-profile registry and the attachment port.
Rules, room state, RNG, Confirm/Apply, Skill generation, DSH, Memory promotion
and training truth remain outside the module.

The HTTP adapter exposes health/metadata plus consent, binary ingress, read and
delete routes beneath `/starcraft-tmg-level3/provider/api/v1`. Production
requires TLS. Plain HTTP can be enabled only explicitly for a loopback address
and loopback Host; forwarded headers do not grant transport security. Responses
use no-store, no-referrer, nosniff and deny-all CSP headers.

## Failure and abuse coverage

The behavior suite verifies:

- authentication occurs before Provider-profile resolution;
- cross-principal, cross-room, wrong-session and stale-epoch access fails;
- client-supplied model, base URL, budget, principal or key-shaped consent
  fields fail before reaching the registry;
- placeholder model and online DSH profiles fail closed;
- wrong nonce does not consume the intent, while success consumes it before the
  port call and prevents replay;
- exact-boundary expiry, wrong media type/encoding, byte-length mismatch,
  oversize and non-printable data fail and zero the Buffer;
- pending consent can be superseded, but an attached credential must first be
  detached;
- explicit detach is idempotent; session end and principal revocation detach;
- an unsafe port acknowledgement is redacted and its returned Worker reference
  is immediately terminated;
- a failed detach remains visible and can be retried;
- detach requested during ingress waits for acknowledgement, then terminates
  the Worker and never exposes an attached state;
- capacity exhaustion does not silently evict the existing pending intent.

## Fixed evidence

- Slice contract: `6e7d243bcbd766b2f7eb52dbf3b46fbe1dc0f0cf6e5bef823c1d68cd5f03027f`.
- Control source: `07ed07456c01318a5a91fe7d8df5de4f0f9c615cdb0ee13e6d6d68606b5c3cb8`.
- HTTP source: `8cacde957d29ccb4108aecd12407b6d603a8e7e8c67a5977a66b8241a5c96934`.
- Slice verifier: 27/27.
- Focused adjacent gates: Slice 153 15/15, session lifecycle 21/21, Provider
  supervisor 24/24.
- Fixed cumulative denominator: 234 assertions through Slice 154.
- Slice report: `30bf5825dbb6aaec7ceb7d04d6f1701e596e492cdd6da34624370929a88bc0fd`.

The full predecessor-to-current aggregate passed through Ticket 15's real
Chromium closure, Slice 153 and the complete Slice 154 focused gate. Generated
reports remain ignored evidence; contracts, implementation, verifiers and this
handoff are tracked.

## Harness and truth boundary

The Harness loop was applied to the StarCraft TMG online-Agent boundary, but
this backend control Slice invoked no prompt route, Rules tool, UI trace or
Agent decision. It made no Memory write and produced no training candidate.
Rollback rules are reject-and-zero on boundary failure, lifecycle detach on
revocation and retention of Ticket 15's injected Gateway until live acceptance.

Only a clearly synthetic byte-array sentinel exercised the attachment seam.
No user key was requested or accepted; no source refresh, Provider call, Skill,
DSH, MuZero export, self-play or training promotion occurred. A real key is
needed only for the user-authorized minimal call in Slice 162 and must be
configured locally, never pasted into chat.
