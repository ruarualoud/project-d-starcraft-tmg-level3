# Ticket 15 Slice 147 — role context isolation

Status: complete. Ticket 15 is 4/9; Slices 148–152 remain. Overall project
status remains 13/22 Tickets complete. Web/backend development is active;
native package and physical-device acceptance remain user-deferred until full
development completion.

## Delivered

The online role-Agent runtime now composes Slice 145's authenticated lifecycle
and Slice 146's Provider supervisor with one bounded role-context module. Its
four fixed routes are Tutor to `novice_teacher_prompt`, Opponent to
`opponent_prompt`, Commentator to `referee_prompt`, and Companion to
`sparring_coach_prompt`. There is no generic client-selected prompt route.

Each turn reads only its viewer-scoped room projection and the tool set granted
by that role's server capability profile. The runtime may prefetch board state,
current LegalSpace, accepted Rule Skill snapshots, advisory Memory, Character
worldbook and public events; none of those reads grant mutation authority.
Rules and current room evidence always outrank Character roleplay and Memory.

Online Rule Skills must be the game-scoped `project_d_game_skill_v1` shape,
match the exact game, rules version and source snapshot, carry required source
and app-rule endpoint references, and have `replay_passed` or
`human_reviewed` status. The Provider-facing Trace receives hash references,
not full Skill payloads. Live turns cannot generate, promote or use a Skill as
Rules or training truth.

Memory must match the exact room, principal, session and mode, use an allowed
namespace and have accepted or curated status. It is advisory only; among the
four modes, only Opponent may let `strategy_memory` influence its decision.
There are no Memory writes or promotions in this runtime.

Conversation history is isolated per server-created session and bounded by
both message count and bytes. An authenticated reconnect restores the same
session history and budget while incrementing the connection fence; another
principal or a new session cannot read it. Material, Character selection,
rules, room, role or connection drift fails closed.

Prompt text lives only in an ephemeral server-side artifact store. The
credential-free Gateway sees a random prompt reference and hash, resolves it
through an internal port for the supervised call, and the runtime releases it
after success or failure. User or Provider text containing credential-shaped
material is rejected without entering history. The Provider-output fence was
also hardened to reject both sensitive key names and credential-shaped string
values.

## Verification

- Slice 147 focused context-isolation contract: 24/24.
- Slice 146 Provider-supervisor regression: 24/24.
- Character worldbook regression: 8/8.
- Four-role Character Agent regression: 9/9.
- Full Ticket 15 aggregate through Slice 147: exit code 0.
- Deterministic injected Gateway invocations in the Slice report: 7.
- Prompt artifacts retained after turns: 0.
- Context contract hash:
  `2cf83537d7a269a912dcde78023a0f78d23bac23e592e5afb027410119ad9444`.
- Slice report hash:
  `8f0d0d58d99d46a9d319f42a8a5c9b83d48907ad7cad1ea5645cb04efee004d0`.

No official source refresh, live Provider call, BYOK acceptance, Skill
generation or promotion, DSH run, MuZero export, self-play, Memory write or
training promotion occurred. The Skill read in verification is a scoped
fixture, not a generated production Skill.

## Harness evidence and next slice

The report records the exact prompt routes and context tools, selected and
rejected LegalSpace candidates, memory references, reconnect/cross-mode
isolation, user-visible role states and rollback/demotion rules. The ctx2skill
record explicitly blocks live-turn Skill generation, Memory-over-Rules and
cross-game Skills; cross-time Skill replay is not claimed because no Skill was
changed.

Slice 148 now validates the structured outputs of all four roles. Tutor,
Commentator and Companion remain read-only. Opponent may select exactly one
enabled candidate from the current LegalSpace and request a sealed Preview,
but model Confirm and Apply remain impossible. Slices 149–152 then add the
authenticated HTTP/event boundary, Web Adjutant UI, Battle Lab TraceProjection
and real Chromium aggregate. Secure BYOK and a live external Provider remain
Ticket 16 responsibilities.
