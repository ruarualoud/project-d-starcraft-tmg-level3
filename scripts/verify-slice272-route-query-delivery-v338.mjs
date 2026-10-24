import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { describeIterativeRosterCapabilitiesV1 } from '../packages/roster-strategist/iterative-roster-capabilities-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async name => JSON.parse(gunzipSync(await fs.readFile(`${directory}/${name}`)));
const request = await read('call-042.product-request.json.gz');
const reply = await read('call-042.reply.json.gz');
const source = request.promptNodes[0].content.decisionState;
const original = JSON.stringify(reply);
async function throughProduct(output) {
  const saved = new Map();
  const state = { sessionId: source.sessionId, revision: 0, modelContextVersion: 19,
    mineralBudget: source.mineralBudget, frozenContext: source.frozenContext,
    currentCandidate: source.currentCandidate, plan: source.plan,
    observations: [], iterations: [] };
  const port = createIterativeRosterFlashModelPortV1({
    skillGuidance: {}, missionEvidence: {},
    queryCapabilities: s => describeIterativeRosterCapabilitiesV1(s, { sceneAvailable: true }),
    replyStore: { loadRetainedReply: async key => saved.get(key),
      retainReply: async (key, value) => saved.set(key, value) },
    deliberationFactory: { createForRun: async ({ onEvent }) => ({
      deliberate: async () => onEvent({ type: 'round_completed', receiptHash: reply.receipt.receiptHash,
        sanitizedOutputRecord: { sanitizedOutput: structuredClone(output) },
        usage: {}, paidProviderCall: false }),
    }) },
  });
  return (await port.decide({ requestKey: 'actual-42-reproduction', state })).decision;
}
const actual = await throughProduct(reply.output);
assert.equal(actual.kind, 'query');
assert.deepEqual(actual.queries[0], {
  kind: 'scene_query', candidateHash: reply.output.queries[0].candidateHash,
  queryKind: 'mission_marker_control', argumentsJson: reply.output.queries[0].argumentsJson,
  branchStateHash: reply.output.queries[0].branchStateHash,
});
for (let i = 1; i < 4; i++) {
  assert.equal(actual.queries[i].argumentsJson, reply.output.queries[i].argumentsJson,
    'Actual requested unit/target must not disappear at the wire-to-tool boundary');
  assert.equal(actual.queries[i].kind, 'scene_query');
  assert.equal(actual.queries[i].queryKind, 'map.route_access');
}
const legacy = structuredClone(reply.output);
legacy.queries = [{ ...legacy.queries[1], argumentsJson: '', branchStateHash: '' }];
const aggregate = await throughProduct(legacy);
assert.deepEqual(aggregate.queries, [{ kind: 'map_route', candidateHash: source.currentCandidate.candidateHash }],
  'Legacy whole-army route audit remains a distinct unchanged operation');
const branch = structuredClone(reply.output);
branch.queries = [{ ...branch.queries[1], branchStateHash: reply.output.queries[0].branchStateHash }];
assert.equal((await throughProduct(branch)).queries[0].branchStateHash, branch.queries[0].branchStateHash);
const conflict = structuredClone(branch);
conflict.queries[0].queryKind = 'attack_probability';
assert.equal((await throughProduct(conflict)).kind, 'repair_needed', 'Never silently substitute another explicit tool kind');
assert.equal(JSON.stringify(reply), original);
console.log(JSON.stringify({ pass: true, checks: 4, actualReply42: true,
  exactUnitTargetAndBranchPreserved: true, legacyArmyAuditPreserved: true,
  conflictingToolRepairable: true, providerCalls: 0, nativeCalls: 0 }));
