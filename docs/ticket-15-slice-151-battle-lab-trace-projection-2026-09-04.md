# Ticket 15 Slice 151 — live Battle Lab TraceProjection

Status: complete. Ticket 15 is 8/9; Slice 152 remains. Overall project
progress remains 13/22 Tickets complete. Source refresh was not performed.

## Delivered

Battle Lab now opts into the same `role_agent_session_v1` Client Domain
extension used by Expo Web. It no longer shows `not_mounted_ticket_15` after a
verified room is bound. Its public runtime interface remains exactly
`bootstrap`, `read`, `dispatch` and `subscribe`; the new online session and
trace behavior stays behind that interface.

`role-agent-trace-projection-v2.mjs` is the single safe projection boundary.
Its read port accepts only `roomId`, reads the already viewer-scoped Role-Agent
projection, verifies that projection's hash and room binding, and emits a new
hash-sealed exact-schema projection. The identity lane binds:

- the exact source Role-Agent projection hash and host-view hash;
- opaque session reference and server session-binding hash, never session ID;
- room-state and current LegalSpace hashes when present;
- Agent revision, mode, lifecycle and connection epoch.

The observable state denominator is six: session, turn, tools, decision,
confirmation and failure. Intermediate `waiting_provider` state is refreshed
while a request is still in flight rather than only after the dispatch Promise
settles. Tool IDs must come from the server catalogue. Rule-Skill and Memory
evidence is hash-only. Decision rationale is reduced to a hash, failure output
to a code, and private turn/trace locators are replaced with hashes.

Battle Lab's Adjutant panel can select the four modes and their exact intents,
open/send/cancel/reconnect/end a session, and submit a separate human
confirmation for a room-created Agent Preview. The trace panel shows safe
identity, Provider/status/budget, state transitions, tool use, decision and
failure evidence. Typed message content is sent through Client Domain but is
not copied into TraceProjection.

## Privacy and authority

The V2 validator has an exact top-level, identity, trace, decision and privacy
schema. It rejects cross-room input, changed source/projection hashes, duplicate
trace IDs, unknown tools, invalid Rule-Skill/Memory hashes, secret-shaped keys
or values, training claims and any non-false privacy attestation. Raw prompts,
raw Provider output, Provider usage receipts, credentials, session IDs,
conversation transcript and free-form failure text never enter this lane.

Trace refresh is read-only and cannot mask a successful room operation. The
Agent still has no Rules/room authority and cannot Confirm or Apply. Opponent
Preview continues through the existing explicit human intent and authoritative
`Confirm → control lease → fenced Apply → signed Receipt → refresh` path.

Historical V1 TraceProjection remains readable for old adapters, while the
tracked Battle Lab product mounts V2 by default.

## Verification

- Slice 151 focused TraceProjection verifier: 21/21.
- Slice 150 Role-Agent Client regression: 15/15.
- Ticket 14 Battle Lab migration regression: 23/23.
- Expo TypeScript: exit code 0.
- Full Ticket 15 aggregate through Slice 151: exit code 0.
- Contract hash: `e265da03c98237ca376b69e2acb4b62cc77a88cf651770281806dab4fc43f667`.
- Focused report hash: `8054983578d704c27053ae411353685b1ce87a67dc0111ca947fa8f50f5ca5d5`.

Verification used a real Room Runtime plus injected deterministic Agent
transport behavior. It exercised live Client Domain session, success,
`waiting_provider`, cancel and failure paths. It made zero external model calls
and accepted no API key.

## Remaining Ticket 15 work

Slice 152 runs the actual Chromium end-to-end matrix for all four modes,
Provider-not-configured/failure, cancellation, budget, background/reconnect,
Opponent Preview, external human confirmation and rendered privacy. It then
closes Ticket 15 and publishes the Ticket 16 secure BYOK/live-Provider handoff.

No BYOK/live Provider, source refresh, Skill generation or promotion, DSH,
MuZero, self-play, Memory write, training promotion or native-device claim was
made in this slice.
