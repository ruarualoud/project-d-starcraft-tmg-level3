import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, fail }
  from '../packages/skill-production/common.mjs';
import { prepareDirectedMatchupInputV1 }
  from '../packages/strategy-skills/directed-matchup-input-v1.mjs';
import { inspectStrategyDispatchV1 }
  from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { verifyCompiledStrategyCaseV1 }
  from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { compileExtraDirectedMatchupInitiativeCasesV1 }
  from './support/extra-directed-matchup-case-corpus-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async relative => verifySeal(JSON.parse(
  await readFile(path.join(root, relative), 'utf8')));
const generalRoot = 'build/ticket-18-general-strategy-live-v1/'
  + 'general-strategy-3705e4aa46ecd74a7826207a67b5b096/';
const skillRoot = 'content/strategy-skills/ticket-18-foundational-v1/skills/';
const [frozenInput, generalSkill, generalLayer, terran, daelaam, kerrigan] =
  await Promise.all([
    readJson('build/ticket-18-faction-production-v1/terran_armed_forces-input.json'),
    readJson(generalRoot + 'general-strategy-final-v1/final-general-skill.json'),
    readJson(generalRoot + 'general-strategy-final-v1/final-general-strategy-layer.json'),
    readJson(skillRoot + 'faction-terran_armed_forces.json'),
    readJson(skillRoot + 'faction-daelaam.json'),
    readJson(skillRoot + 'faction-kerrigan_s_swarm.json'),
  ]);
const corpus = await compileExtraDirectedMatchupInitiativeCasesV1(root);
verifySeal(corpus);
corpus.cases.forEach(verifyCompiledStrategyCaseV1);
if (corpus.cases.length !== 8
  || hash(corpus.sourceBinding) !== hash(frozenInput.sourceBinding)
  || corpus.sourceRefreshPerformed !== false) {
  fail('EXTRA_MATCHUP_CASE_CORPUS_INVALID');
}
const definitions = [
  { id: 'terran-to-daelaam', prefix: 'matchup.terran_to_daelaam.',
    ownSkill: terran, opponentSkill: daelaam },
  { id: 'daelaam-to-terran', prefix: 'matchup.daelaam_to_terran.',
    ownSkill: daelaam, opponentSkill: terran },
  { id: 'terran-to-kerrigan-s-swarm', prefix: 'matchup.terran_to_kerrigan_s_swarm.',
    ownSkill: terran, opponentSkill: kerrigan },
  { id: 'kerrigan-s-swarm-to-terran', prefix: 'matchup.kerrigan_s_swarm_to_terran.',
    ownSkill: kerrigan, opponentSkill: terran },
];
const rows = definitions.map(definition => {
  const cases = corpus.cases.filter(testCase =>
    testCase.prompt.caseId.startsWith(definition.prefix));
  const input = prepareDirectedMatchupInputV1({ frozenInput, generalSkill,
    generalLayer, ownSkill: definition.ownSkill,
    opponentSkill: definition.opponentSkill, cases });
  return { ...definition, cases, input, dispatch: inspectStrategyDispatchV1(input) };
});
const out = path.join(root, 'build/ticket-18-extra-directed-matchup-v1');
await mkdir(out, { recursive: true });
const putImmutable = async (relative, value) => {
  const target = path.join(out, relative);
  const encoded = JSON.stringify(value, null, 2);
  try { await writeFile(target, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(target, 'utf8') !== encoded) {
      fail('EXTRA_MATCHUP_PREPARATION_IMMUTABLE_CONFLICT');
    }
  }
};
await putImmutable('frozen-initiative-case-corpus-v1.json', corpus);
for (const row of rows) {
  await putImmutable(`${row.id}-input.json`, row.input);
  await putImmutable(`${row.id}-dispatch.json`, row.dispatch);
}
const report = seal({
  schema: 'ticket18_extra_directed_matchup_input_report_v1',
  ticket: 18,
  slice: 184,
  directions: rows.map(row => ({ id: row.id,
    scope: row.input.contract.scope,
    inputHash: row.input.hash,
    dispatchHash: row.dispatch.hash,
    developmentCases: row.input.workspace.developmentCases.length,
    heldoutCases: row.input.evaluationManifest.heldoutCount })),
  actualRulesCases: corpus.cases.length,
  actualAppliedAndReplayedBranches: corpus.actualAppliedAndReplayedBranches,
  providerCalls: 0,
  sourceRefreshPerformed: false,
  strategyEffectivenessProven: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
await putImmutable('input-report.json', report);
console.log(JSON.stringify({ ready: true, directions: rows.length,
  cases: corpus.cases.length, replayedBranches: corpus.actualAppliedAndReplayedBranches,
  inputHashes: rows.map(row => row.input.hash), providerCalls: 0,
  sourceRefreshPerformed: false, hash: report.hash }));
