import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createFactionEvidenceCompilerV1 } from '../packages/skill-production-v3/faction-evidence.mjs';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [catalogue, { dataset }] = await Promise.all([loadFrozenSkillEvidence(root), loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root })]);
const mutableCatalogue = structuredClone(catalogue), mutableDataset = structuredClone(dataset);
const compiler = createFactionEvidenceCompilerV1({ catalogue: mutableCatalogue, dataset: mutableDataset });
const cases = [['terran_armed_forces', 15, 38, 5], ['zerg_swarm', 19, 34, 9]];
const results = [];
for (const [id, eligibleCount, rejectedCount, unitCount] of cases) {
  const r = compiler.compile('tactical_cards:' + id); verifySeal(r);
  assert.equal(r.armyPool.length, eligibleCount); assert.equal(r.excludedArmyCandidates.length, rejectedCount);
  assert.equal(r.armyPool.filter(p => p.profile.candidateKind === 'unit').length, unitCount);
  assert.equal(r.productManifest.length, 83); assert.equal(r.scenarioSources.length, 20);
  assert.equal(r.nonArmyBuildingUnits.length, 4); assert.equal(r.otherFactionCards.length, 5);
  assert.equal(r.eligibilityReceipt.candidateCount, eligibleCount);
  assert(r.eligibilityReceipt.everyCandidateTagAppearsOnFactionCard);
  assert(r.factionSelectionReceipt.exactlyOneFactionCard);
  assert.equal(r.factionSelectionReceipt.factionCard.recordKey, r.factionRecordKey);
  const { resultHash: eh, ...eb } = r.eligibilityReceipt; assert.equal(hash(eb), eh);
  const { resultHash: sh, ...sb } = r.factionSelectionReceipt; assert.equal(hash(sb), sh);
  assert(r.excludedArmyCandidates.every(p => p.missingTags.length && !p.eligible));
  assert(r.armyPool.every(p => r.eligibilityReceipt.eligibilityRows.some(e => e.recordKey === p.profile.recordKey && e.eligible)));
  const allSources = [r.primarySource, ...r.armyPool.map(p => p.source), ...r.nonArmyBuildingUnits.map(p => p.source),
    ...r.otherFactionCards.map(p => p.source), ...r.scenarioSources];
  const refs = [...allSources.map(p => p.ref), ...r.excludedArmyCandidates.map(p => p.ref)];
  assert.equal(refs.length, 83); assert.equal(new Set(refs).size, 83);
  assert.deepEqual([...refs].sort(), r.productManifest.map(p => p.ref).sort());
  for (const p of allSources) {
    const raw = catalogue.rows.find(row => row.id === p.ref);
    assert.deepEqual(p.content, JSON.parse(raw.text)); assert.equal(p.payloadHash, hash(p.content));
    assert.equal(p.sourceRowHash, raw.hash);
  }
  assert.equal(r.skillsGenerated, 0); assert.equal(r.runtimeAccepted, false); assert.equal(r.trainingTruth, false);
  assert(r.scope.completeGlobalSourcesRequiredAtGeneration && r.scope.eligibilityOnlyNotCompleteRosterLegality);
  assert(r.generationRequiresAcceptedOverallDependency);
  assert(!r.armyPool.some(p => r.nonArmyBuildingUnits.some(n => n.profile.recordKey === p.profile.recordKey)));
  assert.equal(hash(compiler.compile('tactical_cards:' + id)), hash(r));
  results.push(r);
}
assert(results[0].armyPool.some(p => p.profile.recordKey === 'army_units:marine'));
assert(results[1].armyPool.some(p => p.profile.recordKey === 'army_units:zergling'));
assert(results[0].excludedArmyCandidates.some(p => p.candidateRecordKey === 'army_units:zergling'));
assert(results[1].excludedArmyCandidates.some(p => p.candidateRecordKey === 'army_units:marine'));
assert(results.every(r => r.nonArmyBuildingUnits.some(p => p.profile.recordKey === 'army_units:roachling')));
assert.throws(() => compiler.compile('Terran'), { code: 'FACTION_EVIDENCE_FACTION_REQUIRED' });
assert.throws(() => compiler.compile('tactical_cards:barracks'), { code: 'FACTION_EVIDENCE_FACTION_REQUIRED' });
mutableCatalogue.sourceBinding.rules = hash('later mutation');
mutableDataset.recordsByKey['tactical_cards:terran_armed_forces'].payload.cost = 999;
assert.equal(compiler.compile('tactical_cards:terran_armed_forces').hash, results[0].hash);

const body = () => { const { hash: ignored, ...r } = structuredClone(catalogue); return r; };
let bad = body(); bad.sourceBinding.dataset = hash('wrong');
assert.throws(() => createFactionEvidenceCompilerV1({ catalogue: seal(bad), dataset }), { code: 'FACTION_EVIDENCE_SOURCE_DRIFT' });
bad = body(); bad.rows = bad.rows.filter(r => r.id !== 'source:army_units:marine');
assert.throws(() => createFactionEvidenceCompilerV1({ catalogue: seal(bad), dataset }), { code: 'FACTION_EVIDENCE_PRODUCT_DENOMINATOR' });
bad = body(); bad.rows.push(bad.rows.find(r => r.id === 'source:army_units:marine'));
assert.throws(() => createFactionEvidenceCompilerV1({ catalogue: seal(bad), dataset }), { code: 'FACTION_EVIDENCE_PRODUCT_DRIFT' });
bad = body(); const index = bad.rows.findIndex(r => r.id === 'source:tactical_cards:terran_armed_forces');
const { hash: ignored, ...record } = bad.rows[index];
const content = JSON.parse(record.text); content.cost = 999; record.text = JSON.stringify(content); bad.rows[index] = seal(record);
assert.throws(() => createFactionEvidenceCompilerV1({ catalogue: seal(bad), dataset }), { code: 'FACTION_EVIDENCE_PRODUCT_DRIFT' });
const files = ['packages/skill-production-v3/faction-evidence.mjs', 'scripts/verify-ticket-18-faction-evidence-v1.mjs',
  'packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checkGroups: 10, catalogueHash: catalogue.hash, codeHashes,
  factionEvidenceHashes: results.map(r => r.hash), sourceProductsAccountedForPerFaction: 83,
  eligibleArmyCandidates: [15, 19], nonArmyBuildingUnitsPerFaction: 4,
  realRulesKernelCalled: true, providerCalls: 0, sourceRefreshPerformed: false,
  skillGenerationPerformed: false, paidGenerationAuthorizedByThisReport: false, formalSkillsAccepted: 0, trainingTruth: false });
const out = path.join(root, 'build/ticket-18-faction-evidence-v1'); await mkdir(out, { recursive: true });
for (const r of results) await writeFile(path.join(out, r.factionRecordKey.split(':')[1] + '.json'), JSON.stringify(r, null, 2));
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checkGroups: 10, eligibleArmyCandidates: [15, 19],
  providerCalls: 0, skillsGenerated: 0, hash: report.hash }));
