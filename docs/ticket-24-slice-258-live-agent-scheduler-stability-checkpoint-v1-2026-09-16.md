# Ticket 24 / Slice 258 live-Agent scheduler stability checkpoint

Date: 2026-09-16

Status: Slice 258 remains open. The Standard-2000 human-versus-Agent match is
paused after authoritative action 18 so the scheduling change can be reviewed
before the remaining match is run.

## Change

- DeepSeek Chat uses the official beta strict-function endpoint. Every exposed
  function is strict and every turn must call a declared tool.
- Planner and Action terminate through typed `submit_planning` and
  `submit_decision` tools. The Host reconstructs and revalidates canonical
  finite or parameterized proposals.
- Formation, battlefield-asset placement and final instantiation are no longer
  broad Planner queries. Planner chooses a candidate and requests a Host search;
  the Host searches that selected candidate once before Action.
- Historical formation/asset tool results remain in the durable record, but the
  Planner continuation replaces their coordinate enumeration with a receipt
  summary. This removes repeated context without deleting audit evidence.
- Query protection is separated from correction protection. Planner has an
  eight-round safety ceiling, Action has six, while malformed/semantic repair
  remains three rounds. The ceilings are anti-loop safeguards, not target call
  counts. A ceiling-forced terminal answer must retain uncertainty and is
  recorded as a strategy-review signal.
- Every completed decision records a prompt-policy observation against up to
  five earlier paid decisions: plan continuity, candidate and Pass comparison,
  Skill grounding, opponent counterplan, placement reasons, exact evidence,
  calls, tokens and corrections. Medium observations do not block Apply.

## Focused verification

One syntax/diff check of the three directly changed modules passed. No Rules,
map, UI, historical Slice or whole-repository gate was rerun.

The existing match resumed from:

`build/ticket-24-slice-258-standard-2000-ha-map-v1/20260916085936321`

The already-paid fourth Planner query was processed without replay. The next
decision selected and legally instantiated a two-model Hydralisk deployment,
advanced the recorded action count from 17 to 18, and captured the Apply/UI
evidence before the runner was intentionally stopped.

## Stability and strategy observation

- New-policy calls in this decision: 4.
- New-policy semantic/format corrections: 0.
- Query safety ceiling reached: no.
- Strategy result: `no_observed_negative_strategy_effect`.
- Preserved evidence: plan continuity, selected/Pass comparisons, three Skill
  references, two opponent-response/counter-response branches, two model
  placement reasons and five exact query references.
- Review item: the Agent knew the deployed Hydralisk remained about 16 inches
  from marker 5 and framed the move as next-round staging. This is coherent but
  not yet proof that it dominates the faster Raptor alternative. Track it in
  match/replay evaluation; it is not evidence of truncation by the new scheduler.

## Performance and cost

- Before canary: 79 calls, 3,531,319 units, CNY 9.642108.
- After applied action 18: 83 calls, 3,759,533 units, CNY 9.952359.
- The decision-wide trace includes four legacy calls and totals 412,408 units,
  versus a five-decision baseline average of 617,978 (about 33% lower).
- The four new-policy calls total 228,214 units (about 63% lower than that
  baseline). The first new Planner prompt fell from the legacy continuation's
  202,548 bytes to 135,432 bytes after coordinate-enumeration compaction.
- Action prompts remain about 205–209 KB because an exact complete formation and
  every model assignment must be visible. That cost is intentional positioning
  evidence, not repeated broad candidate search.

No source refresh occurred and no decision was promoted to training truth.

## Remaining Slice 258 work

1. Resume the same authoritative room and complete the Standard-2000 match.
2. Review prompt-policy observations after subsequent decision types, especially
   movement, ranged attack, melee/charge, Pass and phase transitions.
3. Produce terminal JSON/NDJSON, screenshots, cost ledger and PDF evidence.
4. Run the planned Agent-versus-Agent, replay/counterfactual/SkillOpt/MuZero
   evidence only after the human-versus-Agent terminal package is sound.
