import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

// Reproduce actual108: saved selector scenes work when named, yet the next
// query's repair directory says there are no available scene references.
const formal = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const saved = formal.selectionEvidence.scenarios;
assert(saved.length > 0);
const native = saved[0].receipt.sourceReceipt;
const body = { schema: 'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
  sourceStateHash: native.sourceStateHash, builderBundleHash: native.builderBundleHash,
  rulesRuntimeHash: native.rulesRuntimeHash, readOnly: true, mutatesRoomState: false,
  mutatesBuilderState: false, mutatesSourceData: false, reimplementsRules: false,
  resultsBoundToSourceState: true, unknownStaysUnknown: true, hostPreferenceWeightsApplied: false,
  sameStateABComparisonSupported: true, scenarioBranchesOperateOnClonesOnly: true,
  hypotheticalPlacementsAreAdvisoryNotRulesLegality: true, providerCalls: 0, trainingTruth: false };
let nativeExecutions = 0;
const forbidden = () => { nativeExecutions++; throw Error('DIRECTORY_MUST_NOT_EXECUTE_OR_RESTORE'); };
const port = createRosterTeachEvidencePortV1({
  labDescriptor: () => ({ ...body, descriptorHash: hash(body) }),
  describeQueryContext: () => ({ sourceStateHash: native.sourceStateHash, phase: 'setup' }),
  proveMutationZero: () => ({ sourceStateMutationCount: 0, sourceStateHashUnchanged: true,
    builderBundleHashUnchanged: true, rulesRuntimeHashUnchanged: true }),
  queryProbability: forbidden, querySpatial: forbidden, queryMath: forbidden,
  queryThreatExchange: forbidden, runScenarioBranch: forbidden,
  restoreHypotheticalBranch: forbidden,
}, { retainedScenarios: saved });
const context = port.describeQueryContext();
assert.deepEqual(context.availableFoundationBranchRefs?.toSorted(), saved.map(s => s.challengeId).toSorted(),
  'Lazy saved branches are missing from the actual tool discovery directory');
for (const row of saved) {
  const description = context.availableScenarioBranches.find(s => s.branchIdRef === row.challengeId);
  assert.equal(description.branchStateHash, row.receipt.sourceReceipt.branchStateHash);
  assert.equal(description.scenarioReceiptHash, row.receipt.sourceReceipt.receiptHash);
  assert.equal(description.restorationRequiresSourceValidation, true);
}
const bad = await port.query({ mutationAuthority: false, initialFoundationHash: hash('probe'),
  sourceHashes: [native.sourceStateHash], challengeId: 'directory-probe',
  request: { kind: 'spatial', toolRequest: { branchIdRef: 'not-a-scene',
    queryKind: 'mission_marker_control', argumentsJson: '{}' } } });
assert.equal(bad.unknownReasonCode, 'ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN');
assert.deepEqual(bad.queryRepair.availableScenarioBranches, context.availableScenarioBranches);
assert.deepEqual(bad.queryRepair.availableFoundationBranchRefs, context.availableFoundationBranchRefs);
assert.equal(nativeExecutions, 0);
console.log(JSON.stringify({ pass: true, savedScenes: saved.length,
  discoveryAndRepairSameDirectory: true, unknownReferenceNotGuessed: true,
  nativeExecutions, providerCalls: 0, writes: 0 }));
