import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { inspectStarcraftTmgActionParametersV1 } from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
import { reprojectRosterTeachNativeQueryRepairV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/F/fresh-generation-v274/workspace/iterative-draft/sessions`;
const filename = (await fs.readdir(directory)).find(name => name.endsWith('.json'));
const stored = JSON.parse(await fs.readFile(`${directory}/${filename}`, 'utf8'));
const state = (stored.value ?? stored).draftTeachSnapshots.at(-1).state;
const receipt = state.investigation.evidence.find(row => row.unknownReasonCode === 'SELECTED_MELEE_CHARGE_TARGET_INVALID'
  && row.queryRepair?.actionSpace?.parameterDomains?.some(domain => domain.actionType === 'charge'));
assert(receipt, 'Actual F contains the rejected charge declaration');
const operation = state.investigation.operations.find(row => hash(row.request) === receipt.requestHash);
assert(operation, 'Use the exact original request, not a synthetic target');
const request = operation.request, args = JSON.parse(request.toolRequest.argumentsJson);
const domain = receipt.queryRepair.actionSpace.parameterDomains.find(row => row.domainId === args.domainId);
const originalDomain = hash(domain), originalReceipt = hash(receipt), originalRequest = hash(request);
const bad = inspectStarcraftTmgActionParametersV1(domain, args.parameters);
assert.equal(bad.valid, false, 'Actual targetUnitId/targetModelId typo must be classified before Native instantiation');
assert(bad.fieldIssues.some(issue => issue.fieldPath === 'parameters.targets[0].unitId'));
assert(bad.fieldIssues.some(issue => issue.fieldPath === 'parameters.targets[0].targetUnitId'));
assert.equal(bad.parameterContract.additionalFieldsAllowed, false);
const corrected = { leadingModelId: args.parameters.leadingModelId,
  targets: args.parameters.targets.map(row => ({ unitId: row.targetUnitId, modelId: row.targetModelId })) };
assert.equal(inspectStarcraftTmgActionParametersV1(domain, corrected).valid, true);
assert.equal(inspectStarcraftTmgActionParametersV1(domain, { ...corrected, path: [] }).valid, false,
  'Declaration does not accept a movement path');
assert.equal(inspectStarcraftTmgActionParametersV1(domain, { ...corrected, targets: [...corrected.targets, ...corrected.targets] }).valid, false);
assert.equal(inspectStarcraftTmgActionParametersV1(domain, { ...corrected, targets: [{ ...corrected.targets[0], modelId: corrected.leadingModelId }] }).valid, false);
const { canonicalOfficialSelectedRosterChargeParametersV1 } = await import('../packages/product-composition/official-selected-roster-charge-parameter-contract-v1.mjs');
assert.deepEqual(canonicalOfficialSelectedRosterChargeParametersV1(domain, corrected), corrected);
assert.throws(() => canonicalOfficialSelectedRosterChargeParametersV1(domain, args.parameters), /SELECTED_MELEE_CHARGE_TARGET_INVALID/);
const projected = reprojectRosterTeachNativeQueryRepairV1({ request, receipt, queryContext: receipt.queryRepair });
assert(projected.queryRepair.failureTargets.some(row => row.currentParameterContractReview?.fieldIssues?.length),
  'Saved old failure must expose the current source contract without replaying its action');
const feedback = projected.queryRepair.failureTargets.find(row => row.currentParameterContractReview)
  .currentParameterContractReview.repairContext;
assert.equal(feedback.stage, 'charge_declaration');
assert(!Object.hasOwn(feedback, 'submittedPath'));
assert(!Object.hasOwn(feedback, 'submittedDistanceIncludingHostStartMilliInches'),
  'Declaration input repair must not invent zero-distance movement feedback');
assert.equal(projected.nativeParameterContractProjection?.nativeExecutions, 0);
assert.deepEqual(projected.sourceReceipt, receipt.sourceReceipt);
assert.equal(hash(receipt), originalReceipt);
assert.equal(hash(request), originalRequest);
assert.equal(hash(domain), originalDomain, 'Do not reseal or expand the Native target domain');
assert.deepEqual(reprojectRosterTeachNativeQueryRepairV1({ request, receipt: projected, queryContext: receipt.queryRepair }), projected);
console.log(JSON.stringify({ pass: true, actualLegacyCharge: true, invalidFieldIssues: bad.fieldIssues.length,
  correctedSubmissionShapeValid: true, targetAndAuthorityUnchanged: true,
  oldFailureReprojectedWithoutExecution: true, providerCalls: 0, nativeActions: 0,
  chargeReachOrStrategicValueNotProven: true }));
