import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
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
import { createAnswerRepairBookV1, applyAnswerReviewPatchV1 } from '../packages/skill-evaluation/answer-internal-review-v1.mjs';
import { createRulesBackedDevelopmentFeedbackV1 } from '../packages/skill-evaluation/rules-backed-answer-repair-v1.mjs';
import { evaluateGuidedRulesV1 } from '../packages/skill-evaluation/guided-rules-evaluation-v1.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const args = process.argv.slice(2);
if (args.length !== 3 || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--teacher-run'
  || !/^answer-review-[a-f0-9]{20}$/.test(args[2])) fail('GUIDED_RUN_ARGUMENTS_INVALID');
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const parentDir = path.join(base, args[2]);
const [parent, parentReport, teacher] = await Promise.all(['recipe', 'report', 'actual-answer-review'].map(n => json(path.join(parentDir, n + '.json'))));
if (parent.version !== 'rules_backed_development_correction_v1' || 'answer-review-' + parent.hash.slice(0, 20) !== args[2]
  || parentReport.recipeHash !== parent.hash || parentReport.resultHash !== teacher.hash || parentReport.failure
  || !parentReport.developmentCorrectionPassed || parent.modelHash !== profile.integrity.hash
  || !/^overall-repair-[a-f0-9]{20}$/.test(parent.parentRunId)) fail('GUIDED_RUN_TEACHER_INCOMPLETE');
const inspection = await promisify(execFile)(process.execPath,
  [path.join(root, 'scripts/inspect-ticket-18-complete-repair-evidence-v1.mjs'), parent.parentRunId], { cwd: root, timeout: 240000, maxBuffer: 64 * 1024 });
const inspected = JSON.parse(inspection.stdout.trim());
if (!inspected.evidenceVerified || inspected.hash !== parent.parentEvidenceHash) fail('GUIDED_RUN_BASE_NOT_VERIFIED');
const candidate = await json(path.join(base, parent.parentRunId, 'overall-rules-candidate.json'));
const exam = await json(path.join(base, parent.parentRunId, 'actual-model-exam.json'));
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue), context = createGlobalProductionContext(catalogue);
const originalDrills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const independentDrills = await createIndependentConditionDrillsV1({ catalogue, originalDrills, legacyDrills });
const sourceProbes = createSourceAuditProbesV3({ catalogue, reader }), supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const book = createAnswerRepairBookV1({ candidate, exam, drills: originalDrills, legacyDrills });
const feedback = createRulesBackedDevelopmentFeedbackV1({ candidate, book, catalogue, drills: originalDrills, legacyDrills });
if (book.hash !== parent.bookHash || feedback.hash !== parent.feedbackHash || candidate.hash !== parent.candidateHash
  || context.hash !== parent.contextHash || independentDrills.manifest.hash !== parent.frozenIndependentConditionManifestHash) fail('GUIDED_RUN_DEPENDENCY_DRIFT');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const db = new DatabaseSync(filename, { readOnly: true });
let teacherReceiptHash;
try {
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(args[2])?.recipe !== parent.hash) fail('GUIDED_RUN_TEACHER_JOURNAL_DRIFT');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id='rules-backed-development-editor' AND state='complete'").get(args[2]);
  if (!row || verifySeal(verifySeal(JSON.parse(row.artifact)).value).hash !== teacher.hash) fail('GUIDED_RUN_TEACHER_ARTIFACT_DRIFT');
  const responses = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(args[2]).map(r => verifySeal(JSON.parse(r.response)).value);
  const response = responses.find(r => r.usageReceipt?.receiptHash === teacher.receiptHash);
  if (!response) fail('GUIDED_RUN_TEACHER_RECEIPT_MISSING');
  const { receiptHash, ...receiptBody } = response.usageReceipt; teacherReceiptHash = receiptHash;
  if (hash(receiptBody) !== receiptHash || receiptBody.status !== 200 || receiptBody.physicalAttempts !== 1 || receiptBody.automaticRetries !== 0
    || receiptBody.providerProfileRef?.hash !== profile.integrity.hash || receiptBody.responseFingerprint !== sha256(JSON.stringify(response.output))
    || response.output.channels?.skill?.action !== 'finish') fail('GUIDED_RUN_TEACHER_RECEIPT_INVALID');
  const output = response.output.channels.skill.content;
  const answers = applyAnswerReviewPatchV1({ replacements: output.replacements }, { book, answers: book.answers, review: feedback });
  if (hash(output.lessons) !== hash(teacher.lessons) || hash(answers) !== hash(teacher.answers) || teacher.feedbackHash !== feedback.hash
    || hash(teacher.originalAnswers) !== hash(book.answers) || teacher.independentConditionCasesExposed) fail('GUIDED_RUN_TEACHER_OUTPUT_DRIFT');
  const scores = answers.map(a => { const c = book.cases[a.caseIndex]; return c.kind === 'fresh' ? originalDrills.verify(a.prediction) : legacyDrills.judge(c.group, a.prediction); });
  if (!scores.every(s => s.passed) || parentReport.correct !== scores.length) fail('GUIDED_RUN_DEVELOPMENT_CORRECTION_FAILED');
} finally { db.close(); }
const main = await verifyProductionReadiness(root, catalogue), gates = [];
for (const name of ['guided-rules-evaluation', 'independent-condition', 'reader-command-policy']) {
  const gate = await json(path.join(base, name + '-readiness.json'));
  if (!gate.passed) fail('GUIDED_RUN_READINESS_FAILED');
  for (const r of gate.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('GUIDED_RUN_READINESS_CODE_DRIFT');
  gates.push(gate);
}
if (gates[0].teacherHash !== teacher.hash || gates[0].independentManifestHash !== independentDrills.manifest.hash) fail('GUIDED_RUN_READINESS_INPUT_DRIFT');
const files = ['scripts/run-ticket-18-guided-rules-evaluation-v1.mjs', 'packages/skill-evaluation/guided-rules-evaluation-v1.mjs',
  'packages/skill-evaluation/independent-condition-drills-v1.mjs', 'packages/skill-production/model.mjs',
  'packages/skill-production/store.mjs', 'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = { maxCalls: 50, maxCostMicros: 5_000_000, maxTokens: 12_000_000, maxWallMs: 60 * 60 * 1000, maxInputBytes: 1_000_000 };
const recipe = seal({ version: 'guided_overall_rules_evaluation_v1', parentRunId: args[2], parentRecipeHash: parent.hash,
  teacherHash: teacher.hash, teacherReceiptHash, candidateHash: candidate.hash, contextHash: context.hash,
  catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, modelHash: profile.integrity.hash,
  independentManifestHash: independentDrills.manifest.hash, originalManifestHash: originalDrills.manifest.hash,
  legacyManifestHash: legacyDrills.manifest.hash, sourceProbesHash: sourceProbes.hash, supplementalHash: supplemental.hash,
  mainReadinessHash: main.hash, readinessHashes: gates.map(g => g.hash), codeHashes, limits,
  commandPolicy: 'finish_only', oldCasesAreDevelopment: true, newEvaluationAnswersExposed: false,
  sourceRefreshPerformed: false, formalAcceptance: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, lessonCandidates: teacher.lessons.length,
    fullSkillClaims: candidate.coverage.claims, developmentCases: 105, independentCases: 30, sourceControls: 22,
    expectedAnswersExposed: false, paidCalls: 0, limits })); process.exit(0);
}
const runId = 'guided-rules-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, result = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('GUIDED_RUN_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('teacher', teacher); await put('independent-manifest', independentDrills.manifest);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'guided-rules-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('GUIDED_RUN_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  result = await evaluateGuidedRulesV1({ candidate, teacher, context, originalDrills, legacyDrills, independentDrills,
    sourceProbes, supplemental, store, model,
    onProgress: row => console.log(JSON.stringify({ event: 'guided-evaluation', ticket: 18, slice: 173, ...row })) });
  await put('actual-guided-evaluation', result);
  if (!result.passed) fail('GUIDED_RULES_EVALUATION_NOT_PASSED');
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'GUIDED_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'guided_evaluation_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, candidateHash: candidate.hash, teacherHash: teacher.hash,
    resultHash: result?.hash || null, summary: result?.summary || null, sourceCorrect: result?.sourceControl.correct ?? null,
    passed: !!result?.passed && !failure, failure, ledger,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['independent_source_review', 'full_skill_plus_guide_reader', 'external_rules_judge'],
    newEvaluationAnswersExposed: false, oldCasesAreDevelopment: true, sourceRefreshPerformed: false,
    formalSkillsAccepted: 0, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    promotions: [], trainingTruth: false, elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, passed: report.passed, failure, summary: report.summary,
    sourceCorrect: report.sourceCorrect, tokens: ledger.knownTokens, cumulativeTokens: report.cumulativeKnownTokensLowerBound,
    cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
