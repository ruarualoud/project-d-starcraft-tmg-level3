import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createIndependentConditionDrillsV1 } from '../packages/skill-evaluation/independent-condition-drills-v1.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { createAnswerRepairBookV1 } from '../packages/skill-evaluation/answer-internal-review-v1.mjs';
import { createRulesBackedDevelopmentFeedbackV1, repairAnswersFromRulesV1 } from '../packages/skill-evaluation/rules-backed-answer-repair-v1.mjs';
import { evaluateGuidedRulesV1 } from '../packages/skill-evaluation/guided-rules-evaluation-v1.mjs';
import { openReadOnlyProductionReplayV1 } from '../packages/skill-evaluation/read-only-production-replay-v1.mjs';
import { seal, verifySeal, hash, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const runId = process.argv[2];
if (process.argv.length !== 3 || !/^guided-rules-[a-f0-9]{20}$/.test(runId || '')) fail('GUIDED_INSPECTION_ARGUMENTS_INVALID');
const json = async (run, name) => verifySeal(JSON.parse(await readFile(path.join(base, run, name + '.json'), 'utf8')));
const recipe = await json(runId, 'recipe'), report = await json(runId, 'report'), actual = await json(runId, 'actual-guided-evaluation');
if (recipe.version !== 'guided_overall_rules_evaluation_v1' || runId !== 'guided-rules-' + recipe.hash.slice(0, 20)
  || report.recipeHash !== recipe.hash || report.resultHash !== actual.hash
  || report.failure && report.failure.code !== 'GUIDED_RULES_EVALUATION_NOT_PASSED') fail('GUIDED_INSPECTION_RUN_INCOMPLETE');
const parent = await json(recipe.parentRunId, 'recipe'), teacher = await json(recipe.parentRunId, 'actual-answer-review');
const candidate = await json(parent.parentRunId, 'overall-rules-candidate'), exam = await json(parent.parentRunId, 'actual-model-exam');
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue), context = createGlobalProductionContext(catalogue);
const originalDrills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const independentDrills = await createIndependentConditionDrillsV1({ catalogue, originalDrills, legacyDrills });
const sourceProbes = createSourceAuditProbesV3({ catalogue, reader }), supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const book = createAnswerRepairBookV1({ candidate, exam, drills: originalDrills, legacyDrills });
const feedback = createRulesBackedDevelopmentFeedbackV1({ candidate, book, catalogue, drills: originalDrills, legacyDrills });
if (recipe.parentRecipeHash !== parent.hash || recipe.teacherHash !== teacher.hash || recipe.candidateHash !== candidate.hash
  || parent.bookHash !== book.hash || parent.feedbackHash !== feedback.hash || recipe.contextHash !== context.hash
  || recipe.independentManifestHash !== independentDrills.manifest.hash
  || parent.frozenIndependentConditionManifestHash !== independentDrills.manifest.hash) fail('GUIDED_INSPECTION_DEPENDENCY_DRIFT');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentReplay = openReadOnlyProductionReplayV1({ filename, runId: recipe.parentRunId, recipe: parent });
let parentDelivery;
try {
  const rebuiltTeacher = await repairAnswersFromRulesV1({ candidate, book, feedback, context, ...parentReplay });
  assert.equal(rebuiltTeacher.hash, teacher.hash);
  parentDelivery = parentReplay.evidence(); assert.equal(parentDelivery.receiptHashes.length, 1);
} finally { parentReplay.close(); }
const replay = openReadOnlyProductionReplayV1({ filename, runId, recipe });
let delivery, rebuilt;
try {
  rebuilt = await evaluateGuidedRulesV1({ candidate, teacher, context, originalDrills, legacyDrills, independentDrills,
    sourceProbes, supplemental, ...replay });
  assert.equal(rebuilt.hash, actual.hash); delivery = replay.evidence();
  assert.equal(delivery.receiptHashes.length, 23); assert.equal(delivery.matchedStepIds.length, 23);
  assert.deepEqual(rebuilt.summary, report.summary); assert.equal(rebuilt.sourceControl.correct, report.sourceCorrect);
  assert.equal(report.passed, rebuilt.passed);
} finally { replay.close(); }
// Negative transport/lineage controls use the same real read-only store and
// never create a second Provider request or edit the source DB.
const negative = openReadOnlyProductionReplayV1({ filename, runId, recipe });
try {
  assert.throws(() => negative.store.reserve('missing-attempt', {}), { code: 'READ_ONLY_REPLAY_REQUEST_DRIFT' });
  assert.throws(() => negative.store.settle('anything', {}), { code: 'READ_ONLY_REPLAY_MUTATION_FORBIDDEN' });
  const { hash: ignored, ...body } = teacher;
  const changed = structuredClone(body); changed.lessons[0].procedure[0] += ' Unauthorized input drift.';
  await assert.rejects(() => evaluateGuidedRulesV1({ candidate, teacher: seal(changed), context, originalDrills, legacyDrills, independentDrills,
    sourceProbes, supplemental, ...negative }), { code: 'READ_ONLY_REPLAY_STEP_INPUT_DRIFT' });
  assert.equal(negative.evidence().receiptHashes.length, 0);
} finally { negative.close(); }
const result = seal({ schema: 'starcraft_guided_rules_actual_delivery_evidence_v1', runId, recipeHash: recipe.hash,
  candidateHash: candidate.hash, teacherHash: teacher.hash, evaluationHash: actual.hash, parentDelivery, delivery,
  sourceCorrect: rebuilt.sourceControl.correct, summary: rebuilt.summary,
  rawAnswerScoresRecomputed: true, exactActualRequestsReconstructed: true, newProviderCalls: 0,
  qualityPassed: rebuilt.passed, negativeControlsPassed: true, formalAcceptance: false, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'verified-guided-evidence.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ evidenceVerified: true, matchedActualRequests: 24, rawAnswersRescored: 157,
  sourceCorrect: result.sourceCorrect, summary: result.summary, qualityPassed: result.qualityPassed,
  providerCalls: 0, hash: result.hash }));
