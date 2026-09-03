# Ticket 14 Slice 141 — score forecast and contextual rules

Status: complete. Ticket 14 is 14/16; Slices 142–143 remain. Overall project
status remains 13/22 Tickets complete.

## Delivered

The RoomRuntime now owns two revision-bound, viewer-safe BattleWorkbench
queries. The score forecast reports the current scores and one of three
explicit result modes:

- `exact` only when the current LegalSpace contains a content-hash-valid
  scoring resolution, or the match is already terminal;
- `conditional` for a visible Marker-control snapshot whose assumptions and
  excluded supply/final-reserve scoring are shown;
- `unknown` when the required scenario inputs or legal scoring resolution are
  absent.

Malformed scoring resolutions or mixed room/LegalSpace identities quarantine
the projection. The query never rolls chance, advances the phase or mutates
state. Its scoring entry can only submit the observed finite action to the
existing `LegalSpace → Preview → human confirmation → Apply → Receipt/Replay`
route. Direct score editing remains impossible.

The rules quick view projects the exact room-pinned display artifact,
catalogue/runtime identity and explicit LegalSpace RuleAtom lineage for each
visible unit, action, ability and keyword. Exact field equality and exact unit
identifiers are used; unlinked keywords remain `unknown` rather than falling
back to similarly worded current or historical rules. Historical pre-FAQ
rooms retain their own display/Replay identity read-only, and mixed identities
are quarantined.

Expo mounts the forecast in Battle status, rules context in Unit and Battle
status, a scoring Preview entry, and navigation to Room & rules. Battle Lab
mounts the same projections and scoring Preview route. Both remain presentation
clients of the same four-operation Client Domain.

## Verification

- Slice 141 focused contract: 18/18.
- Slice 140 write-palette regression: 16/16.
- Slice 137 workbench/RoomRuntime regression: 10/10.
- Slice 135 Battle Lab regression: 23/23.
- Expo TypeScript: zero errors.
- forecast hash: `07980b3366577cc319576147ba4dd91fe38a00f37aab2702e006f94d892c5897`.
- rules quick-view hash:
  `99db84f91289bd3db6dba7da2e20f24391d2b02caec9a1a79d3cf957d628be8f`.
- report hash:
  `cd5fe0f6d5ec16f6fdfb7a25423635f45d6a1faa87c527d6eb59dfb595c667eb`.

No source refresh, Provider call, Skill generation, DSH run, MuZero export,
self-play, memory promotion or training promotion occurred. Production room
truth remains false until the native/device and aggregate gates close.

## Next

Slice 142 produces pinned Android/iOS builds and real-device evidence. Slice
143 then runs the cross-surface migration/security aggregate, verifies current
FAQ room binding end to end and closes Ticket 14.
