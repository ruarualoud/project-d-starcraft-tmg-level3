import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { inspectFactionCandidateEvidenceV1 } from '../packages/skill-evaluation/faction-candidate-evidence-v1.mjs';
import { inspectFactionConsumerReplayV1 } from '../packages/skill-evaluation/faction-consumer-evidence-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { finalizeFactionSkillV1, renderFinalFactionSkillV1 } from '../packages/strategy-skills/faction-skill-finalization-v1.mjs';
import { fail, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, flag, runId] = process.argv.slice(2);
if (process.argv.length !== 5 || !['--preflight', '--finalize'].includes(mode)
  || flag !== '--consumer-run' || !/^faction-consumer-[a-f0-9]{20}$/u.test(runId || '')) fail('FACTION_FINAL_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n)
    fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, runId, name + '.json'), 'utf8')));
const [recipe, report, input, savedCandidate, savedProduction, evaluation, applicationEvaluation, finalGeneral] = await Promise.all(
  ['recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation', 'rule-application-evaluation', 'final-general-dependency'].map(json));
for (const row of recipe.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
  fail('FACTION_FINAL_CONSUMER_CODE_DRIFT');
const readiness = verifySeal(JSON.parse(await readFile(path.join(base, 'finalization-readiness.json'), 'utf8')));
if (!readiness.passed || readiness.providerCalls !== 0) fail('FACTION_FINAL_READINESS_REQUIRED');
for (const row of readiness.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
  fail('FACTION_FINAL_READINESS_CODE_DRIFT');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const { candidate, evidence: productionEvidence } = await inspectFactionCandidateEvidenceV1({ root,
  runId: recipe.sourceRunId, input, knownRulePolicy, catalogue, context });
if (candidate.hash !== savedCandidate.hash || productionEvidence.hash !== savedProduction.hash)
  fail('FACTION_FINAL_REPLAY_DRIFT');
const sourceRecipe = verifySeal(JSON.parse(await readFile(path.join(base, recipe.sourceRunId, 'recipe.json'), 'utf8')));
if (sourceRecipe.hash !== productionEvidence.recipeHash) fail('FACTION_FINAL_SOURCE_RECIPE_DRIFT');
const consumerEvidence = await inspectFactionConsumerReplayV1({ filename,
  runId, recipe, report, input, candidate, productionEvidence, knownRulePolicy, drills, applicationDrills,
  evaluation, applicationEvaluation, finalGeneral });
const skill = finalizeFactionSkillV1({ input, candidate, productionEvidence, consumerEvidence,
  rosterEvaluation: evaluation, ruleEvaluation: applicationEvaluation,
  generalSkill: finalGeneral.generalSkill, generalLayer: finalGeneral.generalLayer,
  draftEnvelopeBinding: sourceRecipe.draftEnvelopeBinding || null });
const finalReport = seal({ schema: 'faction_final_offline_handoff_v1', runId, recipeHash: recipe.hash,
  skillHash: skill.hash, candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash,
  consumerEvidenceHash: consumerEvidence.hash, readinessHash: readiness.hash,
  completeChapters: candidate.sections.length, recommendations: skill.knowledge.reduce((n, s) => n + s.draft.recommendations.length, 0),
  sourceRefreshPerformed: false, newProviderCalls: 0, runtimeAccepted: false, fullGameEffectivenessProven: false, trainingTruth: false });
if (mode === '--finalize') {
  const out = path.join(base, runId, 'final-faction-skill-v1'); await mkdir(out, { recursive: true });
  const putImmutable = async (name, text) => {
    const target = path.join(out, name);
    try { await writeFile(target, text, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error;
      if (await readFile(target, 'utf8') !== text) fail('FACTION_FINAL_EXISTING_VERSION_CONFLICT'); }
  };
  for (const [name, value] of [['final-faction-skill', skill], ['production-evidence', productionEvidence],
    ['consumer-evidence', consumerEvidence], ['report', finalReport]]) await putImmutable(name + '.json', JSON.stringify(value, null, 2));
  await putImmutable('final-faction-skill.md', renderFinalFactionSkillV1(skill));
}
console.log(JSON.stringify({ mode, ready: true, skillId: skill.skillId, skillHash: skill.hash,
  completeChapters: finalReport.completeChapters, recommendations: finalReport.recommendations,
  newProviderCalls: 0, runtimeAccepted: false, reportHash: finalReport.hash }));
