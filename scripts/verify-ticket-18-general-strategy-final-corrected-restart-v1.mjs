import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fail, hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from '../packages/online-agent-session/portable-credential-material-v1.mjs';
import { correctFinalGeneralStrategyEvidenceMetadataV1,
  assertNoStaleGeneralStrategyCaseClaimsV1 } from '../packages/strategy-skills/general-strategy-evidence-metadata-correction-v1.mjs';
import { gradeStrategyDecisionV1 } from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { ROOT, json } from './support/strategy-live-production-support-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';

const FINAL_RUN = 'general-final-last-cc0f7f72536b8169b8d1';
const baseRelative = `build/ticket-18-general-strategy-live-v1/${PARENT_RUN}/general-strategy-final-v1/`;
const runRelative = baseRelative + FINAL_RUN + '/';
const correctionRelative = baseRelative + 'evidence-metadata-correction-v1/';
const [parentResult, corpus, result, report, completion, parentCompletion, parentRestart,
  canonicalResult, canonicalSkill, canonicalLayer, canonicalRouter, canonicalCompletion] = await Promise.all([
  json(runRelative + 'finalization-result.json'), json(runRelative + 'case-corpus.json'),
  json(correctionRelative + 'result.json'), json(correctionRelative + 'report.json'),
  json(correctionRelative + 'completion.json'), json(correctionRelative + 'parent-completion.json'),
  json(baseRelative + 'final-restart-verification.json'), json(baseRelative + 'final-corrected-result.json'),
  json(baseRelative + 'final-general-skill.json'), json(baseRelative + 'final-general-strategy-layer.json'),
  json(baseRelative + 'final-router-manifest.json'), json(baseRelative + 'final-completion-receipt.json'),
]);

[parentResult, corpus, result, report, completion, parentCompletion, parentRestart,
  canonicalResult, canonicalSkill, canonicalLayer, canonicalRouter, canonicalCompletion,
  result.correction, result.skill, result.layer, result.routerManifest].forEach(verifySeal);

if (result.hash !== canonicalResult.hash || result.skill.hash !== canonicalSkill.hash
  || result.layer.hash !== canonicalLayer.hash || result.routerManifest.hash !== canonicalRouter.hash
  || completion.hash !== canonicalCompletion.hash || report.resultHash !== result.hash
  || report.skillHash !== result.skill.hash || report.layerHash !== result.layer.hash
  || report.routerManifestHash !== result.routerManifest.hash || report.correctionHash !== result.correction.hash
  || report.parentCompletionHash !== parentCompletion.hash
  || report.parentRestartVerificationHash !== parentRestart.hash
  || completion.reportHash !== report.hash || completion.resultHash !== result.hash
  || completion.skillHash !== result.skill.hash || completion.strategyLayerHash !== result.layer.hash
  || completion.routerManifestHash !== result.routerManifest.hash
  || completion.evidenceMetadataCorrectionHash !== result.correction.hash) {
  fail('GENERAL_CORRECTED_RESTART_ARTIFACT_CHAIN_INVALID');
}

if (report.changedAxes.length !== 1 || report.changedAxes[0] !== 'objective_plan'
  || report.changedFields.length !== 1 || report.changedFields[0] !== 'risk'
  || report.sourceAxesAccepted !== 7 || report.sourceFieldsAccepted !== 77
  || report.decisionCasesRegraded !== 17 || report.decisionSemanticsChanged
  || report.officialRuleClaimsChanged || !report.formalGeneralSkillCompleted
  || report.providerCalls !== 0 || report.additionalTokens !== 0 || report.additionalCostMicros !== 0
  || report.sourceRefreshPerformed || report.runtimeAccepted || report.published
  || report.humanReviewed || report.trainingTruth) fail('GENERAL_CORRECTED_RESTART_REPORT_INVALID');

if (result.skill.schema !== 'project_d_game_skill_v1'
  || result.skill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
  || result.skill.version !== '1.0.1-offline-replay-passed'
  || result.skill.status !== 'replay_passed'
  || result.skill.trustTier !== 'replay_passed_offline_candidate'
  || result.skill.procedure.length !== 7 || !result.skill.canAffectStrategy
  || result.skill.canAffectRules || result.skill.runtimeAccepted || result.skill.published
  || result.layer.status !== 'offline_strategy_candidate'
  || result.routerManifest.legalityAuthority !== 'rules_service_only'
  || result.routerManifest.runtimeLoads.length !== 0
  || result.routerManifest.offlineProductionLoads.length !== 1
  || result.routerManifest.offlineProductionLoads[0] !== result.skill.hash
  || result.completeGameStrategyEffectivenessProven || result.runtimeAccepted || result.trainingTruth) {
  fail('GENERAL_CORRECTED_RESTART_SCOPE_INVALID');
}

const rebuilt = correctFinalGeneralStrategyEvidenceMetadataV1({ finalResult: parentResult, corpus });
if (rebuilt.hash !== result.hash) fail('GENERAL_CORRECTED_RESTART_REBUILD_DRIFT');
const consistency = assertNoStaleGeneralStrategyCaseClaimsV1(result);
if (consistency.staleClaims !== 0 || consistency.checkedPolicies !== 7
  || consistency.hash !== report.consistencyHash) fail('GENERAL_CORRECTED_RESTART_CASE_CLAIM_INVALID');

const caseById = new Map(corpus.cases.map(row => [row.prompt.caseId, row]));
const parentById = new Map(parentResult.caseResults.map(row => [`${row.caseId}:${row.axis}`, row]));
let migrated = 0;
for (const caseResult of result.caseResults) {
  verifySeal(caseResult); verifySeal(caseResult.artifact); verifySeal(caseResult.grade);
  const compiled = caseById.get(caseResult.caseId);
  const parent = parentById.get(`${caseResult.caseId}:${caseResult.axis}`);
  if (!compiled || !parent || caseResult.caseHash !== compiled.hash || !caseResult.rulesReplayPassed) {
    fail('GENERAL_CORRECTED_RESTART_CASE_BINDING_INVALID');
  }
  const regraded = gradeStrategyDecisionV1(compiled, caseResult.artifact.value);
  if (regraded.hash !== caseResult.grade.hash || !regraded.decisionPreferencePassed) {
    fail('GENERAL_CORRECTED_RESTART_CASE_REGRADE_FAILED');
  }
  if (caseResult.axis === 'objective_plan') {
    migrated += 1;
    if (caseResult.evaluatedPolicyHash !== parent.policyHash
      || caseResult.parentCaseResultHash !== parent.hash
      || caseResult.evidenceMetadataCorrectionHash !== result.correction.hash
      || caseResult.decisionSemanticInputsChanged !== false
      || caseResult.artifact.hash !== parent.artifact.hash || caseResult.grade.hash !== parent.grade.hash) {
      fail('GENERAL_CORRECTED_RESTART_CASE_MIGRATION_INVALID');
    }
  } else if (caseResult.hash !== parent.hash) fail('GENERAL_CORRECTED_RESTART_UNRELATED_CASE_CHANGED');
}
if (result.caseResults.length !== 17 || migrated !== 2) fail('GENERAL_CORRECTED_RESTART_CASE_DENOMINATOR_INVALID');

for (const row of report.codeHashes) {
  if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) {
    fail('GENERAL_CORRECTED_RESTART_CODE_DRIFT', { file: row.file });
  }
}
const finalMarkdown = await readFile(path.join(ROOT, baseRelative, 'final-general-skill.md'), 'utf8');
if (finalMarkdown.includes('本轴没有可引用的开发案例')
  || !finalMarkdown.includes('当前开发案例 movement.far-v2')
  || !result.skill.procedure.every(row => finalMarkdown.includes(`（${row.axis}）`))
  || containsStarcraftTmgOnlineCredentialMaterialV1({ result, report, completion, finalMarkdown })) {
  fail('GENERAL_CORRECTED_RESTART_READABLE_OR_REDACTION_INVALID');
}

const receipt = seal({ schema: 'ticket18_general_strategy_final_corrected_restart_verification_v1',
  ticket: 18, slice: 174, parentRunId: FINAL_RUN, parentResultHash: parentResult.hash,
  resultHash: result.hash, reportHash: report.hash, completionHash: completion.hash,
  skillHash: result.skill.hash, strategyLayerHash: result.layer.hash,
  routerManifestHash: result.routerManifest.hash, sourceAxes: 7, sourceFields: 77,
  decisionCases: 17, developmentResults: 10, heldoutResults: 7,
  evidenceMetadataFieldsChanged: 1, allDecisionArtifactsRegraded: true,
  strategyDecisionSemanticsChanged: false, officialRuleClaimsChanged: false,
  codeHashesCurrent: true, sensitiveMaterialFound: false, providerCalls: 0,
  runtimeAccepted: false, published: false, trainingTruth: false });
await writeFile(path.join(ROOT, baseRelative, 'final-corrected-restart-verification.json'),
  JSON.stringify(receipt, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, version: result.skill.version, sourceAxes: 7,
  sourceFields: 77, cases: 17, development: 10, heldout: 7, evidenceFieldsChanged: 1,
  providerCalls: 0, cumulativeTokens: report.cumulative.cumulativeTokens,
  cumulativeCny: report.cumulative.cumulativeEstimateMicros / 1e6,
  skillHash: result.skill.hash, receiptHash: receipt.hash }));
