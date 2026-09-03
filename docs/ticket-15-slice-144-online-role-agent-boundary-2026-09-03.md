# Ticket 15 Slice 144 — online role-Agent boundary

Date: 2026-09-03
Status: complete; Ticket 15 is 1/9
Project progress: 13/22 Tickets complete
Source refresh: not performed

## Outcome

Slice 144 fixes the Ticket 15 migration boundary before changing the existing
character runtime. The Ticket 13 CharacterPackage, worldbook, prompt,
capability, portrait and injected-Provider code remains reusable historical
evidence, but is not relabelled as the online product runtime.

The new target is a versioned online supervisor under
`packages/online-agent-session`. It owns session and turn lifecycle while
Rules, RoomRuntime, ChanceTicket, non-model confirmation and Provider
credentials remain outside it.

## Fixed denominator

Ticket 15 contains nine planned slices, 144–152:

1. boundary and migration audit;
2. room/principal/role session lifecycle;
3. credential-free Provider Gateway supervision and budgets;
4. prompt/tool/Memory/history/reconnect isolation;
5. Opponent LegalSpace Preview and external confirmation;
6. authenticated Agent HTTP and event projection;
7. Client Domain and Expo Web Adjutant mount;
8. Battle Lab live safe Harness traces;
9. real-browser aggregate and Ticket 16 handoff.

## Important migration finding

The V1 character session directly requires BYOK, stores BYOK and seat tokens in
process maps, exposes BYOK HTTP routes, lacks one-turn-at-a-time budget,
timeout/cancel and reconnect state, and is not mounted into the Ticket 14
client surfaces. Ticket 15 wraps stable character contracts behind the new
supervisor rather than mutating the old contract or silently accepting these
gaps.

Ticket 15's Provider port is credential-free. It supports a deterministic
injected Adapter for verification and an honest `provider_not_configured`
product state. Ticket 16 later provides secure BYOK and a live external model
receipt behind that port.

## Evidence

- Slice 144 boundary verifier: 11/11; report hash
  `68c414f21cc4bf0a4ef76fca4334358f0171cac1cde7186a5d3c1f2b8402063f`.
- Historical Ticket 13 four-mode Agent verifier: 9/9.
- Historical injected Provider Adapter verifier: 5/5.
- Ticket 14 deferred-device handoff aggregate: 13/13.
- Four modes remain exact: Tutor, Opponent, Commentator and Companion. Only
  Opponent may select a current enabled LegalSpace candidate and request a
  sealed Preview; no model may confirm or apply.

No official-source refresh, real external Provider call, BYOK acceptance,
Skill generation, DSH, MuZero, self-play or training promotion occurred.

Next: Slice 145 implements the room/principal/seat/role-isolated session
lifecycle and viewer-safe reconnect projection.
