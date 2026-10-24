// Reproduce the saved A query ending after two of three attempts because the
// actual lab's invalid-phase error never reached the correction channel.
import fs from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base = process.argv[2];
// Persist failures even if the tool observing this process disconnects.
process.once('uncaughtException', error => {
  writeFileSync(base + '/common-v116-scenario-repair-gate-failure.private.json', JSON.stringify({
    at: new Date().toISOString(), code: error.code, message: error.message, stack: error.stack,
    providerCalls: 0, roomActions: 0,
  }) + '\n', { mode: 0o600 });
  console.error(error);
  process.exitCode = 1;
});
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const saved = draft.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
assert.equal(saved.request.toolRequest.spec.phase, 'setup');
assert.equal(saved.choices.length, 2);
assert.equal(saved.maximumAttempts, 3);
assert.equal(saved.result.unknownReasonCode, 'PREGAME_LAB_BRANCH_PHASE_INVALID');
const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No action'); }, apply() { throw Error('No mutation'); } } });
const port = createRosterTeachEvidencePortV1(lab);
const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
// Phase validation precedes geometry: run the exact saved paid request, not a
// fabricated failure or a new model response.
const result = await port.query({ ...scope, challengeId: 'captured-phase', request: saved.request });
assert.equal(result.unknownReasonCode, 'PREGAME_LAB_BRANCH_PHASE_INVALID');
assert.equal(result.queryRepair?.correctable, true, 'source phase error must offer the remaining correction attempt');
assert.equal(result.queryRepair.failureTargets[0].requestPointer, '/toolRequest/spec/phase');
assert.equal(result.queryRepair.failureTargets[0].receivedValue, 'setup');
assert.deepEqual(result.queryRepair.failureTargets[0].expectedSchema.enum,
  lab.describeQueryContext().scenarioConstruction.allowedPhases);
assert.equal(result.sourceReceipt, null, 'invalid input must not create a branch');
const operation = structuredClone(saved);
operation.result = result;
operation.currentFailure = result;
const state = { framework: {}, agenda: { questions: [{ questionId: operation.questionId, evidenceRequest: operation.originalRequest }] },
  evidence: [], investigation: { operations: [{ queryId: operation.originalQueryId, questionId: operation.questionId, request: operation.originalRequest }], evidence: [] },
  queryRecovery: { selection: { queryIds: [operation.originalQueryId] }, operations: [operation] } };
let asks = 0;
await recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, evidencePort: port,
  sourceHash: 'c'.repeat(64), completedBeforeRun: true, checkpoint: async () => {},
  ask: async (_kind, blocks) => {
    asks++;
    assert(blocks.some(b => b.result?.queryRepair?.failureTargets?.[0]?.requestPointer === '/toolRequest/spec/phase'));
    return { disposition: 'defer', kind: 'scenario', toolRequestJson: '{}', publicReason: 'Scripted bounded handoff proof, not a strategy or geometry result.' };
  } });
assert.equal(asks, 1);
assert.equal(operation.choices.length, 3);
assert.equal(operation.maximumAttempts, 3);
assert.equal(operation.status, 'model_deferred');
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged, true);
console.log(JSON.stringify({ status: 'PASS', exactSavedPhaseFailure: true, sourceOwnedRepairContract: true,
  remainingAttemptDelivered: true, attemptsReset: false, providerCalls: 0, roomActions: 0,
  actualModelOrRouteCompletionProven: false }));
