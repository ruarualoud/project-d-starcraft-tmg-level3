# S272 v300 — multi-segment readonly history recovery (prepared, not loaded)

T27 5/6; T23 33/36; remaining S272/S248/S249/S250 = 4.
Final planning admission0/6; battle experiments0/12.

## Loaded versus on disk

**All six live processes still run v299**, with v298 transparent reads:
A48366/B48368/C48370/D48372/E48374/F48376.
No pause markers were added for this follow-up. Do not report v300 as live.

On disk, v300 is ready after its focused gate. Load it for all six at the next
required common safe boundary; do not interrupt a useful batch just to update
the cumulative reader record. On a later restart, preserve settled dispatches,
all sessions and bills and ensure the six use the same on-disk version.

## Actual residual defect and repair

The v299 live observer confirmed F restored26+2 steps. C had a different shape:
archive A→B→A. The latest B segment had already been merged, so the v299
last-history-only logic skipped the earlier A segment. Current C retained all
eight latest answers, and older work remained in immutable history, but its
active manifest/cumulative step record was incomplete.

The shared reconciler now visits eligible history segments newest-first,
recognizes already-included ancestors, and assembles missing segments in
chronological order. It keys segments by their position/identity in the
append-only history, not just a display hash that can recur. v299 continuation
records are recognized so their already-recovered work is not counted twice.

Same frozen-source readonly guard, explicit review boundary, question/version
compatibility, current-answer precedence, maximum no-progress counter, current
citation rebinding and draft-only status remain. No provider allowance, billing
counter or factual conclusion is reset. Historical objects are unchanged.

## Focused verification

`node scripts/verify-slice272-multi-archive-reader-v300.mjs <C-dir>`

- Actual C RED:3 active steps rather than the recoverable30 at that observation.
- One GREEN after repair:27 earlier steps plus4 current steps (the live process
  progressed between observations), all8 latest answers preserved, old history
  unchanged, repeated reconciliation does not duplicate work.
- Provider0, Native0. No old green gate/full suite repeated. The gate works on
  an isolated in-memory copy; it does not rewrite C's production session.

## Live v299 evidence after transparent reads

| Group / request | Reference errors | Unresolved answers |
|---|---:|---:|
| A223 | 0 | 2 |
| B127 | 0 | 1 |
| C115 | 0 | 1 |
| D124 | 0 | 3 |
| E165 | 1 | 4 |
| F116 | 0 | 5 |

These are real request/reader observations, not final admission. C improved
from five unresolved answers to one; F now exposes five instead of three,
which may reflect withdrawal of unsupported claims and is not automatically a
strategy regression. Inspect its actual reasons before judging. All six
remain on the same product paths and frozen experiment configuration.

The observed C/D/E/F delivered question/page structures contained zero
sameContentAsEarlierObject / same_prompt_evidence_reference_v1 stubs. E161 and
D121 had real dispatch progress, not only generated local prompts.

## Next action

1. Keep the verified-live six running; watch for actual terminal failures or
   synthesis completion rather than inferring failure from observation latency.
2. Investigate material unknowns and the handoff from readonly synthesis back
   to facts/Plan revision. E's four concrete scope/capability candidates are in
   the v299 report. Do not re-run successful Native evidence or invent outcomes.
3. Apply v300 on the next necessary unified safe resume and observe C continuity.
4. D still needs legal2000, and all groups need final Plan/source acceptance.

Harness loop used; routed role:teach_framework_synthesis_step; evidence is actual
C history + six live requests; no UI acceptance or training promotion claimed.
Demote if paid work duplicates, new inquiries inherit old answers, or drafts
become accepted facts without current review. No subagents/commit/push/deletion.
