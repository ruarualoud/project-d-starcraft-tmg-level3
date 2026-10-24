// Reproduce A r130: zero resource points was confused with no source-card
// exhaustion twice. Exercise the real saved-output recovery, not a mock error.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  '../packages/online-agent-session/sqlite-live-decision-store-v1.mjs';
import * as live from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import { planStarcraftTmgPromptRepairRecoveryV1 } from
  '../packages/online-agent-session/live-prompt-repair-recovery-v1.mjs';

const db = new DatabaseSync(process.argv[2], { readOnly: true });
const match = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
  'SELECT record_json FROM sc_live_decision_records').get().record_json);
db.close();
const choice = Object.values(match.decisions).find(value =>
  value.authority.stateRevision === 130 && value.stage === 'planning');
assert.equal(choice.repeatedSemanticFailureCount, 2);
assert.equal(choice.semanticCorrectionRounds, 2);
const original = JSON.stringify(choice);
const lastKey = choice.attemptKeys.at(-1);
const last = choice.attempts[lastKey];
const a = choice.authority;
const input = { scope: match.scope, retryApproved: true,
  roomProjection: { room: { roomId: a.roomId, stateRevision: a.stateRevision,
    stateHash: a.stateHash }, matchBinding: { bindingHash: a.matchBindingHash },
    viewer: { seatKey: a.seatKey }, state: { round: 3, phase: 'movement' } },
  spatialActionSpace: { authority: a, actionSpaceHash: a.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.filter(row => row.kind === 'finite')
      .map(row => ({ candidateId: row.id, action: row.action })),
    parameterDomains: choice.actionIndex.filter(row => row.kind === 'parameterized')
      .map(row => row.action) },
  spatialObservation: { observationHash: a.spatialObservationHash },
  planState: { plan: choice.currentPlan }, matchMemory: null };
const candidateId = last.safeOutput.recommendedCandidateId;
const claims = live.inspectStarcraftTmgSelectedActionResourceClaimsV1({
  spatialActionSpace: input.spatialActionSpace, candidateId,
  stage: 'planning', value: last.safeOutput });
function correctAllResourceClaims(raw) {
  const corrected = structuredClone(raw);
  for (const claim of claims.contradictions) {
    const [owner, field] = claim.field.split('.');
    corrected[owner][field] = corrected[owner][field].map(text =>
      text === claim.text
        ? 'Wild Mutation costs no resource points; faction:player2 is exhausted on commit.'
        : text);
  }
  return corrected;
}
function verifyRemainingClaims() {
  assert.equal(live.inspectStarcraftTmgSelectedActionResourceClaimsV1({
    spatialActionSpace: input.spatialActionSpace, candidateId,
    stage: 'planning', value: correctAllResourceClaims(last.safeOutput) }).status,
  'consistent');
  const actionClaims = live.inspectStarcraftTmgSelectedActionResourceClaimsV1({
    spatialActionSpace: input.spatialActionSpace, candidateId,
    stage: 'action', value: { selectedReason: claims.contradictions[0].text } });
  assert.equal(actionClaims.correctionIssues[0].facts.sourceInstanceId, 'faction:player2');
  assert.equal(JSON.stringify(choice), original);
}
if (process.argv.includes('--remaining-claims-only')) {
  verifyRemainingClaims();
  console.log(JSON.stringify({ passed: true, scope: 'remaining-claims-only',
    correctedDuplicateClaimFields: claims.contradictions.map(row => row.field),
    priorFeedbackAndRecoveryChecksNotRepeated: true,
    providerCalls: 0, roomWrites: 0, trainingTruth: false }));
  process.exit(0);
}
assert.equal(claims.status, 'contradicted');
assert.equal(claims.resourceContract.sourceInstanceId, 'faction:player2');
assert.equal(claims.resourceContract.costs[0].effectiveResourceCost, 0);
const copy = structuredClone(choice);
// Directly exercise feedback reconstruction even before eligibility is fixed.
const nextVersion = 'starcraft_tmg_planner_action_spatial_intent_solver_v56_json_resource_correction_facts';
live.applyStarcraftTmgPlanningPromptRepairRecoveryV1(copy, {
  previousPromptPolicyVersion: last.promptPolicyVersion,
  nextPromptPolicyVersion: nextVersion, lastAttemptKey: lastKey,
  reason: 'repeated_semantic_failure_after_contract_change',
  priorSemanticCorrectionRounds: 2 }, input,
  '2026-10-14T01:00:00.000Z', 'json_channels_v1');
const feedback = JSON.parse(copy.providerContinuationMessages.at(-1).content);
assert.equal(feedback.current.code, 'PLANNER_SELECTED_ACTION_RESOURCE_CONTRADICTED');
const issue = feedback.current.issues.find(row =>
  row.claimKind === 'source_card_exhaustion');
assert(issue, 'real recovery must provide the rejected claim and typed resource facts, not only an error code');
assert.equal(issue.claimText, claims.contradictions[0].text);
assert.equal(issue.field, 'assessment.evidenceFor');
assert.equal(issue.facts.candidateId, candidateId);
assert.equal(issue.facts.abilityName, 'Wild Mutation');
assert.equal(issue.facts.sourceInstanceId, 'faction:player2');
assert.equal(issue.facts.sourceCardExhaustedOnCommit, true);
assert.equal(issue.facts.costs[0].effectiveResourceCost, 0);
assert.equal(issue.facts.stateScope, 'on_commit');
assert(issue.correction.includes('Zero resource-point cost'));
assert.equal(feedback.strategyRecommendationProvided, false);
assert.deepEqual(copy.attempts, choice.attempts);
assert.deepEqual(copy.currentPlan, choice.currentPlan);
assert.deepEqual(copy.queryReceipts, choice.queryReceipts);
assert.equal(copy.semanticCorrectionRounds, 2);
assert.equal(copy.stageCorrectionRounds, choice.stageCorrectionRounds);
assert.equal(copy.stageQueryRounds, choice.stageQueryRounds);
const options = { retryApproved: true, promptPolicyVersion: nextVersion,
  maxSemanticCorrectionRounds: 3 };
const recovery = planStarcraftTmgPromptRepairRecoveryV1(choice, options);
assert.equal(recovery?.reason, 'repeated_semantic_failure_after_contract_change');
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(choice,
  { ...options, retryApproved: false }), null);
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(choice,
  { ...options, promptPolicyVersion: last.promptPolicyVersion }), null);
assert.equal(planStarcraftTmgPromptRepairRecoveryV1({ ...copy,
  status: 'provider_output_invalid' }, options), null);
verifyRemainingClaims();
console.log(JSON.stringify({ passed: true, capturedRevision: 130,
  originalPaidAttempts: choice.attemptKeys.length,
  typedFeedbackRebuiltByProductionNormalizer: true,
  zeroPointsSeparatedFromCardExhaustion: true,
  changedContractRecoveryBounded: true,
  originalPlanAndPaidRepliesUnchanged: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false }));
