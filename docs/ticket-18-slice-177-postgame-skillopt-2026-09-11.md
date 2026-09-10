# Ticket 18 / Slice 177 — postgame reflection and SkillOpt candidate closure

Status: complete on 2026-09-11. Ticket 18 is `6/8`; Slices 178–179 remain.
Project completion remains `16/22` Tickets.

## Outcome

The first-five pipeline now has a resumable review→reflection→SkillOpt candidate
path. Four completed, Rules-executed and replay-passed matchup transitions were
compiled into Episodes:

- Terran→Zerg development and held-out;
- Zerg→Terran development and held-out.

Each Episode seals two different evidence windows. `preAction` contains only the
declared player observation, legal candidates, objective and policy axes that
existed when the choice was made. `actualOutcome` contains the selected branch,
objective vector, resulting state and Rules replay result. Outcome evidence can
be used by review but cannot rewrite the original decision window.

## Reflection result

Both directions contain two observations whose frozen objectives prefer
opposite first actors. The bounded finding is therefore conditional: there is no
evidence for a fixed Terran-first or Zerg-first policy. The proposed lesson says
to compare the current objective vector and visible positional tempo, then
revise when deployment, score, threat or activation information changes.

This creates two separate directed-matchup SkillOpt candidates:

- Terran→Zerg: `1d3f33718a82b12a05a503a59b2846c1f9eb14cd62bd2233806ae2777ab5fa8c`;
- Zerg→Terran: `326eee9f0d5359aa242faff6eab81a7938cd1ccda9a3274eb24c8a3b49b3ddd6`.

Both are `quarantined_candidate`, require independent held-out evaluation and
Arena comparison, and have no right to replace the five accepted runtime
versions.

## Resume proof

The workflow completed reflection, returned a typed
`paused_after_completed_reflection` state and sealed a checkpoint. A new store
instance restored that checkpoint and continued directly at SkillOpt candidate
materialization. The deterministic Reflection Adapter was invoked once before
the pause and zero times after resume.

Run command:

`node scripts/run-ticket-18-postgame-skillopt-v1.mjs`

Report:
`build/ticket-18-postgame-skillopt-v1/report.json`

Report hash:
`dfc4ef065595db46dbfbf5aa2bd4fca1b7c54b46556cfa306cf5fc81de60c5eb`

## Honest boundary

The four Episodes are completed synthetic Rules transitions, not full matches.
The Reflection Adapter is deterministic and injected, not a paid model. This
Slice proves evidence separation, multi-Episode aggregation, checkpoint resume
and quarantine—not candidate utility, win-rate improvement or full-game
strategy effectiveness. Those are Slice178 evaluation concerns.

No official sources were refreshed, no memory was promoted, no training
candidate was emitted and no paid Provider call occurred.

## Next deliverable

Slice178 compiles candidate Skill versions, replays old failures, applies an
independent held-out set and compares candidate versus accepted parent in the
isolated Arena. Only a candidate with no Critical/High regression may become
promotable; publication remains an explicit CAS action with rollback.
