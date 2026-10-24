// Captured B r1: a 150KB seeded plan is copied until the 32768-unit response
// truncates. Exercise the actual prompt, submission and same-choice recovery.
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
  value.authority.stateRevision === 1 && value.stage === 'planning');
const original = JSON.stringify(choice);
const attempt = choice.attempts[choice.attemptKeys.at(-1)];
assert.equal(attempt.safeOutput.providerTurn.issue, 'output_truncated');
assert.equal(attempt.usage.outputUnits, 32768);
assert(attempt.safeOutput.providerTurn.content.includes(choice.currentPlan.objective));
const a = choice.authority;
const input = { scope: match.scope, retryApproved: true,
  roomProjection: { room: { roomId: a.roomId, stateRevision: a.stateRevision,
    stateHash: a.stateHash }, matchBinding: { bindingHash: a.matchBindingHash },
  viewer: { seatKey: a.seatKey }, state: { round: 1, phase: 'movement' } },
  legalSpace: { ...a, finiteActions: [] },
  spatialActionSpace: { authority: a, actionSpaceHash: a.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.map(row => ({ candidateId: row.id,
      action: row.action })), parameterDomains: [] },
  spatialObservation: { observationHash: a.spatialObservationHash },
  planState: { plan: choice.currentPlan }, matchMemory: null };
const artifact = live.buildStarcraftTmgLivePromptArtifactV1(match, input,
  choice, 1, choice.queryReceipts, 'planning').artifact;
const node = artifact.nodes.find(row => row.nodeId === 'json-agent-query-interface');
const interfaceValue = node.content ?? node.value ?? node.payload;
// Read via the production node envelope, not a reimplemented schema.
const shape = interfaceValue?.terminalShape;
assert(shape?.properties?.plan, 'captured prompt must expose the production plan schema');
assert(shape?.properties?.planUpdateMode,
  'existing plans must offer a declared delta protocol instead of compulsory copying');
assert(shape.properties.plan.properties.objective.anyOf.some(row => row.type === 'null'));
const plan = { currentGoal: 'Choose the first actor for the present Movement phase.',
  objective: null, strategicApproach: null, opponentModel: null };
const raw = { recommendedCandidateId: choice.actionIndex[0].id,
  currentGoalSource: 'plan.currentGoal', planUpdateMode: 'field_delta_v1', plan,
  assessment: { verdict: 'revise', health: 'at_risk',
    continuitySummary: 'Keep the strategy; update only this immediate intention.' } };
const mapped = live.projectStarcraftTmgSubmittedPlanningV1(raw, input);
assert.equal(mapped.planRevision.objective, choice.currentPlan.objective);
assert.deepEqual(mapped.planRevision.strategicApproach, choice.currentPlan.strategicApproach);
assert.equal(mapped.planRevision.currentGoal, plan.currentGoal);
assert.equal(mapped.opponentModelSnapshot, undefined,
  'inherited old opponent beliefs must not be stamped as fresh');
const cleared = live.projectStarcraftTmgSubmittedPlanningV1({ ...raw,
  plan: { ...plan, contingencies: [] } }, input);
assert.deepEqual(cleared.planRevision.contingencies, [], 'explicit clearing is not inheritance');
assert.throws(() => live.projectStarcraftTmgSubmittedPlanningV1(raw,
  { ...input, planState: null }), /PLANNER_DELTA_BASE_REQUIRED/);
const options = { retryApproved: true,
  promptPolicyVersion: artifact.responseContract.promptPolicyVersion,
  maxSemanticCorrectionRounds: 3 };
const recovery = planStarcraftTmgPromptRepairRecoveryV1(choice, options);
assert(recovery, 'a concrete changed protocol must recover a typed truncation at the same capacity');
const copy = structuredClone(choice);
live.applyStarcraftTmgPlanningPromptRepairRecoveryV1(copy, recovery, input,
  '2026-10-14T00:00:00.000Z', 'json_channels_v1');
assert.equal(copy.status, 'generating');
assert.deepEqual(copy.attempts, choice.attempts);
assert.deepEqual(copy.queryReceipts, choice.queryReceipts);
assert(copy.providerContinuationMessages.some(row => row.content.includes('output_truncated')));
assert.equal(planStarcraftTmgPromptRepairRecoveryV1({ ...copy,
  status: 'provider_output_invalid' }, options), null, 'one repaired contract cycle only');
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(choice, { ...options,
  promptPolicyVersion: attempt.promptPolicyVersion }), null);
assert.equal(JSON.stringify(choice), original);
console.log(JSON.stringify({ passed: true, capturedRevision: 1,
  originalOutputUnits: 32768, originalPlanBytes: Buffer.byteLength(JSON.stringify(choice.currentPlan)),
  deltaBytes: Buffer.byteLength(JSON.stringify(raw)), fullStrategyRetained: true,
  noFreshnessForgery: true, paidHistoryRetained: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
