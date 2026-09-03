# Ticket 15 Slice 148 — strict role output and Opponent Preview

Status: complete. Ticket 15 is 5/9; Slices 149–152 remain. Overall project
status remains 13/22 Tickets complete. Web/backend development is active;
native package and physical-device acceptance remain user-deferred until full
development completion.

## Delivered

The online role turn is now a deep module with the same three-method interface
as the context runtime: `metadata`, `readContext` and `sendTurn`. Callers do not
select or configure the output policy. Provider completion, role/intent output
validation, evidence resolution, decision comparison and Rules-owned Preview
all remain inside the implementation.

Every accepted Provider response must use
`starcraft_tmg_online_role_output_v1` and exactly the four top-level fields
`schemaVersion`, `channels`, `visualCue` and `evidenceRefIds`. Channel fields
are also exact and role/intent scoped. Tutor emits speech/teaching,
Commentator emits speech from its public projection, Companion emits
speech/teaching, Opponent chat is speech-only, and only Opponent `take_turn`
may emit a decision. Unknown fields, schemas, channels or server-owned
confirmation/apply instructions are rejected without retaining raw output.

Evidence references come from a server-built catalogue for that exact prompt.
All outputs cite the current viewer projection and, when available, a
same-game accepted Rule Skill. Opponent decisions must also cite the current
LegalSpace; Commentator must cite current public events. A model cannot invent
another room, revision, Skill or event reference.

An Opponent decision names exactly one enabled candidate from the LegalSpace
seen by that turn. It must record why the line was selected, its score or
position value, its risk and at least one rejected enabled alternative when
another exists. Strategy Memory may influence the comparison only through
explicit same-session `strategy_memory` references and remains advisory;
Rules and room evidence cannot be overridden.

The Preview port receives no credential. It binds the model's candidate to the
exact MatchBinding hash, LegalSpace hash, state revision and state hash that
were observed before the Provider call. The authoritative engine now checks
all four values as one complete precondition before sealing or persisting an
open Preview. Partial, stale or mismatched bindings fail closed.

The returned Preview projection is content-hash sealed, binds the exact
candidate and canonical proposal, and requires explicit human confirmation.
The model-facing module has no Confirm or Apply method and cannot advance the
authoritative state revision. Provider raw-output hash, normalized accepted
output hash, decision receipt and Preview projection hash remain separately
auditable.

## Verification

- Slice 148 strict role-output and Preview contract: 28/28.
- Slice 147 context-isolation regression: 24/24.
- Authoritative room regression: green.
- Historical four-role Kerrigan Agent regression: 9/9.
- Full Ticket 15 aggregate through Slice 148: exit code 0.
- Deterministic injected Gateway invocations in the final Slice report: 18.
- Model Confirm calls: 0; model Apply calls: 0.
- Prompt artifacts retained after accepted and rejected turns: 0.
- Output/Preview contract hash:
  `d971f5d1de2486b64c4f31c878dc42a5a907ce88a211a418fe28188b4288b892`.
- Final Slice report hash:
  `358ac1e57d3e3e97f5d3c37b317621e29f2dfc03d134543f44e5caccf8753fc4`.

The adversarial suite covers wrong schema, unknown/server-owned fields,
role-channel escalation, invented or omitted evidence, absent candidates,
missing alternative comparison, cross-session Memory, Preview adapter failure,
stale four-way binding, tampered Preview state and transport-side candidate
switching. Rejected outputs enter history only as failure metadata and hashes;
their content is not retained.

No official source refresh, live Provider call, BYOK acceptance, Skill
generation or promotion, DSH run, MuZero export, self-play, Memory write or
training promotion occurred. The Rule Skill used here is an accepted,
same-source verifier fixture rather than a newly generated Skill.

## Next slice

Slice 149 mounts this deep module behind an authenticated online-Agent HTTP and
event interface: create/read/send/cancel/reconnect/end/events, bounded schemas,
idempotency and redacted errors, with no credential endpoint. Slice 150 then
mounts the Web Adjutant controls; Slice 151 exposes safe Battle Lab traces and
Slice 152 runs the real Chromium aggregate. Secure BYOK and a live external
Provider remain Ticket 16 responsibilities.
