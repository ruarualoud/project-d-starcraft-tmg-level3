import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { reconcileRosterFinalPlanReviewV1, verifyRosterFinalPlanReviewAdjudicationV1 }
  from "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createAgentSelectedRosterJourneyV1 }
  from "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";
import { rosterSelectionUnitRulesV1 } from "../packages/roster-strategist/roster-selection-justification-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from "./support/official-development-tranche-source-lock-fixture-v1.mjs";
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg("input"), "utf8"));
const original = JSON.stringify(raw);
const plan = JSON.parse(raw.planSerialized);
const paid = raw.publicOutputs.findLast(o => o.roundKind === "final_review_reconciliation").sanitizedOutput;
const { reviewHash, reviewAdjudication, ...body } = raw.planReview.review;
const review = { ...body, reviewHash: hashStarcraftTmgContract(body) };
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg("fixture") });
let qualifications = 0, checks = 0, report;
try {
  if (arg("only") === "journey") {
    const stored = JSON.parse(await readFile(arg("state"), "utf8"));
    const state = structuredClone(stored.value ?? stored);
    state.teachFeedback.taughtPlan.planHash = plan.planHash;
    const teach = { ...structuredClone(raw), plan, planVersionHistory: [], planReviewHistory: [],
      status: "planned", claimRepairBacklog: [],
      planReview: { status: "completed", planHash: plan.planHash, review:
        { findings: [review.findings[21]], planHash: plan.planHash } } };
    teach.agentSelectedStrategySource.planHash = hashStarcraftTmgContract(state.plan);
    let qualifiedCalls = 0;
    const journey = createAgentSelectedRosterJourneyV1({ iterativeDraft: {
      start: async () => {}, read: async () => structuredClone(state),
      listSessions: async () => [structuredClone(state)],
      proposeSchedule: async () => ({ status: "rules_audited" }),
      reviseSchedulePublicPlan: async () => ({ status: "unit_references_verified" }),
    }, workspaceService: {
      listSessions: async () => ({ sessions: [{ sessionId: teach.sessionId,
        planningMode: "locked_roster_teach_v1" }] }),
      readSession: () => structuredClone(teach),
      createAgentSelectedTeachSession: async () => { throw Error("OLD_TEACH_NOT_REUSED"); },
      reviewFinalPlan: async () => { throw Error("PASSED_REVIEW_REPEATED"); },
      revisePlan: async () => { throw Error("UNQUALIFIED_REVIEW_WAS_USED_AS_CORRECTION"); },
      reconcileReviewFindings: async () => { qualifiedCalls += 1;
        teach.planReview.review.findings = []; return structuredClone(teach); },
    }, promoteTeachPlan: async () => { throw Error("PLAN_REPROMOTED"); } });
    await journey.run(state.sessionId);
    let view;
    const deadline = Date.now() + 3000;
    do { view = await journey.read(state.sessionId);
      if (view.stoppedReason || view.stage === "source_review_completed_clean") break;
      await new Promise(resolve => setTimeout(resolve, 25));
    } while (Date.now() < deadline);
    assert.equal(view.stoppedReason, null);
    assert.equal(qualifiedCalls, 1, "normal Generate must use the same qualification before correction");
    assert.equal(view.stage, "source_review_completed_clean");
    report = { ok: true, normalJourneyUsesSameQualification: true,
      noDirectUnqualifiedRewrite: true, realProviderCalls: 0, originalWrites: 0, semanticTruthCertified: false };
    console.log("STANDARD_JOURNEY_QUALIFICATION_OK");
  } else {
  const bad = paid.judgments.find(j => j.findingIndex === 21);
  assert.equal(bad.claimAssessment, "source_supported");
  assert.match(bad.publicReason, /literal assertion therefore disagrees/u);
  const qualified = await reconcileRosterFinalPlanReviewV1({ plan, review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    armyAudit: raw.working.verdict.audit,
    deliberation: { deliberate: async request => {
      if (request.roundKind === "final_review_reconciliation_consistency") {
        checks += 1;
        return { output: { schemaVersion: "starcraft_tmg_roster_review_consistency_v1",
          roundKind: request.roundKind, checks: paid.judgments.map(j => ({ findingIndex: j.findingIndex,
            consistent: !(checks === 1 && j.findingIndex === 21),
            suggestedClaimAssessment: j.findingIndex === 21 ? "source_contradicted" : j.claimAssessment,
            publicReason: "Local fixture: the public reason says the assertion disagrees with source." })) } };
      }
      qualifications += 1;
      const output = structuredClone(paid);
      if (qualifications > 1) {
        const feedback = request.promptNodes.find(n => n.kind === "reconciliation-binding-feedback");
        assert(feedback.issues.some(i => i.code === "ASSESSMENT_REASON_CONFLICT" && i.findingIndex === 21));
        output.judgments.find(j => j.findingIndex === 21).claimAssessment = "source_contradicted";
      }
      return { output };
    } } });
  assert.equal(qualifications, 2);
  assert.equal(checks, 2);
  assert.equal(verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: qualified }).unresolvedHighCount, 4);
  assert(!qualified.reviewAdjudication.decisions.some(d => d.findingIndex === 21));
  assert.deepEqual(qualified.findings, review.findings);
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, actualReasonFieldConflictReproduced: true, boundedAutomaticFeedback: true,
    noIncorrectJudgmentConsumed: true, originalPaidDraftUnchanged: true,
    realProviderCalls: 0, originalWrites: 0, semanticTruthCertified: false };
  console.log("REVIEW_CONSISTENCY_FEEDBACK_OK");
  }
} catch (error) {
  report = { ok: false, failure: error.message, qualifications, checks, realProviderCalls: 0, originalWrites: 0 };
  throw error;
} finally { await writeFile(arg("report"), JSON.stringify(report, null, 2), { mode: 0o600 }); }
