import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-b624e21a2da88377b410';
const read = async n => verifySeal(JSON.parse(await readFile(base + n + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), input = await read(runId + '/terran_armed_forces-input');
const { rebuildRequest: request } = await read('native-target-reconstruction-diagnosis');
const capacity = recipe.nativeOutputCapacityBinding;
const prepared = prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(request, capacity),
  executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity, proposerBatchBinding: recipe.proposerBatchBinding,
  proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding, targetReconstructionBinding: recipe.nativeTargetReconstructionBinding });
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite', db = new DatabaseSync(filename, { readOnly: true });
let value, original;
try {
  const get = id => db.prepare('SELECT artifact,input_hash FROM steps WHERE run=? AND id=?').get(runId, id);
  const row = get(prepared.fullRoleId);
  assert.equal(row.input_hash, hash(prepared.roleInput));
  value = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
  original = verifySeal(verifySeal(JSON.parse(get(prepared.fullRoleId.slice(0, -'.target-reconstruction.v1'.length)).artifact)).value);
} finally { db.close(); }
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId,
  attemptId: 'structured-08237f616058d341911e3b78bfd78496efac18fc9a82b59d' });
const resolveArtifact = h => { assert.equal(h, original.hash); return original; };
const args = { value, input, request, roleInput: prepared.roleInput, recipe,
  resolveArtifact, resolveTeachFailureEvidence: () => evidence };
let checks = 0;
const check = (name, fn) => { fn(); checks++; };
check('actual corrected consumer request and full invocation', () => assert.deepEqual(
  verifyFactionStructuredRoleReplayV1(args).providerReceiptHashes, [value.hostMaterialization.originalFailureReceiptHash]));
check('actual new native request is8192', () => assert.equal(JSON.parse(prepared.payload).outputCapacityBindingHash, capacity.hash));
check('real subjects now match target4/5', () => assert.deepEqual(value.output.items.map(i => [i.index, i.value.title]), [
  [4, 'Dropship 机动回收与延迟部署：Strap in! 与 Ready For Dust-off 的运用'],
  [5, 'Factory 的 Elite 槽位与机械维修：Field Repair 的运用'],
]));
for (const key of ['nativeOutputCapacityBinding', 'proposerBatchBinding', 'nativeTargetReconstructionBinding']) {
  const changed = structuredClone(recipe); delete changed[key];
  check('missing real binding rejected ' + key, () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, recipe: changed })));
}
check('original wrong draft required', () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveArtifact: null }),
  { code: 'FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_BINDING_REQUIRED' }));
const { hash: ignored, ...old } = original;
check('original semantic failure cannot be replaced', () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args,
  resolveArtifact: () => seal({ ...old, output: value.output }) })));
const changedRequest = structuredClone(request); changedRequest.workspace.completedRecommendations[0].risk += ' changed';
check('full prior prose drift rejected', () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, request: changedRequest })));
const changedValue = structuredClone(value); delete changedValue.hash; changedValue.output.items[0].value.title += ' changed';
check('normalized prose cannot drift', () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, value: seal(changedValue) })));
const files = ['packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/verify-ticket-18-native-reference-reconstruction-consumer-v2.mjs'];
const report = seal({ passed: true, checks, runId, originalPaidArtifactHash: value.hash,
  originalPaidFailureReceiptHash: value.hostMaterialization.originalFailureReceiptHash,
  originalWrongDraftHash: original.hash, fullRoleInputHash: hash(prepared.roleInput),
  providerCalls: 0, newDshSessions: 0, actualStoredDshReceiptVerified: true,
  acceptanceInherited: false, strategyProven: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'native-reference-reconstruction-consumer-readiness-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, actualArtifactHash: value.hash, hash: report.hash }));
