import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan, verifyFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build/ticket-18-first-five-v1');
const catalogue = await loadFrozenSkillEvidence(ROOT), plan = createFirstFivePlan(catalogue);
verifyFirstFivePlan(plan, catalogue);
const packetGate = verifySeal(JSON.parse(await readFile(path.join(OUT, 'readiness.json'), 'utf8')));
const continuationGate = verifySeal(JSON.parse(await readFile(path.join(OUT, 'continuation-readiness.json'), 'utf8')));
assert(continuationGate.passed);
for (const row of continuationGate.codeHashes) assert.equal(sha256(await readFile(path.join(ROOT, row.file))), row.hash, row.file);
assert(packetGate.passed && packetGate.planHash === plan.hash);
for (const row of packetGate.codeHashes) assert.equal(sha256(await readFile(path.join(ROOT, row.file))), row.hash, row.file);
const reader = createEvidenceReader(catalogue);
for (const packet of plan.packets) reader.read({ refs: [...new Set(packet.passages.map(p => p.ref))], maxChars: 48000 });
const drills = await createProductionDrills(catalogue);
assert.equal(drills.manifest.cases, 69); assert.equal(drills.proof().length, 69);
let assertions = 0;
for (const group of drills.groups()) for (const test of drills.list(group)) {
  assert(!Object.hasOwn(test, 'expected')); assertions += 1;
  const receipt = drills.proof().find(r => r.id === test.id);
  assert(receipt); assertions += 1;
  const correct = drills.verify({ id: test.id, answer: receipt.expected });
  assert(correct.passed); assertions += 1;
  const wrong = typeof receipt.expected === 'boolean' ? !receipt.expected : receipt.expected + 1;
  assert(!drills.verify({ id: test.id, answer: wrong }).passed); assertions += 1;
  assert.throws(() => drills.verify({ id: test.id, answer: receipt.expected, expected: receipt.expected })); assertions += 1;
}
assert.throws(() => drills.verify({ id: 'invented', answer: true })); assertions += 1;
const addedFiles = ['packages/skill-evaluation/production-drills-v1.mjs', 'packages/skill-production/packet-continuation.mjs',
  'scripts/run-ticket-18-overall-rules-v2.mjs', 'scripts/verify-ticket-18-production-readiness-v1.mjs'];
const codeHashes = [...new Map([...packetGate.codeHashes, ...continuationGate.codeHashes,
  ...await Promise.all(addedFiles.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })))].map(r => [r.file, r])).values()];
const report = seal({ passed: true, ticket: 18, slice: 173, phase: 'preflight_only',
  catalogueHash: catalogue.hash, planHash: plan.hash, packetGateHash: packetGate.hash, continuationGateHash: continuationGate.hash,
  drillManifestHash: drills.manifest.hash, fixedBeforeGeneration: true, assertions,
  codeHashes, sourceRefreshPerformed: false, providerCalls: 0, trainingTruth: false });
try {
  const prior = verifySeal(JSON.parse(await readFile(path.join(OUT, 'production-readiness.json'), 'utf8')));
  await writeFile(path.join(OUT, 'production-readiness-' + prior.hash + '.json'), JSON.stringify(prior, null, 2), { flag: 'wx' })
    .catch(error => { if (error.code !== 'EEXIST') throw error; });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await writeFile(path.join(OUT, 'production-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, assertions, heldoutCases: drills.manifest.cases,
  readingPackets: plan.packets.length, hash: report.hash, providerCalls: 0 }));
