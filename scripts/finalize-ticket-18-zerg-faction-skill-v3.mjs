import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { inspectFactionConsumerReplayV1 } from '../packages/skill-evaluation/faction-consumer-evidence-v1.mjs';
import { createFactionConsumerGuidedRevisionV3 } from '../packages/skill-production-v3/faction-consumer-guided-revision-v3.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { finalizeFactionSkillV1, renderFinalFactionSkillV1 } from '../packages/strategy-skills/faction-skill-finalization-v1.mjs';
import { seal, verifySeal, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, flag, runId] = process.argv.slice(2);
if (process.argv.length !== 5 || !['--preflight', '--finalize'].includes(mode)
  || flag !== '--consumer-run' || !/^faction-consumer-[a-f0-9]{20}$/u.test(runId || ''))
  fail('FACTION_ZERG_FINAL_V3_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const dirJson = async (dir, name) => verifySeal(JSON.parse(await readFile(path.join(base, dir, name + '.json'), 'utf8')));

const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n)
    fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }

const [recipe, report, input, candidate, productionEvidence, rosterEvaluation,
  ruleEvaluation, finalGeneral, savedParentCandidate, savedParentProduction,
  savedParentConsumer, savedRevisionSpec, savedSourceProof] = await Promise.all([
  'recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation',
  'rule-application-evaluation', 'final-general-dependency', 'parent-candidate',
  'parent-production-evidence', 'parent-consumer-evidence',
  'consumer-guided-revision-spec', 'source-proof',
].map(name => dirJson(runId, name)));
if (recipe.version !== 'faction_consumer_evaluation_run_v5'
  || recipe.candidateHash !== candidate.hash || report.failure !== null
  || !report.boundedRosterChoicePassed || !report.boundedRuleApplicationPassed)
  fail('FACTION_ZERG_FINAL_V3_RUN_NOT_QUALIFIED');

const parentRunId = recipe.parentConsumerRunId;
const [parentRecipe, parentReport, parentInput, parentCandidate,
  parentProductionEvidence, parentRosterEvaluation, parentRuleEvaluation,
  parentGeneral] = await Promise.all([
  'recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation',
  'rule-application-evaluation', 'final-general-dependency',
].map(name => dirJson(parentRunId, name)));
if (parentInput.hash !== input.hash || parentGeneral.hash !== finalGeneral.hash
  || parentCandidate.hash !== savedParentCandidate.hash
  || parentProductionEvidence.hash !== savedParentProduction.hash)
  fail('FACTION_ZERG_FINAL_V3_PARENT_ARTIFACT_DRIFT');

const catalogue = await loadFrozenSkillEvidence(root);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const parentConsumerEvidence = await inspectFactionConsumerReplayV1({ filename,
  runId: parentRunId, recipe: parentRecipe, report: parentReport, input,
  candidate: parentCandidate, productionEvidence: parentProductionEvidence,
  knownRulePolicy, drills, applicationDrills,
  evaluation: parentRosterEvaluation, applicationEvaluation: parentRuleEvaluation,
  finalGeneral });
if (parentConsumerEvidence.hash !== savedParentConsumer.hash)
  fail('FACTION_ZERG_FINAL_V3_PARENT_CONSUMER_DRIFT');

const rebuilt = createFactionConsumerGuidedRevisionV3({ input, candidate: parentCandidate,
  knownRulePolicy, rosterEvaluation: parentRosterEvaluation,
  ruleEvaluation: parentRuleEvaluation, consumerEvidence: parentConsumerEvidence,
  rosterDrills: drills, applicationDrills, draftEnvelopeBinding,
  parentProductionEvidence });
if (rebuilt.candidate.hash !== candidate.hash
  || rebuilt.revisionEvidence.hash !== productionEvidence.hash
  || rebuilt.revisionSpec.hash !== savedRevisionSpec.hash
  || rebuilt.sourceProof.hash !== savedSourceProof.hash)
  fail('FACTION_ZERG_FINAL_V3_REVISION_REBUILD_DRIFT');

const consumerEvidence = await inspectFactionConsumerReplayV1({ filename,
  runId, recipe, report, input, candidate, productionEvidence, knownRulePolicy,
  drills, applicationDrills, evaluation: rosterEvaluation,
  applicationEvaluation: ruleEvaluation, finalGeneral });
const skill = finalizeFactionSkillV1({ input, candidate, productionEvidence,
  rosterEvaluation, ruleEvaluation, consumerEvidence,
  generalSkill: finalGeneral.generalSkill, generalLayer: finalGeneral.generalLayer,
  draftEnvelopeBinding });
const finalReport = seal({ schema: 'faction_final_offline_handoff_v3', runId,
  recipeHash: recipe.hash, skillHash: skill.hash, candidateHash: candidate.hash,
  parentCandidateHash: parentCandidate.hash,
  productionEvidenceHash: productionEvidence.hash,
  consumerEvidenceHash: consumerEvidence.hash,
  revisionSpecHash: rebuilt.revisionSpec.hash,
  completeChapters: candidate.sections.length,
  recommendations: skill.knowledge.reduce((total, section) =>
    total + section.draft.recommendations.length, 0),
  boundedRosterChoicePassed: true, boundedRuleApplicationPassed: true,
  groupedRuleScores: ruleEvaluation.summary,
  independentlyHeldOutApplicationCases: 0,
  formalOfflineSkillAccepted: true, sourceRefreshPerformed: false,
  newProviderCalls: 0, runtimeAccepted: false,
  fullGameEffectivenessProven: false, trainingTruth: false });

if (mode === '--finalize') {
  const out = path.join(base, runId, 'final-faction-skill-v3');
  await mkdir(out, { recursive: true });
  async function putImmutable(name, text) {
    const target = path.join(out, name);
    try { await writeFile(target, text, { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (await readFile(target, 'utf8') !== text)
        fail('FACTION_ZERG_FINAL_V3_EXISTING_VERSION_CONFLICT');
    }
  }
  for (const [name, value] of [
    ['final-faction-skill', skill], ['production-evidence', productionEvidence],
    ['consumer-evidence', consumerEvidence], ['revision-spec', rebuilt.revisionSpec],
    ['report', finalReport],
  ]) await putImmutable(name + '.json', JSON.stringify(value, null, 2));
  await putImmutable('final-faction-skill.md', renderFinalFactionSkillV1(skill));
}
console.log(JSON.stringify({ mode, ready: true, skillId: skill.skillId,
  skillHash: skill.hash, completeChapters: finalReport.completeChapters,
  recommendations: finalReport.recommendations,
  boundedRosterChoicePassed: true, boundedRuleApplicationPassed: true,
  formalOfflineSkillAccepted: true, newProviderCalls: 0,
  runtimeAccepted: false, reportHash: finalReport.hash }));
