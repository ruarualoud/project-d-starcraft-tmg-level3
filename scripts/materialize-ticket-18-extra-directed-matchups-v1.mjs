import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, verifySeal } from '../packages/skill-production/common.mjs';
import { ROOT } from './support/strategy-live-production-support-v1.mjs';

const runId = 'extra-matchup-final-v1-b1c7cfaf9aafd85cfb9f';
const buildRoot = path.join(ROOT, 'build/ticket-18-extra-directed-matchup-v1',
  runId);
const contentRoot = path.join(ROOT,
  'content/strategy-skills/ticket-18-foundational-v1');
const definitions = [
  ['terran-to-daelaam',
    'matchup-terran_armed_forces-to-daelaam.json',
    'starcraft-tmg.matchup.terran_armed_forces-to-daelaam'],
  ['daelaam-to-terran',
    'matchup-daelaam-to-terran_armed_forces.json',
    'starcraft-tmg.matchup.daelaam-to-terran_armed_forces'],
  ['terran-to-kerrigan-s-swarm',
    'matchup-terran_armed_forces-to-kerrigan_s_swarm.json',
    'starcraft-tmg.matchup.terran_armed_forces-to-kerrigan_s_swarm'],
  ['kerrigan-s-swarm-to-terran',
    'matchup-kerrigan_s_swarm-to-terran_armed_forces.json',
    'starcraft-tmg.matchup.kerrigan_s_swarm-to-terran_armed_forces'],
];

const readSealed = async file => verifySeal(JSON.parse(await readFile(file,
  'utf8')));
const writeExact = async (file, value) => {
  const encoded = JSON.stringify(value, null, 2);
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(file, 'utf8') !== encoded) {
      fail('EXTRA_MATCHUP_CONTENT_CONFLICT');
    }
  }
};

const report = await readSealed(path.join(buildRoot, 'report.json'));
if (report.failure !== null || report.formalMatchupSkillsCompleted !== 4
  || report.caseResults !== 8 || report.decisionCasesPassed !== true
  || report.runtimeAccepted !== false || report.trainingTruth !== false) {
  fail('EXTRA_MATCHUP_FORMALIZATION_NOT_QUALIFIED');
}
const materialized = [];
for (const [directory, filename, skillId] of definitions) {
  const skill = await readSealed(path.join(buildRoot, directory,
    'final-matchup-skill.json'));
  if (skill.skillId !== skillId || skill.skillType !== 'strategy'
    || skill.trustTier !== 'offline_evaluated_advisory'
    || skill.canAffectRules !== false || skill.runtimeAccepted !== false
    || skill.trainingTruth !== false) {
    fail('EXTRA_MATCHUP_SKILL_NOT_PORTABLE');
  }
  await writeExact(path.join(contentRoot, 'skills', filename), skill);
  materialized.push({ skillId, filename, hash: skill.hash });
}
await writeExact(path.join(contentRoot, 'qualifications',
  'directed-matchups-extra.json'), report);
console.log(JSON.stringify({ materialized: materialized.length,
  qualificationHash: report.hash, skills: materialized }));
