# Ticket18 / Slice173 — complete-Skill evidence gate

This adds the read-only admission check needed between overall production and supplementary evaluation/faction generation. It does not change or restart the active `overall-v3-cdf99e843cad9297a084` process.

## Implemented

`packages/skill-production-v3/overall-evidence-gate.mjs`:

- requires a terminal, correctly bound, complete production report and no running steps, ambiguous intents or payment-required outcome;
- reads the actual 37 stored packet artifacts, revalidates their complete source/review/journal contracts and losslessly reassembles the candidate; its hash must match the report and file;
- checks all 15 examination groups against the current frozen drills and exact full-Skill input hashes;
- resolves the recorded Provider answers, checks receipt hash, model-profile binding, single-attempt policy and output fingerprint;
- recomputes all 105 rule answers and 14 source answers against their host oracles; merely editing `passed`, summary counts, individual scores or a saved answer cannot pass;
- keeps supplemental source audit, factions/matchups, real arena and reflection/regression/rollback open. This evidence never publishes, claims a human review, mutates Rules or creates training truth.

`scripts/run-ticket-18-supplemental-source-audit-v1.mjs` composes that check with the separately frozen eight known-risk source controls. It has preflight/live modes, exact parent/candidate/code/readiness bindings, complete-Skill reader input, the existing secure Keychain/Provider worker, usage-first SQLite ledger, ¥100 notification boundary, payment-required stop, bounded 6-call/3M-token/¥5/10-minute budget, and saved actual results. Valid wrong answers are retained rather than resampled. The new job budget does not reset or discard any earlier production cost.

It is an independent evaluation call, not another DSH production retry. The original 14 + 105 cases remain mandatory. These eight additional cases are known-risk regressions, not falsely labelled fresh held-out tests.

## Verified so far

`verify-ticket-18-overall-evidence-gate-v3.mjs`: 12 engineering checks, using the real frozen 69 + 36 rule-case oracles and 14 source controls, SQLite step fixtures and explicitly injected Provider receipts. Positive 105/105 + 14/14, a real wrong fixture answer 68/69, missing/altered receipts, model/input drift, group omission and forged scores are distinguished. No external requests or actual Skill-quality claim. Readiness `e93dcd4e6d52e59884750b17177f37a331b544fec568a8821dfd36d5f15b783b`.

The new CLI passes syntax checking. Its preflight against the currently running real production correctly stops with `SUPPLEMENTAL_PARENT_OUTPUT_MISSING`, before credential ingress or billable calls: there is no complete overall file or exam report yet. Positive actual 37-packet admission and actual supplementary evaluation remain to be performed when production finishes.

At this checkpoint: actual production **29/37, eight remaining**, 030 in source review. Ticket18 remains **1/8**, project **16/22**, formal five-Skill acceptance **0/5**. No official source refresh or Codex subagent.
