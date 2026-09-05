import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createConfirmedOverallOmissionsV1, repairCompleteSkillV1 } from '../packages/skill-production-v3/complete-source-repair-v1.mjs';
import { inspectCompletedOverallProductionV3, inspectOverallExamsV3 } from '../packages/skill-production-v3/overall-evidence-gate.mjs';
import { assertNoKnownExternalClaimFailure } from '../packages/skill-production-v3/external-findings.mjs';
import { readCompleteOverallRulesContextV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createSourceAuditProbesV3, validateSourceAuditAnswers } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), runId = process.argv[2];
if (process.argv.length !== 3 || !/^overall-repair-[a-f0-9]{20}$/.test(runId || '')) fail('REPAIR_INSPECTION_ARGUMENTS_INVALID');
const base = path.join(root, 'build/ticket-18-production-v3'), out = path.join(base, runId);
const json = async (dir, name) => verifySeal(JSON.parse(await readFile(path.join(dir, name + '.json'), 'utf8')));
const recipe = await json(out, 'recipe'), report = await json(out, 'report');
if (recipe.version !== 'complete-overall-source-repair-v1' || runId !== 'overall-repair-' + recipe.hash.slice(0, 20)
  || report.recipeHash !== recipe.hash || report.runId !== runId
  || report.failure && report.failure.code !== 'COMPLETE_REPAIR_EVALUATION_NOT_PASSED') fail('REPAIR_INSPECTION_PRODUCTION_INCOMPLETE');
const parentDir = path.join(base, recipe.parentRunId);
const [parent, parentReport, old, oldExam, oldRegression] = await Promise.all(
  ['recipe', 'report', 'overall-rules-candidate', 'actual-model-exam', 'actual-source-regression'].map(n => json(parentDir, n)));
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue);
const plan = createFirstFivePlan(catalogue), context = createGlobalProductionContext(catalogue);
const drills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const probes = createSourceAuditProbesV3({ catalogue, reader }), supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentEvidence = inspectCompletedOverallProductionV3({ filename, recipe: parent, report: parentReport, candidate: old,
  exam: oldExam, regression: oldRegression, plan, catalogue, context, drills, legacyDrills, probes, purpose: 'diagnostic_audit' });
if (recipe.parentRecipeHash !== parent.hash || recipe.parentEvidenceHash !== parentEvidence.hash
  || recipe.parentCandidateHash !== old.hash || recipe.catalogueHash !== catalogue.hash || recipe.contextHash !== context.hash
  || recipe.planHash !== plan.hash || recipe.drillManifestHash !== drills.manifest.hash
  || recipe.legacyManifestHash !== legacyDrills.manifest.hash || recipe.probesHash !== probes.hash
  || recipe.supplementalHash !== supplemental.hash || recipe.supplementalStepPrefix !== 'supplemental.') fail('REPAIR_INSPECTION_BINDING_DRIFT');
const parents = await Promise.all(plan.packets.map(p => json(parentDir, p.id)));
if (hash(parents.map(p => p.hash)) !== hash(parentEvidence.packetHashes)) fail('REPAIR_INSPECTION_PARENT_PACKETS_DRIFT');
const findings = createConfirmedOverallOmissionsV1({ candidate: old, packets: parents, context, reader });
const rebuilt = await repairCompleteSkillV1({ catalogue, plan, context, candidate: old, packets: parents, findings,
  repairPacket: async ({ packet }) => ({ candidate: await json(out, packet.id), repair: await json(out, packet.id + '.external-repair') }),
  importPacket: ({ packet }) => json(out, packet.id) });
const [candidate, exam, regression, extra, repairReceipt] = await Promise.all(
  ['overall-rules-candidate', 'actual-model-exam', 'actual-source-regression', 'actual-supplemental-source-audit', 'repair-receipt'].map(n => json(out, n)));
if (rebuilt.manifest.hash !== recipe.repairPlanHash || rebuilt.candidate.hash !== candidate.hash || rebuilt.receipt.hash !== repairReceipt.hash
  || report.repairReceiptHash !== repairReceipt.hash || report.candidateHash !== candidate.hash || report.processedPackets !== 37
  || hash(report.resultHashes) !== hash(rebuilt.packets.map(p => p.hash))) fail('REPAIR_INSPECTION_REASSEMBLY_DRIFT');
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== recipe.hash
    || db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(runId).n
    || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(runId).n) fail('REPAIR_INSPECTION_JOURNAL_NOT_COMPLETE');
  const readStep = id => {
    const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
    return row && { inputHash: row.input_hash, value: verifySeal(JSON.parse(row.artifact)).value };
  };
  for (const packet of rebuilt.packets) {
    assertNoKnownExternalClaimFailure(db, packet);
    const saved = readStep(packet.packetId + '.candidate') || readStep(packet.packetId + '.verified-repair-import');
    if (!saved || verifySeal(saved.value).hash !== packet.hash) fail('REPAIR_INSPECTION_PACKET_JOURNAL_DRIFT');
  }
  for (const finding of findings) if (verifySeal(readStep('external-finding.' + finding.hash)?.value).hash !== finding.hash) fail('REPAIR_INSPECTION_FINDING_JOURNAL_DRIFT');
  const responses = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(runId)
    .map(r => verifySeal(JSON.parse(r.response)).value);
  const exams = inspectOverallExamsV3({ candidate, exam, regression, drills, legacyDrills, probes, readStep,
    providerProfileHash: recipe.modelHash, readReceipt: h => responses.find(r => r.usageReceipt?.receiptHash === h), requirePassing: false });
  const fullContext = readCompleteOverallRulesContextV3(candidate);
  const input = { candidateHash: candidate.hash, contextHash: fullContext.hash, probesHash: supplemental.hash };
  const saved = readStep('supplemental.overall-source-regression'), response = responses.find(r => r.usageReceipt?.receiptHash === extra.receiptHash);
  if (!saved || saved.inputHash !== hash(input) || verifySeal(saved.value).hash !== extra.hash || !response) fail('REPAIR_INSPECTION_SUPPLEMENTAL_MISSING');
  const { receiptHash, ...receiptBody } = response.usageReceipt;
  if (hash(receiptBody) !== receiptHash || receiptBody.providerProfileRef?.hash !== recipe.modelHash || receiptBody.status !== 200
    || receiptBody.physicalAttempts !== 1 || receiptBody.automaticRetries !== 0
    || receiptBody.schemaVersion !== 'starcraft_tmg_provider_egress_transport_v1.success'
    || receiptBody.responseFingerprint !== sha256(JSON.stringify(response.output)) || response.output.channels?.skill?.action !== 'finish'
    || exams.providerReceiptHashes.includes(receiptHash)) fail('REPAIR_INSPECTION_SUPPLEMENTAL_RECEIPT_INVALID');
  const answers = validateSourceAuditAnswers(response.output.channels.skill.content, supplemental);
  const extraCorrect = answers.filter(a => a.passed).length;
  if (hash(answers) !== hash(extra.answers) || extra.candidateHash !== candidate.hash || extra.contextHash !== fullContext.hash
    || extra.probesHash !== supplemental.hash || extra.total !== answers.length || extra.correct !== extraCorrect
    || extra.passed !== answers.every(a => a.passed) || extra.fullSkillSections !== 37 || extra.omittedClaims !== 0
    || extra.expectedAnswersExposed !== false || extra.strategyEffectivenessProven !== false || extra.trainingTruth !== false) fail('REPAIR_INSPECTION_SUPPLEMENTAL_SCORE_DRIFT');
  const qualityPassed = exams.qualityPassed && extra.passed;
  if (report.sourceResultHash !== regression.hash || report.supplementalResultHash !== extra.hash || report.examResultHash !== exam.hash
    || report.sourceCorrect !== regression.correct || report.supplementalCorrect !== extra.correct
    || hash(report.examSummary) !== hash(exam.summary) || report.evaluationPassed !== qualityPassed) fail('REPAIR_INSPECTION_REPORT_DRIFT');
  const result = seal({ schema: 'starcraft_actual_complete_repair_inspection_v1', runId, recipeHash: recipe.hash,
    parentEvidenceHash: parentEvidence.hash, repairReceiptHash: repairReceipt.hash, candidateHash: candidate.hash,
    exams, supplementalResultHash: extra.hash, supplementalReceiptHash: receiptHash, supplementalCorrect: extraCorrect,
    scoresRecomputedFromRawAnswers: true, cases: 127, changedClaims: rebuilt.receipt.changedClaims,
    unchangedClaims: rebuilt.receipt.unchangedClaims, unchangedPackets: rebuilt.receipt.retainedPackets,
    qualityPassed, diagnosticOnly: true, formalAcceptance: false, runtimeAccepted: false, trainingTruth: false });
  await writeFile(path.join(out, 'verified-repair-evidence.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ evidenceVerified: true, qualityPassed, changedClaims: result.changedClaims,
    unchangedClaims: result.unchangedClaims, rawAnswersRescored: result.cases, examSummary: exam.summary,
    sourceCorrect: regression.correct, supplementalCorrect: extraCorrect, providerCalls: 0, hash: result.hash }));
} finally { db.close(); }
