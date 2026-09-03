# Ticket 16 Slice 160 — Web and Battle Lab secure BYOK product flow

Date: 2026-09-04
Status: complete. Ticket 16 is 8/10; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Expo Web and Battle Lab now mount a separate secure Provider lifecycle beside
the exact four-operation Client Domain. The safe Profile catalogue loads only
after an explicit user action, so page startup has no implicit Provider request.
A current active online-Agent session
is required before the player can choose a server-listed Provider/model
profile, read the disclosure, accept explicit consent and prepare one
short-lived binary ingress. The client cannot submit an arbitrary endpoint,
model, header, budget or retry policy.

Both surfaces use password-style input. They clear the application input state
before awaiting the network and zero every mutable byte buffer on success or
failure. This does not claim that immutable JavaScript strings or browser
internals can be physically zeroed. The precise guarantee is that the product
does not intentionally retain the value or write it to browser/server
persistent storage; the isolated Worker keeps it in session memory only until
detach, expiry or lifecycle revocation.

The public product projection contains profile/model, safe lifecycle state and
the consent-time maximum session budget envelope. It deliberately omits the
attachment ID, ingress nonce, raw Agent session ID and all sensitive input.
That envelope is not labelled as current spend: the durable ProviderAttemptStore
remains the exact accounting authority. The UI exposes attached, missing,
error and detached states plus explicit refresh/detach.

## Authority and privacy boundaries

- Game `bootstrap/read/dispatch/subscribe` remains exact and does not gain a
  credential intent.
- A WeakMap-backed trusted composition seam reads only the current private
  Agent locator; it is never added to the public Client Domain or DOM.
- Metadata and control use same-origin cookie authentication, `no-store`, HTTPS
  except explicit loopback development, and no `Authorization` request header.
- Sensitive ingress alone uses `application/octet-stream` and a one-use nonce.
- Provider/result network projections are allowlisted and credential-shaped
  echoes fail closed.
- No automatic Provider retry, schema repair, Rules authority, room mutation,
  Confirm/Apply authority, Skill publication or training authority was added.

## Fixed evidence

- Contract: `e7ed2a0a83b8f9b52d7738d2224ffad6cab596f36d50328ef50c3e84c89d9a96`.
- Contract source: `28dbbfd6b7778f88699d7df5ca73aef893bf3942d364aba4e088ba5e2f622ed5`.
- Secure session client: `833cd634f0733d0109e5a788ef8b8a3c23e46335bc4570cceabace71f99390a3`.
- Browser transport: `b107e6b6f79c61517baf1c78aa0e289345209dba5273acddb88864f9ebc0cfb3`.
- Expo product panel: `09d3f41ae792c8c61afdef6abd0e983f6a350433957b33bd3c5eb8f78bb525c5`.
- Battle Lab app: `9a21f7814e11b232404a39491eece76dd8f5437fc7925e3d26e7f38454a0e48e`.
- Verifier source: `b5e13022269e5c230583361a1ce23e4425026f57e051377054618e579195f919`.
- Behavior verifier: 37/37, nine deterministic HTTP requests through the real
  HTTP control and browser transport, with caller/transport/server buffer
  zeroing and public projection scans.
- Fixed cumulative denominator: 422 predecessor assertions + 37 Slice 160
  assertions = 459 assertions.
- Slice report: `f1a683780b0fe1aa1c9b8dfb569dabc4b25db1c00b17ea8bbdb0ef7a1d18767c`.

The focused gate also passed the Slice 154 secure ingress, Ticket 15 role-Agent,
Battle Lab migration, Expo character render and Expo TypeScript checks. Slice
161 owns redaction fuzz, real Chromium and cancellation/timeout/Worker-failure
aggregate evidence.

## Truth boundary

Only a synthetic credential sentinel reached the deterministic control fixture.
No external Provider, user credential, official-source refresh, DSH, Skill
generation, self-play, MuZero export, Memory write or training promotion ran.
The credential previously posted in chat is not accepted as Slice 162 input;
the live-call gate requires a rotated replacement injected locally through the
secure product flow.
