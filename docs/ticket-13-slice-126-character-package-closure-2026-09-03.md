# Ticket 13 / Slice 126 — CharacterPackage closure and handoff

Status: complete.

## Outcome

Slice 126 closes Ticket 13 at 8/8. It fixes the seven implementation-report
denominators, replays the frozen historical and current contracts, audits
rights/credential/authority boundaries, and seals the exact interfaces owned by
Tickets 14 and 15.

## Fixed evidence denominator

- Slices 119–125: 7 reports and 79/79 focused assertions.
- Slice 126 closure: 12/12 acceptance assertions.
- Ticket 13 aggregate: 8 reports and 91/91 assertions.
- Adjacent gates: Rules transition 7/7, room 7/7, direct Provider 5/5,
  role Agent 9/9 and worldbook 8/8, totaling 36/36.
- The closure report hash remains stable after regenerating adjacent session,
  room and injected-Provider evidence.

## Cross-version and security replay

- Historical JSON Adapter source remains byte-frozen at
  `14e30a6a...f510`; Character Card PNG remains an explicit bounded v2 rather
  than a silent upgrade.
- CharacterPackage, eight-persona catalogue, eight static visual bindings,
  one dynamic manifest, shared presentation and held-out adversarial suite are
  cross-hash-bound.
- Reports and handoff evidence contain no credential material. Provider evidence
  remains injected transport only, with no persisted key and no internal retry.
- Rights remain fail closed: development may render the current Kerrigan
  derivatives, while public output removes those paths and uses a labeled
  Project D-original fallback.

## Handoff

Ticket 14 consumes the selector, presentation and PNG Adapter interfaces. It
must provide actual Web/App framework mounts, browser and native-device evidence,
revision-CAS selection transport, offline/public fallback and responsive/
accessibility proof without changing battlefield geometry.

Ticket 15 consumes the Character Session factory and direct Provider transport.
It must provide explicit per-session BYOK consent/detach, credential isolation,
an authorized live model/version receipt, four role-mode evidence, viewer-scoped
room projection and human-confirmed Opponent apply.

The handoff grants neither ticket Rules legality, hidden-state access,
unconfirmed room mutation, Skill/DSH generation or training authority.

## Evidence

- Handoff: `4a15b4a2c2f48d28b2233758e88c064719e836a93b8a4d09277d297ac15af9c3`.
- Closure report: `7994370f566e2a83b0916e5ef48c8f83bd78fc4000137044c49209878fb6df0f`.
- Report artifact: `build/ticket-13-closure-v1/report.json`.
- Verification: `npm run verify:ticket-13-closure`.

## Non-claims

No official source refresh, real or paid Provider call, Skill generation or
promotion, DSH execution, MuZero data generation, self-play or training
promotion occurred. Framework mounting, live BYOK/model evidence and independent
public-release rights remain open. Overall project status is 13/22; Ticket 14 is
next.
