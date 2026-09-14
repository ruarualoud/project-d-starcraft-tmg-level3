import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence }
  from '../packages/skill-production/evidence.mjs';
import { createFactionEvidenceCompilerV1 }
  from '../packages/skill-production-v3/faction-evidence.mjs';
import { prepareExtraFactionInputV1, EXTRA_FACTION_KEYS_V1 }
  from '../packages/strategy-skills/extra-faction-input-v1.mjs';
import { inspectStrategyDispatchV1 }
  from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { seal, verifySeal } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async relative => verifySeal(JSON.parse(
  await readFile(path.join(root, relative), 'utf8')));
const generalRoot = 'build/ticket-18-general-strategy-live-v1/'
  + 'general-strategy-3705e4aa46ecd74a7826207a67b5b096/';
const [catalogue, { dataset }, frozenInput, generalSkill, generalLayer] =
  await Promise.all([
    loadFrozenSkillEvidence(root),
    loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root }),
    json('build/ticket-18-faction-production-v1/terran_armed_forces-input.json'),
    json(generalRoot + 'general-strategy-final-v1/final-general-skill.json'),
    json(generalRoot + 'general-strategy-final-v1/final-general-strategy-layer.json'),
  ]);
const compiler = createFactionEvidenceCompilerV1({ catalogue, dataset });
const rows = EXTRA_FACTION_KEYS_V1.map(factionRecordKey => {
  const evidence = compiler.compile(factionRecordKey);
  const input = prepareExtraFactionInputV1({ frozenInput, factionEvidence: evidence,
    generalSkill, generalLayer });
  const dispatch = inspectStrategyDispatchV1(input);
  return { factionRecordKey, evidence, input, dispatch };
});
const out = path.join(root, 'build/ticket-18-extra-faction-v1');
await mkdir(out, { recursive: true });
const put = async (name, value) => {
  const target = path.join(out, name);
  const encoded = JSON.stringify(value, null, 2);
  try { await writeFile(target, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(target, 'utf8') !== encoded) throw error;
  }
};
for (const row of rows) {
  const id = row.factionRecordKey.split(':')[1];
  await put(id + '-evidence.json', row.evidence);
  await put(id + '-input.json', row.input);
  await put(id + '-dispatch.json', row.dispatch);
}
const report = seal({ schema: 'ticket18_extra_faction_input_report_v1',
  ticket: 18, slice: 183,
  factions: rows.map(row => ({ factionRecordKey: row.factionRecordKey,
    evidenceHash: row.evidence.hash, inputHash: row.input.hash,
    dispatchHash: row.dispatch.hash,
    eligibleArmyCandidates: row.evidence.armyPool.length,
    plannedAxes: row.input.contract.requiredAxes.length,
    workspaceBytes: row.dispatch.fullWorkspaceBytes })),
  officialProductRecordsPerFaction: rows.map(row =>
    row.evidence.productManifest.length),
  sourceRefreshPerformed: false,
  providerCalls: 0,
  skillsGenerated: 0,
  runtimeAccepted: false,
  trainingTruth: false });
await put('input-report.json', report);
console.log(JSON.stringify({ ready: true, ticket: 18, slice: 183,
  factions: report.factions, sourceRefreshPerformed: false,
  providerCalls: 0, reportHash: report.hash }));
