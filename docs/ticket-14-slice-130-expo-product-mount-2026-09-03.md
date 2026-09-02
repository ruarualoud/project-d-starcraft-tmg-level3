# Ticket 14 Slice 130 — tracked Expo product mount

Status: complete; Ticket 14 is 3/11 with 8 slices remaining.

## Outcome

The exact 116-file recovered Expo baseline now has a separate tracked product
candidate at `apps/starcraft-tmg-expo`. The product preserves the ordered
Database, Army, Tools, Match and Settings tabs while mounting the one shared
Client Domain Module at the root route provider.

The migration receipt seals the byte-level derivation:

- source: 116 files / 2,650,442 bytes / manifest
  `b5761d2fa1f1cb155696f1a145888ffbf1718c38113b38c439e9d9a8974a55ca`;
- target: 119 files / 2,591,632 bytes / manifest
  `5ea7a1fee0eec9aea96f2e384b922bba64937203804761e2cbe84e87ece4b92c`;
- delta: 107 unchanged, 9 changed, 3 added and 0 removed; and
- migration receipt:
  `f47ba215f22c97957fb329752e333f96e26a184864cd65813efb35668a84c796`.

The frozen vendor directory remains untouched. The derived app points through
Metro to `packages/client-domain`; it does not copy the domain implementation.

## Product mount

`Level3ClientDomainProvider` composes the shared module with:

- the authoritative HTTP transport;
- an AsyncStorage Adapter restricted to integrity-bound viewer projections;
- browser visibility/network lifecycle for Expo Web; and
- Expo AppState lifecycle for native clients.

The hook exposes a projection and connection status plus bounded `bindRoom`,
`dispatch` and `refresh` interactions. No room is invented at startup. Until a
real route and server-issued capability arrive, the Match tab visibly remains
`room_required` and read-only. SeatGrant material stays in runtime memory and
is not written to AsyncStorage.

## Legacy authority isolation

The old 1,527-line local MatchRecord state machine was replaced by a 210-line
authoritative-room status shell. Mounted routes no longer import direct
Firestore sync, expose local match save/delete operations, generate local match
randomness or accept arbitrary source packages.

Historical match keys remain byte-preserved and inaccessible until Slice 134
can classify, quarantine and explicitly migrate them. Bundled data remains
available for reference browsing and army drafts, but Settings labels it as a
display-only compatibility source rather than official, Rules or room truth.

## Verification

`npm run verify:ticket-14-expo-product-mount` passes 10/10. It proves the exact
file migration, ordered five-tab shell, complete mounted local import graph,
absence of reachable Firestore/local-match authority, use of the shared module,
and Web/App semantic status parity. The mounted graph contains 35 files and 68
edges at graph hash
`58d71aa9cd0e076f9148c1004060d9a3187cc2619adbbcf1c5322754bb8bc271`.

The cumulative Slice 130 gate passes 66/66: Slice 128 13/13, Slice 129 17/17,
authoritative Room 7/7, HTTP Adapter 4/4, Ticket 11 authority 15/15 and Slice 130
10/10. The Slice 130 report hash is
`55dc68f39f362c906b275d1d4de086ac59e5457410ae5a26489c5a1003b9fc69`.

No Expo dependency installation, static Web build, real browser session,
native build or real-device evidence occurred. Those remain Slices 136 and
137. No official-source refresh, Provider call, Skill generation, DSH run,
MuZero output, self-play or training promotion occurred. Slice 131 next mounts
room locators, SeatGrant ingress, ControlLease, invite/deep-link and recovery.
