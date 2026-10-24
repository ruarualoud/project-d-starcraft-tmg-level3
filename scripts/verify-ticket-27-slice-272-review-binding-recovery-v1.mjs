import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { reconcileRosterFinalPlanReviewV1, verifyRosterFinalPlanReviewAdjudicationV1 }
  from "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { rosterSelectionUnitRulesV1 } from "../packages/roster-strategist/roster-selection-justification-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg("teach"), "utf8"));
const before = JSON.stringify(raw);
const plan = JSON.parse(raw.planSerialized);
const paid = raw.publicOutputs.findLast(o => o.roundKind === "final_review_reconciliation").sanitizedOutput;
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg("fixture") });
const requests = [];
let report;
try {
  assert.equal(paid.judgments.find(j => j.findingIndex === 73).counterEvidence[0].claimQuote,
    raw.planReview.review.findings[73].claimQuote, "reproduce the actual paid self-counterquote");
  const qualified = await reconcileRosterFinalPlanReviewV1({ plan, review: raw.planReview.review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    armyAudit: raw.working.verdict.audit,
    deliberation: { deliberate: async request => {
      requests.push(request);
      const output = structuredClone(paid);
      if (requests.length > 1) {
        const j = output.judgments.find(x => x.findingIndex === 73);
        j.counterEvidence = [{ claimPath: "scoreRoute.routeText", claimQuote: plan.scoreRoute.routeText }];
      }
      return { output, receipt: { localFixture: true, paidProviderCall: false } };
    } } });
  assert.equal(requests.length, 2, "the consumer must request only bounded binding correction");
  const feedback = requests[1].promptNodes.find(n => n.kind === "reconciliation-binding-feedback");
  assert(feedback.issues.some(i => i.code === "COUNTERQUOTE_IS_ALLEGED_QUOTE" && i.findingIndex === 73));
  const targetNode = requests[0].promptNodes.find(n => n.kind === "literal-claims-to-qualify");
  assert(targetNode.targets.every(t => !("publicReason" in t) && !("finding" in t)),
    "old reviewer conclusions must not anchor the independent qualification");
  const facts = requests[0].promptNodes.find(n => n.kind === "verified-structured-facts");
  assert.equal(facts.arithmetic.missionMarkerGroups.find(g =>
    g.scoringActorId === "player2" && g.affinityPlayerId === "player2").totalVp, 2);
  assert.equal(facts.arithmetic.armySlots.finalCapacity.Elite, 6);
  assert.equal(facts.arithmetic.armySlots.usedSlots.Elite, 6);
  assert.equal(facts.arithmetic.armySlots.finalCapacity.Hero, 1);
  assert.equal(verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: qualified }).unresolvedHighCount, 6);
  assert.deepEqual(qualified.findings, raw.planReview.review.findings);
  assert.equal(JSON.stringify(raw), before);
  report = { ok: true, actualPaidBindingFailureReproduced: true,
    boundedFieldCorrection: true, reviewerAnchoringRemoved: true,
    sourceArithmeticPresented: true, paidFindingsPreserved: true,
    realProviderCalls: 0, originalWrites: 0, semanticTruthCertified: false };
  console.log("REVIEW_BINDING_AUTO_RECOVERY_OK");
} catch (error) {
  report = { ok: false, failure: error.message, realProviderCalls: 0, originalWrites: 0 };
  throw error;
} finally {
  await writeFile(arg("report"), JSON.stringify(report, null, 2), { mode: 0o600 });
}
