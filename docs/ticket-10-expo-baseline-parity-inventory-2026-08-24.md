# Expo product baseline recovery and parity inventory

Date: 2026-08-24  
Wayfinder ticket: [Inventory and recover the Expo product source](../../.scratch/starcraft-tmg-level3-platform/issues/10-inventory-and-recover-the-expo-product-source.md)  
Evidence: [`ticket-10-expo-baseline-inventory-v1.json`](../evidence/baseline/ticket-10-expo-baseline-inventory-v1.json)

## Outcome

The canonical Expo shell has been recovered exactly, but the complete source used for the last retained public-beta APK has not.

- Remote branch `codex/starcraft-classic-army-builder` currently resolves to the planned commit `f07b3cb78ce6bf119bdc529cde41dbe91e00a61d`.
- A clean checkout exists at `starcraft-tmg-level3/imports/sc-tmg-app/` and remains a read-only, parent-repository-ignored Adapter input.
- The checkout is a valid Expo Web/App product shell with the database, army builder, tools, match tracker, settings and bilingual UX.
- The retained fix15 APK contains Battle Table, AI and room-invite code that is absent from both remote branches. The APK is therefore historical executable evidence, not a reproducible source baseline.
- The current Battle Lab has the richer referee/AI observability surface but still has multiple client/server state authorities and cannot become the product or Rules authority unchanged.

Ticket 10 is an inventory/recovery task, not a migration. No Expo source, Battle Lab source or Level-3 authority code was changed while producing this report.

## Source lock

| Field | Value |
|---|---|
| Repository | `git@github.com:ruarualoud/sc-tmg-app.git` |
| Branch | `codex/starcraft-classic-army-builder` |
| Remote branch HEAD | `f07b3cb78ce6bf119bdc529cde41dbe91e00a61d` |
| Local HEAD | `f07b3cb78ce6bf119bdc529cde41dbe91e00a61d` |
| Commit date | `2026-06-03T22:00:46+08:00` |
| Subject | `Show StarCraft app ability timing costs` |
| Checkout | `starcraft-tmg-level3/imports/sc-tmg-app/` |
| Tracked tree | `116` files, `2,650,442` blob bytes |
| Working tree | clean |

The remote currently exposes only `main@9f89f297...` and the locked branch. Neither branch contains the historical Battle/AI/room integration files.

## Expo baseline inventory

### Routing and UI

The product uses Expo Router and one shared React Native tree for Web, Android and iOS. Its five main tabs are:

1. database: unit, mission and deployment browsing;
2. army: list creation, card/resource accounting, upgrades and text import/export;
3. tools: dice, combat comparison, versus and roster analysis;
4. match: manual rounds, score, unit/building/supply status and timeline tracking;
5. settings: data sync/import, language and editable local unit-name translations.

The shell is the correct product-experience baseline. Its mobile navigation, safe-area handling, native controls, army workflow and bilingual presentation should be preserved through the later shared-boundary decision.

The recovered source does **not** contain an AI tab, interactive Battle Table, map/terrain assets or room UI. `MatchRecord` declares `battleTable` and remote-room placeholder fields, but no implementation reads or writes them.

### Data access

The source has two client-side data paths:

- embedded `assets/data/bundled-data.json`, currently version `65` with `26` units, `37` cards and `165` game cards;
- direct Firestore REST reads from `starcrafttmgbeta/starcrafttmgbeta` collections, followed by client normalization and whole-package replacement in AsyncStorage.

Army lists, matches, dice history, language and custom translations are also stored in AsyncStorage. Offline JSON import can replace the local normalized data package.

This is useful offline product behavior but not source authority. The source has no immutable raw snapshot, upstream content hash, review status, rights decision or translation provenance binding.

### State ownership and rooms

The Match screen owns a mutable `MatchRecord` in React state. Unit health/status, phase, supply, scores and timeline rows are updated locally and later saved as a whole object. There is no LegalSpace, sealed preview, expected revision, receipt chain or replay proof in this source.

The recovered server folder is mostly a Manus template. Its application router exposes only template health/auth procedures. It does not host StarCraft rooms or authoritative Rules.

Remote-room fields in `MatchRecord` are interface fossils, not functioning room integration:

- `battleTable?: unknown`;
- `remoteRoomId?: string`;
- `remoteRoomBaseUrl?: string`;
- `remoteRoomVersion?: number`;
- `remoteRoomSideKey?: 'player1' | 'player2'`.

### Native capabilities

The source currently binds Expo SDK 54, React Native 0.81.5 and React 19.1. It uses or declares:

- AsyncStorage;
- clipboard;
- haptics;
- deep links and Expo Router;
- browser opening;
- sharing;
- Expo Image;
- Web static export through Metro.

The app config uses package ID `space.manus.sc.tmg.app.t20260420025112`, portrait orientation, tablet support, Android minSdk 24, typed routes and the React compiler.

### Build ownership

The actual package scripts own Expo dev, TypeScript, lint, Vitest, Android and iOS entrypoints. `PACKAGING.md` and `build.sh` are not a reproducible release contract:

- they refer to `pnpm dev:metro`, which is absent from `package.json`;
- they may install pnpm/EAS globally;
- they pull live Firestore data during packaging;
- no tracked `eas.json` exists;
- `build.sh` explicitly tolerates some type errors.

Future product work must replace this with a pinned, non-interactive, source/data/lockfile-bound Web and native build receipt. This report did not install or build anything.

## Battle Lab inventory

The current Battle Lab consists of:

- `starcraft-tmg-local/` for the browser UI;
- `scripts/starcraft-tmg-rules-v0.mjs` for rules/threat/simple-AI functions;
- `scripts/starcraft-tmg-rules-service-v0.mjs` for the legacy HTTP surface;
- `scripts/serve-starcraft-tmg-local.mjs` for static pages, rooms, coach and observer routes.

It has the richer debugging surface: board/map/terrain rendering, builder, legal-action display, AI preview/apply, coach traces, observer panels and room sync. Its local normalized pack is newer than the recovered Expo bundle: version `67`, `26` units, `37` cards, `171` game cards, `8` scenario maps and `9` terrain presets.

It is not an acceptable authority baseline:

- `/apply-action` accepts a whole client-submitted state plus action;
- room `/state` accepts whole-state replacement;
- version increments exist but no expected-version CAS is required;
- rooms live in one process-local `Map`;
- public/private journals, rejection receipts and deterministic replay are absent;
- browser drag directly changes piece/terrain coordinates and publishes the result.

These are exactly the seams that Ticket 11 must replace before either client consumes the shared room protocol.

## Expo source / Battle Lab / APK parity

| Capability | Recovered Expo source | Battle Lab | Retained fix15 APK |
|---|---|---|---|
| Web/App shared shell | Yes | Web only | Android build |
| Unit/card browser | Yes | Yes | Yes |
| Mature army-builder UX | Yes; preferred baseline | Basic/diagnostic | Yes |
| Manual match tracker | Yes | Battle-state log | Yes |
| Interactive board/map/terrain | No | Yes | Yes |
| Simple AI and ranked actions | No | Yes | Yes |
| Coach/observer surface | No | Yes | historical AI UI present |
| Room invite/publish/pull | Placeholders only | Yes, unsafe whole-state sync | Yes |
| Official authoritative transition | No | No | No evidence |
| Revision/CAS + append-only replay | No | No | No evidence |
| Data version | `65` | `67` | bundled lineage not independently extracted |
| Translation | local handcrafted/editable strings | no provenance authority | local bilingual strings |
| Reproducible build from recovered source | not yet run | not applicable | **No: source delta missing** |

## APK evidence

The retained release APK is:

- path: `starcraft-tmg-local/downloads/sc-tmg-app-public-beta-20260526-fix15-upgrade-advisory-arm64-release.apk`;
- SHA-256: `cdba3698d4ef54ca2b313b8e7704e6a998b6fcaf06c535b8faeb64026f14320f`;
- size: `44,942,967` bytes;
- package: `space.manus.sc.tmg.app.t20260420025112`;
- version: `1.0.0` / code `1`;
- ABI: `arm64-v8a`;
- embedded bundle: `assets/index.android.bundle`;
- signed metadata: `META-INF/ANDROIDD.SF` and `META-INF/ANDROIDD.RSA`.

Static inspection of its bundle finds the fix15 marker and the following capabilities absent from the recovered remote source:

- `starcraft-tmg-rooms/api/v1`;
- `battleTable` and `remoteRoomId` behavior;
- `Copy Invite`, `Publish Room`, `Pull Room`;
- `Battle Initialization` and `Mission Overlay`;
- `Apply AI`, `StarCraft AI`, and `decideSimpleAi`;
- authoritative-looking movement confirmation UI markers such as `battle-pending-move`—but no evidence that the underlying mutation was actually authoritative.

The package identity matches the recovered shell, so the APK belongs to the same product lineage. Its richer bundle proves an unrecovered source delta; it cannot be used as editable source or as proof that the new Level-3 contracts already existed.

## Web artifact status

No `sc-tmg-app-web`, Expo `dist`, source-intake checkout, or historical cloud tarball remains in the local worktree. The former public URL `http://192.144.128.100/match` returned HTTP 404 during this inventory. Historical screenshots and reports document the old deployment, but there is no current static Web artifact to hash or rebuild.

## Migration constraints passed to later tickets

This ticket records facts and does not choose the shared-client implementation. The following constraints now bind the next decisions:

- Expo remains the Web/App product shell baseline; Battle Lab remains the developer/referee/Agent-observability surface.
- Neither source tree owns authoritative match state.
- Ticket 11 must finish the sole transition/journal contract before client migration.
- Ticket 14 must define one generated/shared domain SDK and decide how AsyncStorage records and historical room URLs become projections or compatibility imports.
- The richer APK-only delta must be reimplemented from product behavior and evidence against the new SDK; decompiling it into a second authority is forbidden.
- Official data and translations must pass through the Level-3 source/localization service rather than direct unreviewed client replacement.
- Native clipboard, haptics, deep links, offline caching and mobile UX remain platform Adapter capabilities, not domain authority.

## Ticket 10 acceptance matrix

| Requirement | Evidence | Result |
|---|---|---|
| Obtain the historical Expo repository | clean fixed-root checkout | pass |
| Bind exact repository/branch/commit | remote and local HEAD both `f07b3cb...` | pass |
| Inventory routing and UI | five tabs plus dev route listed | pass |
| Inventory data access | bundled v65, Firestore REST, AsyncStorage | pass |
| Inventory state ownership | client-owned whole records identified | pass |
| Inventory room integration | placeholders only in source; unsafe Battle Lab room found | pass |
| Inventory native capabilities | Expo config and dependency usage recorded | pass |
| Inventory build ownership | scripts/config drift and missing release lock recorded | pass |
| Compare Battle Lab | feature and authority matrix recorded | pass |
| Compare Web/APK artifacts | APK statically bound; Web artifact absence and 404 recorded | pass with explicit source-loss finding |
| Avoid migration/rewrite | no product source changed | pass |

The ticket is resolved as an inventory. Product parity is intentionally **not** marked complete: the missing APK source delta becomes explicit migration debt for the shared Web/App boundary, not hidden success.
