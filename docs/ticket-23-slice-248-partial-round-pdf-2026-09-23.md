# T23 / S248 — r1–47 partial screenshot report

## Delivered scope

`output/pdf/slice248-20260922172710914/partial-r001-r047.pdf`:
98 landscape A4 pages,47 continuous accepted actions with actual board images,
public plans/reasons, plan-continuity and prediction-calibration records when
present. Includes Round1 and Round2 startup, **not a finished match**, full
product acceptance, high-strategy certification or Skill-promotion approval.
Public model reasons may be mistaken; they are retained without being promoted
to Rules truth. No hidden chain of thought is collected or exported.

The companion JSON is a whitelisted evidence snapshot, not the private Room
database. HTML is retained for reproducibility. Neither credentials nor private
codec keys are printed or exported. This fixture uses fixed Standard2000 armies
without an Agent-generated roster plan and an explicitly abstract terrain layer.
Earlier inherited screenshots may show the decorative background; that does
not establish classic-map geometry. Historical missing portraits are retained
as observed, not silently replaced by later screenshots with loaded portraits.

## Exact lineage and dice

Current run:`20260922172710914`. Its seven inherited actions trace through
`20260922133120597`; that source's first five screenshots trace further to
`20260922115126519`. The exporter follows recorded fork links, binds each source
and branch receipt, and labels source runs. It does not infer an image from
matching revision numbers alone or report old paid calls as newly executed.

Every included action has its current branch authoritative receipt and recorded
Replay success. The two chance receipts are r45 (6,2 /2,6 =8:8 initiative tie)
and r46 (4,1 /5,2 =5:7, Zerg initiative). r47 opens Round2 startup. No other
covered action has dice outcomes to invent. No action is reexecuted for export.

## Implementation and focused verification

New `scripts/generate-ticket-23-slice-248-round-evidence-v1.mjs` is additive.
The existing final H-A reporter and its finished-match acceptance gate are
unchanged. New CLI:

```sh
node scripts/generate-ticket-23-slice-248-round-evidence-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914 \
  --through-revision=47
```

The first execution exposed missing inherited r1 screenshots. Corrected only
the source-image lineage resolver, then one successful execution checked all
47 receipts/images and zero overflowing screenshot containers. It reads the
existing SQLite journal read-only, decrypting locally in memory. No separate
new test suite, old product gate, build or paid verification was run.

ReportLab was unavailable; the project already uses Chromium printing, so the
exporter reused that route without installing dependencies. Poppler rendered
all98 pages; five contact sheets were inspected in full, with readable-size
checks of the cover, a long public-decision page and the initiative screenshot.
No missing report images, clipped text, overlapping page furniture or blank
pages observed. Long public records flow across pages; short continuation pages
are intentional and are not truncated for page-count reduction. Text extraction
also confirms both actual dice sequences and the last revision47 page.

Report generation: **0Provider calls /0Room mutations /0paid units /¥0**.
The live76208 match continued independently through r84 during artifact work;
the PDF's cutoff remains explicitly47, not the current revision.

## Harness handoff

- harnessLoopUsed:true; targetGames:StarCraft TMG.
- promptPackRoutes:selfplay_agent_prompt (retained evidence, no new prompt).
- harnessToolsCalled:read-only Room journal, fork lineage and Web image export.
- uiTraceEvidence:47actual per-action board screenshots with source labels.
- agentDecisionEvidence:public plan, reason, risk and recorded facts.
- memoryTraceEvidence:retained plan continuity and prediction calibration.
- trainingTraceCandidates:raw; trainingTruth:false; no promotion.
- rollbackOrDemotionRules:missing receipt/image or invalid lineage prevents
  report creation; bad strategic reasoning is labelled evidence, not rewritten.
- userVisibleChecks:98rendered pages inspected; no complete-match claim.

Remaining T23 slices:248finish the live full match;249review and bounded
counterfactual/Skill experiments;250synthesize acceptance and evidence. T23
remains33/36. K3S271's independent three-cycle blocker remains stopped and
unintegrated; this partial report does not close it.
