# Ticket 15 — online role-Agent session roadmap

Date: 2026-09-03
Status: active; Slices 144–150 complete, 7/9 complete
Project progress: 13/22 Tickets complete; Ticket 14 is 15/16 with device evidence deferred
Source refresh: not performed

## Outcome

Ticket 15 turns the Ticket 13 character/session contracts and Ticket 14 Web
surfaces into real room-connected online Agent sessions. It does not own
Provider credentials, Rules, room state, human confirmation, Skill generation
or training truth.

The four initial modes are Tutor, Opponent, Commentator and Companion. They are
four fixed security profiles, not four copies of one permissive chat session.
New modes require a future versioned capability profile; arbitrary client mode
names fail closed.

## Existing baseline and migration

The repository already contains reusable CharacterPackage, worldbook,
RoleSkillPack, prompt assembly, capability, dynamic portrait, process-memory
session, HTTP and injected OpenAI-compatible transport code. Those files are
Ticket 13 evidence, not a Ticket 15 product runtime.

The V1 session currently receives raw BYOK material, keeps credentials and seat
tokens in process maps, has no supervisor budget/cancel/single-flight state and
is not mounted in Client Domain, Expo or Battle Lab. Ticket 15 therefore wraps
the stable character contracts behind a new versioned online supervisor. It
does not silently relabel the V1 runtime as production-ready or rewrite its
historical verifier.

## Provider boundary

Ticket 15 calls only an opaque Provider Gateway port. The port accepts bounded
prompt/response-contract references, a budget reservation and an abort signal;
it never accepts or returns credentials. A deterministic injected gateway is
valid verification evidence, and the Web product must show an honest
`provider_not_configured` state when no gateway exists.

Ticket 16 supplies the isolated secure BYOK/live-Provider implementation behind
that port. Therefore Ticket 15 proves real online orchestration and browser
behavior, but does not claim a real external model call.

## Planned slices

| Slice | Scope | Closure evidence |
| --- | --- | --- |
| 144 | **Complete.** Freeze the existing implementation audit, target deep-module boundary and migration route. | Hash-sealed predecessor/boundary; exact reusable files and gaps; four-mode authority matrix; nine-slice denominator; 11/11 focused plus historical Agent 9/9, Provider 5/5 and Ticket 14 handoff 13/13. |
| 145 | **Complete.** Implement room/principal/seat/role-isolated online session lifecycle. | Server-created session identity and connection fence; hash-sealed viewer projection and receipts; exact room/principal/seat/role/character/rules binding; stale/cross-room/cross-seat rejection; explicit create/read/reconnect/end; 21/21 focused and full prior aggregate green; no credential or room authority retained. |
| 146 | **Complete.** Implement the credential-free Provider Gateway supervisor. | Per-session single-flight without a global lock; reservation/verified-usage budgets; server timeout/cancel and AbortSignal; no automatic retry; late-result hash quarantine and reconnect fencing; honest `provider_not_configured`; 24/24 with deterministic injected Gateway only. |
| 147 | **Complete.** Bind prompt, tool, history and Memory flows to mode and reconnect identity. | Four exact prompt routes and capability-prefetched tools; ephemeral prompt refs; bounded per-session history; same-game/rules/source accepted Rule Skills as hash refs; advisory same-scope Memory; reconnect continuity plus cross-mode/cross-room/credential rejection; 24/24 focused and full prior aggregate green. |
| 148 | **Complete.** Close role behavior and Opponent Preview handoff. | Exact role/intent output schema and server-catalogued evidence; Tutor/Commentator/Companion plus Opponent chat are read-only; Opponent `take_turn` selects one enabled current candidate with alternative/value/risk/Memory evidence; MatchBinding+LegalSpace+revision+state precondition; sealed Preview only and external human confirmation; 28/28 focused with full prior aggregate green. |
| 149 | **Complete.** Mount authenticated Agent HTTP and event projection. | External principal authentication; exact 64-KiB request boundary; create/read/send/cancel/reconnect/end/events; exact concurrent idempotent replay; capacity-reserved hash-chain events; redacted safe projections and no credential endpoint; 26/26 focused and full prior aggregate green. |
| 150 | **Complete.** Add the opt-in Client Domain extension and Expo Web Adjutant controls. | Existing four client operations unchanged; separate room/Agent queues; mode/status/budget/chat/cancel/reconnect/end/confirmation UX; safe Harness trace; offline/background read-only; actual human Confirm→fenced Apply; no local Agent authority; 15/15 focused, component render 6/6, historical Client Domain 17/17 and Expo mount 10/10. |
| 151 | Replace Battle Lab's `not_mounted_ticket_15` with live safe TraceProjection. | Real session/turn/tool/decision/failure states; no raw prompt/output/Provider receipt/credential; Expo/Battle Lab identity parity. |
| 152 | Run real Chromium end-to-end and Ticket 15 aggregate. | Four modes, failure/reconnect/cancel/budget paths, Opponent Preview and external confirm, privacy scan, fixed denominators and Ticket 16 handoff. |

## Completion boundary

Ticket 15 completes only when the Web and backend online-session behavior is
proven through real browser traces. Native package rebuild and physical-device
acceptance remain in the deferred final-device batch. Real external model and
BYOK evidence belong to Ticket 16.

No source refresh, live Provider call, Skill generation, DSH, MuZero export,
self-play or training promotion is authorized by this roadmap.
