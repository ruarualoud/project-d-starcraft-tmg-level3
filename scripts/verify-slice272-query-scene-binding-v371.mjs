import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { assessRosterTeachQueryCorrectionScopeV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const formal = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const queries = formal.selectionEvidence.queries;
const scenes = formal.selectionEvidence.scenarios;
const requested = JSON.parse(gunzipSync(await fs.readFile(process.argv[3] + '/call-115.product-request.json.gz')))
  .promptNodes.find(n => n.kind === 'failed_query_to_correct').request;
const reply = JSON.parse(gunzipSync(await fs.readFile(process.argv[3] + '/call-115.reply.json.gz'))).output;
const wrongBranch = JSON.parse(reply.edits[0].valueJson);
const query = queries.find(q => q.receipt.receiptHash === requested.toolRequest.branchIdRef).receipt;
const saved = scenes.find(s => s.receipt.sourceReceipt.branchStateHash === query.baseStateHash);
assert(saved);
const body = { schema: 'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
  sourceStateHash: query.sourceStateHash, builderBundleHash: query.builderBundleHash,
  rulesRuntimeHash: query.rulesRuntimeHash, readOnly: true, mutatesRoomState: false,
  mutatesBuilderState: false, mutatesSourceData: false, reimplementsRules: false,
  resultsBoundToSourceState: true, unknownStaysUnknown: true, hostPreferenceWeightsApplied: false,
  sameStateABComparisonSupported: true, scenarioBranchesOperateOnClonesOnly: true,
  hypotheticalPlacementsAreAdvisoryNotRulesLegality: true, providerCalls: 0, trainingTruth: false };
let restores = 0;
const noExecution = () => { throw Error('NO_QUERY_OR_FORMATION_REEXECUTION'); };
const port = createRosterTeachEvidencePortV1({ labDescriptor: () => ({ ...body, descriptorHash: hash(body) }),
  proveMutationZero: noExecution, queryProbability: noExecution, querySpatial: noExecution,
  queryMath: noExecution, queryThreatExchange: noExecution, runScenarioBranch: noExecution,
  restoreHypotheticalBranch: ({ receipt }) => { restores++; return { branchStateHash: receipt.branchStateHash }; },
  describeQueryContext: ({ base }) => ({ sourceStateHash: query.sourceStateHash,
    baseStateHash: base.kind === 'source' ? query.sourceStateHash : base.branchStateHash }),
}, { retainedScenarios: scenes, retainedQueryReceipts: queries.map(q => q.receipt) });
const actual = port.describeQueryContext(query.receiptHash);
assert.equal(actual.baseStateHash, query.baseStateHash,
  'An exact retained query receipt must bind to its original scene, never a guessed scene');
assert.equal(restores, 1);
const directory = actual.availableScenarioBranches.find(s => s.branchIdRef === saved.challengeId);
assert(directory.queryReceiptRefs.includes(query.receiptHash));
assert.throws(() => port.describeQueryContext('arbitrary-unknown-hash'), /BRANCH_REF_UNKNOWN/);
const fixed = { ...requested, toolRequest: { ...requested.toolRequest, branchIdRef: saved.challengeId } };
const wrong = { ...requested, toolRequest: { ...requested.toolRequest, branchIdRef: wrongBranch } };
const options = { resolveQueryContext: ref => port.describeQueryContext(ref) };
assert.equal(assessRosterTeachQueryCorrectionScopeV1(requested, fixed, options).sameNamedScope, true);
const rejected = assessRosterTeachQueryCorrectionScopeV1(requested, wrong, options);
assert.equal(rejected.sameNamedScope, false, 'Same unit names in a different scene are not the original scenario');
assert.equal(rejected.sceneScopeChanged, true);
console.log(JSON.stringify({ pass: true, exactReceiptToSceneBinding: true,
  changedSceneRejected: true, arbitraryReferenceRejected: true, restores,
  nativeQueries: 0, providerCalls: 0, writes: 0 }));
