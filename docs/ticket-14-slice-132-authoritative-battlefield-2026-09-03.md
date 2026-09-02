# Ticket 14 Slice 132 — authoritative battlefield

Status: complete. Ticket 14 is 5/11; 6 slices remain. Overall project status
remains 13/22 Tickets complete.

## Outcome

The tracked Expo Web/Android/iOS product now mounts a viewer-scoped battlefield
that drives the existing Client Domain Module through the complete authoritative
sequence:

`LegalSpace → listed proposal → sealed Preview → explicit human confirmation →`
`fenced Apply → refreshed viewer projection → Replay verification`.

The client does not own Rules or room state. A pointer/touch creates only a
local proposal draft. Preview does not move a model, Apply is never optimistic,
and offline/background/fenced clients remain read-only without a write queue.

## Security closure found during the slice

The pre-UI audit found two transport leaks and three response-binding gaps that
would have made an otherwise polished UI misleading:

- Apply and Replay could return a raw authoritative envelope over the network.
- LegalSpace accepted structurally plausible responses from another room,
  MatchBinding, seat or state.
- Preview did not bind all room/match/seat/state/proposal/seal structure.
- Replay trusted `matchesCurrent: true` without binding the returned result to
  the current viewer projection.

The RoomRuntime now returns only a bounded public envelope summary and a
public- or SeatGrant-scoped final projection. HTTP and in-memory transports both
preserve optional Replay authentication. Invalid, malformed, tampered and
cross-room SeatGrants fail closed rather than falling back to public Replay.
The Client Domain validates current schema, room, game, MatchBinding, seat,
state revision/hash, LegalSpace hash, listed action/domain identity, Preview
content-hash/seal structure, replay counters and the exact final viewer
projection.

Human confirmation round-trips the exact observed `previewId`, `previewToken`
and `previewContentHash`; a structurally self-consistent forged Preview can no
longer cause the server to apply a different stored Preview. Apply success is
not published until the complete receipt is bound to the session, proposal,
action, confirmation, seat, lease, pre/post hashes and journal and the refreshed
projection reaches the receipt's post-state revision/hash/journal/game clock.
Forged or mixed receipts fail closed.

Network projections now use the explicit
`starcraft_tmg_viewer_room_projection_v3` contract. Apply uses
`starcraft_tmg_viewer_apply_response_v2`; Replay uses
`starcraft_tmg_viewer_replay_response_v3` and
`starcraft_tmg_viewer_replay_bundle_v2`. Retired identifiers remain listed in a
contract catalog for diagnosis and historical display, but the client never
accepts them as the current shape. The V3 state projection is allowlisted and
recursively field-filtered rather than clone-then-delete. Unknown top-level and
nested fields are removed by default; only a reviewed, frozen catalog of
official public source bundles can retain a complete subtree. RoomRuntime and
Client Domain share this one browser-safe projector, so newly introduced
private state does not become public by default and the client exact-checks the
same shape the server emits.

This is deliberately not a claim that the Expo client verifies the secret HMAC
or a trusted Ed25519 public key. It verifies structure, canonical content hashes
and current session/projection binding; the Referee remains the cryptographic
authority.

## Battlefield presentation contract

- World coordinates are safe-integer milli-inches with a bottom-left origin.
- The display is uniform contain-fit plus camera zoom; X and Y always share one
  scale. A 54×36 table is letterboxed, never stretched.
- SVG applies exactly one bottom-left-world to top-left-display Y reversal.
- Physical base sizes accept authoritative milli-inch/inch fields and legacy
  millimetre fields. Millimetres convert by `mm / 25.4 × 1000`.
- Device pixel ratio, zoom, pan and 44dp touch expansion do not enter Rules
  geometry, LegalSpace or proposal parameters.
- `pieces[].models[]` is flattened without a client count cap. The test fixture
  uses 13 models, and the implementation has no eight-slot assumption.
- When a projection has no per-model array, the client shows one explicitly
  non-model `unit_anchor` plus the aggregate model count. It does not invent
  individual positions from a unit coordinate.
- Terrain, center/mission/effect markers and tangible tokens are separate
  display layers. The projector consumes the real official
  `axis_aligned_rectangle` min/max footprint, `diameterMillimeters` mission
  marker and coordinate-only intangible marker schemas. Unknown coordinates
  or base geometry produce a visible fail-closed diagnostic rather than a
  guessed rules footprint; coordinate-only intangible markers use a distinct
  display icon that is never treated as collision geometry.

## Proposal editors

- Finite buttons use only the exact current `finiteActions[].actionKey`.
- Legacy path-only movement supports ordered milli-inch waypoints.
- `official_standard_move_path_v1` through `v5` requires explicit leading-model
  selection, path waypoints and one placement for every remaining model.
- Unknown parameter kinds remain visible for diagnosis but are not submittable.
- Search suggestions and disabled diagnostics never become action authority.
- A sealed official Standard Move reads
  `core.action.movePlan.canonicalPath` and `finalModelPositions`; its cyan final
  placements reuse each projected model's exact base shape and dimensions. A
  local draft is a gray dashed overlay and its placements use the same model
  geometry, never a fixed-radius placeholder. Neither mutates the authoritative
  projection.

## Expo delivery

The existing room access/recovery controls remain mounted above the new
`AuthoritativeBattleWorkspace`. The workspace provides keyboard/touchable
`+`, `−`, Fit, Reset and directional pan controls, an accessible model list,
LegalSpace action panels, a standard-move editor, an explicit Preview confirm
surface, accepted-receipt summary and Replay verification summary.

The editor has both board-tap and accessible numeric X/Y inputs in inches. The
numeric path is bounded to the authoritative board and converted to exact
milli-inch proposal coordinates; it does not decide movement legality. A Replay
failure raises a persistent integrity block that disables all writes. Recovery
requires the Client Domain's single `revalidate_authority` operation, which
performs a fresh authoritative projection followed immediately by successful
Replay validation. The latch survives UI remount and ordinary refresh/replay;
merely dismissing the alert, reconnecting or retrying a write cannot clear it.
Offline/background Replay preflight and Replay transport failure also latch the
current room and principal scope. Latches are keyed by
`roomId + principalScopeHash`; the bounded 16-scope registry fails closed on a
17th blocked scope without evicting earlier evidence. Invite/recovery exchange
occurs only after this capacity preflight, so a rejected bootstrap does not
consume a one-time capability.

Current bounded gaps:

- Pinch zoom and drag-pan are not yet implemented; button controls are the
  cross-platform baseline.
- Dismissing a Preview clears only the local confirmation surface because the
  Client Domain does not yet expose `discard_preview`.
- Replay is an integrity/current-state summary, not a readable event timeline.
- Real browser evidence belongs to Slice 136 and real-device evidence to Slice
  137; this slice does not claim either.

## Verification

Focused denominator: 69/69 numbered checks plus Expo TypeScript with zero
errors.

- Client response binding and integrity latch: 33/33.
- Viewer-scoped Apply/Replay security assertions: 10/10.
- Battlefield presentation/viewport Vitest: 4/4.
- Hash-sealed battlefield contract/static integration: 22/22.

The Ticket 14 cumulative run also replayed the fixed 84 prior assertions,
giving a cumulative 153/153. Ticket 11 authority remained 15/15, Room 7/7,
HTTP 4/4, Client Domain 17/17, Slice 130 10/10 and Slice 131 18/18. Slice 130's
mount smoke now obtains its fixture from the real RoomRuntime rather than a
partial handwritten projection, so strict V3 validation remains intact.

Three independent read-only reviews finished with P0=0, P1=0 and P2=0.

- Contract hash:
  `7f05f1f1cfdb1a19f2b2c07046d128650de29df3615a940a98df01fef0361cf9`
- Report hash:
  `812100346c119e400d67663fdb235a5a18c47f21e47a70cc20fb5db9de291efe`
- Report:
  `build/ticket-14-slice-132-authoritative-battlefield-v1/report.json`

## Harness record

The observable tool sequence for this slice is `read_board_state`,
`list_legal_actions`, `preview_action`,
`apply_action_after_user_confirmation`, and `read_replay`. No Provider was
called; no Skill was generated; DSH was not run; no MuZero record, self-play or
training truth was produced; no official-source refresh was performed.

Next: Slice 133 mounts CharacterPackage/persona selection, one selected
Kerrigan era at a time, the eight-era visible-only dynamic portrait set and the
Adjutant panel without making a live Provider call.
