// Reproduce the actual r5 acceptance silently covering a subsequently repaired
// Plan. Local decision/review doubles prove routing, never strategic/source truth.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createRosterPlanningDraftStoreV1 } from
  "../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs";
import { createIterativeRosterFileStoreV1 } from
  "../packages/roster-strategist/iterative-roster-file-store-v1.mjs";
import { createIterativeRosterPlanSessionV1 } from
  "../packages/roster-strategist/iterative-roster-plan-session-v1.mjs";
import { createAgentSelectedRosterJourneyV1 } from
  "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";
import { createIterativeRosterBuilderAdapterV1 } from
  "../packages/roster-strategist/iterative-roster-builder-adapter-v1.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const option = key => process.argv.find(arg => arg.startsWith(`--${key}=`))
  ?.slice(key.length + 3);
const clone = value => structuredClone(value);
const rawState = JSON.parse(await readFile(option("state"), "utf8"));
const original = rawState.value ?? rawState;
const rawTeach = JSON.parse(await readFile(option("teach"), "utf8"));
const oldCapture = JSON.parse(await readFile(option("alternative"), "utf8"));
const plan = JSON.parse(rawTeach.planSerialized);
assert.notEqual(original.teachFeedback.taughtPlan.planHash, plan.planHash);
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: option("fixture") });
const builder = createIterativeRosterBuilderAdapterV1(
  createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
    createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) }));
const teach = { sessionId: rawTeach.sessionId, status: rawTeach.status,
  planningMode: rawTeach.planningMode, setup: clone(rawTeach.setup),
  agentSelectedCandidateHash: rawTeach.agentSelectedCandidateHash,
  agentSelectedStrategySource: clone(rawTeach.agentSelectedStrategySource),
  selectionJustification: clone(rawTeach.selectionJustification), plan,
  // Deliberately local: test clean-review ordering without buying a review or
  // adjudicating the real seven High findings. This is not an admission receipt.
  planReview: { status: "completed", planHash: plan.planHash,
    review: { findings: [], planHash: plan.planHash,
      reviewHash: "local-routing-double-not-source-truth" } },
  planVersionHistory: rawTeach.planVersionHistory.map(JSON.parse),
  evidence: { toolReceipts: clone(rawTeach.toolReceipts) } };
const id = original.sessionId;
const results = [];
let decisionCalls = 0;
function session(decision) {
  let saved = clone(original);
  const port = createIterativeRosterPlanSessionV1({
    store: { load: async () => clone(saved),
      save: async (_id, value) => { saved = clone(value); } },
    model: { decide: async ({ state }) => {
      decisionCalls += 1;
      assert.equal(state.teachFeedback.disposition, "pending");
      assert.equal(state.teachFeedback.taughtPlan.planHash, plan.planHash);
      assert.equal(state.teachFeedback.sourceReview.planHash, plan.planHash);
      const value = decision(state);
      return { outcome: "completed", decision: value,
        receiptHash: hashStarcraftTmgContract(value) };
    } }, builder,
    tools: { query: async () => { throw new Error("UNEXPECTED_TOOL_REQUERY"); } },
    review: { final: async () => ({ blockingFindings:
      ["OPENING_ARRIVAL_SCHEDULE_NOT_RULES_AUDITED"],
      reviewHash: "local-selection-requires-new-arrival-audit" }) },
  });
  return { ...port, listSessions: async () => [clone(saved)],
    proposeSchedule: async () => ({ status: "rules_audited" }),
    reviseSchedulePublicPlan: async () => ({ status: "unit_references_verified" }) };
}
async function check(name, run) {
  if (option("only") && option("only") !== name) return;
  try { await run(); results.push({ name, status: "passed" }); }
  catch (error) { results.push({ name, status: "failed",
    code: error.code ?? null, message: error.message }); }
}
await check("journey_cannot_skip_corrected_plan_feedback", async () => {
  const draft = session(() => ({ kind: "accept_teach",
    publicReason: "Local double accepts this corrected version, not the old one." }));
  const journey = createAgentSelectedRosterJourneyV1({ iterativeDraft: draft,
    workspaceService: {
      listSessions: async () => ({ sessions: [{ sessionId: teach.sessionId,
        planningMode: "locked_roster_teach_v1" }] }),
      readSession: () => clone(teach),
      readPlanningExperience: () => ({ publicRounds: [] }),
      createAgentSelectedTeachSession: async () => { throw new Error("OLD_TEACH_NOT_REUSED"); },
      reviewFinalPlan: async () => { throw new Error("PASSED_REVIEW_REPEATED"); },
      revisePlan: async () => { throw new Error("UNEXPECTED_PROSE_REPAIR"); },
    }, promoteTeachPlan: async () => { throw new Error("CORRECTED_PLAN_REPROMOTED"); } });
  assert.equal((await journey.read(id)).stage, "reviewed_teach_feedback_required");
  const beforeCalls = decisionCalls;
  await journey.run(id);
  const deadline = Date.now() + 10_000;
  let view;
  do { view = await journey.read(id);
    if (view.stage === "source_review_completed_clean" || view.stoppedReason) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  assert.equal(view.stoppedReason, null);
  assert.equal(view.stage, "source_review_completed_clean",
    JSON.stringify({ stage: view.stage, running: view.running,
      reason: view.stoppedReason, revision: view.revision }));
  assert.equal(decisionCalls - beforeCalls, 1);
  const after = await draft.read(id);
  assert.equal(after.teachFeedback.taughtPlan.planHash, plan.planHash);
  assert.equal(after.teachFeedback.disposition, "accepted");
  assert.deepEqual(after.teachFeedbackHistory[0], original.teachFeedbackHistory[0]);
  assert.deepEqual(after.iterations.slice(0, original.iterations.length), original.iterations);
  await draft.attachTeachFeedback(id, clone(teach));
  assert.equal((await draft.read(id)).teachFeedbackHistory.length,
    after.teachFeedbackHistory.length, "same current feedback must be idempotent");
});
await check("corrected_feedback_can_reopen_army_via_official_builder", async () => {
  const draft = session(state => ({ kind: "propose",
    candidateInput: clone(oldCapture.alternative),
    plan: { ...clone(state.plan), mapEvidenceHash: null,
      victoryRoute: "Local double reopens the roster after corrected premises." },
    assumptionDisposition: "revise" }));
  await draft.attachTeachFeedback(id, clone(teach));
  await draft.resume(id);
  const after = await draft.read(id);
  assert.equal(after.currentCandidate.mineralSpent, 2000);
  assert.notEqual(after.currentCandidate.candidateHash, original.currentCandidate.candidateHash);
  assert.equal(after.iterations.at(-1).rulesVerdictStatus, "legal");
  assert.equal(after.teachFeedback.disposition, "reopened");
  assert.equal(after.openingDeploymentSchedule, null);
  assert.deepEqual(after.teachFeedbackHistory[0], original.teachFeedbackHistory[0]);
});
await check("corrected_feedback_can_reopen_plan_without_changing_army", async () => {
  const draft = session(state => ({ kind: "finish",
    plan: { ...clone(state.plan),
      victoryRoute: "Local double changes the route after corrected premises." },
    assumptionDisposition: "revise" }));
  await draft.attachTeachFeedback(id, clone(teach));
  await draft.resume(id);
  const after = await draft.read(id);
  assert.deepEqual(after.currentCandidate, original.currentCandidate);
  assert.notEqual(after.plan.victoryRoute, original.plan.victoryRoute);
  assert.equal(after.teachFeedback.disposition, "reopened");
  assert.equal(after.openingDeploymentSchedule, null);
  assert.deepEqual(after.teachFeedbackHistory[0], original.teachFeedbackHistory[0]);
});
await check("production_preflight_requires_current_reviewed_feedback", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const directory = await mkdtemp(path.join(root, "build/post-review-admission-"));
  const iterativeStore = createIterativeRosterFileStoreV1({
    directory: path.join(directory, "iterative-draft") });
  await iterativeStore.save(id, clone(original));
  const retained = clone(rawTeach);
  // Local routing double only: the actual paid review is never modified.
  retained.planReview.review.findings = retained.planReview.review.findings
    .map(f => ({ ...f, severity: f.severity === "high" ? "medium" : f.severity }));
  const { reviewHash, ...body } = retained.planReview.review;
  retained.planReview.review = { ...body, reviewHash: hashStarcraftTmgContract(body) };
  await createRosterPlanningDraftStoreV1({ directory }).save(retained);
  const product = await createRosterPlanningProductModuleV1({ root,
    fixtureRoot: option("fixture"), dataDirectory: directory,
    mapConfiguration: oldCapture.mapConfiguration, enableIterativeDraft: true,
    deliberationFactory: { createForRun: async () => {
      throw new Error("UNEXPECTED_PROVIDER_CALL"); } } });
  await assert.rejects(product.prepareAgentSelectedTeachRoomLaunch({
    iterativeSessionId: id, teachSessionId: teach.sessionId }),
  error => error.code === "AGENT_SELECTED_ROOM_LAUNCH_REVIEWED_TEACH_FEEDBACK_REQUIRED");
  const approval = session(() => ({ kind: "accept_teach",
    publicReason: "Local double approves the current reviewed snapshot." }));
  await approval.attachTeachFeedback(id, clone(teach));
  await approval.resume(id);
  await iterativeStore.save(id, await approval.read(id));
  const admitted = await product.prepareAgentSelectedTeachRoomLaunch({
    iterativeSessionId: id, teachSessionId: teach.sessionId });
  assert.equal(admitted.planHash, plan.planHash);
  assert.deepEqual(admitted.recipe.units.map(u => u.recordKey),
    original.currentCandidate.input.units.map(u => u.recordKey));
});
const report = { status: results.every(r => r.status === "passed") ? "passed" : "failed",
  bug: "accepted_teach_session_skips_corrected_plan", results,
  sourcePlanHash: plan.planHash, originalAcceptedPlanHash:
    original.teachFeedback.taughtPlan.planHash,
  localDecisionCalls: decisionCalls, providerCalls: 0, roomMutations: 0,
  sourceTruthProven: false, strategyGainProven: false, trainingTruth: false };
await writeFile(option("output"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
process.stdout.write(JSON.stringify(report) + "\n");
process.exitCode = report.status === "passed" ? 0 : 1;
