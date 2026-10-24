# T27 / S272 — Teach evidence handoff, v318

## Result and limits

Seven scoped cases completed before the disk-cleanup interruption; their saved
reports were inspected on 2026-10-17 without rerunning any command. The last
consumer case is **passed**, not an assumed timeout or an unfinished job.
Together with v314–v317, the count is **49 scoped cases**.

These checks used actual saved source state and real product modules with an
injected model seam. They made **0 real Provider calls and 0 native room actions**.
They do not prove real-model convergence, strategic superiority, final Plan
admission or complete matches. Accepted Plans remain **0/6**, complete experiments
**0/12**, T27 **5/6**, T23 **33/36**, remaining **S272/S248/S249/S250**.
The six production arms remain paused; their state and costs were not rewritten.

## Findings and implemented changes

1. The hypothesis that ordinary later investigation receipts had lost their
   question ownership was disproved. The actual eight question groups already
   retained the relevant later receipts. No speculative fix was made to that path.
2. A real recovery handoff defect was reproduced: recovery results reached the
   synthesis archive, but the corresponding recovery request was absent from the
   question's `executedQueries`. The latest request can change a phase, scene or
   predicate; interpreting its result using only the original failed request is
   unsafe. The framework now forwards `queryRecovery.operations`, and the fact
   probe groups original and recovery requests together with their results.
3. An old receipt without explicit question ownership can now be associated only
   through a unique exact executed-query identity. An ambiguous identity, unknown
   identity or explicit invalid owner is not silently guessed or overwritten.
   Both old failure and later success remain; no status or strategic answer is
   promoted by this association.

Production files changed in v318:

- `packages/roster-strategist/roster-teach-fact-probe-v1.mjs`
- `packages/roster-strategist/roster-teach-framework-v1.mjs`

Focused debug scripts:

- `scripts/debug-slice272-teach-plan-handoff-v318.mjs`
- `scripts/debug-slice272-question-evidence-join-v318.mjs`
- `scripts/debug-slice272-recovery-synthesis-consumer-v318.mjs`

## Step boundaries actually checked

The handoff starts with A's retained **Plan11 Teach** and a distinct **Plan14
revision target**. Eight questions, eight original answers and their public
reasons/tradeoffs/switch conditions reach the revision input. Four unresolved
answers remain unresolved. A saved-receipt read returns the requested original
value. A typed edit is atomically committed in the isolated copy; army and
arrival schedule stay unchanged. The subsequent real review input receives the
new text and still requires semantic review. This scripted text edit is **not**
evidence that the strategy became better, nor that Plan11 Teach accepts Plan14.

The downstream recovery-consumer case uses the actual framework/archive/reader:
its first model seam requests the saved recovery query ID, request kind and
completion flag from `executedQueries`; the next model seam receives those exact
fields. Four checkpoints were written in the isolated fixture; no strategy answer
was replaced and no native action was executed.

## Saved evidence

Every directory below is under
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`; the retained
`report.json` is the result, not its disposable `drafts/` copy.

| Case | Saved report directory | Result |
| --- | --- | --- |
| Actual Teach → typed Plan edit → review consumer | `teach-plan-handoff-v318-Y7WYrP` | Passed |
| Changed map rejected before model/mutation | `teach-plan-handoff-v318-IxPR1F` | Passed |
| Wrong source Plan rejected before model/mutation | `teach-plan-handoff-v318-SQo4T4` | Passed |
| Actual ordinary receipt grouping; hypothesis disproved | `question-evidence-v318-FqJMTI` | Passed |
| Exact legacy identity and ambiguous/invalid identity handling | `question-evidence-v318-tttVCa` | Passed |
| Seven actual recovery requests/results retain their ownership and status | `question-evidence-v318-cBANx8` | Passed |
| Actual recovery request readable in next synthesis input | `recovery-consumer-v318-1utJo9` | Passed |

Concrete failing reproductions are retained as reports in
`question-evidence-v318-hyiFLL` (legacy identity) and
`question-evidence-v318-1uoBs5` (missing recovery request). The seven recovery
rows are observations within one case, not seven extra test passes.

## Still incomplete

- Four original A answers concern branch/switch evidence, opportunity cost and
  Supply/CP, capability/arrival alignment, and post-loss capability/control.
- A later successful scoped receipt does not establish every prerequisite or
  every possible branch. The original unresolved labels cannot be erased by an
  engineering join or by copying another scene's result.
- Actual real-model handling of the repaired evidence, full fresh generation,
  convergence and strategic comparison remain to be demonstrated. No final
  workflow visualization is published before that repaired-product acceptance.

## Cleanup boundary

The user requested disk relief before further development. The exact pending
33-file cleanup list is `docs/disk-cleanup-candidates-2026-10-17-v2.json`.
The user subsequently explicitly approved it; all33 exact disposable files were
removed. Actual free space increased from6.297GiB to7.413GiB. Reports, scripts,
production A–F state, paid records and the v315 fixture dependency were excluded.
See `docs/disk-cleanup-result-2026-10-17-v2.json`; retained reports remain the
record of these completed checks. This cleanup did not restart production.
