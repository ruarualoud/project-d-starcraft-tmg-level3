# Ticket 15 Slice 150 — Client Domain and Expo Web Adjutant

Status: complete. Ticket 15 is 7/9; Slices 151–152 remain. Overall project
progress remains 13/22 Tickets complete. Source refresh was not performed.

## Delivered

The opt-in `role_agent_session_v1` extension wraps the established Client
Domain without widening its public interface. Callers still receive exactly
`bootstrap`, `read`, `dispatch` and `subscribe`. The extension owns bounded
presentation state only; the online lifecycle, prompt/tool context, Provider
supervision, Rules and room remain external authorities.

The room operation queue and Agent operation queue are separate. A long
Provider request therefore does not block player room interactions, while
`cancel_agent_turn` bypasses the regular Agent queue so it can cancel a turn
that is currently waiting on the Provider. Agent session state is not written
to the projection cache. Offline and background lifecycles expose the last
safe projection as read-only, discard late client results, and require an
explicit fenced reconnect after foreground recovery.

The HTTP adapter targets `/starcraft-tmg-level3/agent/api/v2`, requires HTTPS
outside loopback, bounds responses and uses browser same-origin cookie auth
with `credentials: include`. It never constructs an Authorization header and
has no API-key or Provider-credential input.

The Expo Adjutant panel now exposes:

- Tutor, Opponent, Commentator and Companion mode selection;
- connection, Provider and budget status;
- chronological human/Agent messages and mode-scoped intents;
- loading, cancellation, explicit reconnect and end-session controls;
- Opponent decision reason, value/risk and rejected alternatives;
- a separate human-confirmation card for sealed Opponent Previews; and
- a safe Harness trace containing prompt-pack identity, tool calls and
  Rule-Skill/Memory references without raw prompts, raw Provider output or
  Provider usage receipts.

## Human confirmation authority

An Agent turn can return only the hash-sealed Preview projection created by
the room service. A private module-identity ingress validates that projection
against the current viewer room, MatchBinding, LegalSpace, revision, state,
proposal and action. It then invokes the existing Client Domain confirmation
pipeline only after the human submits `confirm_agent_preview`:

`Agent Preview → human intent → Confirm → control lease → fenced Apply → signed Receipt → authoritative refresh`

The Agent extension cannot call Confirm or Apply. The Room Runtime verifies
the opaque Preview token again, requires a human authority controlling the
same seat, and returns an Ed25519-signed receipt. A forged projection or stale
binding fails closed.

## Verification

- Slice 150 focused Agent-client verifier: 15/15.
- Expo Adjutant component render tests: 6/6.
- Historical Client Domain regression: 17/17.
- Historical Expo product mount regression: 10/10.
- Expo TypeScript: exit code 0.
- Full Ticket 15 aggregate through Slice 150: exit code 0.
- Contract hash: `2be527d5d320f0e9b699857b8897790535eec4117925cc7809651e4512e2c052`.
- Focused report hash: `5ef033f6957834dc4009f57cb5219e49affc7f50509c9d1654657e7270a82591`.

Verification used the injected Provider Gateway and a real in-memory Room
Runtime for confirmation/apply evidence. It made zero live external model
calls and accepted no API key.

## Remaining Ticket 15 work

Slice 151 replaces Battle Lab's historical `not_mounted_ticket_15` placeholder
with the live safe TraceProjection. Slice 152 runs real Chromium evidence for
all four modes, failure/cancel/reconnect/budget behavior, human confirmation
and privacy, then closes Ticket 15 and prepares the Ticket 16 secure BYOK/live
Provider handoff.

No BYOK/live Provider, source refresh, Skill generation or promotion, DSH,
MuZero, self-play, Memory write, training promotion or native-device claim was
made in this slice.
