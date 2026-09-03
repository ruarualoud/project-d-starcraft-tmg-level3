# Ticket 16 Slice 159 — durable Provider Gateway composition

Date: 2026-09-04
Status: complete. Ticket 16 is 7/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 159 replaces Ticket 15's injected `complete()` implementation with a
production-shaped composition seam while preserving the exact frozen,
credential-free Ticket 15 Gateway source and request. A Ticket 16 wrapper
carries the authenticated server call context through an ephemeral
`AsyncLocalStorage` scope. At `complete()` time it re-reads both the current
lifecycle session and the frozen supervisor's waiting turn, then derives a
separate internal execution authority containing room/session/principal
hashes, connection epoch, budget policy and original session time. None of
those fields are added to the public Gateway request or persisted.

The durable Gateway resolves the current ephemeral Prompt artifact and strict
response contract, then resolves a current authenticated attachment to its
live isolated Worker. It opens or replays the session budget, commits the
attempt reservation, commits dispatch authority, performs one Worker call and
commits the safe Provider receipt hash plus terminal budget settlement before
returning output.

The composition follows the pinned MTL sequence from
`codex/mtl-character-agent-repair@50ef5c29c655c015335d76e78fb4a0ecb442252f`:

`Persist intent/reservation → Commit dispatch → Execute once → Persist safe receipt → Recover/replay → Explicit replan`

That sequence is now exercised by Tutor, Opponent, Commentator and Companion.
It is also the mandatory scheduling baseline for later offline Skill
generation, self-play and MuZero work, without broadening the authority of
those modes. In particular, online DSH, automatic Provider retry and automatic
schema repair remain forbidden.

## Settlement and crash behavior

- A successful Provider receipt charges its reported input plus output units.
- A typed failure proving that no request was sent settles at zero units.
- The frozen Ticket 15 supervisor remains a conservative secondary envelope:
  it charges a full reservation for any rejected Gateway result. The durable
  store is the exact accounting authority; Slice 160 labels its user-visible
  consent-time budget as a maximum envelope rather than current durable spend.
  The compatibility envelope cannot undercharge or authorize egress.
- A Worker exit, cancellation, timeout or unsafe result after committed
  dispatch consumes the full reservation when usage is unknown.
- Raw Prompt nodes, Provider output, headers, credential bytes and error text
  never enter the attempt store; only the safe Provider receipt hash and
  numeric usage are retained.
- Output is withheld if terminal settlement cannot be observed as committed.
- A lost database COMMIT acknowledgement is resolved by one exact operation
  replay. This is not a Provider retry: the Provider invocation remains one.
- Startup recovery abandons a merely reserved attempt at zero charge and marks
  a dispatched open attempt ambiguous at full reservation. Ambiguous retry
  still needs Slice 158's same-user Ed25519/HMAC approval and fresh attachment.

## Fixed evidence

- Slice contract: `c640fc717e62efaa9b68d7508f60bb3080deb71df041bbf5495c5df2144ad431`.
- Contract source: `8e0889ab7dc0176303369e90bd8a87cdfebaff08f1e191458268692b41a63b55`.
- Durable Gateway source: `4846d992df2f3a64c6188ba28f49b7d2040a8f61dfe71c29dd4189d213309ea3`.
- Execution-scope source: `8ec28977b5c5d62c828070446b56d11684f95944ff99a27fbd089363a716f3fe`.
- Attachment control source: `3dfdbaf33eb76e3e07d71f58d5c8cf5e046659fe80bc1aae183739b68ed9b115`.
- Frozen Ticket 15 supervisor source: `c2356cc0e76f59c4cfe352e06ecb31de39e53b06ac3ce4098a40ca48c04b0f94`.
- Verifier source: `972abe53fa0b641b2aa207d2eb73e3bc0004363b3a4a0bf80261868be4259faf`.
- Behavior verifier: 36/36 across eighteen real temporary SQLite files and
  nine deterministic isolated Worker calls.
- Fixed cumulative denominator: 386 predecessor assertions + 36 Slice 159
  assertions = 422 assertions.
- Slice report: `349f798dae547c2e0b6b32314966d7089cb29b1578fc056dd98fc403f7deee3c`.

The focused aggregate passed the Slice 159 verifier, PostgreSQL parity,
credential attachment, Ticket 15 Gateway and Prompt-context isolation gates.
The first predecessor aggregate correctly rejected an attempted modification
of the frozen Ticket 15 supervisor. That change was removed and the execution
scope was moved wholly into Ticket 16. The corrected predecessor-to-current
aggregate then passed, including Chromium 11/11, the frozen Slice153 boundary
15/15 and all Slices 154–159 focused gates.

## Truth boundary and next Slice

The Worker used deterministic injected child behavior and no external network.
No user API key, real Provider, official data refresh, DSH, Skill generation,
self-play, MuZero export, Memory write or training promotion occurred.

Slice 160 owns the Web and Battle Lab BYOK product flow: consent disclosure,
Provider/model/budget selection, password-style credential input,
attached/missing/error/detached states and DOM/cache/log non-persistence gates.
The user has separately authorized later real DSH Skill experiments, but that
does not change Ticket order and is not part of this Slice.
