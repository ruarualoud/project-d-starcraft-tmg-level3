import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { inspectDraft } from '../packages/skill-production-v3/contracts.mjs';
import { planLosslessClaimPackingV3 } from '../packages/skill-production-v3/structure-repair.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, verifySeal } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const get = (run, id) => verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(run, id).artifact)).value).output;
const draft = get('overall-v3-ee2da227d2f35bcc3c56', 'rules-reading-017.generator');
assert.deepEqual(draft, get('overall-v3-ee2da227d2f35bcc3c56', 'rules-reading-017.generator.schema'));
const tutor = get('overall-v3-d3b0b227f5464ead27ff', 'rules-reading-017.tutor'); db.close();
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const packet = createFirstFivePlan(catalogue).packets[16], reader = createEvidenceReader(catalogue), deps = { packet, context, reader };
assert.equal(draft.claims.length, 25);
assert.throws(() => inspectDraft(draft, deps), { code: 'V3_CLAIM_COUNT_INVALID' });
const fixed = planLosslessClaimPackingV3(draft, deps); assert(fixed);
assert.equal(fixed.resultClaimCount, 24); assert.equal(fixed.originalClaimCount, 25);
assert.equal(fixed.draft.claims.map(c => c.text).join('\n\n'), draft.claims.map(c => c.text).join('\n\n'));
assert.deepEqual(fixed.groups.flatMap(g => g.originalClaimIds), draft.claims.map((_, i) => 'claims.' + i));
assert.equal(fixed.groups.filter(g => g.originalClaimIds.length > 1).length, 1);
assert(fixed.reReviewRequired && !fixed.semanticAcceptanceInherited);
for (const g of fixed.groups) for (const id of g.originalClaimIds) {
  const original = draft.claims[Number(id.slice(7))], next = fixed.draft.claims[Number(g.claimId.slice(7))];
  assert.equal(next.kind, original.kind); assert.deepEqual(next.evidence, original.evidence);
}
assert.equal(planLosslessClaimPackingV3(fixed.draft, deps), null);
const impossible = structuredClone(draft);
impossible.claims.forEach((c, i) => { c.kind = i % 2 ? 'caution' : 'rule'; });
assert.equal(planLosslessClaimPackingV3(impossible, deps), null, 'never merge different categories');
const long = structuredClone(draft); long.claims.forEach(c => { c.text = 'x'.repeat(800); });
assert.equal(planLosslessClaimPackingV3(long, deps), null, 'never exceed the unchanged1500 character limit');
const invalid = structuredClone(draft); invalid.claims[24].evidence = [{ ref: 'invented', spanId: 'p1' }];
assert.throws(() => planLosslessClaimPackingV3(invalid, deps), { code: 'V3_EVIDENCE_ADDRESS_INVALID' });
assert.equal(hash(planLosslessClaimPackingV3(draft, deps)), hash(fixed));
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/claim-packing-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'packing-fixture', recipeHash: hash('packing') });
let tutorCalls = 0, generatorCalls = 0;
const runtime = createProductionRuntimeV3({ store, context, reader, dsh: { async run({ task }) {
  if (task.includes('Tutor: use')) { tutorCalls++; return { final: tutor, injectedOnly: true }; }
  if (task.includes('Student/Generator:')) { generatorCalls++; return { final: draft, injectedOnly: true }; }
  if (task.includes('Role: supportive_reviewer')) {
    const workspace = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
    assert.equal(workspace.claims.length, 24);
    assert.equal(workspace.claims.map(c => c.text).join('\n\n'), draft.claims.map(c => c.text).join('\n\n'));
    throw Object.assign(new Error('review boundary'), { code: 'INJECTED_REVIEW_BOUNDARY' });
  }
  throw new Error('unexpected role');
} } });
await assert.rejects(runtime.produce(packet), { code: 'INJECTED_REVIEW_BOUNDARY' });
assert.equal(tutorCalls, 1); assert.equal(generatorCalls, 1, 'no repeated schema generation for a losslessly packable draft');
assert.equal(store.artifact(packet.id + '.generator-structure-repair').packing.hash, fixed.hash);
assert.equal(store.artifact(packet.id + '.candidate'), null, 'packing cannot itself accept the candidate');
store.close();
console.log(JSON.stringify({ passed: true, checks: 12, actualOriginalClaims: 25, packedClaims: 24,
  allOriginalTextAndSourcesPreserved: true, injectedReviewBoundaryOnly: true, providerCalls: 0, formalSkillsAccepted: 0 }));
