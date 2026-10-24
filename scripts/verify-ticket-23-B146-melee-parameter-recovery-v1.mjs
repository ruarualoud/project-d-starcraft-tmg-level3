import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  '../packages/online-agent-session/sqlite-live-decision-store-v1.mjs';
import { inspectStarcraftTmgActionParametersV1,
  planStarcraftTmgParameterFailureRecoveryV1,
  applyStarcraftTmgParameterFailureRecoveryV1 } from
  '../packages/online-agent-session/action-parameter-contract-v1.mjs';
import { canonicalOfficialSelectedRosterAttackAllocationsV1 } from
  '../packages/product-composition/official-selected-roster-attack-allocation-contract-v1.mjs';

// Concrete B146 paid-return regression, not a general test-suite entry.
// Read-only original store; no Provider, Room write, RNG or Rules Apply.
const database = new DatabaseSync(process.argv[2], { readOnly: true });
const row = database.prepare('SELECT record_json FROM sc_live_decision_records').get();
database.close();
const record = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
const choice = Object.values(record.decisions).find(value =>
  value.authority.stateRevision === 146 && value.status === 'provider_output_invalid');
assert.ok(choice, 'original B146 paid decision retained');
const attempt = choice.attempts[choice.attemptKeys.at(-1)];
const parameters = JSON.parse(attempt.safeOutput.selection.parametersJson);
const domain = choice.actionIndex.find(value =>
  value.id === attempt.safeOutput.candidateId).action;
const sourceBytes = JSON.stringify({ choice, domain, parameters });
const issue = inspectStarcraftTmgActionParametersV1(domain, parameters);
assert.equal(issue.valid, false, 'B146 attackDice must fail before Rules instantiation');
assert.ok(issue.fieldIssues.some(value => value.fieldPath ===
  'parameters.allocations[0].dice' && value.code === 'required_field_missing'));
assert.ok(issue.fieldIssues.some(value => value.fieldPath ===
  'parameters.allocations[0].attackDice' && value.code === 'additional_field_not_allowed'));
const receipt = { reason: 'RULES_QUERY_PARAMETER_CONTRACT_INVALID',
  safeFailureClass: 'parameter_contract_invalid', findingSeverity: 'Medium',
  mayRepairSameChoice: true, repairContext: { fieldIssues: issue.fieldIssues },
  queryReceiptHash: 'concrete-B146-contract-regression' };
const recovery = planStarcraftTmgParameterFailureRecoveryV1({ domain, parameters,
  receipt, history: choice.parameterRecoveryHistory, maximumRounds: 3 });
assert.equal(recovery.kind, 'parameter_submission_invalid');
assert.equal(recovery.action, 'repair_same_choice');
const repairedChoice = structuredClone(choice);
applyStarcraftTmgParameterFailureRecoveryV1(repairedChoice, recovery,
  { attemptKey: attempt.attemptKey, recordedAt: '2026-10-12T00:00:00.000Z' });
assert.equal(repairedChoice.status, 'generating');
assert.ok(repairedChoice.providerContinuationMessages.at(-1).content
  .includes('parameters.allocations[0].dice'));
assert.deepEqual(repairedChoice.attempts, choice.attempts);
assert.deepEqual(repairedChoice.queryReceipts, choice.queryReceipts);
// Test the canonical shape, not an automatic rename of the paid submission.
const canonical = { closeRanksMode: 'decline',
  allocations: [{ targetUnitId: parameters.allocations[0].targetUnitId, dice: 6 }] };
assert.equal(domain.constraints.declineCloseRanksAttackDice, 6);
assert.equal(inspectStarcraftTmgActionParametersV1(domain, canonical).valid, true);
assert.throws(() => canonicalOfficialSelectedRosterAttackAllocationsV1(
  parameters.allocations, domain.parameterSchema.targetUnitIds, 6,
  'SELECTED_MELEE_FIGHT_ALLOCATION_INVALID'),
  /SELECTED_MELEE_FIGHT_ALLOCATION_INVALID:player1-exact-repair-4/);
assert.deepEqual(canonicalOfficialSelectedRosterAttackAllocationsV1(
  canonical.allocations, domain.parameterSchema.targetUnitIds, 6,
  'SELECTED_MELEE_FIGHT_ALLOCATION_INVALID'), canonical.allocations);
assert.throws(() => canonicalOfficialSelectedRosterAttackAllocationsV1(
  canonical.allocations, domain.parameterSchema.targetUnitIds, 5,
  'SELECTED_MELEE_FIGHT_ALLOCATION_INVALID'), /SELECTED_MELEE_FIGHT_ALLOCATION_INVALID/);
assert.equal(inspectStarcraftTmgActionParametersV1(domain,
  { ...canonical, allocations: [{ ...canonical.allocations[0], dice: 0 }] }).valid, false);
assert.equal(inspectStarcraftTmgActionParametersV1(domain,
  { ...canonical, allocations: [{ ...canonical.allocations[0], targetUnitId: 'other-unit' }] }).valid, false);
assert.equal(JSON.stringify({ choice, domain, parameters }), sourceBytes);
console.log(JSON.stringify({ ok: true, revision: 146,
  originalAttackDice: 6, nestedFieldIssues: issue.fieldIssues,
  recovery: recovery.action, paidReturnsAndReceiptsUnchanged: true,
  providerCalls: 0, roomWrites: 0, rulesApply: 0 }));
