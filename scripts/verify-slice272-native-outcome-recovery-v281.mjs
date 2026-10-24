// Actual A supplied the chance contract descriptor instead of explicit die faces.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parsePregameNativeActionInputV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { reprojectRosterTeachNativeQueryRepairV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base] = process.argv.slice(2);
const state = JSON.parse(await fs.readFile(`${base}/A/fresh-generation-v264/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
const investigation = state.teachFramework.state.investigation;
const receipt = investigation.evidence.find(e => e.unknownReasonCode === 'PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'
  && !e.queryNotExecuted && !e.repeatedFailedRequest);
assert(receipt, 'Use the first original failure, not a cache wrapper');
const operation = investigation.operations.find(o => o.queryId === receipt.challengeId);
assert(operation);
const request = operation.request;
const before = hash({ request, receipt });
let rejection;
try { parsePregameNativeActionInputV1(request.toolRequest); } catch (error) { rejection = error; }
assert.equal(rejection?.code, 'PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID',
  'Shared source input parser must reject a chance contract where die faces are required');
assert.equal(rejection.queryRepair.correctable, true);
assert.match(rejection.queryRepair.correctionInstruction, /array.*integer die faces/);
assert.equal(rejection.queryRepair.hostSelectsDomain, false);
const projected = reprojectRosterTeachNativeQueryRepairV1({ request, receipt, queryContext: {} });
assert.equal(projected.status, 'unknown');
assert.equal(projected.queryRepair.sourceContract, 'pregame_native_action_input_v1');
assert.equal(projected.nativeInputRepairProjection.nativeExecutions, 0);
// This saved operation is an investigation request, not an already-attempted
// recovery operation. Its source-owned contract admits initial correction;
// do not pass it to the separate legacy retry-continuation predicate.
assert.equal(projected.queryRepair.correctable, true);
assert.equal(projected.queryRepair.failureTargets[0].requestPointer, '/toolRequest/argumentsJson');
assert.strictEqual(reprojectRosterTeachNativeQueryRepairV1({ request, receipt: projected, queryContext: {} }), projected);
assert.equal(hash({ request, receipt }), before);
const input = JSON.parse(request.toolRequest.argumentsJson);
const validTransport = { ...input, outcome: { chanceReveals: [1, 6] } };
assert.deepEqual(parsePregameNativeActionInputV1({ argumentsJson: JSON.stringify(validTransport) }), validTransport,
  'Shape admission does not check or invent the selected action count; Native still validates it');
const noOutcome = { domainId: input.domainId, parameters: input.parameters };
assert.deepEqual(parsePregameNativeActionInputV1({ argumentsJson: JSON.stringify(noOutcome) }), noOutcome);
console.log(JSON.stringify({ pass: true, originalFailure: receipt.challengeId,
  newAndRetainedInputRecoverable: true, originalEvidenceUnchanged: true,
  nativeDiceValidationUnchanged: true, providerCalls: 0, nativeActions: 0 }));
