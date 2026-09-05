import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { compileFactionProductionInputV1 } from '../packages/skill-production-v3/faction-production-input-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(root, file), 'utf8')));
const overall = 'build/ticket-18-production-v3/guide-repair-bab46109030e9073f739/';
const catalogue = await loadFrozenSkillEvidence(root), overallDependency = await json(overall + 'overall-production-dependency.json');
const qualificationReceipt = await json(overall + 'overall-dependency-qualification.json');
const inputs = [];
for (const id of ['terran_armed_forces', 'zerg_swarm']) {
  const factionEvidence = await json('build/ticket-18-faction-evidence-v1/' + id + '.json');
  const deps = { catalogue, overallDependency, qualificationReceipt, factionEvidence };
  const input = compileFactionProductionInputV1(deps); inputs.push(input);
  assert.equal(input.overallSkill.sections.flatMap(s => s.claims).length, 522);
  assert.equal(input.frozenSources.manifest.coreRows, 220); assert.equal(input.frozenSources.manifest.faqRows, 68);
  assert.equal(input.frozenSources.manifest.productRows, 83); assert.equal(input.factionEvidence.productManifest.length, 83);
  assert.equal(input.operationalGuide.hash, overallDependency.operationalGuide.hash);
  assert(!input.paidWorkAuthorizedByThisArtifact && !input.runtimeAccepted && input.skillsGenerated === 0);
  const serialized = JSON.stringify(input);
  assert(!serialized.includes('production-heldout.') && !serialized.includes('independent-condition.'));
  assert.equal(compileFactionProductionInputV1(deps).hash, input.hash);
  const body = v => Object.fromEntries(Object.entries(structuredClone(v)).filter(([k]) => k !== 'hash'));
  let bad = body(qualificationReceipt); bad.offlineGenerationQualified = false;
  assert.throws(() => compileFactionProductionInputV1({ ...deps, qualificationReceipt: seal(bad) }), { code: 'FACTION_INPUT_OVERALL_NOT_QUALIFIED' });
  bad = body(factionEvidence); bad.sourceBinding.rules = hash('wrong');
  assert.throws(() => compileFactionProductionInputV1({ ...deps, factionEvidence: seal(bad) }), { code: 'FACTION_INPUT_FROZEN_SOURCE_DRIFT' });
  bad = body(factionEvidence); bad.runtimeAccepted = true;
  assert.throws(() => compileFactionProductionInputV1({ ...deps, factionEvidence: seal(bad) }), { code: 'FACTION_INPUT_AUTHORITY_INVALID' });
}
const out = path.join(root, 'build/ticket-18-faction-production-v1'); await mkdir(out, { recursive: true });
for (const input of inputs) await writeFile(path.join(out, input.factionRecordKey.split(':')[1] + '-input.json'), JSON.stringify(input, null, 2));
const files = ['packages/skill-production-v3/faction-production-input-v1.mjs', 'scripts/verify-ticket-18-faction-production-input-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 10, overallDependencyHash: overallDependency.hash,
  inputHashes: inputs.map(r => r.hash), inputBytes: inputs.map(r => Buffer.byteLength(JSON.stringify(r))),
  codeHashes, providerCalls: 0, skillsGenerated: 0, trainingTruth: false });
await writeFile(path.join(out, 'input-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 10, inputBytes: report.inputBytes, providerCalls: 0, hash: report.hash }));
