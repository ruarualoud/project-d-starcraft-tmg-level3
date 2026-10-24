# T27 / S272 — citation repair inside the evidence reader v289

## Concrete failure

A saved eight paid answers after20 page reads, but used archive document paths
(`plan:/...`, `context:/...`) as native receipt references. The shared qualifier
does not resolve these paths. The reader gave no feedback before its next
submission; merely saving eight answers therefore did not establish usability.

## Shared product change

- Reuse the existing source-owned citation qualifier inside the synthesis reader.
  Show exact unknown references and invalid paths after each answer, and when
  resuming existing partial answers. Native bodies, paid answers and strategy
  arguments remain unchanged.
- Keep correction inside `read -> answer -> finish`. The model selects original
  evidence and edits its answers; the host does not invent replacement references,
  decide the strategy, or re-execute investigation queries.
- A malformed citation cannot finish silently. A genuinely unresolved original
  receipt is a separate factual unknown, not a citation-format error. It remains
  subject to existing final Plan admission; this does not admit an unresolved Plan.
- A previously finished reader with malformed citations may reopen this editing
  stage only, retaining its paid finish, history and counters. No allowance reset.
- Combine with v288 ordinary continuation: preserve original evidence indexing
  and skip completed Native preparation. No frozen source or Rules change.

## Focused verification

`verify-slice272-reader-citation-repair-v289.mjs` used actual A answers through the
ordinary shared-framework entry. RED: no corrective feedback was delivered.
One GREEN after the change:57 malformed citation/binding entries surfaced across
the eight answers, paid arguments unchanged, malformed finish rejected, explicit
unknown facts not conflated with malformed references.0 Provider/Native calls.
Elapsed64.141s under concurrent actors. This is not57 Rules bugs, a strategy
acceptance result, or a production latency benchmark. Old passed gates not rerun.

## Operational state

All six old processes exited with saved paused status. B–F had no pending selector
decision. Maintenance markers were moved recoverably to
`pause-released-reader-citations-v289`; no saved reply or ledger was deleted.
Same-session product Run resumed with A6898/B6899/C6900/D6901/E6902/F6903. A/B
retain generation264; C–F retain generation274. Each directory contains
`resume-reader-citations-v289-20261017.log`. Launch is not proof of a paid request
or completed repair: inspect bounded progress and the next real answer.

Known cumulative usage at this checkpoint:622 calls,107,749,374 input units and
1,866,004 output units. This is historical cumulative usage, not this change's
cost; earlier unknown fees remain in their original ledger.

Final acceptance0/6; T27 5/6, T23 33/36; remaining272/248/249/250=4. No games,
manual roster/Plan changes, source refresh, cost resets, commits or subagents.

## Harness observation

- harnessLoopUsed: true
- targetGames: StarCraft TMG
- promptPackRoutes: shared Teach synthesis reader, fixed/iterative Plan generation
- harnessToolsCalled: original saved evidence, same citation qualifier
- uiTraceEvidence: none; no UI acceptance claimed
- agentDecisionEvidence: original A paid eight-answer batch
- memoryTraceEvidence: read/answer history and original receipts preserved
- trainingTraceCandidates: none promoted
- rollbackOrDemotionRules: original mutation, evidence replacement or false certainty
- userVisibleChecks: model can repair the cited field without restarting its investigation
