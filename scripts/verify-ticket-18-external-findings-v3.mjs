import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { inspectCompletedRepair } from '../packages/skill-production-v3/repair-gate.mjs';
import { externalBlockersForCandidate, assertNoKnownExternalClaimFailure } from '../packages/skill-production-v3/external-findings.mjs';
import { repairExternalPacket } from '../packages/skill-production-v3/external-repair.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'build/ticket-18-production-v3'), run = 'rules-v3-1dc2feb6d351a65c83be';
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const db = new DatabaseSync(filename, { readOnly: true });
const get = file => readFile(path.join(out, run, file + '.json'), 'utf8').then(JSON.parse);
const candidates = await Promise.all([1, 2, 3, 4, 5].map(n => get('rules-reading-00' + n)));
assert.deepEqual(candidates.map(c => externalBlockersForCandidate(db, c).length), [0, 2, 2, 0, 1]);
assert.throws(() => assertNoKnownExternalClaimFailure(db, candidates[2]), { code: 'KNOWN_EXTERNAL_PACKET_ISSUE' });
const { hash: oldHash, ...oldBody } = candidates[2];
assert.throws(() => assertNoKnownExternalClaimFailure(db, seal({ ...oldBody, arbitraryNewMetadata: true })), { code: 'KNOWN_EXTERNAL_PACKET_ISSUE' });
assert.throws(() => assertNoKnownExternalClaimFailure(db, { ...candidates[2], contextHash: 'tampered' }));
assertNoKnownExternalClaimFailure(db, candidates[0]); assertNoKnownExternalClaimFailure(db, candidates[3]);
const catalogue = await loadFrozenSkillEvidence(root), plan = createFirstFivePlan(catalogue), context = createGlobalProductionContext(catalogue);
await assert.rejects(async () => inspectCompletedRepair({ filename, recipe: await get('recipe'), report: await get('report'),
  plan, catalogue, context }), { code: 'KNOWN_EXTERNAL_PACKET_ISSUE' });
const target = candidates[2], findings = externalBlockersForCandidate(db, target), packet = plan.packets[2];
const reader = createEvidenceReader(catalogue), revised = structuredClone(target.draft);
revised.claims[4] = { kind: 'rule', text: '接入点连接不同海拔层级，经过它移动的模型可以改变海拔；FAQ09允许连贯性连线经过接入点。这不是视线许可，视线须独立按阻挡地形、足迹与掩护规则判定。',
  evidence: [{ ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.0', spanId: 'p1' },
    { ref: 'faq-v1:09', spanId: 'p1' }, { ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.5', spanId: 'p1' }] };
revised.claims[6].text += '初始槽位由派系卡提供；建军时花费高能瓦斯购买战术卡可以解锁额外槽位。';
const patch = { parentHash: hash(target.draft), replacements: [4, 6].map(i => ({ claimId: 'claims.' + i, value: revised.claims[i] })), additions: [], citationAdditions: [] };
const temp = await mkdtemp(path.join(out, 'external-repair-test-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'external-repair-fixture', recipeHash: hash('fixture') });
let calls = 0;
const dsh = { async run({ task }) {
  calls++;
  assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n'));
  const ws = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
  if (task.includes('Correct only the flagged existing claims')) return { final: patch, injected: true };
  const verdicts = ws.claims.map(c => ({ claimId: c.claimId, verdict: 'supported', reason: 'Injected external-correction workflow fixture only.', evidence: c.evidence }));
  return { final: { verdicts, passageCoverage: ws.assignedPassages.map(p => ({ ...p, verdict: 'covered', reason: 'Injected source completeness fixture.',
    claimIds: ws.claims.filter(c => c.evidence.some(e => e.ref === p.ref && e.spanId === p.spanId)).map(c => c.claimId) })) }, injected: true };
} };
const runtime = createProductionRuntimeV3({ store, context, reader, dsh });
const repaired = await repairExternalPacket({ runtime, packet, candidate: target, findings, context, reader });
assert.equal(calls, 3); assert(repaired.candidate.semanticPassed);
assert.equal(repaired.seed.semanticAcceptanceInherited, false); assert.equal(repaired.repair.externalProbePassed, false);
assert.equal(repaired.repair.formalSkillAcceptance, false);
for (let i = 0; i < target.draft.claims.length; i++) if (![4, 6].includes(i)) assert.deepEqual(repaired.candidate.draft.claims[i], target.draft.claims[i]);
assertNoKnownExternalClaimFailure(db, repaired.candidate);
await assert.rejects(repairExternalPacket({ runtime, packet, candidate: repaired.candidate, findings, context, reader }), { code: 'EXTERNAL_REPAIR_FINDING_STALE' });
let noOpCalls = 0;
await assert.rejects(repairExternalPacket({ runtime: { role: async () => { noOpCalls++; return seal({ output: { parentHash: hash(target.draft), replacements: [], additions: [] } }); } },
  packet, candidate: target, findings, context, reader }), { code: 'EXTERNAL_PATCH_NO_PROGRESS' });
assert.equal(noOpCalls, 1); store.close();
db.close();
console.log(JSON.stringify({ passed: true, checks: 10, blockedPackets: 3, openFindings: 5,
  injectedCorrectionWorkflowPassed: true, readyForNextProductionPhase: false, providerCalls: 0 }));
