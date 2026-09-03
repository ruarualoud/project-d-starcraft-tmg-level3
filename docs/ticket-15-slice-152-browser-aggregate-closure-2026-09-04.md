# Ticket 15 Slice 152 — real-browser aggregate and closure

Date: 2026-09-04
Status: complete. Ticket 15 is 9/9; project progress is 14/22.
Ticket 14 physical-device acceptance remains deferred and not waived.
Source refresh: not performed.

## Outcome

Slice 152 closes the online role-Agent Ticket through a real Chromium run
against one same-origin fixture containing the actual RoomRuntime, room HTTP
Adapter, authenticated Agent HTTP, session lifecycle, Provider supervisor,
role-context/output runtime and Battle Lab Client Domain. The only substituted
boundary is an injected deterministic Provider Gateway. No external model or
API key was used, accepted or needed.

The browser exercised all four fixed roles:

- Tutor completed an `explain` turn with current Rule-Skill evidence;
- Commentator consumed public events without room mutation;
- Companion completed a viewer-scoped reflective turn;
- Opponent selected one current enabled LegalSpace candidate, returned only a
  sealed Preview, waited for the separate browser human-confirm action, then
  passed through Confirm, fenced Apply, signed Receipt, authoritative refresh
  and explicit Replay verification.

The same run exercised `provider_failed`, honest
`provider_not_configured`, pre-Gateway `provider_input_budget_exceeded`, an
in-flight AbortSignal cancellation, and background read-only followed by an
explicit connection-epoch reconnect.

## Product defects found and repaired

Real-browser execution found three integration defects that isolated module
tests could not expose:

1. The Agent client imported HTTP constants and credential detection through
   server modules, which pulled `node:crypto`, `node:util` and server rule
   imports into the browser. The wire constants and credential scanner now
   live in dependency-free portable modules; the server reuses and re-exports
   the same contracts.
2. Async trace refresh could reset a user's draft role-mode selection to the
   previously projected mode before session creation. The selector remains
   user-owned until a server session becomes active.
3. Foreground recovery correctly projected `reconnect_required`, but the UI
   disabled the reconnect control once the page was visible. The reconnect
   capability now remains true while either read-only or explicitly awaiting
   reconnect.

## Privacy scopes

The browser verifies privacy according to the contract boundary instead of
making an impossible blanket claim:

- Trace DOM excludes conversation text, raw prompt/output, Provider usage
  receipt, credentials and raw session IDs;
- authenticated Agent HTTP necessarily carries its private session locator and
  accepted user-visible structured output, but excludes credentials, raw
  prompt artifacts and Provider usage receipts;
- saved screenshots and reports exclude seat tokens, auth-cookie values, raw
  session IDs and conversation sentinels.

No browser artifact persists raw network bodies.

## Fixed evidence

- Real Chromium matrix: `11/11`, four fixed screenshots, report
  `b76b3af4...f4a2` after the full aggregate run.
- Prior Ticket 15 denominator: 8 reports / 170 assertions.
- Slice 152 browser denominator: 11 assertions.
- Closure denominator: 11 assertions.
- Ticket total including closure: 192 assertions.
- Browser aggregate contract: `d4f3e56c...377e`.
- Ticket 15 closure report: `51bdc550...d13c`.
- Focused Slice 152 gate: pass, including Client Agent 15/15, Agent HTTP
  26/26, TraceProjection 21/21, Expo TypeScript, Chromium 11/11 and closure
  11/11.
- Full `verify:ticket-15-slice-152`: pass through all Slices 144–152.

Build reports and screenshots remain generated, ignored evidence. The contract,
fixture, verifier and closure code are tracked.

## Ticket 16 handoff

Ticket 16 owns secure BYOK ingress, isolated credential Worker, live Provider
egress and the first user-authorized external-model receipt. Ticket 15 exposes
only the credential-free Gateway seam and therefore does not need an API key.
When Ticket 16 reaches its live-call gate, the key must be configured through a
local environment or secure product input and must never be pasted into chat.

Native rebuild/device validation remains in the final-device batch. No Skill
generation, DSH, MuZero export, self-play, memory write, training promotion or
production-ready claim occurred in this Slice.
