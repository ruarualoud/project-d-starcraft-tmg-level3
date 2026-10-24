import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterToolPortV1 } from '../packages/roster-strategist/iterative-roster-tool-port-v1.mjs';
const [directory] = process.argv.slice(2);
const captured = JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-046.product-request.json.gz`))).promptNodes[0].content;
const result = captured.latestToolTurn.results[0];
const state = { sessionId: captured.decisionState.sessionId, modelContextVersion: 19,
  frozenContext: captured.decisionState.frozenContext, currentCandidate: captured.decisionState.currentCandidate,
  observations: [{ query: result.query, receipt: result.receipt, requestKey: captured.latestToolTurn.requestKey }] };
const original = JSON.stringify(state);
let solves = 0, restores = 0, restored;
const lab = {
  labDescriptor: () => ({ sourceStateHash: result.receipt.sourceStateHash }),
  runScenarioBranch: () => { solves++; throw Error('HISTORICAL_SCENE_MUST_NOT_BE_RESOLVED'); },
  restoreHypotheticalBranch: input => { restores++; restored = structuredClone(input); return input.receipt; },
  describeQueryContext: input => ({ exactQueriedBase: input.base }),
};
const port = createIterativeRosterToolPortV1({
  armyBuilderPort: { evaluateRosterCandidate() {}, enumerateArmyBuildingChoices() {} },
  mapEvidencePort: { summarizeMap() {}, evaluateRosterRoute() {} },
  createSceneLaboratory: () => lab,
});
const advertised = port.describeCapabilities(state).retainedSelectionScenes;
assert(advertised?.some(row=>row.branchStateHash===result.receipt.branchStateHash),
  'Actual newly created selector scene must be discoverable alongside retained Teach scenes');
const receipt = await port.query({ kind: 'scene_context', candidateHash: state.currentCandidate.candidateHash,
  branchStateHash: result.receipt.branchStateHash }, state);
assert.equal(receipt.queryContext.exactQueriedBase.branchStateHash, result.receipt.branchStateHash);
assert.equal(solves, 0); assert.equal(restores, 1);
assert.deepEqual(restored.spec, JSON.parse(result.query.argumentsJson));
assert.deepEqual(restored.receipt.hypotheticalPlacements, result.receipt.hypotheticalPlacements);
assert.equal(restored.receipt.receiptHash, result.receipt.sourceReceiptHash);
const body = { ...restored.receipt }; delete body.receiptHash;
assert.equal(hash(body), restored.receipt.receiptHash, 'Recover original Native receipt, never invent or re-sign it');
assert.equal(port.describeCapabilities({ ...state, currentCandidate: { candidateHash: 'another-army' } }).retainedSelectionScenes.length, 0);
assert.equal(JSON.stringify(state), original);
console.log(JSON.stringify({ pass: true, checks: 3, actualNewSelectorSceneDiscoverable: true,
  exactPositionsRestored: true, changedArmyExcluded: true, newScenarios: solves, providerCalls: 0, nativeActions: 0 }));
