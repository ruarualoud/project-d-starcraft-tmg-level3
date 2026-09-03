# Ticket 14 — shared Web/App client roadmap

Status: active; 13/16 implementation slices complete, 3 remaining. The route
was expanded on 2026-09-03 after the battle-workbench capability audit.

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
| 132 | **Complete.** Mount the authoritative battlefield flow and scale-safe rendering. | LegalSpace → proposal → preview → human confirmation → apply → replay; strict response binding and viewer-scoped Apply/Replay; no drag mutation; arbitrary model counts; map/token/base scale parity across viewports; focused 69/69 plus TypeScript 0 errors and cumulative 153/153. |
| 133 | **Complete.** Mount CharacterPackage/persona selection, eight-era dynamic portrait and Adjutant panel. | Exact opt-in extension; Web/App React render; opaque short HMAC asset grants; visible/onLoad-only animation; cold-offline local neutral portrait; focused 65/65 plus TypeScript and cumulative 218/218; no live Provider call. |
| 134 | **Complete.** Replace client source ownership with official-source/localization projections and migrate settings, army drafts and historical match records. | Metadata-only provenance/freshness UI; exact room-pinned historical rules display; explicit refresh only; fixed-key, two-confirmation, immutable AsyncStorage classification/quarantine; focused 49/49 and cumulative 267/267; official FAQ V1 gap recorded without refreshing the frozen lock. |
| 135 | **Complete.** Move Battle Lab room, board, Referee and Agent trace views onto the same Client Domain Module. | No whole-state replace/client drag authority; observer/referee projections; Expo/Battle Lab same hashes for shared views; legacy sandbox isolated; focused 23/23 and cumulative 290/290. |
| 136 | **Complete.** Produce the pinned Web static build and real browser acceptance evidence. | Precompiled hash-bound CSS removes the Web/SSR NativeWind cache race; two clean production builds are manifest-identical at 54 files / 4,226,632 bytes and tree `caa75c59...f8e8`; real Chromium checks production observer plus authenticated Expo desktop/tablet/mobile and Battle Lab desktop/mobile; 7/7 browser, 10/10 secret-scanned artifacts, 18/18 static/security contract, uniform 54×36 physical scale, 30/30 portraits, full rotated-base containment and zero sample-formation overlap. |
| 137 | **Complete.** Implement the BattleWorkbenchSnapshot and six-panel shell, then mount Unit, Scenario, Deployment/Reserve and current-score inspection. | One revision/viewer/MatchBinding-bound read model through the existing four-operation Client Domain interface; Expo/Battle Lab parity; no catalogue fallback or client authority; explicit missing/private/unknown states; focused 10/10, Battle Lab 23/23, Client Domain 17/17 and TypeScript pass. |
| 138 | **Complete.** Implement rules-owned multi-mode threat queries and map layers. | Stationary fire, move+fire, charge/engagement, per-weapon, one-to-many, many-to-one and own/enemy aggregate layers; model-count split speed and explicit LOS/terrain/elevation/status/upgrade coverage; focused 9/9, Slice 137 regression 10/10 and TypeScript pass. |
| 139 | **Complete.** Implement the current-rules matchup probability query and contextual sheet. | One-to-one/one-to-many/many-to-one/matrix finite D6 distributions with ChanceTicket lineage, separate mathematical/rules coverage, visible assumptions and unresolved modifiers; legacy beta calculator remains disabled; focused 8/8, Slice 138 regression 9/9 and TypeScript pass. |
| 140 | **Complete.** Implement the complete LegalSpace-classified Token/Marker action palette and authoritative write-sheet entry points. | Current FAQ 12-entry/27-atom handoff plus separate 69 named-base/11 generic-base evidence; current/historical/quarantined binding classifier; create/place/move/consume/remove metadata; seven write-sheet families route to Preview/Confirm/Apply/Receipt/Replay; focused 16/16, FAQ F5 17/17, Slice 137 regression 10/10, Battle Lab 23/23 and TypeScript pass. |
| 141 | Implement if-the-round-ended-now scoring forecast, score write entry and contextual rules quick view. | Server-owned non-mutating forecast with exact/conditional/unknown branches; current score and scenario objectives; scoring changes use Preview/Confirm/Apply; selected unit/action/keyword links into exact room-pinned rules with no compatibility fallback. |
| 142 | Produce native Android/iOS build and real-device evidence. | Pinned dependency/build receipt; Android plus iOS where build environment allows; app lifecycle, deep link, storage, haptics/sharing; real-device action/reconnect trace. |
| 143 | Run cross-surface migration/security aggregate and close Ticket 14. | Fixed denominators; original Ticket 10/11/12/13 replay; Web/App/Battle Lab/workbench parity; credential/path/privacy scan; production blockers; Ticket 15 handoff. |

## Completion rule

Ticket 14 is complete only at 16/16. A local HTML preview, a native semantic
tree, a copied Expo source tree, or a passing static test cannot substitute for
real browser and real-device evidence. Unsupported iOS build infrastructure is
reported explicitly but does not weaken the Android real-device requirement or
the shared semantic contract.
