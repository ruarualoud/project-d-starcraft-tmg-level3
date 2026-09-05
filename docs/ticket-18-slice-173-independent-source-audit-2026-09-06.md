# Slice 173: independent source audit after citation repair

Ticket 18 remains 1/8; Slice 173 is not complete; project 16/22; formal Skills
0/5. The 37 reading packets still form one overall-rules Skill.

## Actual completed run

`rules-v3-1dc2feb6d351a65c83be` completed five packet candidates, with the two
configured source reviewers marking all five passed. This is a recorded model
review result, **not final content acceptance**. Report:
`1f831719db6ad13c2abfcb9a72e9c7a9f80f0df7bb219838d326431a5c6c2aae`.

The continuation reused completed 001/002 work without new Provider calls and
repaired 003's exact missing `p2` address without any new editor/diagnoser call.
It added six real verification calls: 754,319 tokens, estimated ¥0.106761.
Across the parent and continuation: 23 calls, 2,904,067 tokens, ¥0.637760.
Global known lower bound: 8,285,690 tokens. Known estimate plus historical
unknown-call reserve: ¥38.253489, not an invoice. No active paid run remains.

## Why production is still held

Independent inspection of the saved statements against their exact frozen
sources found five defects missed by the two model reviewers:

| Packet / claim | Finding | Required correction |
| --- | --- | --- |
| 002 / 8 | Full Cover exemption expanded into Flying models always being visible | Preserve Direct Cover/Dead Zone checks; remove the universal visibility claim |
| 002 / 12 | Invented precedence favoring the summary table over conflicting prose | Preserve the genuine any-part/Wholly-Within discrepancy without inventing authority; defer the unresolved edge case to bound Rules/referee handling |
| 003 / 4 | Access Point movement/Coherency permission expanded into LoS permission | Separate movement, Coherency and LoS; use the actual terrain/footprint/cover rules |
| 003 / 6 | Omitted where initial and additional Army Slots come from | Include Faction Card initial slots and Vespene Gas Tactical Card purchases |
| 005 / 2 | DISPLACEMENT movement list missing; displaced object/operator ambiguous | Enumerate the seven movement types and distinguish the overlapping Token/model from the Leading Model |

These five findings have exact candidate/claim-text/context/source hashes,
source quotes and reasons. They are stored in the shared SQLite journal as
`external-finding.*`, with a portable report at
`build/ticket-18-production-v3/external-source-audit.json`:
`bd27384586081782df6579b60bfc071cd0a4787cdf17377a674dab5dfa8029e9`.
Old positive model reviews remain immutable. Current independent audit status
is **three packets held by five findings**, not “five accepted packets.”

## Implemented correction seam

- `external-findings.mjs` binds external review/trace failures to the exact
  offending text. A new candidate hash or metadata-only change cannot bypass
  the same known failed claim.
- `repair-gate.mjs` re-reads the real completed job artifacts, source inventory,
  final reviews and issue journal, and rejects known external claim failures.
- `external-repair.mjs` submits the complete source context plus explicit
  findings to a narrowly scoped editor. Only flagged existing claims can
  change; empty/no-progress edits stop rather than trigger blind resampling.
  New source reviews are mandatory. The receipt explicitly keeps independent
  counterexample evaluation and formal Skill acceptance false until measured.
- The full 32-packet continuation/105-question entrypoint is prepared but has
  **not been launched**. Its repair gate rejects these unresolved old results.

Ten focused checks pass, including actual persisted blockers, metadata-bypass
rejection, source-gate refusal, and an injected-model correction through the
actual runtime with unaffected claims preserved and fresh review required.
The injected corrected text is a test fixture, **not the actual repaired
production candidate**. The three affected packets still need real targeted
correction and independent counterexample assessment before the next phase.

## Next work, in order

1. Correct the five recorded defects in the three actual packets, preserving
   unchanged packets and their evidence.
2. Calibrate/re-test scope transfer, source precedence, complete enumerations
   and cross-claim contradiction with positive/negative source-grounded cases.
3. Recheck the revised packets and the persisted external failure history.
4. Produce the remaining 32 packets, compile the lossless overall Skill and
   run the real 105-case assessment; then factions, both directed matchups,
   actual Room Harness/strategy and reflection/versioned-upgrade gates.

This is ctx2skill/offline Skill evolution plus Harness observability:
source evidence defeats model consensus, known failures become bounded edits
and regressions, and no generated material changes Rules authority. No new
official data, subagents, live publication, memory promotion or training truth.
