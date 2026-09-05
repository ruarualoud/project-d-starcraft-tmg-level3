import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { repairExternalPacket } from '../packages/skill-production-v3/external-repair.mjs';
import { createConfirmedOverallOmissionsV1, prepareCompleteSkillRepairV1, repairCompleteSkillV1 } from '../packages/skill-production-v3/complete-source-repair-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-production-v3');
const parent = path.join(base, 'overall-v3-cdf99e843cad9297a084');
const get = name => readFile(path.join(parent, name + '.json'), 'utf8').then(JSON.parse).then(verifySeal);
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue);
const plan = createFirstFivePlan(catalogue), context = createGlobalProductionContext(catalogue);
const packets = await Promise.all(plan.packets.map(p => get(p.id))), candidate = await get('overall-rules-candidate');
const findings = createConfirmedOverallOmissionsV1({ candidate, packets, context, reader });
const deps = { catalogue, plan, context, candidate, packets, findings };
const manifest = prepareCompleteSkillRepairV1(deps);
assert.equal(manifest.targets.length, 2); assert.equal(manifest.affectedPackets, 1); assert.equal(manifest.untouchedPackets, 36);
assert.deepEqual(manifest.targets.map(t => t.claimId), ['claims.0', 'claims.5']);
assert.throws(() => prepareCompleteSkillRepairV1({ ...deps, findings: [...findings, findings[0]] }), { code: 'COMPLETE_REPAIR_PARENT_OR_FINDINGS_INVALID' });
assert.throws(() => prepareCompleteSkillRepairV1({ ...deps, packets: packets.slice(1) }), { code: 'OVERALL_PACKET_DENOMINATOR_INVALID' });
const { hash: ignored, ...candidateBody } = candidate;
assert.throws(() => createConfirmedOverallOmissionsV1({ candidate: seal({ ...candidateBody, arbitrary: true }), packets, context, reader }), { code: 'COMPLETE_OMISSION_AUDIT_PARENT_DRIFT' });
const target = packets[17], draft = structuredClone(target.draft);
draft.claims[0].text += '领队底座的任何部分移动都不能超过该单位的Speed，而非仅检查底座中心位移。';
draft.claims[5].text += '仍在有效期内的限时增益、减益及任务效果保留，但离场不会暂停计时；原本在Cleanup & Refresh到期的仍在那里到期，无论单位是否在战场。';
const patch = { parentHash: hash(target.draft), replacements: [0, 5].map(n => ({ claimId: 'claims.' + n, value: draft.claims[n] })), additions: [], citationAdditions: [] };
const temp = await mkdtemp(path.join(base, 'complete-source-repair-test-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'injected-complete-repair', recipeHash: hash('fixture') });
let dshCalls = 0, repairCalls = 0, importCalls = 0;
const runtime = createProductionRuntimeV3({ store, context, reader, dsh: { async run({ task }) {
  dshCalls++; assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n'));
  const ws = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
  if (task.includes('Correct only the flagged existing claims')) return { final: patch, injected: true };
  return { final: { verdicts: ws.claims.map(c => ({ claimId: c.claimId, verdict: 'supported',
    reason: 'Injected workflow test only; not an actual independent source judgment.', evidence: c.evidence })),
    passageCoverage: target.rounds.at(-1).reviews[0].passageCoverage.map(({ sourceEvidence, ...p }) => ({ ...p,
      reason: 'Injected coverage workflow fixture copied from the retained parent; no quality claim.' })) }, injected: true };
} } });
const importPacket = async ({ candidate: packet }) => { importCalls++; return packet; };
const result = await repairCompleteSkillV1({ ...deps, importPacket, repairPacket: async args => {
  repairCalls++; return repairExternalPacket({ ...args, runtime, context, reader });
} });
assert.equal(dshCalls, 3); assert.equal(repairCalls, 1); assert.equal(importCalls, 36);
assert.equal(result.candidate.coverage.claims, 522); assert.equal(result.receipt.unchangedClaims, 520);
assert(!result.receipt.formalAcceptance && !result.receipt.actualExamPassed);
assert.notEqual(result.candidate.hash, candidate.hash);
for (let n = 0; n < 37; n++) if (n !== 17) assert.equal(result.packets[n].hash, packets[n].hash);
for (let n = 0; n < target.draft.claims.length; n++) if (![0, 5].includes(n)) assert.deepEqual(result.packets[17].draft.claims[n], target.draft.claims[n]);
function injectedRepair(newCandidate) {
  return { candidate: newCandidate, repair: seal({ parentCandidateHash: target.hash, candidateHash: newCandidate.hash, findingHashes: findings.map(f => f.hash) }) };
}
await assert.rejects(() => repairCompleteSkillV1({ ...deps, importPacket, repairPacket: async () => injectedRepair(target) }), { code: 'COMPLETE_REPAIR_NO_PROGRESS' });
const { hash: oldHash, ...targetBody } = target;
const unflagged = structuredClone(draft); unflagged.claims[1].text += 'UNAUTHORIZED TEST CHANGE';
await assert.rejects(() => repairCompleteSkillV1({ ...deps, importPacket, repairPacket: async () => injectedRepair(seal({ ...targetBody, draft: unflagged })) }), { code: 'COMPLETE_REPAIR_UNFLAGGED_CHANGE' });
await assert.rejects(() => repairCompleteSkillV1({ ...deps, importPacket: async ({ candidate: p }) => { const { hash: h, ...b } = p; return seal({ ...b, unauthorized: true }); }, repairPacket: async () => result }), { code: 'COMPLETE_REPAIR_UNTOUCHED_PACKET_DRIFT' });
store.close();
const files = ['packages/skill-production-v3/complete-source-repair-v1.mjs', 'scripts/verify-ticket-18-complete-source-repair-v1.mjs',
  'packages/skill-production-v3/external-repair.mjs', 'packages/skill-production-v3/external-findings.mjs',
  'packages/skill-evaluation/overall-rules-package-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 10, contextHash: context.hash, parentCandidateHash: candidate.hash,
  findingsHashes: findings.map(f => f.hash), codeHashes, providerCalls: 0, injectedOnly: true,
  actualCorrectionQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'complete-source-repair-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 10, affectedPackets: 1, untouchedPackets: 36,
  changedClaims: 2, unchangedClaims: 520, providerCalls: 0, hash: report.hash }));
