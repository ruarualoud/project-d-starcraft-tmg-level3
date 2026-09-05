import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGuideRepairInputsV1 } from './ticket-18-guide-repair-inputs-v1.mjs';
import { inspectGuideNoProgressV1 } from './ticket-18-guide-no-progress-evidence-v1.mjs';
import { replayGuideReconstructionV1, materializeReusedGuideV1 } from './ticket-18-guide-reconstruction-reuse-v1.mjs';
import { repairGuideFromRulesV1 } from '../packages/skill-evaluation/guide-local-repair-v1.mjs';
import { evaluateGuidedRulesV1 } from '../packages/skill-evaluation/guided-rules-evaluation-v1.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
if (![3, 5, 7].includes(args.length) || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--parent-run'
  || args.length >= 5 && args[3] !== '--recover-no-progress-run'
  || args.length === 7 && args[5] !== '--reuse-reconstruction-run') fail('GUIDE_REPAIR_ARGUMENTS_INVALID');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }
const deps = await loadGuideRepairInputsV1(root, args[2]);
const { base, parent, parentEvidence, baseRunId, candidate, teacher, context, catalogue, feedback, independentDrills } = deps;
const recovery = args.length >= 5 ? await inspectGuideNoProgressV1(root, args[4], deps) : null;
const reuse = args.length === 7 ? await replayGuideReconstructionV1(root, args[6], deps, recovery) : null;
if (parent.modelHash !== profile.integrity.hash) fail('GUIDE_REPAIR_PROFILE_DRIFT');
const main = await verifyProductionReadiness(root, catalogue), gates = [];
for (const name of ['guide-local-repair', 'guided-rules-evaluation', 'independent-condition', 'reader-command-policy']) {
  const gate = verifySeal(JSON.parse(await readFile(path.join(base, name + '-readiness.json'), 'utf8')));
  if (!gate.passed) fail('GUIDE_REPAIR_READINESS_FAILED');
  for (const r of gate.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('GUIDE_REPAIR_READINESS_CODE_DRIFT');
  gates.push(gate);
}
const files = ['scripts/run-ticket-18-guide-local-repair-v1.mjs', 'scripts/ticket-18-guide-repair-inputs-v1.mjs',
  'scripts/ticket-18-guide-no-progress-evidence-v1.mjs',
  'scripts/ticket-18-guide-reconstruction-reuse-v1.mjs',
  'scripts/inspect-ticket-18-guide-local-repair-evidence-v1.mjs', 'packages/skill-evaluation/guide-local-repair-v1.mjs',
  'packages/skill-evaluation/guided-rules-evaluation-v1.mjs', 'packages/skill-production/model.mjs',
  'packages/skill-production/store.mjs', 'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = { maxCalls: 30, maxCostMicros: 5_000_000, maxTokens: 12_000_000, maxWallMs: 60 * 60 * 1000, maxInputBytes: 1_000_000 };
const recipe = seal({ version: 'guide_local_repair_and_evaluation_v1', revision: (parent.revision ?? 0) + 1,
  parentRunId: args[2], parentRecipeHash: parent.hash, parentEvidenceHash: parentEvidence.hash, baseRunId,
  teacherHash: teacher.hash, feedbackHash: feedback.hash, candidateHash: candidate.hash, contextHash: context.hash,
  ...(recovery ? { recoveryHash: recovery.hash, recoveryRunId: args[4] } : {}),
  ...(reuse ? { reuseHash: reuse.hash, reuseRunId: args[6] } : {}),
  catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, modelHash: profile.integrity.hash,
  independentManifestHash: independentDrills.manifest.hash, originalManifestHash: deps.originalDrills.manifest.hash,
  legacyManifestHash: deps.legacyDrills.manifest.hash, sourceProbesHash: deps.sourceProbes.hash, supplementalHash: deps.supplemental.hash,
  mainReadinessHash: main.hash, readinessHashes: gates.map(g => g.hash), codeHashes, limits, commandPolicy: 'finish_only',
  developmentFeedbackExposed: true, independentCasesExposedToRepair: false, independentSuiteRepeated: true,
  sourceRefreshPerformed: false, formalAcceptance: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, revision: recipe.revision,
    failedDevelopmentCases: feedback.rules.findings.length, editableLessons: feedback.allowedLessons.map(l => l.id),
    preservedBaseClaims: candidate.coverage.claims, developmentCases: 105, repeatedIndependentCases: 30, sourceControls: 22,
    paidCalls: 0, limits })); process.exit(0);
}
const runId = 'guide-repair-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, repaired = null, result = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('GUIDE_REPAIR_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('feedback', feedback); await put('parent-teacher', teacher);
  if (recovery) await put('no-progress-evidence', recovery);
  if (reuse) await put('reconstruction-reuse', reuse);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'guide-repair-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('GUIDE_REPAIR_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  repaired = reuse ? materializeReusedGuideV1(store, reuse)
    : await repairGuideFromRulesV1({ candidate, teacher, feedback, context, store, model, recovery });
  await put('actual-guide-repair', repaired);
  console.log(JSON.stringify({ event: 'guide-repaired', changedLessons: repaired.changedLessons, hash: repaired.hash }));
  result = await evaluateGuidedRulesV1({ ...deps, teacher: repaired, store, model,
    onProgress: row => console.log(JSON.stringify({ event: 'guided-evaluation', ticket: 18, slice: 173, ...row })) });
  await put('actual-guided-evaluation', result);
  if (!result.passed) fail('GUIDED_RULES_EVALUATION_NOT_PASSED');
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'GUIDE_REPAIR_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'guide_local_repair_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, candidateHash: candidate.hash, parentTeacherHash: teacher.hash,
    repairedTeacherHash: repaired?.hash || null, resultHash: result?.hash || null, summary: result?.summary || null,
    sourceCorrect: result?.sourceControl.correct ?? null, passed: !!result?.passed && !failure, failure, ledger,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['rule_skill_builder', 'independent_source_review', 'full_skill_plus_guide_reader', 'external_rules_judge'],
    independentCasesExposedToRepair: false, independentSuiteRepeated: true, sourceRefreshPerformed: false,
    formalSkillsAccepted: 0, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    promotions: [], trainingTruth: false, elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, passed: report.passed, failure, summary: report.summary,
    sourceCorrect: report.sourceCorrect, tokens: ledger.knownTokens, cumulativeTokens: report.cumulativeKnownTokensLowerBound,
    cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
