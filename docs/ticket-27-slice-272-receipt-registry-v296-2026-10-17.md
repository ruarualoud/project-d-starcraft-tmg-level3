# T27 / S272 — original receipts versus derived references, v296

## Scope / progress

The six matrix-v274 planning groups remain active on one product implementation.
Final admission0/6; T27 5/6, T23 33/36, remaining272/248/249/250. No games or
claim that the full map/battle/review objective is complete. This turn made three
source-level repairs: path decoding(v294), non-numeric structure references(v295),
and this receipt-registry fix. No unrelated gates, subagents, installs, deletion,
data refresh, commit or push.

## Actual overwrite

D101's correction feedback listed only `reference` and `receiptHash` for several
known original receipts. The registry recursively registered every object carrying
a receiptHash, with last-write-wins semantics. Prior answers' citationBindings,
typed citations and ledger evidenceScopes therefore replaced the actual source
body with a derived reference. This also let a reference-only record masquerade
as a source for its own `reference` field.

The actual session contains three relevant source families:

- f24e7c...: Native mission-scoring authority, resultStatus `derivable`.
- 26c1fe...: original port rejection, status `illegal`.
- 421bd3...: old Teach comparison evidence, status `advisory`, retained in
  `draftTeachSnapshots[0].state.evidence` but absent from the latest input.

The first two originals are present in the latest context. The third is a separate
retention/lookup gap, not permission to fabricate a body from a hash.

## Fix

`qualifyRosterTeachFrameworkSynthesisV1` now excludes the derived citation/ledger
collections, direct typed citation records, exact reference-only pairs and
navigation-only directories from its source-body registry. The original records
remain untouched. Existing evidence-type and result-status checks remain; no
fuzzy path selection, hash re-signing, semantic inference or Native replay.
Binding version8 refreshes saved raw answers through the existing derived-view
path. The reader's current contract explains that directories/previous bindings
point to originals and are not original receipts themselves.

## Focused verification, including the corrected assumption

`verify-slice272-receipt-registry-v296.mjs`:

1. RED reproduced3 failed source lookups in the actual latest D context.
2. First post-fix run restored2 but still failed the assumption that all3 original
   bodies were present. A bounded source inspection proved421bd3's body is only
   in the older snapshot. This is an input-retention gap; do not bypass it.
3. Corrected that fixture expectation, then ran the still-unpassed gate once:
   GREEN. Current originals return `derivable` and `illegal`; the orphan remains
   unknown until its actual retained original is supplied. Supplying that exact
   original restores `advisory`. Four reference-only forms cannot self-authenticate,
   and reference order cannot override a source body.0 Provider/Native calls.

No previously passed test was repeated. The extra execution was for the concrete
incorrect fixture premise, not a retry of unchanged production code hoping to pass.

## Remaining retention task

Restore an addressable original-receipt read path for references carried across
Teach/Plan snapshots. Use exact persisted originals with their original candidate,
source and scene scope; do not copy a prior strategy as fact, broadly import an
unrelated room, auto-change a claim or rerun a successful Native query. The actual
421bd3... case in D is the next regression target. The current decoder correctly
keeps it unknown when only reference metadata is supplied.

## Current real model state

Intermediate zero citation errors is not stable acceptance. E136 reached0 malformed
citations, but its subsequent answer introduced5 wrong `sourceReceipt.result...`
paths (the original uses `queryReceipt`, not `result`). These require reading the
same original, not silent field substitution. Four E strategic/factual questions
also remain open as described in the v295 report. D's nonexistent field names are
separate from the now-fixed source-body overwrite. No claim of complete convergence.

## Common-code continuation / accounting

All six v295 actors drained, latest dispatched calls completed and PIDs exited.
Markers were recoverably renamed `pause-released-receipt-registry-v296`.
Same-session v296 continuation: A4363/B4364/C4365/D4366/E4367/F4368.
Logs: `resume-receipt-registry-v296-20261017.log` in the original generation folders.
Do not restart solely for a slow restore/observation; inspect the actual handle.

Known current-generation usage:747 calls,112227911 input units,2364983 output units.
Since the v293 boundary this is+31 calls,+910516 input,+143692 output. All local
bug gates used0 model calls. Original ledgers/unknown fees/previous generations
remain; no reset and no claim of an exact full invoice.

## Harness / diff

- harnessLoopUsed: true
- targetGames: frozen StarCraft TMG / Standard2000 / six planning groups
- promptPackRoutes: saved-evidence synthesis and current binding projection
- harnessToolsCalled: read-only original/reference registry; no Native execution
- uiTraceEvidence: no new UI claim; product entry unchanged
- agentDecisionEvidence: D101 feedback versus actual source locations; E136/137 distinction
- memoryTraceEvidence: all paid answers/originals/counters/fees retained
- trainingTraceCandidates: none; trainingTruth=false; no Skill/rule promotion
- rollbackOrDemotionRules: derived reference promoted to source, orphan auto-filled, scene scope lost
- userVisibleChecks: original source fields survive historical answer/reference indexing

This fix changes the framework registry and reader instruction, adds the one concrete
regression script, and updates this report/navigation/TASKS/durable memory. The
previous v294/v295 code and focused evidence remain; no broad validation was run.
