import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { seal } from '../packages/skill-production/common.mjs';
import { correctFinalGeneralStrategyEvidenceMetadataV1,
  assertNoStaleGeneralStrategyCaseClaimsV1 } from '../packages/strategy-skills/general-strategy-evidence-metadata-correction-v1.mjs';
import { renderFinalGeneralStrategySkillV1 } from '../packages/strategy-skills/general-strategy-finalization-v1.mjs';
import { ROOT, json, codeHashes } from './support/strategy-live-production-support-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';

const FINAL_RUN = 'general-final-last-cc0f7f72536b8169b8d1';
const baseRelative = `build/ticket-18-general-strategy-live-v1/${PARENT_RUN}/general-strategy-final-v1/`;
const runRelative = baseRelative + FINAL_RUN + '/';
const [parentResult, corpus, parentReport, parentRecipe, parentContinuation, parentRestart] = await Promise.all([
  json(runRelative + 'finalization-result.json'), json(runRelative + 'case-corpus.json'),
  json(runRelative + 'report.json'), json(runRelative + 'recipe.json'),
  json(runRelative + 'continuation-manifest.json'),
  json(baseRelative + 'final-restart-verification.json'),
]);
const parentCompletion = seal({ schema: 'ticket18_general_strategy_final_completion_receipt_v1',
  runId: FINAL_RUN, recipeHash: parentRecipe.hash, reportHash: parentReport.hash,
  resultHash: parentResult.hash, skillHash: parentResult.skill.hash,
  strategyLayerHash: parentResult.layer.hash, routerManifestHash: parentResult.routerManifest.hash,
  continuationManifestHash: parentContinuation.hash,
  formalGeneralSkillCompleted: true, runtimeAccepted: false, published: false, trainingTruth: false });
const result = correctFinalGeneralStrategyEvidenceMetadataV1({ finalResult: parentResult, corpus });
const consistency = assertNoStaleGeneralStrategyCaseClaimsV1(result);
const out = path.join(ROOT, baseRelative, 'evidence-metadata-correction-v1');
await mkdir(out, { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
const report = seal({ schema: 'ticket18_general_strategy_evidence_metadata_correction_report_v1',
  ticket: 18, slice: 174, parentRunId: FINAL_RUN, parentReportHash: parentReport.hash,
  parentCompletionHash: parentCompletion.hash, parentRestartVerificationHash: parentRestart.hash,
  resultHash: result.hash, skillHash: result.skill.hash, layerHash: result.layer.hash,
  routerManifestHash: result.routerManifest.hash, correctionHash: result.correction.hash,
  consistencyHash: consistency.hash, changedAxes: ['objective_plan'], changedFields: ['risk'],
  sourceAxesAccepted: 7, sourceFieldsAccepted: 77, decisionCasesRegraded: result.caseResults.length,
  decisionSemanticsChanged: false, officialRuleClaimsChanged: false,
  formalGeneralSkillCompleted: true, providerCalls: 0, additionalTokens: 0, additionalCostMicros: 0,
  codeHashes: await codeHashes([
    'packages/strategy-skills/general-strategy-evidence-metadata-correction-v1.mjs',
    'scripts/run-ticket-18-general-strategy-evidence-metadata-correction-v1.mjs',
  ]),
  cumulative: parentReport.cumulative, sourceRefreshPerformed: false,
  runtimeAccepted: false, published: false, humanReviewed: false, trainingTruth: false });
const completion = seal({ schema: 'ticket18_general_strategy_final_completion_receipt_v2',
  parentCompletionHash: parentCompletion.hash, parentRestartVerificationHash: parentRestart.hash,
  reportHash: report.hash, resultHash: result.hash, skillHash: result.skill.hash,
  strategyLayerHash: result.layer.hash, routerManifestHash: result.routerManifest.hash,
  evidenceMetadataCorrectionHash: result.correction.hash,
  formalGeneralSkillCompleted: true, runtimeAccepted: false, published: false, trainingTruth: false });
await save('parent-completion', parentCompletion); await save('result', result);
await save('report', report); await save('completion', completion);
await writeFile(path.join(ROOT, baseRelative, 'final-corrected-result.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
await writeFile(path.join(ROOT, baseRelative, 'final-general-skill.json'), JSON.stringify(result.skill, null, 2), { mode: 0o600 });
await writeFile(path.join(ROOT, baseRelative, 'final-general-skill.md'), renderFinalGeneralStrategySkillV1(result), { mode: 0o600 });
await writeFile(path.join(ROOT, baseRelative, 'final-general-strategy-layer.json'), JSON.stringify(result.layer, null, 2), { mode: 0o600 });
await writeFile(path.join(ROOT, baseRelative, 'final-router-manifest.json'), JSON.stringify(result.routerManifest, null, 2), { mode: 0o600 });
await writeFile(path.join(ROOT, baseRelative, 'final-completion-receipt.json'), JSON.stringify(completion, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ completed: true, version: result.skill.version, changedAxes: 1,
  changedFields: 1, decisionCasesRegraded: result.caseResults.length, providerCalls: 0,
  additionalTokens: 0, additionalCny: 0, cumulativeTokens: report.cumulative.cumulativeTokens,
  cumulativeCny: report.cumulative.cumulativeEstimateMicros / 1e6,
  skillHash: result.skill.hash, reportHash: report.hash }));
