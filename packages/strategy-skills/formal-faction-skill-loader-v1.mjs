import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, seal, verifySeal } from '../skill-production/common.mjs';

const RUN = /^faction-consumer-(?:v[1-9][0-9]*-)?[a-f0-9]{20}$/u;
const DIRECTORY = /^final-faction-skill-v([1-9][0-9]*)$/u;
const REPORT_SCHEMAS = new Set([
  'faction_final_offline_handoff_v1',
  'faction_final_offline_handoff_v2',
  'faction_final_offline_handoff_v3',
]);

async function sealedJson(filename) {
  return verifySeal(JSON.parse(await readFile(filename, 'utf8')));
}

// This loader is the stable consumer seam for immutable formal faction Skills.
// It selects the highest explicitly versioned final directory and validates the
// Skill against its adjacent handoff report. Producer implementation hashes are
// release evidence, not a reason to replay paid production at startup.
export async function loadFormalFactionSkillV1({ root, runId, expectedFaction }) {
  if (!path.isAbsolute(root || '') || !RUN.test(runId || '')
    || !/^tactical_cards:[a-z0-9_]+$/u.test(expectedFaction || '')) {
    fail('FORMAL_FACTION_SKILL_ARGUMENTS_INVALID');
  }
  const runRoot = path.join(root, 'build/ticket-18-faction-production-v1', runId);
  const versions = (await readdir(runRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && DIRECTORY.test(entry.name))
    .map(entry => ({ name: entry.name, version: Number(DIRECTORY.exec(entry.name)[1]) }))
    .sort((left, right) => right.version - left.version);
  if (!versions.length) fail('FORMAL_FACTION_SKILL_NOT_FOUND');
  const selected = versions[0];
  const directory = path.join(runRoot, selected.name);
  const [skill, report] = await Promise.all([
    sealedJson(path.join(directory, 'final-faction-skill.json')),
    sealedJson(path.join(directory, 'report.json')),
  ]);
  if (skill.schema !== 'project_d_game_skill_v1' || skill.gameId !== 'starcraft-tmg'
    || skill.factionRecordKey !== expectedFaction || report.runId !== runId
    || !REPORT_SCHEMAS.has(report.schema) || report.skillHash !== skill.hash
    || report.formalOfflineSkillAccepted !== true
    || report.sourceRefreshPerformed !== false
    || report.runtimeAccepted !== false || report.trainingTruth !== false
    || skill.status !== 'offline_candidate'
    || skill.trustTier !== 'offline_evaluated_advisory'
    || skill.canAffectRules !== false || skill.runtimeAccepted !== false
    || skill.trainingTruth !== false || !Array.isArray(skill.knowledge)
    || !skill.knowledge.length) fail('FORMAL_FACTION_SKILL_UNQUALIFIED');
  const receipt = seal({
    schema: 'formal_faction_skill_load_receipt_v1',
    runId,
    factionRecordKey: expectedFaction,
    selectedVersion: selected.version,
    selectedDirectory: selected.name,
    skillHash: skill.hash,
    handoffReportHash: report.hash,
    selectionPolicy: 'highest_explicit_formal_version',
    producerReplayPerformed: false,
    providerCalls: 0,
    sourceRefreshPerformed: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  return Object.freeze({ skill, report, receipt });
}
