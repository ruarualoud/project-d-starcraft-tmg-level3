import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext, compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { inspectDraft } from '../packages/skill-production-v3/contracts.mjs';
import { planDraftAddressRepairV3, applyDraftAddressRepairV3 } from '../packages/skill-production-v3/address-repair.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const run = 'overall-v3-c904482236da37da200f';
const get = id => verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(run, id).artifact)).value).output;
const draft = get('rules-reading-018.generator'), tutor = get('rules-reading-018.tutor');
assert.deepEqual(draft, get('rules-reading-018.generator.schema')); db.close();
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const packet = createFirstFivePlan(catalogue).packets[17], reader = createEvidenceReader(catalogue), deps = { packet, context, reader };
assert.throws(() => inspectDraft(draft, deps), { code: 'V3_EVIDENCE_ADDRESS_INVALID' });
const plan = planDraftAddressRepairV3(draft, deps);
assert.equal(plan.issues.length, 1); assert.equal(plan.issues[0].path, 'claims.7.evidence.0');
// A source-backed fixture selection, NOT a real model review or acceptance.
const choice = plan.choices.find(c => c.ref === 'core.iuUyObNTQ2M8xK4IUqzC.items.4.subItems.1' && c.spanId === 'p1');
assert(choice);
const selection = { parentHash: hash(draft), corrections: [{ path: plan.issues[0].path, addressId: choice.addressId,
  reason: 'Engineering fixture: 8.4.2 Passing explicitly describes first-pass priority and information/flexibility tradeoff.' }] };
const repaired = applyDraftAddressRepairV3(draft, plan, selection, deps);
assert.equal(repaired.draft.claims.length, draft.claims.length);
for (const [i, claim] of draft.claims.entries()) {
  assert.equal(repaired.draft.claims[i].text, claim.text);
  assert.equal(repaired.draft.claims[i].kind, claim.kind);
  if (i !== 7) assert.deepEqual(repaired.draft.claims[i], claim);
}
assert.equal(repaired.resolved[0].after.ref, choice.ref);
assert(repaired.resolved[0].after.quote.includes('first player to Pass'));
assert(repaired.reReviewRequired && !repaired.semanticAcceptanceInherited);
assert.equal(planDraftAddressRepairV3(repaired.draft, deps), null);
const change = patch => ({ ...selection, corrections: [{ ...selection.corrections[0], ...patch }] });
assert.throws(() => applyDraftAddressRepairV3(draft, plan, change({ path: 'claims.6.evidence.0' }), deps), { code: 'V3_ADDRESS_REPAIR_PATH_INVALID' });
for (const addressId of [-1, 0.5, '1', plan.choices.length]) {
  assert.throws(() => applyDraftAddressRepairV3(draft, plan, change({ addressId }), deps), { code: 'V3_ADDRESS_REPAIR_CHOICE_INVALID' });
}
assert.throws(() => applyDraftAddressRepairV3(draft, plan, { ...selection, parentHash: hash('wrong') }, deps), { code: 'V3_ADDRESS_REPAIR_BINDING_INVALID' });
assert.throws(() => applyDraftAddressRepairV3(draft, plan, { ...selection, corrections: [] }, deps), { code: 'SOURCE_UNCERTAIN_REQUIRES_EXTERNAL_EVIDENCE' });
assert.throws(() => applyDraftAddressRepairV3(draft, plan, change({ text: 'unauthorized prose replacement' }), deps), { code: 'OUTPUT_SCHEMA_INVALID' });
const multiple = structuredClone(draft); multiple.claims[0].evidence[0].ref = 'invented';
const multiplePlan = planDraftAddressRepairV3(multiple, deps);
assert.equal(multiplePlan.issues.length, 2);
const duplicate = { parentHash: hash(multiple), corrections: [selection.corrections[0], selection.corrections[0]] };
assert.throws(() => applyDraftAddressRepairV3(multiple, multiplePlan, duplicate, deps), { code: 'V3_ADDRESS_REPAIR_PATH_INVALID' });
const wrongSource = { ...context, catalogueHash: hash('foreign') }; delete wrongSource.hash;
assert.throws(() => planDraftAddressRepairV3(draft, { ...deps, context: seal(wrongSource) }), { code: 'V3_SOURCE_BINDING_INVALID' });
const taskBytes = Buffer.byteLength(compileGlobalTask(context, 'fixture', { rejectedDraft: draft, addressRepair: plan }));
assert(taskBytes < 786432, 'complete source and full address table fit original input budget');
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/address-repair-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'address-fixture', recipeHash: hash('address') });
let tutorCalls = 0, generatorCalls = 0, repairCalls = 0;
const runtime = createProductionRuntimeV3({ store, context, reader, dsh: { async run({ task }) {
  if (task.includes('Tutor: use')) { tutorCalls++; return { final: tutor, injectedOnly: true }; }
  if (task.includes('Student/Generator:')) { generatorCalls++; return { final: draft, injectedOnly: true }; }
  if (task.includes('Repair ONLY the listed unknown citation addresses')) { repairCalls++; return { final: selection, injectedOnly: true }; }
  if (task.includes('Role: supportive_reviewer')) {
    const workspace = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
    assert.equal(workspace.claims[7].evidence[0].ref, choice.ref);
    assert.deepEqual(workspace.claims.map(c => c.text), draft.claims.map(c => c.text));
    assert(task.includes(context.prompt.sources[0].ref), 'fresh review still has the complete official background');
    throw Object.assign(new Error('review boundary'), { code: 'INJECTED_REVIEW_BOUNDARY' });
  }
  throw new Error('unexpected role');
} } });
await assert.rejects(runtime.produce(packet), { code: 'INJECTED_REVIEW_BOUNDARY' });
assert.equal(tutorCalls, 1); assert.equal(generatorCalls, 1); assert.equal(repairCalls, 1);
assert.deepEqual(store.artifact(packet.id + '.generator').output, draft, 'original Provider output retained');
assert.equal(store.artifact(packet.id + '.generator-address-repair').receipt.hash, repaired.hash);
assert.equal(store.artifact(packet.id + '.candidate'), null, 'valid-address selection cannot accept the candidate');
store.close();
console.log(JSON.stringify({ passed: true, checks: 14, actualFailingPacket: packet.id, invalidAddressCount: 1,
  correctedPaths: repaired.resolved.map(r => r.path), sourceTableChoices: plan.choices.length, fullSourceTaskBytes: taskBytes,
  injectedReviewBoundaryOnly: true, providerCalls: 0, formalSkillsAccepted: 0 }));
