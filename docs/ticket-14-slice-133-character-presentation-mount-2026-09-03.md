# Ticket 14 Slice 133 — Character presentation mount

Status: complete. Ticket 14 is 6/11; 5 slices remain. Overall project status
remains 13/22 Tickets complete.

## Outcome

The tracked Expo Web/Android/iOS product now mounts the Ticket 13
CharacterPackage as an explicitly opt-in Client Domain, RoomRuntime, transport
and HTTP extension. The match screen renders the selected tactical Adjutant;
settings exposes the server-scoped persona selector. Web and App share one
seat-scoped selection and one semantic binding while receiving separate
ephemeral asset capabilities.

The current catalogue is not hard-coded to eight entries. At the frozen default
spoiler/knowledge ceiling of 60 it exposes six named Kerrigan eras and two
identity-free locked slots. Explicit spoiler opt-in raises both frozen ceilings
to 80 and exposes all eight current eras. Exactly one persona is selected at a
time, and every current persona resolves its own five-role dynamic manifest.
Later versioned catalogue additions remain possible without an eight-item
branch.

No live model is involved. The mounted panel is deterministic UI over a
server-owned portrait state machine. Provider/BYOK execution remains Tickets
15–16; Skill generation, DSH, MuZero export and self-play remain closed.

## Atomic and compatibility contracts

The browser-safe `starcraft_tmg_client_character_projection_v2` pins the exact
Ticket 13 handoff, CharacterPackage, V2 catalogue and V2 visual-binding hashes.
It binds principal scope, selector state/revision, selected worldbook and
persona state, manifest, portrait state, rights decision and content set before
rendering. Public projections are exact, identity-free and asset-free.

Persona/spoiler mutations use an exact V3 response binding. The client checks
the request intent, previous/next selector revisions and hashes, canonical
selector event, exact receipt schema/event hash, frozen 60/80 ceiling policy,
room revision and the complete projected binding. It then performs a fresh
authoritative Room plus Character readback; the mutation response itself is
never published as truth.

This work does not rewrite the default contracts:

- default RoomRuntime aggregates remain `starcraft_tmg_room_runtime_v2` and do
  not expose Character methods or state;
- Character-enabled aggregates use the explicit
  `starcraft_tmg_room_runtime_v2.character_presentation_v2` extension and
  reject historical base aggregates instead of silently adding defaults;
- default Client Domain views and intents retain their V1 shape/unsupported
  behavior;
- default transports and HTTP metadata do not advertise Character operations.

## Restricted asset delivery

Development-only derived portrait bytes are served through the fixed
same-origin content-hash route. Hash knowledge alone grants nothing. An
authenticated read creates a random short-lived opaque handle plus expiry and
HMAC seal; room, SeatGrant, principal scope, persona, selector, rights,
manifest and allowed-content bindings remain only in the server-side grant
record. The token therefore does not serialize those fields into URLs or logs.

Every asset read verifies the HMAC, expiry, active server record, current
SeatGrant capability, exact current selector state/revision and selected
manifest. The HTTP boundary accepts exactly one `grant` query field, resolves
real paths beneath the character root, and checks MIME, byte length and SHA-256
before returning `private, no-store` bytes. Persona/ceiling changes, SeatGrant
revocation, token tampering, cross-manifest hashes and expiry fail closed.

The in-memory opaque-grant store is appropriate only to the current controlled
development runtime. Multi-instance persistent capability storage and key
management remain explicit Ticket 21 production work.

## Expo lifecycle and offline behavior

- The current frame mounts immediately. No five-frame prefetch or explicit
  platform disk-cache path is used.
- Animation owns zero timers until the visible image fires `onLoad`, then at
  most one timer. Offscreen, collapsed, background, offline, reduced-motion,
  public and unmounted states own zero timers.
- A failed frame stops playback. While online and visible it may trigger one
  authoritative refresh for that exact `bindingHash + contentHash`; ordinary
  good frames cannot clear the latch, preventing a permanently damaged later
  frame from causing a refresh loop. Successful loading of the original failed
  frame clears the latch and permits a future expiry recovery.
- The viewer-scoped offline snapshot is content-free and hash-sealed. It stores
  selected persona/selector metadata but never a route, bearer or grant. A
  cold-offline mount renders a local, code-native static neutral Adjutant rather
  than caching restricted portrait bytes.
- Explicit temporary/network failures retain the last-known-good snapshot.
  Authentication, invalid projections, rights withdrawal, extension removal
  and unknown permanent errors purge it.

## Verification

Slice 133 focused denominator: 65/65 numbered checks plus Expo TypeScript with
zero errors.

- Character mount/security/contract verifier: 20/20.
- Real React product-component mount and lifecycle traces: 5/5.
- Ticket 13 persona selector regression: 13/13.
- Ticket 13 presentation regression: 12/12.
- Ticket 13 all-era dynamic portrait regression: 15/15.

The cumulative Ticket 14 command also replays the fixed Slice 128–132
denominator of 153/153, for 218/218 numbered checks plus TypeScript. Adjacent
RoomRuntime 7/7, HTTP 4/4 and Client Domain 17/17 gates also pass.

Three independent read-only reviews closed with no remaining P0 or P1 after
remediation. The verifier still reports real-browser and real-device evidence
as false: those are deliberately owned by Slices 136 and 137 and are not
claimed here.

Report:
`build/ticket-14-slice-133-character-mount-v2/report.json`.

Report hash:
`2962047c817e993e1d0eba73bdcb7f7a66fc57d45e08c89ff98ad5517304b412`.

## Harness record

This UI/agent-behavior round used the observable harness boundary. The exact
operations were `read_character_presentation`, `select_character_persona` and
`set_character_spoiler_access`; user-visible checks cover spoiler-safe choices,
one visible selected dynamic portrait and Web/App shared semantic binding.

No official-source refresh, Provider call, Skill generation, DSH run, MuZero
record, self-play run or training promotion occurred.

Next: Slice 134 mounts the already frozen official-source/localization
projections and migrates settings, army drafts and historical match records
without refreshing upstream data or enabling legacy/source fallback.
