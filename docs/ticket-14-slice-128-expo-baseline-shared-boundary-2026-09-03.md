# Ticket 14 Slice 128 — Expo baseline and shared client seam

Status: complete; Ticket 14 is 1/11 with 10 slices remaining.

## Outcome

The recovered Expo product source is now present in the tracked Level-3
repository as a byte-exact, read-only baseline under
`vendor/sc-tmg-expo-baseline-f07b3cb/`. It remains evidence and a derivation
source, not the running product or a state authority.

The frozen identity is:

- source commit `f07b3cb78ce6bf119bdc529cde41dbe91e00a61d`;
- Git tree `4b8d248626ddb1b4dfb2faf4776731bdb3ee896e`;
- 116 tracked files;
- 2,650,442 bytes;
- extracted file-manifest hash
  `b5761d2fa1f1cb155696f1a145888ffbf1718c38113b38c439e9d9a8974a55ca`.

This preserves the five-tab Expo UX, Expo SDK 54 / React Native 0.81.5 /
React 19.1 baseline, Web static target, Android/iOS identity, native capability
dependencies and bilingual product experience. A credential scan found no
private key or credential material.

## Shared module decision

Expo remains the player-facing Web/Android/iOS shell. Battle Lab remains the
developer, Referee and Agent-observability surface. Both will consume one deep
Client Domain Module through only:

```text
bootstrap(route_and_principal_context)
read()
dispatch(typed_client_intent)
subscribe(listener)
```

Transport, projection cache, revision, reconnect and receipt mechanics stay
behind this interface. HTTP/in-memory transports, AsyncStorage/in-memory stores
and Expo/browser lifecycle implementations provide real internal seams with at
least two Adapters each. The interface rejects whole game state, caller-declared
side/role, unchecked actions, `confirmed=true`, client RNG, Rules/source
overrides and Provider credentials.

Capacitor is deliberately excluded: Expo already covers Web, Android and iOS,
so another client lifecycle would add migration/state-ownership cost without
capability leverage.

## Migration debt made explicit

The baseline still contains client-owned `MatchRecord` mutation, AsyncStorage
whole-match saves, direct Firestore reads and inactive remote-room fields. These
bytes are intentionally preserved so the migration cannot claim the old
behavior disappeared. They are not mounted into the Level-3 runtime.

- preferences may import into versioned local preferences;
- army records import as untrusted drafts and require official-data validation;
- historical matches import as read-only timelines, never room-state restores;
- bundled/direct-Firestore data is display-only migration input, never source
  authority;
- old room URLs produce locators only and must exchange for a current SeatGrant;
- the retained APK remains behavior evidence and is never editable source.

## Verification

`npm run verify:ticket-14-expo-baseline-boundary` passes 13/13 at boundary
`e8b268e9...f6cd` and report `d080e22b...c2d6`. It verifies exact bytes,
product routes and versions, credential absence, explicit legacy debt, surface
roles, the Capacitor rejection, module depth, ownership, platform Adapters,
compatibility imports, all eleven planned slices and the absence of any false
mount/build/device/action claim.

The local architecture preview is generated at
`build/ticket-14-slice-128-expo-baseline-boundary-v1/preview.html`.

No source refresh, dependency install, Web/native build, browser/device run,
room mutation, Provider call, Skill, DSH, MuZero, self-play or training action
occurred. Slice 129 next implements the Client Domain Module itself.
