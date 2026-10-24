import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { reconcileRosterFinalPlanReviewV1, verifyRosterFinalPlanReviewAdjudicationV1 }
  from "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { rosterSelectionUnitRulesV1 } from "../packages/roster-strategist/roster-selection-justification-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg("input"), "utf8"));
const before = JSON.stringify(raw);
const plan = JSON.parse(raw.planSerialized);
const paid = raw.publicOutputs.findLast(o => o.roundKind === "final_review_reconciliation").sanitizedOutput;
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg("fixture") });
let report, calls = 0;
try {
  assert.equal(paid.judgments.find(j => j.findingIndex === 23).disposition, "keep_high");
  assert.match(paid.judgments.find(j => j.findingIndex === 23).publicReason, /correct scoring assertion/u);
  const qualified = await reconcileRosterFinalPlanReviewV1({ plan, review: raw.planReview.review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    armyAudit: raw.working.verdict.audit,
    deliberation: { deliberate: async request => {
      calls += 1;
      const fields = request.responseFormat.schema.properties.judgments.items.properties;
      assert("claimAssessment" in fields && !("disposition" in fields),
        "model must assess factual support, not confuse severity with claim quality");
      const witnesses = new Map([[23, "scoreRoute.routeText"], [29, "scoreRoute.routeText"],
        [82, "componentPurposes.player1-tactical-5"]]);
      return { output: { ...paid, judgments: paid.judgments.map(j => {
        const { disposition, ...rest } = j;
        const claimPath = witnesses.get(j.findingIndex);
        const quote = claimPath === "scoreRoute.routeText" ? plan.scoreRoute.routeText
          : plan.componentPurposes.find(p => `componentPurposes.${p.instanceId}` === claimPath)?.publicPurposeText;
        return { ...rest, claimAssessment: j.findingIndex === 48 ? "source_attribution_unsubstantiated"
          : witnesses.has(j.findingIndex) ? "source_supported" : "conditional_or_uncertain",
          counterEvidence: claimPath ? [{ claimPath, claimQuote: quote }] : j.counterEvidence };
      }) }, receipt: { localFixture: true, paidProviderCall: false } };
    } } });
  assert.equal(calls, 1, "old completed qualification must not skip the corrected assessment contract");
  assert.equal(verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: qualified }).unresolvedHighCount, 1);
  assert(qualified.reviewAdjudication.decisions.some(d => d.findingIndex === 23));
  assert(!qualified.reviewAdjudication.decisions.some(d => d.findingIndex === 48));
  assert.deepEqual(qualified.findings, raw.planReview.review.findings);
  assert.equal(JSON.stringify(raw), before);
  report = { ok: true, actualWrongSeverityReproduced: true, assessmentNotSeverityModelOwned: true,
    supportedFactsDoNotTriggerRewrites: true, assertedUnsupportedSourceAttributionRemainsHigh: true,
    previousQualificationPreserved: true, realProviderCalls: 0, originalWrites: 0,
    semanticTruthCertified: false };
  console.log("REVIEW_ASSESSMENT_SEVERITY_OK");
} catch (error) {
  report = { ok: false, failure: error.message, calls, realProviderCalls: 0, originalWrites: 0 };
  throw error;
} finally { await writeFile(arg("report"), JSON.stringify(report, null, 2), { mode: 0o600 }); }
