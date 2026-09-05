import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3, validateTutorLessonV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, verifySeal } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const rows = db.prepare("SELECT artifact FROM steps WHERE run=? AND id IN (?,?) AND state='complete' ORDER BY id")
  .all('overall-v3-64bb34fd54b622ede911', 'rules-reading-006.tutor', 'rules-reading-006.tutor.schema');
const rows17 = db.prepare("SELECT artifact FROM steps WHERE run=? AND id IN (?,?) AND state='complete' ORDER BY id")
  .all('overall-v3-d3b0b227f5464ead27ff', 'rules-reading-017.tutor', 'rules-reading-017.tutor.schema');
db.close(); assert.equal(rows.length, 2);
assert.equal(rows17.length, 2);
const outputs17 = rows17.map(r => verifySeal(verifySeal(JSON.parse(r.artifact)).value).output);
for (const output of outputs17) {
  assert.equal(output.lesson.length, 21); assert.equal(output.uncertainties.length, 3);
  assert(Buffer.byteLength(JSON.stringify(output)) < 65536);
  assert.deepEqual(validateTutorLessonV3(output), output, 'complete 21-point Tutor notes must survive unchanged');
}
const outputs = rows.map(r => verifySeal(verifySeal(JSON.parse(r.artifact)).value).output);
assert.deepEqual(outputs[0], outputs[1]); assert.equal(outputs[0].lesson[3].length, 1397);
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const packet = createFirstFivePlan(catalogue).packets[5], reader = createEvidenceReader(catalogue);
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/tutor-artifact-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'tutor-artifact-fixture', recipeHash: hash('fixture') });
let tutorCalls = 0, generatorCalls = 0;
const runtime = createProductionRuntimeV3({ store, context, reader, dsh: { async run({ task }) {
  if (task.includes('Tutor: use')) { tutorCalls++; return { final: outputs[0], fixtureOnly: true }; }
  if (task.includes('Student/Generator:')) {
    generatorCalls++;
    const workspace = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
    assert.deepEqual(workspace.unverifiedTutor, outputs[0]);
    throw Object.assign(new Error('fixture boundary'), { code: 'INJECTED_GENERATOR_BOUNDARY' });
  }
  throw new Error('unexpected role');
} } });
await assert.rejects(runtime.produce(packet), { code: 'INJECTED_GENERATOR_BOUNDARY' });
assert.equal(tutorCalls, 1); assert.equal(generatorCalls, 1);
store.close();
assert.deepEqual(validateTutorLessonV3(outputs[0]), outputs[0]);
for (const invalid of [{ lesson: [], uncertainties: [] }, { lesson: [42], uncertainties: [] },
  { lesson: [''], uncertainties: [] }, { lesson: ['test'], uncertainties: null },
  { lesson: ['test'], uncertainties: [], hiddenClaims: ['bad'] }]) assert.throws(() => validateTutorLessonV3(invalid));
assert.throws(() => validateTutorLessonV3({ lesson: ['x'.repeat(65537)], uncertainties: [] }), { code: 'V3_TUTOR_ARTIFACT_BUDGET_EXCEEDED' });
const overhead = Buffer.byteLength(JSON.stringify({ lesson: [''], uncertainties: [] }));
const boundary = { lesson: ['x'.repeat(65536 - overhead)], uncertainties: [] };
assert.deepEqual(validateTutorLessonV3(boundary), boundary);
assert.throws(() => validateTutorLessonV3({ ...boundary, lesson: [boundary.lesson[0] + 'x'] }), { code: 'V3_TUTOR_ARTIFACT_BUDGET_EXCEEDED' });
assert.throws(() => validateTutorLessonV3({ ...boundary, uncertainties: ['x'] }), { code: 'V3_TUTOR_ARTIFACT_BUDGET_EXCEEDED' });
assert.deepEqual(validateTutorLessonV3({ lesson: ['point'], uncertainties: Array(21).fill('unknown') }).uncertainties.length, 21);
const store17 = openProductionStore(path.join(temp, 'fixture17.sqlite'), { runId: 'tutor-017-fixture', recipeHash: hash('fixture17') });
let tutor17Calls = 0, generator17Calls = 0;
const runtime17 = createProductionRuntimeV3({ store: store17, context, reader, dsh: { async run({ task }) {
  if (task.includes('Tutor: use')) { tutor17Calls++; return { final: outputs17[0], fixtureOnly: true }; }
  if (task.includes('Student/Generator:')) {
    generator17Calls++;
    const workspace = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
    assert.deepEqual(workspace.unverifiedTutor, outputs17[0]);
    throw Object.assign(new Error('fixture boundary'), { code: 'INJECTED_GENERATOR_BOUNDARY' });
  }
  throw new Error('unexpected role');
} } });
await assert.rejects(runtime17.produce(createFirstFivePlan(catalogue).packets[16]), { code: 'INJECTED_GENERATOR_BOUNDARY' });
assert.equal(tutor17Calls, 1); assert.equal(generator17Calls, 1); store17.close();
console.log(JSON.stringify({ passed: true, checks: 12, actualSavedTutorPreserved: true, longestActualItemChars: 1397,
  actualSavedTutor17Points: 21, boundedByWholeArtifactBytes: 65536,
  sourceAcceptanceInherited: false, injectedGeneratorBoundaryOnly: true, providerCalls: 0 }));
