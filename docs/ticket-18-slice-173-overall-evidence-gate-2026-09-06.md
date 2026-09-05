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

Inspection and admission are now explicit separate purposes. Default `qualified_dependency` rejects wrong scores and known unchanged external claim failures. `diagnostic_audit` may inspect a terminal, fully assembled candidate whose only terminal failure is the recorded completed examination; it still recomputes every score and verifies every raw receipt, but reports `diagnosticOnly=true` and cannot qualify dependent generation. This allows collecting the extra eight failures before beginning corrections instead of serially discovering them after each earlier fix. Incomplete production, bad input/receipt provenance and payment failures remain blocked in either mode. Even a passing base examination is not, by itself, the complete dependent-generation/publication gate.

`scripts/run-ticket-18-supplemental-source-audit-v1.mjs` composes that check with the separately frozen eight known-risk source controls. It has preflight/live modes, exact parent/candidate/code/readiness bindings, complete-Skill reader input, the existing secure Keychain/Provider worker, usage-first SQLite ledger, ¥100 notification boundary, payment-required stop, bounded 6-call/3M-token/¥5/10-minute budget, and saved actual results. Valid wrong answers are retained rather than resampled. The new job budget does not reset or discard any earlier production cost.

It is an independent evaluation call, not another DSH production retry. The original 14 + 105 cases remain mandatory. These eight additional cases are known-risk regressions, not falsely labelled fresh held-out tests.

## Verified so far

`verify-ticket-18-overall-evidence-gate-v3.mjs`: 12 engineering check groups, using the real frozen 69 + 36 rule-case oracles and 14 source controls, SQLite step fixtures and explicitly injected Provider receipts. Positive 105/105 + 14/14, a real wrong fixture answer 68/69, missing/altered receipts, model/input drift, group omission, forged scores and diagnostic-versus-admission handling are distinguished. No external requests or actual Skill-quality claim. Final readiness `e6e4eb086d2201c7442f4fe5f8a5eb574bfedb7d9d61ddcd1a0d15d5da0604e2`. Existing external-finding regressions also pass20 checks.

The new CLI passes syntax checking. Its preflight against the currently running real production correctly stops with `SUPPLEMENTAL_PARENT_OUTPUT_MISSING`, before credential ingress or billable calls: there is no complete overall file or exam report yet. Positive actual 37-packet admission and actual supplementary evaluation remain to be performed when production finishes.

At this checkpoint: actual production **29/37, eight remaining**, 030 in source review. Ticket18 remains **1/8**, project **16/22**, formal five-Skill acceptance **0/5**. No official source refresh or Codex subagent.

## Actual completion and diagnostic audit

The existing production process subsequently completed all37 packets and assembled522 claims without another code intervention. Packet031 automatically repaired two unknown citation addresses with all original text preserved, then passed actual source reviews;032–037 also passed. Total candidate hash `b68272f9678e0bbacccc7a9e5266dd438e862b9b967eba9ac1c65c4bddb667cc`.

Actual complete-Skill source regression passed14/14, but the rule examination passed99/105 (fresh64/69, legacy35/36), so production correctly ended with `V3_OVERALL_EVALUATION_REQUIRES_TARGETED_REPAIR`. The report is `ee7337e7b6d4858e3abbd67ee73d14c6d891780059901a0e21417e319038204e`. The new read-only gate successfully reconstructed all37 actual packets and rescored all119 actual answers with their original Provider receipts in diagnostic mode, without treating those wrong answers as a receipt/transport failure.

The eight additional controls then actually ran as `overall-audit-5c101d0a8a2800d15653`, recipe `5c101d0a8a2800d15653e33f4dac444343912458cb3878af042bf42109ba0eef`. Result5/8, with original negative answers retained and no resampling; report `a6401688dd31e5b1b7f7f8b32e6dba73565966b8f084d754e2febc6432fb2a29`. One additional call used74,960 tokens / estimated¥0.015944. Combined global known Provider usage is29,635,331 tokens / estimated cost plus historical unknown reserve¥41.778819, not an invoice. There are no running steps, ambiguous intents or payment-required outcomes after both runs ended.

Detailed failures and next diagnostic experiment are recorded in `ticket-18-slice-173-complete-skill-diagnosis-2026-09-06.md`. Source production is37/37, but Slice173 is not closed and formal five-Skill acceptance remains0/5.
