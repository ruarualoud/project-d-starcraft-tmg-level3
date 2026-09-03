# Ticket 15 Slice 145 — online session lifecycle

Status: complete. Ticket 15 is 2/9; Slices 146–152 remain. Overall project
status remains 13/22 Tickets complete. Native device acceptance remains
deferred by the user until full development completion.

## Delivered

The new `packages/online-agent-session` deep module owns the credential-free
online role-Agent session lifecycle. It exposes four operations: create, read,
reconnect and end. Session identifiers and monotonically fenced connection
epochs are server-created; clients cannot choose a session ID, seat, principal
scope, role authority or credential material.

Every operation resolves an opaque `principalSessionRef` through an external
server authority port and retains only a principal scope hash. A session is
hash-bound to its room, principal scope, seat, principal role, Agent mode,
CharacterPackage, character selection and exact room rules/data artifacts.
Cross-room, cross-principal, cross-seat, cross-role and cross-character access
fails closed. Principal recovery/revision, character selection or rules/data
drift invalidates the old session instead of silently migrating it.

The viewer projection and lifecycle receipts are content-hash sealed. They do
not expose the opaque principal reference, seat token, authorization header,
Provider credential, prompt or model output. Reconnect advances a connection
epoch so a stale Web connection cannot continue against its old fence. Ending
is idempotent for the same authenticated scope, and an ended session cannot be
reconnected.

Tutor, Opponent, Commentator and Companion are separately authorized by the
server principal binding. No arbitrary role name is accepted, while the
product contract imposes no artificial fixed count on concurrent sessions;
resource limits remain an external deployment policy.

## Verification

- Slice 145 lifecycle contract: 21/21.
- Slice 144 boundary regression: 11/11.
- Historical four-role Character Agent regression: 9/9.
- Historical injected Provider seam regression: 5/5.
- Ticket 14 Web/backend handoff regression: 13/13.
- Lifecycle contract hash:
  `96dee782fb7bac9be82a5ef6a7acabd29b681e07b8bf04a1315b943e2bf52442`.
- Slice report hash:
  `07dcfd10b22d21b16af38d82a39d592208ca8700747b517ba6420614e7595425`.

No source refresh, live Provider call, BYOK acceptance, Skill generation, DSH
run, MuZero export, self-play, memory promotion or training promotion occurred.

## Next

Slice 146 adds the credential-free Provider Gateway supervisor: one in-flight
turn per session, explicit budget reservation and usage, timeout/cancel,
late-result fencing, no automatic retry, deterministic injected verification
and an honest `provider_not_configured` product state. Secure BYOK and a real
external model receipt remain Ticket 16.
