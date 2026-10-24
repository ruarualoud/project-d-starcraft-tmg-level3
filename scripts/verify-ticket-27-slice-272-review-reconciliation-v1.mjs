import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as reviewModule from "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { runReviewedRosterPlanRepairV1 } from
  "../packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs";
import { rosterPublicClaimTextEntriesV1 } from
  "../packages/roster-strategist/roster-public-claim-paths-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { rosterSelectionUnitRulesV1 } from
  "../packages/roster-strategist/roster-selection-justification-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg("teach"), "utf8"));
const plan = JSON.parse(raw.planSerialized);
const review = raw.planReview.review;
const original = JSON.stringify(raw);
const claims = new Map(rosterPublicClaimTextEntriesV1(plan));
for (const p of plan.componentPurposes) claims.set(`componentPurposes.${p.instanceId}`, p.publicPurposeText);
const h1 = "opponentHypotheses.h1-kerrigan-melee-on-2-4";
const h4 = "opponentHypotheses.h4-crushing-grip-tempo.hypothesisText";
const witnesses = new Map([[23, `${h1}.expectedCounterTexts.0`], [29, `${h1}.hypothesisText`],
  [45, h4], [46, h4], [73, "scoreRoute.routeText"], [82, "componentPurposes.player1-tactical-5"]]);
const decisions = [...witnesses].map(([findingIndex, claimPath]) => ({ findingIndex,
  findingHash: hashStarcraftTmgContract(review.findings[findingIndex]),
  effectiveSeverity: "medium", publicReason: "Local binding fixture only; not a factual source adjudication.",
  counterEvidence: [{ claimPath, claimQuote: claims.get(claimPath) }] }));
let report;
try {
  assert.equal(review.findings.filter(f => f.severity === "high").length, 7);
  // Existing adjudication rejects actual structured hypothesis counterquotes
  // because it indexes only global/component prose. This is the concrete RED.
  if (arg("only") !== "qualification") {
    reviewModule.createRosterFinalPlanReviewAdjudicationV1({ plan, review,
      decisions: [decisions[0]] });
  }
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg("fixture") });
  const output = { schemaVersion: "starcraft_tmg_roster_review_reconciliation_v1",
    roundKind: "final_review_reconciliation", judgments: review.findings.flatMap((f, i) =>
      f.severity === "high" ? [{ findingIndex: i, disposition: witnesses.has(i) ? "track_medium" : "keep_high",
        publicReason: "Local boundary fixture, not proof of semantic adjudication.",
        counterEvidence: decisions.find(d => d.findingIndex === i)?.counterEvidence || [] }] : []),
    publicSummary: "Local fixture preserves the genuine projected-receipt allegation." };
  let localCalls = 0;
  const qualified = await reviewModule.reconcileRosterFinalPlanReviewV1({ plan, review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    armyAudit: raw.working.verdict.audit,
    deliberation: { deliberate: async () => { localCalls += 1; return { output, receipt: { local: true } }; } } });
  assert.deepEqual(qualified.findings, review.findings, "paid findings must stay immutable");
  assert.equal(reviewModule.verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: qualified }).unresolvedHighCount, 1);
  const invalid = structuredClone(output);
  invalid.judgments[0].counterEvidence[0].claimQuote = "fabricated counterquote";
  await assert.rejects(() => reviewModule.reconcileRosterFinalPlanReviewV1({ plan, review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    deliberation: { deliberate: async () => ({ output: invalid }) } }), /ADJUDICATION_INVALID/u);
  let state = { plan, planReview: { status: "completed", planHash: plan.planHash, review },
    planReviewHistory: [], claimRepairBacklog: [] };
  let reconciled = 0, repaired = 0;
  await runReviewedRosterPlanRepairV1({ sessionId: raw.sessionId,
    expectedPlanHash: plan.planHash, authorizeAdditionalCycle: true,
    service: {
      readSession: () => structuredClone(state),
      reconcileReviewFindings: async () => { reconciled += 1;
        state.planReview.review = qualified; return structuredClone(state); },
      revisePlan: async (_id, request) => {
        assert.deepEqual(request.targetedClaimPaths, [review.findings[48].claimPath],
          "automatic correction must qualify the review before rewriting supported strategy claims");
        repaired += 1; state.plan = { ...plan, planHash: "1".repeat(64) }; state.status = "planned";
      },
      reviewFinalPlan: async () => { state.planReview = { status: "completed",
        planHash: state.plan.planHash, review: { findings: [] } }; },
    } });
  assert.equal(reconciled, 1);
  assert.equal(repaired, 1);
  assert.equal(localCalls, 1);
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, structuredCounterquotesAccepted: true, paidFindingsUnmodified: true,
    forgedQuoteRejected: true, reconciliationBeforeCorrection: true,
    sameBoundedCorrectionCycle: true, providerCalls: 0, originalWrites: 0,
    semanticTruthCertified: false };
  console.log("REVIEW_RECONCILIATION_ROUTING_OK");
} catch (error) {
  report = { ok: false, failure: error.message, providerCalls: 0, originalWrites: 0 };
  throw error;
} finally {
  await writeFile(arg("report"), JSON.stringify(report, null, 2), { mode: 0o600 });
}
