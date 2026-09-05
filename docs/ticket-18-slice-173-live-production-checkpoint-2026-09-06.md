# Slice 173 — live production checkpoint, not completion

Ticket18: 1/8 slices complete; overall-rules production/evaluation in progress.
Formal first-five Skills: 0/5. Frozen sources unchanged. No Codex subagents.

## Real evidence

69 fresh mechanism cases were frozen before new generation. Their 346
source/kernel/preflight assertions pass; these are not model results.
The production plan retains 288 eligible source rows, 364 spans and 37 reading
packets inside ONE Skill, not 37 standalone Skills.

| Run | Calls | Known tokens | Estimated CNY | Outcome |
| --- | ---: | ---: | ---: | --- |
| rules-v2-e3c0bd7831b447959b45 | 7 | 131884 | 0.150780 | Optional valid review citations rejected |
| rules-v2-3faeae1a35cda1bde24f | 3 | 68534 | 0.091113 | Empty local patch after designer-note omission finding |
| rules-v2-441e39a97d937df7327c | 35 | 624878 | 0.877342 | Cooperatively paused after sixth packet's generator settled |

The third run completed five packet jobs: one semantic pass, four quarantined.
The sixth generator's Provider responses settled before the stop; no process
was killed and no ambiguous attempt was manufactured. The intended stop is
recorded as an administrative lease-fencing receipt, so the runner's
`STEP_LEASE_STALE` failure is not misrepresented as a Provider failure.

Continuation reuses only content/input-bound raw role outputs. Acceptance is
recomputed, while ancestor calls/cost/wall time stay charged. The first
continuation actually reused Tutor, Generator and the first reviewer without
calling them again. Nineteen recovery assertions and eight packet-workflow
groups pass; eight administrative stop assertions prove in-flight accounting
settles before fencing and cached paid responses remain recoverable.

## Still being corrected

- Source citation coverage currently conflates non-rule designer prose with
  missing normative claims. Two semantic reviewers can correctly say no rule
  is missing while the citation counter still demands another claim.
- A complete existing claim may need an additional citation rather than a new
  duplicate claim; the localized editor needs that explicitly bounded route.
- Requiring every Generator to issue a read command is brittle. The host can
  provide the exact complete assigned source in its prompt and record this
  separately from actual tool reads, while Tutor retains real retrieval.
- Whole-topic evaluation context can exceed the fixed budget. Retrieval must
  be question-scope-addressed without exposing expected answers or silently
  truncating required information.

The run was paused before duplicating these known defects through all remaining
packets. Original artifacts and negative findings are preserved. No five-Skill
generation, held-out model result, arena, registry promotion, reflection or
upgrade-chain completion is claimed here.

Cumulative known lower bound: 5,381,623 tokens. Known-usage estimate ¥8.654379
plus historical unknown-call reserve ¥28.961350 = ¥37.615729. This is an
estimate/reservation ledger, not an invoice. Next notification tier ¥100.
