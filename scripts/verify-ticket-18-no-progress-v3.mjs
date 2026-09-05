import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { externalBlockersForCandidate } from '../packages/skill-production-v3/external-findings.mjs';
import { repairExternalPacket } from '../packages/skill-production-v3/external-repair.mjs';
import { applyIssuePatch } from '../packages/skill-production-v3/contracts.mjs';
import { seal, hash } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-production-v3');
const candidate = JSON.parse(await readFile(path.join(base, 'rules-v3-1dc2feb6d351a65c83be/rules-reading-003.json'), 'utf8'));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('rules-v3-45543327938bde810be5', 'rules-reading-003.external-source-editor');
const actual = JSON.parse(row.artifact).value;
const findings = externalBlockersForCandidate(db, candidate); db.close();
// The actual response contains both requested paths, but preserves BOTH bad
// texts verbatim. This is not a hash false positive or a missing evidence row.
assert.equal(actual.output.replacements.length, 2);
for (const f of findings) {
  assert.equal(hash(actual.output.replacements.find(p => p.claimId === f.claimId).value.text), f.claimTextHash);
  assert(f.evidence.every(e => e.quote && e.quote.length > 0));
}
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue);
const context = createGlobalProductionContext(catalogue), packet = createFirstFivePlan(catalogue).packets[2];
const fixture = structuredClone(actual.output);
fixture.replacements[0].value.text = '接入点允许模型改变海拔；FAQ09允许连贯性连线经过接入点，但不提供视线许可。视线须独立按阻挡地形足迹及掩护规则检查。';
fixture.replacements[1].value.text += '派系卡提供初始槽位，建军时花费高能瓦斯购买战术卡可以解锁额外槽位。';
let calls = 0;
const repaired = await repairExternalPacket({ candidate, packet, findings, context, reader, runtime: {
  role: async input => {
    calls++;
    if (calls === 1) return actual;
    assert.equal(input.roleId, 'external-source-editor.no-progress');
    assert.deepEqual(input.workspace.unchangedClaimIds, ['claims.4', 'claims.6']);
    assert.equal(input.workspace.priorArtifactHash, actual.hash);
    assert.equal(input.workspace.rejectedPatch.parentHash, hash(candidate.draft));
    assert(input.workspace.sourceAudit.every(f => f.exactSourceEvidence.length));
    return seal({ output: fixture });
  },
  produce: async (_packet, seed) => {
    assert.equal(seed.semanticAcceptanceInherited, false);
    const { hash: ignored, ...body } = candidate;
    return seal({ ...body, draft: seed.draft, semanticPassed: false }); // not real model acceptance
  },
} });
assert.equal(calls, 2); assert.equal(repaired.repair.noProgressResponses.length, 1);
assert.equal(repaired.repair.noProgressResponses[0].artifactHash, actual.hash);
assert.equal(repaired.repair.sourceReviewPassed, false);
assert.equal(repaired.repair.externalProbePassed, false);
const patched = applyIssuePatch(candidate.draft, fixture, findings.map(f => ({ kind: 'claim_external_counterexample', claimId: f.claimId })));
for (let i = 0; i < candidate.draft.claims.length; i++) if (![4, 6].includes(i)) assert.deepEqual(patched.draft.claims[i], candidate.draft.claims[i]);
let repeated = 0;
await assert.rejects(repairExternalPacket({ candidate, packet, findings, context, reader,
  runtime: { role: async () => { repeated++; return actual; } } }), { code: 'EXTERNAL_PATCH_NO_PROGRESS' });
assert.equal(repeated, 2); // one new feedback-bearing correction; never unbounded sampling
console.log(JSON.stringify({ passed: true, checks: 6, actualSavedNoOpReproduced: true, injectedCorrectionOnly: true, providerCalls: 0 }));
