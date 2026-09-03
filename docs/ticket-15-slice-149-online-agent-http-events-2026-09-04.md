# Ticket 15 Slice 149 — authenticated Agent HTTP and events

Status: complete. Ticket 15 is 6/9; Slices 150–152 remain. Overall project
status remains 13/22 Tickets complete. Web/backend development is active;
native package and physical-device acceptance remain user-deferred until full
development completion.

## Delivered

The online Agent runtime now has one V2 HTTP deep module with only `handle`
and `metadata` as its public interface. It exposes nine exact routes under
`/starcraft-tmg-level3/agent/api/v2`: public health and metadata, plus
authenticated create, read, turn, cancel, reconnect, end and event operations.
The historical Character V1 HTTP/BYOK implementation is not reused or silently
relabelled as the online product runtime.

Authentication is delegated to an external principal authenticator. The HTTP
module gives the lifecycle only a server-resolved principal-session reference;
the client cannot submit a principal reference, seat authority or Provider
material. Cross-principal access fails through the existing lifecycle binding.
Bodies are exact-field checked, capped at 64 KiB, forbidden on GET/DELETE and
rejected if they contain credential-shaped keys or values. Turn, cancel,
reconnect and end mutations require the current connection epoch fence.

Every mutation requires an idempotency key scoped by the authenticated
principal, method and path. Concurrent calls with the same key and payload
share one promise and one side effect; completed calls replay the exact same
public response. Reusing the key with a different payload conflicts. The
bounded idempotency store fails closed instead of evicting prior replay truth.

Each terminal mutation is projected into a bounded per-session event stream.
Events have monotonic sequence numbers, a previous-event hash, their own event
hash, cursor pagination and explicit non-training review state. Event capacity
is reserved before concurrent work, so two mutations cannot both pass a stale
capacity check. A full stream rejects new mutations without evicting events,
while an already stored idempotent replay remains available.

The public session projection manually selects safe Provider state fields. It
does not clone internal credential-policy fields, principal references, raw
authentication headers, assembled prompts, raw Provider output or Provider
usage receipts. The turn response exposes only normalized role output,
decision/Preview projections and their safe hashes. Cancel treats a supervised
`cancelled` terminal turn as a successful cancellation operation. Ending a
session first cancels an in-flight Provider turn, then advances the lifecycle
fence; neither route lets a model Confirm or Apply a Preview.

## Verification

- Slice 149 HTTP/events contract: 26/26.
- Slice 148 role-output/Preview regression: 28/28.
- Slice 146 Provider Supervisor regression: 24/24.
- Slice 145 lifecycle regression: 21/21.
- Full Ticket 15 aggregate through Slice 149: exit code 0.
- Deterministic injected Gateway invocations in the final Slice report: 11.
- HTTP/events contract hash:
  `26e17a96f0b7cfc9b83dc8e66c1381ff9371aafa71492be45541c5d9a732101b`.
- Final Slice report hash:
  `e1f5ccffa766805644a0c1b97b9315db6a09c0a92db87d140b41c2aba988ff14`.

The adversarial suite covers missing authentication, cross-principal access,
oversized bodies, client-supplied authority or Provider material, missing and
conflicting idempotency keys, concurrent identical sends, stale connection
epochs, cursor overflow, malformed routes/queries/methods, in-flight cancel,
end-with-cancel, ended-session sends, event/idempotency capacity and response,
event and Gateway leakage scans.

The verifier traverses the real online session lifecycle and real Provider
Supervisor and makes 11 calls through an injected deterministic Gateway. This
proves the production-shaped orchestration seam without claiming a third-party
model call. No API key is needed or accepted in Ticket 15.

No official source refresh, live Provider call, BYOK acceptance, native-device
run, Skill generation or promotion, DSH run, MuZero export, self-play, Memory
write or training promotion occurred.

## Next slice

Slice 150 mounts this interface into the opt-in Client Domain extension and
Expo Web Adjutant controls: mode, connection/provider status, budget, chat,
cancel and explicit human confirmation UX. Existing four Client Domain
operations remain unchanged, background/offline behavior stays read-only and
the browser holds no Agent or room authority. Slice 151 then exposes safe live
Battle Lab traces and Slice 152 closes Ticket 15 with real Chromium evidence.
Secure BYOK and one user-authorized live external Provider receipt remain
Ticket 16 responsibilities.
