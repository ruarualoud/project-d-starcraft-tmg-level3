# Ticket 14 — shared Web/App client roadmap

Status: active; 4/11 implementation slices complete, 7 remaining.

Ticket 14 restores the recovered Expo source as the Web/App product baseline,
mounts the Level-3 room/source/character interfaces into a real tracked product,
and moves Battle Lab onto the same Client Domain Module. It does not make either
client a Rules, Referee, source, Agent-session, or training authority.

## Fixed boundary decisions

- Expo is the canonical player product shell for Web, Android, and iOS.
- Battle Lab remains the developer/Referee/Agent-observability surface.
- Both consume one deep Client Domain Module with four caller operations:
  `bootstrap`, `read`, `dispatch`, and `subscribe`.
- HTTP/in-memory authoritative transports, AsyncStorage/in-memory projection
  stores, and Expo/browser lifecycle implementations are internal Adapters.
- Native and browser storage holds preferences, drafts, and viewer-scoped
  projections only. It never holds an authoritative room write model.
- Capacitor has no role because Expo already covers the three player targets.
- Historical local records and room URLs are compatibility imports, not silent
  state recovery. The retained APK is behavior evidence, not editable source.
- Actual online Provider/BYOK execution remains Ticket 15/16. This Ticket may
  render a server-owned Agent state but may not run a live model.

## Planned slices

| Slice | Scope | Required closure evidence |
| --- | --- | --- |
| 128 | **Complete.** Freeze the exact recovered Expo source as a tracked read-only baseline and decide the shared seam, ownership, platform Adapters, compatibility policy, Capacitor decision, and implementation route. | 116 files / 2,650,442 bytes / Git tree and extracted-manifest hashes; no credentials; ADR; hash-sealed boundary; old import untouched; product mount still false. |
| 129 | **Complete.** Implement the deep Client Domain Module and its HTTP/in-memory transport, projection-store and lifecycle Adapters. | `bootstrap/read/dispatch/subscribe`; typed intents/views/rejections; revision/reconnect handling; no whole-state input; 17/17 interface-level tests. |
| 130 | **Complete.** Create the tracked Expo product worktree from the frozen baseline and mount the Client Domain Module into routing, providers and shell status. | Preserved five-tab UX; explicit migration receipt; no direct Firestore or authoritative match write on mounted paths; Web/App shared semantic smoke. |
| 131 | **Complete.** Implement room locator, SeatGrant, ControlLease, reconnect, viewer projection, invite/deep-link and seat-recovery flows. | URL claims cannot create authority; one-time memory/SQLite CAS; hash + Ed25519 + HMAC receipts; two-device read vs fenced-controller behavior; production verified HTTPS links; offline read-only projection. |
| 132 | Mount the authoritative battlefield flow and scale-safe rendering. | LegalSpace → proposal → preview → human confirmation → apply → replay; no drag mutation; arbitrary model counts; map/token/base scale parity across viewports. |
| 133 | Mount CharacterPackage/persona selection, eight-era dynamic portrait and Adjutant panel. | Web/App actual rendered evidence; visible-only animation; offline/reduced-motion/public-rights fallbacks; no live Provider call. |
| 134 | Replace client source ownership with official-source/localization projections and migrate settings, army drafts and historical match records. | Provenance UI; version-frozen room data; AsyncStorage classification/quarantine; offline cache; no legacy/source fallback. |
| 135 | Move Battle Lab room, board, Referee and Agent trace views onto the same Client Domain Module. | No whole-state replace/client drag authority; observer/referee projections; Expo/Battle Lab same hashes for shared views; legacy sandbox isolated. |
| 136 | Produce the pinned Web static build and real browser acceptance evidence. | Reproducible build receipt; desktop/tablet/mobile; accessibility; deep links; offline/reconnect; screenshot/video traces; no horizontal/geometry drift. |
| 137 | Produce native Android/iOS build and real-device evidence. | Pinned dependency/build receipt; Android plus iOS where build environment allows; app lifecycle, deep link, storage, haptics/sharing; real-device action/reconnect trace. |
| 138 | Run cross-surface migration/security aggregate and close Ticket 14. | Fixed denominators; original Ticket 10/11/12/13 replay; Web/App/Battle Lab parity; credential/path/privacy scan; production blockers; Ticket 15 handoff. |

## Completion rule

Ticket 14 is complete only at 11/11. A local HTML preview, a native semantic
tree, a copied Expo source tree, or a passing static test cannot substitute for
real browser and real-device evidence. Unsupported iOS build infrastructure is
reported explicitly but does not weaken the Android real-device requirement or
the shared semantic contract.
