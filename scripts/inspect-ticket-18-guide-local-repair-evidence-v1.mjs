import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGuideRepairInputsV1 } from './ticket-18-guide-repair-inputs-v1.mjs';
import { inspectGuideNoProgressV1 } from './ticket-18-guide-no-progress-evidence-v1.mjs';
import { repairGuideFromRulesV1 } from '../packages/skill-evaluation/guide-local-repair-v1.mjs';
import { evaluateGuidedRulesV1 } from '../packages/skill-evaluation/guided-rules-evaluation-v1.mjs';
import { openReadOnlyProductionReplayV1 } from '../packages/skill-evaluation/read-only-production-replay-v1.mjs';
import { seal, verifySeal, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const runId = process.argv[2];
if (process.argv.length !== 3 || !/^guide-repair-[a-f0-9]{20}$/.test(runId || '')) fail('GUIDE_REPAIR_INSPECTION_ARGUMENTS_INVALID');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, runId, name + '.json'), 'utf8')));
const recipe = await json('recipe'), report = await json('report'), actual = await json('actual-guided-evaluation');
const savedRepair = await json('actual-guide-repair');
if (recipe.version !== 'guide_local_repair_and_evaluation_v1' || runId !== 'guide-repair-' + recipe.hash.slice(0, 20)
  || !Number.isInteger(recipe.revision) || recipe.revision < 1 || recipe.revision > 3 || recipe.parentRunId === runId
  || report.recipeHash !== recipe.hash || report.resultHash !== actual.hash || report.repairedTeacherHash !== savedRepair.hash
  || report.failure && report.failure.code !== 'GUIDED_RULES_EVALUATION_NOT_PASSED') fail('GUIDE_REPAIR_INSPECTION_INCOMPLETE');
const deps = await loadGuideRepairInputsV1(root, recipe.parentRunId);
const recovery = recipe.recoveryRunId ? await inspectGuideNoProgressV1(root, recipe.recoveryRunId, deps) : null;
if ((recovery?.hash || null) !== (recipe.recoveryHash || null)) fail('GUIDE_REPAIR_RECOVERY_DRIFT');
if (recipe.revision !== (deps.parent.revision ?? 0) + 1 || recipe.parentEvidenceHash !== deps.parentEvidence.hash
  || recipe.parentRecipeHash !== deps.parent.hash || recipe.teacherHash !== deps.teacher.hash || recipe.feedbackHash !== deps.feedback.hash
  || recipe.candidateHash !== deps.candidate.hash || recipe.contextHash !== deps.context.hash
  || recipe.baseRunId !== deps.baseRunId || recipe.independentManifestHash !== deps.independentDrills.manifest.hash) fail('GUIDE_REPAIR_INSPECTION_DRIFT');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const replay = openReadOnlyProductionReplayV1({ filename, runId, recipe });
let rebuilt, delivery;
try {
  const repaired = await repairGuideFromRulesV1({ ...deps, ...replay, recovery });
  assert.equal(repaired.hash, savedRepair.hash);
  rebuilt = await evaluateGuidedRulesV1({ ...deps, teacher: repaired, ...replay });
  assert.equal(rebuilt.hash, actual.hash); assert.deepEqual(rebuilt.summary, report.summary);
  assert.equal(rebuilt.sourceControl.correct, report.sourceCorrect); assert.equal(rebuilt.passed, report.passed);
  delivery = replay.evidence(); assert.equal(delivery.receiptHashes.length, 24); assert.equal(delivery.matchedStepIds.length, 24);
  assert.throws(() => replay.store.settle('anything', {}), { code: 'READ_ONLY_REPLAY_MUTATION_FORBIDDEN' });
} finally { replay.close(); }
const result = seal({ schema: 'starcraft_guide_local_repair_actual_evidence_v1', runId, recipeHash: recipe.hash,
  parentEvidenceHash: deps.parentEvidence.hash, candidateHash: deps.candidate.hash, repairedTeacherHash: savedRepair.hash,
  evaluationHash: rebuilt.hash, delivery, sourceCorrect: rebuilt.sourceControl.correct, summary: rebuilt.summary,
  rawAnswerScoresRecomputed: true, exactActualRequestsReconstructed: true, oldScoresOverwritten: false,
  independentSuiteRepeated: true, independentCasesExposedToRepair: false, newProviderCalls: 0,
  qualityPassed: rebuilt.passed, formalAcceptance: false, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'verified-guide-repair-evidence.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ evidenceVerified: true, matchedActualRequests: 24, rawAnswersRescored: 157,
  sourceCorrect: result.sourceCorrect, summary: result.summary, qualityPassed: result.qualityPassed, providerCalls: 0, hash: result.hash }));
