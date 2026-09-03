# Ticket 16 Slice 161 — redaction, browser and Worker-failure aggregate

Date: 2026-09-04
Status: complete. Ticket 16 is 9/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

The secure Provider boundary now rejects a known credential echoed as raw
UTF-8, URL or double-URL encoding, padded/unpadded Base64, Base64URL, lower or
upper hex, JSON escaping or ASCII Unicode escaping. The client checks the raw
response while its owned secret bytes still exist, then zeroes those bytes on
every result. The server checks its public response against the request bytes
before its `finally` zeroes the owned request Buffer. Generic credential-shaped
objects remain covered by the existing structural detector.

Unexpected Provider-control exceptions now become only
`provider_control_failed`. The client publishes only a fixed allowlist of
failure codes; an arbitrary injected error code cannot become DOM text. No
Provider error message, body or secret encoding is preserved for diagnosis.

## Real-browser result

One pinned real Chromium run drove Battle Lab through seven secure Provider
HTTP requests:

1. bind the authoritative room and open a current Companion session;
2. explicitly load the one server-owned Provider/model Profile;
3. consent and prepare one short-lived ingress;
4. submit one synthetic value to a deterministic Worker-attach failure and
   observe only `credential_worker_attach_failed`;
5. prepare a fresh ingress, attach a second synthetic value to a real isolated
   credential child, and observe the safe attached state;
6. complete a deterministic Companion turn while attached, then refresh;
7. explicitly detach and observe the credential child shut down;
8. complete Tutor, Opponent and Commentator paths and one AbortSignal cancel.

The startup issued no implicit Provider request. Exactly two binary credential
ingresses occurred, each once. The first failed safely, the second attached,
and one detach followed. HTTP responses, final DOM, three screenshots and both
generated reports contain neither synthetic value nor private attachment,
nonce, raw session or authentication locators.

The browser exposed a real Slice 160 integration defect: the trusted Agent
session reader expected the server-internal `session.binding.roomId`, while the
authenticated HTTP contract returns a flat `session.roomId`. The reader now
validates and supports both shapes; Ticket 15's client verifier and the original
Chromium flow remain green.

## Worker failure and recovery aggregate

The focused gate re-executes the durable Gateway and egress suites. Together
they prove definitely-not-sent zero settlement, may-have-been-sent full
reservation, cancellation and timeout after dispatch, unexpected Worker exit,
reserved-at-startup recovery and ambiguous dispatched recovery. Every logical
execution permits at most one physical Provider attempt, zero automatic
Provider retries and zero automatic schema repairs. Ambiguous recovery still
requires the same user's signed approval plus a fresh credential attachment.

## Fixed evidence

- Contract: `118b1e5440c134be4d206d7f3854c89df20f2434a4fd444008ae4a57c212f980`.
- Contract source: `e7d16c710b81f0eb4509014443b01b5077a1ee9f9a19ce3e8615a7309d1e80e5`.
- Portable echo guard: `e845c50efc4806366e421088e8a61f8c71b1bc3eb9d67a9964e666a348975b7c`.
- Trusted Agent session reader: `362ef1fda6649a950549a30096b705596ac34443cf3d1d84651526c345e256ba`.
- Secure session client: `593b23eb0a9d47b99798acf04d1c600c9500caeb83c51c0d04d0291d6adce120`.
- Browser transport: `d26a565a66ae06463759f596873b7e41e7505cc240b8ca656d098acc419dd9e5`.
- HTTP control: `9f8f537ee78f8aaa20416a96b69418dc999a60fb698fc032de53deff6d598b07`.
- Browser fixture: `01f0746caf740b5d2ff49962066056cf6e053356aec7b66abb0789adb5d72de3`.
- Node verifier: `23baccf0da01a148d57f6425d7d0d54d27af7d3cd0cc0496b9a6630f7708d1f8`.
- Chromium verifier: `5bb422685e7f828d86ce0347f83dd291f86e4b06c7484d7691c78d673b3f68c1`.
- Redaction/Worker report: 20/20,
  `bba1d6614ae11779a1ecfd6d1e617d67c628216a1d3cf386b9500123fd195522`.
- Chromium report: 16/16,
  `b057f6cd5b95bac2ee4116f4c33c63fa1e87255f1c8e4bc3d33571d321d14b59`.
- Fixed cumulative denominator: 459 predecessor assertions + 36 Slice 161
  assertions = 495 assertions.

## Truth boundary and next Slice

Only deterministic synthetic credential values were used. A real local child
process held the successful value in session memory, but no external Provider,
real user credential, official-source refresh, Skill generation, DSH, self-play,
MuZero export, Memory write or training promotion ran.

Slice 162 is the final Ticket 16 slice: one separately user-authorized minimal
live Provider call through this product path, exact model/version/usage/cost and
safe-response evidence, followed by the complete Ticket aggregate. The key
previously pasted into chat remains rejected as exposed and must be rotated.
