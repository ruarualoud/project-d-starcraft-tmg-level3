# Ticket 14 Slice 143 — Web/security aggregate and downstream handoff

Date: 2026-09-03
Status: complete; Ticket 14 is 15/16 with only the user-deferred physical-device gate open
Project progress: 13/22 Tickets complete
Source refresh: not performed

## Outcome

Slice 143 closes the planned Ticket 14 development work across the Expo Web/App
client, Battle Lab, Client Domain, current FAQ workbench and native build
artifacts. It does not waive real-device acceptance. Ticket 15 may begin while
that final device gate remains deferred until the full-development test batch.

The closure verifier passed 13/13 aggregate checks over 15 prior Slice reports
and 241 prior assertions, for a fixed aggregate denominator of 254 assertions.
The final report hash is
`e9ffce3185a9c7a5eaf6c5feb9d5304b06dfc890c06b659583569fd525479fc4`.

## Verified surface

- Current official FAQ remains 68 entries / 137 FAQ atoms. The composed rules
  denominator remains 1,163 atoms: 1,049 executable and 114 display-only.
- Expo and Battle Lab share `bootstrap/read/dispatch/subscribe`, the same
  viewer-scoped room state and the same BattleWorkbench projections.
- Every gameplay write remains
  LegalSpace → Proposal → sealed Preview → explicit human confirmation →
  fenced Apply → Receipt → Replay.
- The current production Web export is reproducible at 54 files / 4,319,722
  bytes with tree hash
  `b15d9fb539dc4516e55ce3312bb42ea235bfca377c312c999a0907d057e44826`.
- Real Chromium acceptance passes 7/7 across the production public observer,
  Expo desktop/tablet/mobile and Battle Lab desktop/mobile. Ten evidence
  artifacts pass capability/credential scanning; browser report hash is
  `0b215fbbf7ff0bd9236282f555e326f350ff7fc5a14c0d061dd3b762819025f5`.
- Battle Lab exposes the exact eight-panel diagnostic set: Unit, Actions,
  Threat, Battle status, Markers, Referee, Adjutant and Harness. Only one panel
  is visible at a time. Rules-projected threat layers default off and render
  only after explicit opt-in.
- Android debug and standalone internal-preview APK bytes still match the
  Slice 142 receipt. No BYOK, Provider credential, Skill/DSH, MuZero,
  self-play or training authority is embedded.

## Compatibility repairs found by the aggregate

The aggregate exposed stale historical verifiers rather than authority
regressions. Slice 132 now recognizes the explicit Room & rules callback on the
authoritative workspace. The Web verifier now follows the current default Unit
panel into Actions, recognizes rules-projected threat layers, and verifies all
eight Battle Lab panels.

The frozen Slice 136 Web binding was not rewritten. A hash-sealed amendment
links it to the Slice 142 dependency-lock transition and records the current
Battle Lab surface. The loopback acceptance server exposes only the two exact
FAQ binding modules required by the browser graph; the rest of `content/`
remains closed.

## Downstream handoff

- Ticket 15 owns real online Tutor, Opponent, Commentator and Companion
  sessions, room/role isolation, budget/cancel/reconnect behavior and real Web
  Harness traces. Opponent mode may propose and preview but never confirm.
- Ticket 16 owns dedicated secure BYOK ingress and credential Worker isolation.
  Credentials may not enter APKs, caches, logs, receipts or client projections.
- Ticket 17 owns the real DSH-on arm, only for offline Skill candidate
  generation. Ticket 18 owns durable scheduling, evaluation, promotion and
  rollback.
- Large-scale Skill production still requires fresh user confirmation.

## Deferred gate

Physical Android installation/lifecycle/deep-link/storage/media/action/reconnect
evidence and full-Xcode iOS build/device evidence remain open. The deferral is
explicit and is not a pass or waiver; therefore Ticket 14 remains 15/16.
