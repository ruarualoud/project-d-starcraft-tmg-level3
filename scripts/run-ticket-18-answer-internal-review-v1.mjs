import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createAnswerRepairBookV1, internallyReviewAnswersV1 } from '../packages/skill-evaluation/answer-internal-review-v1.mjs';
import { createRulesBackedDevelopmentFeedbackV1, repairAnswersFromRulesV1 } from '../packages/skill-evaluation/rules-backed-answer-repair-v1.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
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
if (![3, 4].includes(args.length) || args.length === 4 && args[3] !== '--rules-feedback'
  || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--repair-run'
  || !/^overall-repair-[a-f0-9]{20}$/.test(args[2])) fail('ANSWER_REVIEW_RUN_ARGUMENTS_INVALID');
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
// This read-only checker reconstructs the source repair and re-scores all127
// prior raw answers. A saved self-declared score is not a production parent.
const inspection = await promisify(execFile)(process.execPath,
  [path.join(root, 'scripts/inspect-ticket-18-complete-repair-evidence-v1.mjs'), args[2]],
  { cwd: root, timeout: 240000, maxBuffer: 64 * 1024 });
const inspected = JSON.parse(inspection.stdout.trim());
if (!inspected.evidenceVerified) fail('ANSWER_REVIEW_PARENT_NOT_VERIFIED');
const parentDir = path.join(base, args[2]);
const [parent, parentReport, evidence, candidate, exam] = await Promise.all(
  ['recipe', 'report', 'verified-repair-evidence', 'overall-rules-candidate', 'actual-model-exam'].map(n => json(path.join(parentDir, n + '.json'))));
if (evidence.hash !== inspected.hash || evidence.candidateHash !== candidate.hash || evidence.exams.examHash !== exam.hash
  || parentReport.candidateHash !== candidate.hash || evidence.recipeHash !== parent.hash || evidence.runId !== args[2]
  || evidence.exams.sourceCases !== 14 || evidence.supplementalCorrect !== 8) fail('ANSWER_REVIEW_PARENT_BINDING_DRIFT');
const catalogue = await loadFrozenSkillEvidence(root), drills = await createProductionDrills(catalogue);
const legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const book = createAnswerRepairBookV1({ candidate, drills, legacyDrills, exam });
const rulesFeedback = args[3] === '--rules-feedback';
const feedback = rulesFeedback ? createRulesBackedDevelopmentFeedbackV1({ candidate, book, catalogue, drills, legacyDrills }) : null;
const context = rulesFeedback ? createGlobalProductionContext(catalogue) : null;
const independentManifest = rulesFeedback ? await json(path.join(base, 'independent-condition-manifest.json')) : null;
const main = await verifyProductionReadiness(root, catalogue), gates = [];
for (const name of ['answer-internal-review', 'reader-command-policy', ...(rulesFeedback ? ['rules-backed-answer-repair', 'independent-condition'] : [])]) {
  const gate = await json(path.join(base, name + '-readiness.json'));
  if (!gate.passed) fail('ANSWER_REVIEW_READINESS_FAILED');
  for (const r of gate.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('ANSWER_REVIEW_READINESS_CODE_DRIFT');
  gates.push(gate);
}
if (gates[0].bookHash !== book.hash) fail('ANSWER_REVIEW_READINESS_BOOK_DRIFT');
if (rulesFeedback && (gates[2].feedbackHash !== feedback.hash || gates[3].manifestHash !== independentManifest.hash
  || hash(independentManifest.sourceBinding) !== hash(catalogue.sourceBinding))) fail('RULES_FEEDBACK_INDEPENDENT_MANIFEST_DRIFT');
const files = ['scripts/run-ticket-18-answer-internal-review-v1.mjs', 'scripts/inspect-ticket-18-complete-repair-evidence-v1.mjs',
  'packages/skill-evaluation/rules-backed-answer-repair-v1.mjs', 'packages/skill-evaluation/independent-condition-drills-v1.mjs',
  'packages/skill-evaluation/answer-internal-review-v1.mjs', 'packages/skill-production/model.mjs',
  'packages/skill-production/store.mjs', 'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = { maxCalls: 10, maxCostMicros: 3_000_000, maxTokens: 4_000_000,
  maxWallMs: 15 * 60 * 1000, maxInputBytes: rulesFeedback ? 1_000_000 : 786432, maxRevisions: 2 };
const recipe = seal({ version: rulesFeedback ? 'rules_backed_development_correction_v1' : 'complete_skill_answer_internal_review_v1',
  parentRunId: args[2], parentRecipeHash: parent.hash, feedbackHash: feedback?.hash || null,
  frozenIndependentConditionManifestHash: independentManifest?.hash || null, contextHash: context?.hash || null,
  parentReportHash: parentReport.hash, parentEvidenceHash: evidence.hash, candidateHash: candidate.hash,
  bookHash: book.hash, baselineExamHash: exam.hash, catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding,
  modelHash: profile.integrity.hash, commandPolicy: 'finish_only', limits, codeHashes,
  mainReadinessHash: main.hash, readinessHashes: gates.map(g => g.hash), selection: 'all_original_cases',
  oracleFeedbackAllowed: rulesFeedback, feedbackScope: rulesFeedback ? 'old_cases_reclassified_as_development_only' : 'none',
  independentCasesAndAnswersExposed: false, checkerConsensusIsNotAcceptance: true, sourceRefreshPerformed: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, cases: book.cases.length, fullSkillClaims: candidate.coverage.claims,
    priorRawScore: exam.summary, maxSemanticRevisions: limits.maxRevisions, developmentAnswersExposed: rulesFeedback,
    independentCasesAndAnswersExposed: false, feedbackCases: feedback?.findings.length || 0,
    frozenIndependentCases: independentManifest?.cases || 0, paidCalls: 0, limits })); process.exit(0);
}
const runId = 'answer-review-' + recipe.hash.slice(0, 20), out = path.join(base, runId);
await mkdir(out, { recursive: true });
const store = openProductionStore(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, result = null, score = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('ANSWER_REVIEW_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('book', book); await put('parent-evidence', evidence);
  if (rulesFeedback) await put('development-feedback', feedback);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'answer-review-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('ANSWER_REVIEW_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  result = rulesFeedback ? await repairAnswersFromRulesV1({ candidate, book, feedback, context, store, model })
    : await internallyReviewAnswersV1({ candidate, book, store, model, maxRevisions: limits.maxRevisions,
      onProgress: row => console.log(JSON.stringify({ event: 'answer-internal-review', ticket: 18, slice: 173, ...row })) });
  await put('actual-answer-review', result);
  // External host judge only after the autonomous review has ended. Neither
  // scores nor counterexample answers can route back into that review loop.
  const rows = result.answers.map(({ caseIndex, prediction }) => {
    const c = book.cases[caseIndex];
    return c.kind === 'fresh' ? drills.verify(prediction) : legacyDrills.judge(c.group, prediction);
  });
  const original = exam.results.flatMap(g => g.predictions);
  score = seal({ resultHash: result.hash, candidateHash: candidate.hash, baselineExamHash: exam.hash, rows,
    total: rows.length, correct: rows.filter(r => r.passed).length, baselineCorrect: original.filter(r => r.passed).length,
    correctedIds: rows.filter(r => r.passed && !original.find(o => o.id === r.id).passed).map(r => r.id),
    regressedIds: rows.filter(r => !r.passed && original.find(o => o.id === r.id).passed).map(r => r.id),
    allCorrect: rows.every(r => r.passed), modelConsensusClosed: result.closed ?? null,
    developmentAnswersExposed: rulesFeedback, independentCasesAndAnswersExposed: false,
    sourceControlsCarriedForwardFromVerifiedSameCandidate: 22, freshUnseenGeneralizationProven: false,
    formalAcceptance: false, runtimeAccepted: false, trainingTruth: false });
  await put('actual-score', score);
  if ((!rulesFeedback && !result.closed) || !score.allCorrect) fail(rulesFeedback ? 'RULES_DEVELOPMENT_CORRECTION_NOT_PASSED' : 'ANSWER_REVIEW_EVALUATION_NOT_PASSED');
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'ANSWER_REVIEW_RUN_FAILURE', diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'answer_review_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, candidateHash: candidate.hash, bookHash: book.hash,
    resultHash: result?.hash || null, scoreHash: score?.hash || null, correct: score?.correct ?? null, total: book.cases.length,
    changedCases: result?.changedCases ?? null, internalReviewClosed: result?.closed || false,
    evaluationPassed: (!rulesFeedback && !!result?.closed) && !!score?.allCorrect && !failure,
    developmentCorrectionPassed: rulesFeedback && !!score?.allCorrect && !failure,
    lessonCandidates: result?.lessons?.length || 0, failure, ledger,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: rulesFeedback ? ['actual_rules_development_feedback', 'complete_source_teach_editor', 'external_kernel_judge']
      : ['independent_input_and_claim_critic', 'bounded_answer_editor', 'fresh_critic', 'external_kernel_judge'],
    sourceRefreshPerformed: false, developmentAnswersExposed: rulesFeedback,
    independentCasesAndAnswersExposed: false, baselineOverwritten: false,
    formalSkillsAccepted: 0, newSkillsGenerated: 0, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    freshUnseenGeneralizationProven: false, promotions: [], trainingTruth: false, elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, correct: report.correct, total: report.total,
    changedCases: report.changedCases, internalReviewClosed: report.internalReviewClosed, failure,
    developmentCorrectionPassed: report.developmentCorrectionPassed, lessonCandidates: report.lessonCandidates,
    tokens: ledger.knownTokens, cumulativeTokens: report.cumulativeKnownTokensLowerBound,
    cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
