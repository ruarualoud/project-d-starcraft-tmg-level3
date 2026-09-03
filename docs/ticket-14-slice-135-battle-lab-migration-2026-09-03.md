# Ticket 14 Slice 135 — Battle Lab shared-client migration

Status: complete. Ticket 14 is 8/11; three slices remain. Overall project
status is 13/22 Tickets complete.

## Delivered boundary

Slice 135 replaces the untracked legacy Battle Lab path with a tracked Level-3
developer surface. Expo and Battle Lab now compose the same Client Domain and
the same executable battlefield projector. Neither surface owns room state,
rules evaluation, confirmation, replay truth, Agent execution, or training
truth.

- Battle Lab calls exactly `bootstrap`, `read`, `dispatch`, and `subscribe`.
  It submits typed intents only and cannot submit or replace whole room state.
- Expo and Battle Lab use
  `packages/client-domain/battlefield-presentation-v1.mjs`. The Expo TypeScript
  path is a thin typed facade, so map, terrain, marker, token, and arbitrary
  model/base geometry cannot drift between the two surfaces.
- The shared operational hash covers the exact viewer-scoped room projection,
  LegalSpace, room identity, schema, and false training claim. Surface name,
  local preview, receipt, replay, control, and integrity state are deliberately
  excluded from cross-surface equality.
- The tracked Battle Lab presents separate connection, room/observer, board,
  Referee, Agent trace, LegalSpace, and Harness panels. Its board preserves the
  rules-owned `54×36`/declared battlefield aspect ratio and physical
  milli-inch dimensions through uniform SVG scaling.
- A sealed preview remains non-mutating. A separate visible human action is
  required before the Client Domain may claim control, apply, refresh, and
  verify Replay.
- Seat credentials are accepted only as ephemeral input, cleared before the
  first asynchronous operation, and never written to browser storage.

## Agent and Harness observability

The optional TraceProjectionPort receives only `roomId`. It cannot receive a
SeatGrant, session identifier, Provider credential, prompt, user message, or
raw model output. The projection is exact-key and room-bound, accepts at most
128 unique traces, binds decisions to a 64-character LegalSpace hash, and
exposes only hash references to Rules Skills and memory.

Invalid, cross-room, duplicate, overlong-hash, secret-bearing, or
training-authority traces fail closed. A broken trace Adapter is quarantined as
`unavailable:TRACE_PROJECTION_REJECTED` without turning a successful room
operation into a failed authoritative operation. Until Ticket 15 mounts the
live online role-Agent Adapter, the honest product state is
`not_mounted_ticket_15`; no trace is fabricated.

The Harness view records prompt-pack routes, tools called, decision trace IDs,
hash-only memory evidence, rollback/demotion rules, and user-visible checks.
It emits no training candidate and grants no Skill, DSH, MuZero, self-play, or
promotion authority.

## Legacy isolation

The old `../starcraft-tmg-local` Battle Lab is retained as compatibility and
behavior evidence only. It is not imported or mounted by the new app. Its
process-local room map, whole-state client submit/replace, and browser drag
mutation paths cannot create a Level-3 receipt, Replay entry, or training
evidence.

## Verification and review

- Battle Lab migration verifier: 23/23.
- Shared battlefield runtime tests: 4/4.
- Client Domain regression: 17/17.
- Expo TypeScript: zero errors.
- Adjacent authoritative RoomRuntime: 7/7.
- Adjacent HTTP Adapter: 4/4.
- Ticket 14 cumulative numbered assertions: 290/290.
- Evidence report is byte-identical across repeated runs with the same input;
  runtime-unique sealed journal identifiers are verified structurally rather
  than misrepresented as stable snapshot identity.
- Contract review: Blocker 0 / High 0 / Medium 0.
- Security review: Blocker 0 / High 0 / Medium 0. The review found and fixed an
  overlong-hash truncation acceptance and prevented Adapter error details from
  entering the trace status.
- UI static review: Blocker 0 / High 0. Real browser layout, keyboard,
  accessibility, offline/reconnect, and screenshot/video evidence remain the
  explicit Slice 136 gate.

No source refresh, Provider call, Skill generation, DSH run, MuZero export,
self-play, memory promotion, or training promotion occurred. `trainingTruth`
remains false and this slice does not claim browser, native-device, or
production readiness.

## Handoff

Slice 136 produces the pinned Web build and real browser acceptance evidence.
Slice 137 covers native Android/iOS build and real-device evidence. Slice 138
runs the cross-surface migration/security aggregate and closes Ticket 14.
After Ticket 14, the explicitly ordered FAQ F1–F5 refresh/review work runs
before Ticket 15.
