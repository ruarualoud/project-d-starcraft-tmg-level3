# T27 / S272 — exact citation-path decoding, v294

## State and scope

Continue the six matrix-v274 planning groups on the same product code. A fixed
Terran; B generated Terran versus Kerrigan; C versus Zerg Swarm; D versus Daelaam;
E alternate Daybreak; F reversed Kerrigan versus Terran. Final acceptance remains
0/6. T27 5/6, T23 33/36; slices272/248/249/250 remain. No games launched and no
claim that the full map/battle/review objective is complete.

The previous turn was progress: v293 receipt navigation was implemented, tested
and reached real requests. This turn verified all six actual PIDs before acting.

## Root cause

The saved-evidence reader uses JSON Pointer paths such as
`/sourceReceipt/result/rows/0/ownMinusOpponentCumulativeMarkerVp`, but the citation
consumer accepted only dot/bracket paths. The model also emitted relative
slash-separated paths. All three forms identify the same exact sequence of keys.
The consumer treated a whole slash path as one missing field, then asked the
model to correct it. This was a protocol mismatch, not missing strategy evidence.

Actual E request134 had25 such `PATH_NOT_FOUND` findings. All25 selected values
already existed in their original receipts. Examples: round0 cumulative delta0,
round3 delta9, and the boolean that declared control assumptions are not observed
or proven. B/C/D/F also showed slash-path failures; other genuinely wrong fields,
unknown receipt IDs and unsupported whole-object citations are separate issues.

## Changes

- `roster-teach-typed-evidence-v1.mjs`: one exact parser supports existing
  dot/bracket notation, JSON Pointer and unambiguous relative slash paths.
  Pointer escapes are decoded, invalid escapes rejected; own-field lookup remains
  mandatory. Wildcard behavior is retained only in the existing dot/bracket syntax.
- `roster-teach-framework-v1.mjs`: correction diagnostics use the same parser.
  Binding version6 lets the existing saved-result projection rebind old paid raw
  answers without regenerating them. It does not edit the Plan or manufacture facts.
- `roster-teach-synthesis-reader-v1.mjs`: explicit receipt-relative path contract;
  document IDs/absolute archive addresses are still not receipt identities.

No fuzzy matching, numeric coercion, array scalarization, receipt substitution,
strategy selection, source/Rules change, allowance reset or new investigation.
The supplied path and interpretation remain in the original answer. Binding a
value still does not verify the model's interpretation beyond its scenario.

## Focused red/green

`verify-slice272-citation-paths-v294.mjs` uses actual E134 failures and the matching
saved original receipts. RED reproduced25 rejected exact paths. One GREEN after
the shared decoder change verifies all25 values/types and the real synthesis
qualification path. Both absolute and relative slash paths match the prior valid
dotted selection. Original receipt bytes remain unchanged.

Negative checks on the affected path contract: missing leaf stays missing; whole
rows array is not silently treated as a number; invalid Pointer escape is rejected;
an actual unknown receipt remains `RECEIPT_UNRESOLVED`.0 Provider/Native calls.
No old green gate/full suite rerun. The binding-version literal was then advanced
to6 after inspecting its existing saved-raw projection consumer; the passed gate
was not repeated just for that cache-version update.

## Same-session rollout

All v293 actors drained and exited with their latest dispatched replies completed.
Pause markers were recoverably renamed `pause-released-citation-paths-v294`.
Same sessions resumed on common v294: A84827/B84828/C84829/D84830/E84831/F84832.
Logs: `resume-citation-paths-v294-20261017.log` in the original generation folders.
Do not restart merely for a slow observation/preparation step. A208 was prepared
at the maintenance boundary, not proof of a paid dispatch. Counters, originals,
prior generations and unknown fees are preserved.

Next actual check: new reader inputs must show the new decoder feedback and retain
their archive/answers; then the model must resolve remaining genuine citation or
strategic gaps. Decoder tests alone do not prove Plan admission or stable production.

## Harness boundary

- harnessLoopUsed: true
- targetGames: frozen StarCraft TMG / Standard2000
- promptPackRoutes: Teach evidence reader and synthesis qualification
- harnessToolsCalled: exact read-only receipt selection; no Native replay
- uiTraceEvidence: no new UI acceptance; same product workflow
- agentDecisionEvidence: E134 paid paths compared with actual source values
- memoryTraceEvidence: paid answers, receipts, archive, fees and sessions preserved
- trainingTraceCandidates: none; trainingTruth=false; no Skill/rule promotion
- rollbackOrDemotionRules: cross-receipt replacement, changed scalar, invented field, unknown promoted to proof
- userVisibleChecks: equivalent path encodings no longer demand another model repair
