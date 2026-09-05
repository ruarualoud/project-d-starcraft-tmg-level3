import { DatabaseSync } from 'node:sqlite';
import { verifySeal, hash, sha256, seal, exact, fail } from '../skill-production/common.mjs';
import { assembleOverallRulesCandidateV3, readCompleteOverallRulesContextV3 } from '../skill-evaluation/overall-rules-package-v3.mjs';
import { validateSourceAuditAnswers } from '../skill-evaluation/source-audit-probes-v3.mjs';
import { assertNoKnownExternalClaimFailure } from './external-findings.mjs';

// Recompute all scores from bound raw Provider answers, not report booleans.
// Ports are read-only; a missing receipt can never initiate another request.
export function inspectOverallExamsV3({ candidate, exam, regression, drills, legacyDrills, probes,
  readStep, readReceipt, providerProfileHash, maxWallMs = 300000, requirePassing = true }) {
  if (typeof requirePassing !== 'boolean') fail('OVERALL_EVIDENCE_PURPOSE_INVALID');
  [candidate, exam, regression, drills.manifest, legacyDrills.manifest, probes].forEach(verifySeal);
  const context = readCompleteOverallRulesContextV3(candidate);
  if (!candidate.candidateOnly || candidate.published || candidate.runtimeAccepted
    || drills.manifest.catalogueHash !== candidate.catalogueHash || probes.catalogueHash !== candidate.catalogueHash
    || hash(drills.manifest.sourceBinding) !== hash(candidate.sourceBinding)
    || hash(probes.sourceBinding) !== hash(candidate.sourceBinding)
    || exam.candidateHash !== candidate.hash || regression.candidateHash !== candidate.hash) fail('OVERALL_EVIDENCE_BINDING_INVALID');
  const receiptHashes = new Set();
  function raw(hashValue) {
    const response = readReceipt(hashValue);
    if (!response?.usageReceipt || !response.output) fail('OVERALL_EVIDENCE_RECEIPT_MISSING');
    const { receiptHash, ...body } = response.usageReceipt;
    if (receiptHash !== hashValue || hash(body) !== receiptHash
      || body.schemaVersion !== 'starcraft_tmg_provider_egress_transport_v1.success'
      || body.providerProfileRef?.hash !== providerProfileHash || body.status !== 200
      || body.physicalAttempts !== 1 || body.automaticRetries !== 0
      || body.responseFingerprint !== sha256(JSON.stringify(response.output))
      || response.output.channels?.skill?.action !== 'finish'
      || receiptHashes.has(receiptHash)) fail('OVERALL_EVIDENCE_RECEIPT_INVALID');
    receiptHashes.add(receiptHash);
    return response.output.channels.skill.content;
  }
  function step(id, expectedInput, result) {
    const saved = readStep(id);
    if (!saved || saved.inputHash !== hash(expectedInput) || verifySeal(saved.value).hash !== result.hash) fail('OVERALL_EVIDENCE_STEP_INVALID');
  }
  const groups = [...drills.groups().map(group => ({ kind: 'fresh', group, cases: drills.list(group), manifestHash: drills.manifest.hash })),
    ...legacyDrills.manifest.chapters.map(group => ({ kind: 'legacy_regression', group, cases: legacyDrills.list(group), manifestHash: legacyDrills.manifest.hash }))];
  if (!Array.isArray(exam.results) || exam.results.length !== groups.length) fail('OVERALL_EVIDENCE_GROUP_DENOMINATOR');
  const summaries = [{ kind: 'fresh', cases: 0, correct: 0 }, { kind: 'legacy_regression', cases: 0, correct: 0 }];
  for (const [index, group] of groups.entries()) {
    const result = verifySeal(exam.results[index]);
    const input = { candidateHash: candidate.hash, contextHash: context.hash, cases: group.cases, manifestHash: group.manifestHash, maxWallMs };
    if (result.candidateHash !== candidate.hash || result.contextHash !== context.hash || result.inputHash !== hash(input)
      || result.kind !== group.kind || result.group !== group.group || result.manifestHash !== group.manifestHash
      || result.expectedAnswersExposed !== false || result.toolsUsed !== false || result.roomReplayPerformed !== false
      || result.trainingTruth !== false || ![0, 1].includes(result.schemaRepairs)) fail('OVERALL_EVIDENCE_GROUP_BINDING_INVALID');
    step('overall-evaluation.' + group.kind + '.' + group.group, input, result);
    const output = raw(result.providerReceiptHash); exact(output, ['predictions']);
    if (!Array.isArray(output.predictions) || output.predictions.length !== group.cases.length) fail('OVERALL_EVIDENCE_CASE_DENOMINATOR');
    const pending = new Set(group.cases.map(c => c.id));
    for (const row of output.predictions) if (!pending.delete(row.id)) fail('OVERALL_EVIDENCE_CASE_ID_INVALID');
    const rescored = output.predictions.map(row => group.kind === 'fresh' ? drills.verify(row) : legacyDrills.judge(group.group, row));
    const correct = rescored.filter(r => r.passed).length;
    if (hash(rescored) !== hash(result.predictions) || result.cases !== rescored.length || result.correct !== correct) fail('OVERALL_EVIDENCE_SCORE_INVALID');
    const summary = summaries.find(r => r.kind === group.kind); summary.cases += rescored.length; summary.correct += correct;
  }
  if (hash(summaries) !== hash(exam.summary) || exam.passed !== summaries.every(s => s.cases > 0 && s.correct === s.cases)
    || exam.expectedAnswersExposed !== false || exam.roomReplayPerformed !== false || exam.runtimeAccepted !== false
    || exam.strategyEffectivenessProven !== false || exam.trainingTruth !== false) fail('OVERALL_EVIDENCE_EXAM_INVALID');
  const regressionInput = { candidateHash: candidate.hash, contextHash: context.hash, probesHash: probes.hash };
  step('overall-source-regression', regressionInput, regression);
  const answers = validateSourceAuditAnswers(raw(regression.receiptHash), probes);
  if (regression.contextHash !== context.hash || regression.probesHash !== probes.hash
    || hash(answers) !== hash(regression.answers) || regression.total !== probes.cases.length
    || regression.correct !== answers.filter(a => a.passed).length || regression.passed !== answers.every(a => a.passed)
    || regression.fullSkillSections !== candidate.sections.length || regression.omittedClaims !== 0
    || regression.expectedAnswersExposed !== false || regression.strategyEffectivenessProven !== false
    || regression.trainingTruth !== false) fail('OVERALL_EVIDENCE_SOURCE_REGRESSION_INVALID');
  const qualityPassed = exam.passed && regression.passed;
  if (requirePassing && !qualityPassed) fail('OVERALL_EVIDENCE_QUALITY_NOT_PASSED');
  return seal({ candidateHash: candidate.hash, examHash: exam.hash, regressionHash: regression.hash,
    contextHash: context.hash, summaries, sourceCases: answers.length, providerReceiptHashes: [...receiptHashes],
    scoresRecomputedFromRawAnswers: true, fullSkillExposed: true, expectedAnswersExposed: false,
    qualityPassed, diagnosticOnly: !requirePassing,
    strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
}

// The subsequent audit/faction stages must inspect completed production, not
// trust a convenient file, stale checkpoint or synthetic acceptance boolean.
export function inspectCompletedOverallProductionV3({ filename, recipe, report, candidate, exam, regression,
  plan, catalogue, context, drills, legacyDrills, probes, purpose = 'qualified_dependency' }) {
  if (!['qualified_dependency', 'diagnostic_audit'].includes(purpose)) fail('OVERALL_EVIDENCE_PURPOSE_INVALID');
  const diagnostic = purpose === 'diagnostic_audit';
  [recipe, report, candidate, plan, catalogue, context].forEach(verifySeal);
  const runId = 'overall-v3-' + recipe.hash.slice(0, 20), count = plan.packets.length;
  if (recipe.version !== 'overall-rules-production-v3-complete-and-exam' || report.runId !== runId
    || report.recipeHash !== recipe.hash
    || report.failure && !(diagnostic && report.failure.code === 'V3_OVERALL_EVALUATION_REQUIRES_TARGETED_REPAIR')
    || recipe.planHash !== plan.hash
    || recipe.catalogueHash !== catalogue.hash || recipe.contextHash !== context.hash
    || report.planHash !== plan.hash || report.contextHash !== context.hash
    || report.processedPackets !== count || report.plannedPackets !== count || report.semanticallyPassedPackets !== count
    || recipe.drillManifestHash !== drills.manifest.hash || recipe.regressionManifestHash !== legacyDrills.manifest.hash
    || recipe.sourceProbeManifestHash !== probes.hash) fail('OVERALL_EVIDENCE_PRODUCTION_INCOMPLETE');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== recipe.hash) fail('OVERALL_EVIDENCE_RECIPE_DRIFT');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(runId).n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(runId).n) fail('OVERALL_EVIDENCE_PRODUCTION_RUNNING');
    const readStep = id => {
      const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
      return row && { inputHash: row.input_hash, value: verifySeal(JSON.parse(row.artifact)).value };
    };
    const packets = plan.packets.map(p => readStep(p.id + '.candidate')?.value || readStep(p.id + '.verified-repair-import')?.value);
    if (packets.some(p => !p) || hash(packets.map(p => verifySeal(p).hash)) !== hash(report.resultHashes)) fail('OVERALL_EVIDENCE_PACKETS_MISSING');
    if (!diagnostic) for (const packet of packets) assertNoKnownExternalClaimFailure(db, packet);
    const rebuilt = assembleOverallRulesCandidateV3({ catalogue, plan, packets });
    if (rebuilt.hash !== candidate.hash || report.candidateHash !== candidate.hash) fail('OVERALL_EVIDENCE_ASSEMBLY_DRIFT');
    const responses = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(runId)
      .map(row => verifySeal(JSON.parse(row.response)).value);
    const exams = inspectOverallExamsV3({ candidate, exam, regression, drills, legacyDrills, probes, readStep,
      providerProfileHash: recipe.modelHash, readReceipt: h => responses.find(r => r.usageReceipt?.receiptHash === h), requirePassing: !diagnostic });
    if (report.actualExamHash !== exam.hash || report.sourceRegressionHash !== regression.hash
      || hash(report.actualExamSummary) !== hash(exam.summary) || report.actualExamPassed !== exam.passed
      || report.sourceRegressionPassed !== regression.passed || report.overallEvaluationPassed !== exams.qualityPassed) fail('OVERALL_EVIDENCE_REPORT_DRIFT');
    return seal({ schema: 'starcraft_completed_overall_production_evidence_v3', runId, recipeHash: recipe.hash,
      reportHash: report.hash, candidateHash: candidate.hash, sourceBinding: candidate.sourceBinding, catalogueHash: catalogue.hash,
      packetHashes: packets.map(p => p.hash), exams, completeSourceAssemblyVerified: true,
      purpose, diagnosticOnly: diagnostic, baseExamsQualified: !diagnostic && exams.qualityPassed,
      qualifiedForDependentGeneration: false,
      furtherGates: ['supplemental_source_audit', 'factions_and_directed_matchups', 'actual_arena', 'reflection_regression_rollback'],
      authorizesPublication: false, runtimeAccepted: false, humanReviewed: false, canAffectRules: false, trainingTruth: false });
  } finally { db.close(); }
}
