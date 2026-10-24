// Concrete C r70 failure: horizon facts were dropped from correction messages,
// and first-error feedback omitted prior safety constraints when reporting Pass.
// Replays the actual paid JSON outputs through the live port in memory only.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";

// Actual v37 B r6: the current-round prediction contradicts the cited fire
// band, but its correction message loses the submitted claim and source facts.
if (process.argv.includes("--prediction-feedback-only")) {
  const live = await import(
    "../packages/online-agent-session/live-flash-decision-port-v1.mjs");
  const capturePath = process.argv.find(arg => arg.startsWith("--capture="))
    ?.slice("--capture=".length);
  const reportPath = process.argv.find(arg => arg.startsWith("--report="))
    ?.slice("--report=".length);
  assert(capturePath && reportPath);
  const capture = JSON.parse(await readFile(capturePath, "utf8"));
  const originalCapture = JSON.stringify(capture);
  const choice = capture.choice;
  const input = { roomProjection: capture.roomProjection,
    spatialObservation: capture.spatialObservation,
    spatialActionSpace: {
      actionSpaceHash: choice.authority.spatialActionSpaceHash,
      finiteActions: choice.actionIndex.filter(entry => entry.kind === "finite")
        .map(entry => ({ candidateId: entry.id, action: entry.action })),
      parameterDomains: choice.actionIndex.filter(entry => entry.kind === "parameterized")
        .map(entry => entry.action),
    }, planState: { plan: choice.currentPlan } };
  assert.equal(capture.spatialObservation.observationHash,
    choice.authority.spatialObservationHash);
  const inspect = action => live.inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: action.intent.predictedOpponentResponses,
    spatialObservation: capture.spatialObservation,
    currentPhase: capture.currentPhase, queryReceipts: choice.queryReceipts,
    ownAction: action,
  });
  const finding = inspect(capture.rawAction);
  assert.equal(finding.status, "contradicted", "do not waive the actual bad current-round prediction");
  const issue = finding.correctionIssues?.find(entry =>
    entry.field === "intent.predictedOpponentResponses.0");
  assert(issue,
    "actual prediction correction must include the submitted response and source-bound facts, not only an enum");
  assert.deepEqual(issue.claim, capture.rawAction.intent.predictedOpponentResponses[0]);
  assert.equal(issue.facts.actor.unitId, "marine-1");
  assert.equal(issue.facts.actor.activatedPhases.movement, true);
  assert.equal(issue.facts.actor.activatedPhases.assault, false);
  assert.equal(issue.facts.target.unitId, "player2-kerrigan");
  assert.equal(issue.facts.target.activatedPhases.movement, true);
  assert(issue.facts.rangedTargetProjections.length);
  assert(issue.facts.rangedTargetProjections.every(row =>
    row.currentRoundStationaryProfileKeys.length === 0
      && row.currentRoundMoveThenAttackProfileKeys.length === 0));
  assert(issue.sourceReceipts.some(row => row.queryReceiptHash
    === "3af166029672204cfea3b7fd8d4dc292eafde69aa3479104509d007d683e8fff"));
  assert.equal(issue.sourceReceipts[0].authority.stateRevision, 6);
  const feedback = live.buildStarcraftTmgSemanticCorrectionFeedbackV1({
    stage: "action", correction: "ACTION_OPPONENT_PREDICTION_LIFECYCLE_CONTRADICTED",
    issues: finding.correctionIssues, history: choice.semanticCorrectionFeedbackHistory,
    providerInteractionMode: "json_channels_v1",
  });
  assert.equal(feedback.submissionProtocol.requiredChannel, "decision");
  assert.deepEqual(feedback.current.issues, finding.correctionIssues);
  assert.equal(feedback.strategyRecommendationProvided, false);
  const later = structuredClone(capture.rawAction);
  later.intent.predictedOpponentResponses[0].horizon = {
    kind: "bounded_public_transitions", count: 2,
  };
  assert.equal(inspect(later).status, "consistent",
    "conditional later transitions are hypotheses, not certified current fire");
  const recovery = live.planStarcraftTmgActionCorrectionContextRepairV1(choice, input, {
    retryApproved: true, providerInteractionMode: "json_channels_v1",
  });
  assert(recovery, "the actual enum-only failure must get one source-bound correction window");
  assert.equal(recovery.sourceAttemptKey, capture.currentAttemptKey);
  assert.deepEqual(recovery.feedback.current.issues, finding.correctionIssues);
  assert.equal(live.planStarcraftTmgActionCorrectionContextRepairV1(choice, input, {
    retryApproved: false,
  }), null);
  const changed = structuredClone(input);
  changed.roomProjection.room.stateRevision += 1;
  assert.equal(live.planStarcraftTmgActionCorrectionContextRepairV1(choice, changed, {
    retryApproved: true,
  }), null);
  const repaired = structuredClone(choice);
  live.applyStarcraftTmgActionCorrectionContextRepairV1(repaired, recovery,
    "2026-10-13T00:00:00Z");
  assert.equal(repaired.stage, "action");
  assert.equal(repaired.status, "generating");
  assert.equal(repaired.semanticCorrectionRounds, 0);
  assert.equal(repaired.actionCorrectionContextRepairs[0].maximumNewSemanticCorrections, 1);
  assert.deepEqual(repaired.plannerResult, choice.plannerResult);
  assert.deepEqual(repaired.queryReceipts, choice.queryReceipts);
  assert.deepEqual(repaired.attemptKeys, choice.attemptKeys);
  assert.deepEqual(repaired.semanticCorrectionFeedbackHistory.slice(0, -1),
    choice.semanticCorrectionFeedbackHistory);
  assert.deepEqual(repaired.providerContinuationMessages.slice(0, -2),
    choice.providerContinuationMessages);
  for (const key of choice.attemptKeys) {
    assert.deepEqual(repaired.attempts[key].safeOutput, choice.attempts[key].safeOutput);
    assert.deepEqual(repaired.attempts[key].usage, choice.attempts[key].usage);
  }
  assert.deepEqual(JSON.parse(repaired.providerContinuationMessages.at(-1).content),
    recovery.feedback);
  const stoppedAgain = structuredClone(repaired);
  stoppedAgain.status = "provider_output_invalid";
  assert.equal(live.planStarcraftTmgActionCorrectionContextRepairV1(stoppedAgain, input, {
    retryApproved: true,
  }), null, "the new window cannot be reopened without limit");
  const completeFeedback = structuredClone(choice);
  completeFeedback.semanticCorrectionFeedbackHistory.at(-1).issues = finding.correctionIssues;
  assert.equal(live.planStarcraftTmgActionCorrectionContextRepairV1(completeFeedback, input, {
    retryApproved: true,
  }), null, "a real failure already given complete feedback is not a missing-context bug");
  assert.equal(JSON.stringify(capture), originalCapture);
  const report = { passed: true, capturedRevision: 6,
    wrongCurrentRoundPredictionStillRejected: true,
    conditionalFutureHypothesisNotCertifiedAsCurrentAction: true,
    responseActivationRangeAndReceiptFactsReachJsonCorrection: true,
    sameAuthorityOnceOnlyAndOriginalPaidDataPreserved: true,
    providerCalls: 0, roomWrites: 0, previousPassedModesRerun: false,
    trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
  process.exit(0);
}

if (process.argv.includes("--superseded-action-only")) {
  const { DatabaseSync } = await import("node:sqlite");
  const { decodeStarcraftTmgLiveDecisionRecordV1 } = await import(
    "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs");
  const live = await import(
    "../packages/online-agent-session/live-flash-decision-port-v1.mjs");
  const directory = process.argv.find(arg => arg.startsWith("--run-directory="))
    ?.slice("--run-directory=".length);
  const reportPath = process.argv.find(arg => arg.startsWith("--report="))
    ?.slice("--report=".length);
  assert(directory && reportPath);
  const db = new DatabaseSync(`${directory}/seats/player2/provider/live-decisions.sqlite`,
    { readOnly: true });
  let record;
  try {
    record = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
      "SELECT record_json FROM sc_live_decision_records").get().record_json);
  } finally { db.close(); }
  const choice = Object.values(record.decisions).find(entry =>
    entry.authority?.stateRevision === 6 && entry.status === "provider_output_invalid");
  assert(choice?.selectedEffectPlannerRecoveries?.length);
  const before = JSON.stringify(choice);
  const plannerKey = choice.attemptKeys.at(-1);
  assert.equal(choice.attempts[plannerKey].stage, "planning");
  assert.equal(choice.attempts[plannerKey].status, "completed");
  const oldActionKey = choice.localOutputRevalidationHistory.at(-1).attemptKey;
  // RED pinpoints the actual eligibility seam used by the production replay.
  assert.equal(live.isStarcraftTmgActionReplayForCurrentPlannerV1?.(choice, oldActionKey),
    false, "a paid Action preceding the newly accepted Planner cannot be its Action");
  const input = { roomProjection: { room: choice.authority },
    spatialActionSpace: { actionSpaceHash: choice.authority.spatialActionSpaceHash } };
  const recovery = live.planStarcraftTmgSupersededActionReplayRepairV1(choice, input, {
    retryApproved: true,
  });
  assert(recovery);
  assert.equal(recovery.supersededActionAttemptKey, oldActionKey);
  assert.equal(recovery.currentPlannerAttemptKey, plannerKey);
  assert.equal(live.planStarcraftTmgSupersededActionReplayRepairV1(choice, input, {
    retryApproved: false,
  }), null);
  const repaired = structuredClone(choice);
  live.applyStarcraftTmgSupersededActionReplayRepairV1(repaired, recovery,
    "2026-10-13T00:00:00Z");
  assert.equal(repaired.status, "generating");
  assert.deepEqual(repaired.plannerResult, choice.plannerResult);
  assert.equal(repaired.stageCorrectionRounds, 0);
  assert.equal(repaired.semanticCorrectionRounds, 0);
  assert.deepEqual(repaired.attempts, choice.attempts);
  assert.deepEqual(repaired.queryReceipts, choice.queryReceipts);
  assert.deepEqual(repaired.semanticCorrectionFeedbackHistory,
    choice.semanticCorrectionFeedbackHistory);
  assert.deepEqual(repaired.providerContinuationMessages, choice.providerContinuationMessages);
  assert.equal(repaired.promptRepairHistory.at(-1).maximumNewSemanticCorrections, 1);
  assert.equal(live.planStarcraftTmgSupersededActionReplayRepairV1(repaired, input, {
    retryApproved: true,
  }), null);
  const newerActionKey = "captured-new-current-planner-action";
  const newer = structuredClone(choice);
  newer.attemptKeys.push(newerActionKey);
  newer.attempts[newerActionKey] = { stage: "action", status: "completed" };
  assert.equal(live.isStarcraftTmgActionReplayForCurrentPlannerV1(newer, newerActionKey), true);
  assert.equal(live.planStarcraftTmgSupersededActionReplayRepairV1(newer, input, {
    retryApproved: true,
  }), null, "a genuinely new failed Action must not receive this exemption");
  const changedAuthority = structuredClone(input);
  changedAuthority.roomProjection.room.stateRevision += 1;
  assert.equal(live.planStarcraftTmgSupersededActionReplayRepairV1(choice, changedAuthority, {
    retryApproved: true,
  }), null);
  assert.equal(JSON.stringify(choice), before);
  const report = { passed: true, capturedRevision: 6,
    supersededActionExcludedFromCurrentPlannerReplay: true,
    newPlannerAndCorrectionFeedbackPreserved: true,
    genuineNewFailuresStillCount: true, sameAuthorityAndOnceOnly: true,
    providerCalls: 0, roomWrites: 0, previousPassedModesRerun: false,
    trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
  process.exit(0);
}

// Concrete B r6: correct expectedEffects coexists with an Omega outcome for
// Ventral Sacs. Only this mode runs; historical passed C gates are not repeated.
if (process.argv.includes("--selected-effect-only")) {
  const { DatabaseSync } = await import("node:sqlite");
  const { decodeStarcraftTmgLiveDecisionRecordV1 } = await import(
    "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs");
  const live = await import(
    "../packages/online-agent-session/live-flash-decision-port-v1.mjs");
  const directory = process.argv.find(arg => arg.startsWith("--run-directory="))
    ?.slice("--run-directory=".length);
  const reportPath = process.argv.find(arg => arg.startsWith("--report="))
    ?.slice("--report=".length);
  assert(directory && reportPath);
  const db = new DatabaseSync(`${directory}/seats/player2/provider/live-decisions.sqlite`,
    { readOnly: true });
  let record;
  try {
    record = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
      "SELECT record_json FROM sc_live_decision_records").get().record_json);
  } finally { db.close(); }
  const choice = Object.values(record.decisions).find(entry =>
    entry.authority?.stateRevision === 6 && entry.status === "provider_output_invalid");
  assert(choice?.plannerResult, "the actual exhausted B r6 choice is required");
  const before = JSON.stringify(choice);
  const input = {
    roomProjection: { room: choice.authority },
    spatialActionSpace: {
      actionSpaceHash: choice.authority.spatialActionSpaceHash,
      finiteActions: choice.actionIndex.filter(entry => entry.kind === "finite")
        .map(entry => ({ candidateId: entry.id, action: entry.action })),
      parameterDomains: choice.actionIndex.filter(entry => entry.kind === "parameterized")
        .map(entry => entry.action),
    },
    planState: { plan: choice.currentPlan },
  };
  const last = choice.attempts[choice.attemptKeys.at(-1)];
  const action = last.safeOutput.decision;
  assert(action.intent.expectedEffects.some(text => text.includes("End of Round")));
  const actionClaims = live.inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    ...input, candidateId: choice.plannerResult.recommendedCandidateId,
    stage: "action", value: action,
  });
  assert.equal(actionClaims.status, "contradicted");
  const outcomeIssue = actionClaims.correctionIssues?.find(issue =>
    issue.field === "intent.expectedOwnOutcome");
  assert(outcomeIssue,
    "actual identity correction must carry the wrong field, paid claim and selected source, not just an enum error");
  assert.equal(outcomeIssue.claimText, action.intent.expectedOwnOutcome);
  assert.equal(outcomeIssue.selectedActionIdentity.sourceInstanceId, "player2-tactical-4");
  assert.equal(outcomeIssue.selectedActionIdentity.effectKind, "reserve_deploy_indicator");
  assert(outcomeIssue.selectedActionIdentity.effectContract.delayedEffect.includes("End of Round"));
  const feedback = live.buildStarcraftTmgSemanticCorrectionFeedbackV1({
    stage: "action", correction: "ACTION_SELECTED_ACTION_IDENTITY_CONTRADICTED",
    issues: actionClaims.correctionIssues,
    history: choice.semanticCorrectionFeedbackHistory,
    providerInteractionMode: "json_channels_v1",
  });
  assert.equal(feedback.submissionProtocol.requiredChannel, "decision");
  assert.equal(feedback.strategyRecommendationProvided, false);
  assert(feedback.current.issues.some(issue => issue.field === "intent.expectedOwnOutcome"));
  const plannerClaims = live.inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    ...input, candidateId: choice.plannerResult.recommendedCandidateId,
    stage: "planning", value: choice.plannerResult,
  });
  assert.equal(plannerClaims.status, "contradicted",
    "wrong Planner calculations must not seed a supposedly accepted Action");
  assert(plannerClaims.correctionIssues.some(issue =>
    issue.field === "publicPlanSummary.calculations.1"));
  const validArrayWrongOutcome = structuredClone(action);
  validArrayWrongOutcome.intent.expectedOwnOutcome =
    "Place a Faction Indicator; at End of Round may Deploy one Ground reserve Unit base-to-base.";
  validArrayWrongOutcome.intent.expectedEffects[0] = "Create a Source of Creep.";
  assert.equal(live.inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    ...input, candidateId: choice.plannerResult.recommendedCandidateId,
    stage: "action", value: validArrayWrongOutcome,
  }).status, "contradicted", "all explicit effect slots use the same source check");
  const recovery = live.planStarcraftTmgSelectedEffectPlannerRecoveryV1(choice, input, {
    retryApproved: true, promptPolicyVersion: "captured-verified-effect-repair",
  });
  assert(recovery, "an exhausted Action with a wrong upstream Planner returns to Planner");
  assert.equal(live.planStarcraftTmgSelectedEffectPlannerRecoveryV1(choice, input, {
    retryApproved: false, promptPolicyVersion: "captured-verified-effect-repair",
  }), null);
  const repaired = structuredClone(choice);
  live.applyStarcraftTmgSelectedEffectPlannerRecoveryV1(repaired, recovery,
    "2026-10-13T00:00:00Z");
  assert.equal(repaired.stage, "planning");
  assert.equal(repaired.plannerResult, null);
  assert.equal(repaired.stageCorrectionRounds, 3, "do not silently replenish the exhausted window");
  const { planStarcraftTmgPromptRepairRecoveryV1 } = await import(
    "../packages/online-agent-session/live-prompt-repair-recovery-v1.mjs");
  const promptRepair = planStarcraftTmgPromptRepairRecoveryV1(repaired, {
    retryApproved: true, promptPolicyVersion: "captured-verified-effect-repair",
    maxSemanticCorrectionRounds: 3,
  });
  assert(promptRepair);
  live.applyStarcraftTmgPlanningPromptRepairRecoveryV1(repaired, promptRepair,
    input, "2026-10-13T00:00:00Z", "json_channels_v1");
  const nextFeedback = JSON.parse(repaired.providerContinuationMessages.at(-1).content);
  assert.equal(nextFeedback.submissionProtocol.requiredChannel, "planning");
  assert(nextFeedback.current.issues.some(issue =>
    issue.field === "publicPlanSummary.calculations.1"
      && issue.selectedActionIdentity.effectContract.delayedEffect.includes("End of Round")));
  assert.equal(repaired.promptRepairHistory.at(-1).maximumNewSemanticCorrections, 1);
  assert.equal(JSON.stringify(repaired.attempts), JSON.stringify(choice.attempts));
  assert.deepEqual(repaired.queryReceipts, choice.queryReceipts);
  assert(choice.semanticCorrectionFeedbackHistory.every(entry =>
    repaired.semanticCorrectionFeedbackHistory.some(saved =>
      JSON.stringify(saved) === JSON.stringify(entry))), "keep all three historical corrections");
  assert.equal(live.planStarcraftTmgSelectedEffectPlannerRecoveryV1(repaired, input, {
    retryApproved: true, promptPolicyVersion: "another-version",
  }), null, "one recovery, not unlimited policy-version retries");
  assert.equal(JSON.stringify(choice), before, "actual paid record is read-only");
  const report = { passed: true, capturedRevision: 6,
    actualPlannerAndActionClaimsExercised: true,
    correctiveContextRebuiltFromActualPaidReplies: true,
    oldWrongOutcomeStillBlocked: true, maximumNewSemanticCorrections: 1,
    historicalCorrectionsAndPaidRepliesPreserved: true,
    providerCalls: 0, roomWrites: 0, previousPassedModesRerun: false,
    trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
  process.exit(0);
}

const [capturePath, reportPath] = process.argv.slice(2);
assert(capturePath && reportPath);
const original = await readFile(capturePath, "utf8");
const capture = JSON.parse(original)[0].decision;
const a = capture.authority;
assert.equal(a.stateRevision, 70);
assert.equal(a.seatKey, "player2");
const attempts = Object.values(capture.attempts);
assert.equal(attempts.length, 4);
assert(attempts.every(attempt => attempt.status === "completed"));
const originalOutputs = attempts.map(attempt => structuredClone(attempt.safeOutput));
const selectedId = originalOutputs[1].recommendedCandidateId;
const passId = originalOutputs[1].candidateComparisons.at(-1).candidateId;
const units = capture.queryReceipts[0].result.nodes.units.map(node => ({
  ...structuredClone(node), unitId: node.nodeId,
}));
const candidateIds = [...new Set(originalOutputs.slice(1).flatMap(output =>
  output.candidateComparisons.map(comparison => comparison.candidateId)))];
// Only the semantic submission seam is exercised: current IDs are captured;
// finite action descriptors are a declared fixture, not a Rules movement proof.
const scope = { gameId: "starcraft-tmg", roomId: a.roomId,
  matchBindingHash: a.matchBindingHash, seatKey: a.seatKey };
const input = {
  scope, promptPack: "selfplay_agent_prompt",
  roomProjection: {
    room: { roomId: a.roomId, stateRevision: 70, stateHash: a.stateHash },
    matchBinding: { bindingHash: a.matchBindingHash }, viewer: { seatKey: a.seatKey },
    state: { round: 2, phase: "movement", activeSideKey: a.seatKey },
  },
  legalSpace: { ...a, legalSpaceHash: a.legalSpaceHash, finiteActions: [] },
  spatialObservation: { observationHash: a.spatialObservationHash, units },
  spatialActionSpace: { authority: a, actionSpaceHash: a.spatialActionSpaceHash,
    finiteActions: candidateIds.map(candidateId => ({ candidateId,
      action: candidateId === passId ? { actionType: "pass" }
        : { actionType: "move", pieceId: candidateId === selectedId
          ? "player2-swarmling" : "player2-kerrigan" },
    })), parameterDomains: [] },
  matchMemory: null, planState: { plan: capture.currentPlan },
};
let record = null;
const store = {
  async load() { return record ? structuredClone(record) : null; },
  async commit(_key, expectedRevision, next) {
    assert.equal(expectedRevision, record?.revision ?? null);
    record = structuredClone(next);
    return { ok: true };
  },
};
const artifacts = [];
const artifactStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
  maxArtifactBytes: 8 * 1024 * 1024,
});
let fakeTurns = 0;
let queryCalls = 0;
const port = createStarcraftTmgLiveFlashDecisionPortV1({
  providerInteractionMode: "json_channels_v1", maxToolRounds: 3,
  profileCandidates: [{ providerId: "deepseek-openai-compatible-direct",
    model: "deepseek-flash", maxOutputUnits: 32768,
    profileRef: { id: "captured-correction-only", version: "1", hash: a.stateHash } }],
  providerSupervisor: {
    async readState() { return {}; },
    async sendTurn() {
      assert(fakeTurns < originalOutputs.length,
        "the same three-correction limit must prevent a fourth correction request");
      return { ok: true, output: originalOutputs[fakeTurns++],
        usageReceipt: { inputUnits: 10, outputUnits: 5, totalUnits: 15 },
        providerEvidence: { reportedModel: "deepseek-flash" } };
    },
  },
  promptArtifactStore: {
    put(value) { artifacts.push(structuredClone(value.artifact));
      return artifactStore.put(value); },
    release(value) { return artifactStore.release(value); },
  },
  profileAvailabilityPort: { async check() { return { ok: true, available: true }; } },
  strategySkillPort: { async resolve() { return { ok: true, snapshot: {
    skillSetHash: a.stateHash, skillRefs: [], skills: [],
  } }; } },
  spatialQueryPort: { async query(query) {
    const receipt = capture.queryReceipts.find(entry =>
      JSON.stringify(entry.result.scope.subjectUnitIds) === JSON.stringify(
        query.request?.arguments?.subjectUnitIds?.filter(id => units.some(u => u.unitId === id))));
    queryCalls += 1;
    assert(receipt, "fixture must use the original matching relationship receipt");
    return structuredClone(receipt);
  } },
  store,
});
const preflight = await port.preflight({ scope, matchMode: "agent_vs_agent" });
assert.equal(preflight.ok, true);
assert.equal((await port.openMatch({ scope, preflightReceipt: preflight,
  providerSession: { sessionId: "captured-c-feedback-only", connectionEpoch: 1,
    sessionBindingHash: a.matchBindingHash } })).ok, true);
const result = await port.decide(input);
const choice = Object.values(record.decisions)[0];
assert.equal(result.ok, false, "the retained false safety claims must not be accepted");
assert.equal(choice.semanticCorrectionRounds, 3);
assert.equal(fakeTurns, 4);
assert.equal(queryCalls, 2);
const messages = choice.providerContinuationMessages.filter(message => message.role === "user");
const typed = messages.filter(message => message.content.includes(
  "starcraft_tmg_semantic_correction_feedback_v1"));
// RED occurs after exercising the original live persistence/feedback path.
assert.equal(typed.length, 3,
  "all three real semantic errors require structured corrective facts, not error-only prose");
const feedback = typed.map(message => JSON.parse(message.content));
const firstThreat = feedback[0].current.issues.find(issue =>
  issue.code === "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION");
assert(firstThreat);
assert(firstThreat.claimText.includes("Swarmling"));
const marineFact = firstThreat.facts.find(fact =>
  fact.targetId === "player2-swarmling" && fact.attackerId === "player1-marine-1");
assert.equal(marineFact.earliestStationaryAttackHorizon, "current_round");
assert.equal(marineFact.minimumBaseEdgeDistanceMilliInches, 9469);
assert.equal(marineFact.queryReceiptHash, capture.queryReceipts[0].queryReceiptHash);
assert.equal(marineFact.relationshipEdgeId, "unit:player2-swarmling->unit:player1-marine-1");
assert.equal(marineFact.actionWindow.assaultCurrentRoundAvailable, true);
assert(feedback[1].current.issues.some(issue =>
  issue.code === "PLANNER_PASS_OPPORTUNITY_COST_NOT_COMPARED"));
assert(!feedback[1].current.issues.some(issue =>
  issue.code === "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION"),
  "the actual second reply forecasts intended movement; current geometry must not falsify that unverified future prediction");
assert(feedback[1].regressionGuards.some(issue =>
  issue.code === "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION"));
assert(feedback[2].regressionGuards.some(issue =>
  issue.code === "PLANNER_PASS_OPPORTUNITY_COST_NOT_COMPARED"));
assert(feedback.every(packet => packet.submissionProtocol.mode === "json_channels_v1"
  && packet.submissionProtocol.requiredChannel === "planning"));
assert(feedback.every(packet => packet.strategyRecommendationProvided === false));
assert(artifacts[3].nodes.some(node => JSON.stringify(node.content).includes(
  "starcraft_tmg_semantic_correction_feedback_v1")),
  "corrective facts must reach the actual next prompt, not just a diagnostic record");
assert.equal(await readFile(capturePath, "utf8"), original);
const report = { passed: true, capturedRevision: 70,
  actualPortPersistenceAndNextPromptExercised: true,
  currentRoundFactPreserved: true, futurePredictionNotFalselyBlocked: true,
  previousConstraintsRetainedAsRegressionGuards: true,
  oldFalseOutputStillBlocked: true, correctionLimitUnchanged: 3,
  fakeProviderTurns: fakeTurns, providerNetworkCalls: 0, originalRoomWrites: 0,
  capturedPaidRepliesUnchanged: true, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
