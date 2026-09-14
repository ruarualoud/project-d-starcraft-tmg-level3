import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../packages/structured-generation/context-capsule-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const run = 'faction-v1-49e1f39e41163c6b0590';
const input = verifySeal(JSON.parse(await readFile(base + 'terran_armed_forces-input.json', 'utf8')));
const recipe = verifySeal(JSON.parse(await readFile(base + run + '/recipe.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const decode = raw => verifySeal(JSON.parse(raw)).value;
const get = id => decode(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(run, id).artifact);
const roleId = 'faction.terran_armed_forces.threat_tradeoffs.1.review-target-batch-v1.supportive.0.0';
const row = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND id LIKE ? AND state='complete' AND json_extract(artifact,'$.value.roleId')=id").get(run, 'faction.terran_armed_forces.' + roleId + '%');
const value = decode(row.artifact);
const draft = get('faction.terran_armed_forces.threat_tradeoffs.1.known-rule-correction').draft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.axis === 'threat_tradeoffs');
const reviewIndices = [0, 1], requiredSourceRefs = section.requiredSourceRefs;
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: reviewIndices });
const roleRef = { id: roleId, version: 'structured-review-v1', hash: hash(roleId + '.structured-review-v1') };
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section, draft, reviewIndices,
  coverageRequiredSourceRefs: requiredSourceRefs, targets, roleRef, outputContractRef: value.outputContractRef, route: 'supportive' });
const packet = seal({ id: 'faction.terran_armed_forces', inputHash: input.hash, sourceBinding: input.sourceBinding });
const request = { packet, roleId: row.id.slice(packet.id.length + 1), workspace: { section, draft, reviewIndices,
  coverageRequiredSourceRefs: requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const roleInput = { version: 'starcraft_tmg_faction_structured_review_runtime_v1', packetHash: packet.hash,
  roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(capsule), outputContractRef: value.outputContractRef,
  executionPolicyRef: { id: 'policy.faction-target-review.production', version: '2026.09.06.1', hash: hash(policy) },
  semanticAcceptanceInherited: false };
assert.equal(hash(roleInput), row.input_hash);
const resolveArtifact = identity => decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND json_extract(artifact,'$.value.hash')=? LIMIT 1").get(run, identity).artifact);
const resolveResponse = identity => {
  const r = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received' AND json_extract(response,'$.value.usageReceipt.receiptHash')=?").get(run, identity);
  return r ? { response: decode(r.response) } : null;
};
const args = { value, roleInput, request, input, recipe, resolveArtifact, resolveResponse };
const proof = verifyFactionStructuredRoleReplayV1(args);
assert.equal(proof.providerReceiptHashes.length, 1);
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveResponse: () => null }), { code: 'FACTION_STRUCTURED_REPLAY_RECEIPT_MISSING' });
const change = (x, fields) => { const { hash: ignored, ...body } = x; return seal({ ...body, ...fields }); };
const wrongOutput = structuredClone(value.output); wrongOutput.verdicts[0].verdict = 'unsupported';
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, value: change(value, { output: wrongOutput }) }), { code: 'FACTION_STRUCTURED_REPLAY_HOST_MAPPING_DRIFT' });
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args,
  value: change(value, { initialContextCapsuleHash: hash('foreign') }) }), { code: 'FACTION_STRUCTURED_REPLAY_ROLE_BINDING_INVALID' });
db.close();
const files = ['packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs', 'scripts/verify-ticket-18-faction-structured-replay-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const report = seal({ passed: true, actualRunId: run, actualRoleHash: value.hash,
  nativeRoleInputHashMatched: true, actualProviderReceipts: proof.providerReceiptHashes,
  changedJudgmentRejected: true, wrongContextRejected: true, missingPaymentRejected: true,
  completeFactionNotYetInspected: true, newProviderCalls: 0, codeHashes, trainingTruth: false });
await writeFile(base + 'structured-replay-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualRoles: 1, newProviderCalls: 0, hash: report.hash }));
