import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planFactionDependencyRecheckV1, recheckFactionDependencyContextV1 } from '../packages/skill-production-v3/faction-dependency-recheck-v1.mjs';
import { checkDependencyRecheckBudgetV1 } from '../packages/skill-production-v3/dependency-recheck-budget-v1.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext, compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { prepareDshLoop, LOOP_LIMITS } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, safe, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
if (args.length !== 1 || !['--preflight', '--live'].includes(args[0])) fail('DEPENDENCY_RECHECK_ARGUMENTS_INVALID');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const sourceRunId = 'faction-v1-182042133d7ba5b21c2a';
const unsentRunId = 'dependency-recheck-d1479aa57de19d2c2ed8';
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const [input, parent, terminal, diagnosis, gate] = await Promise.all([json('terran_armed_forces-input'),
  json(sourceRunId + '/recipe'), json(sourceRunId + '/report'), json(sourceRunId + '/phase-regression-diagnosis'),
  json('dependency-recheck-readiness')]);
const captured = diagnosis.captured[0], request = captured.request;
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
if (context.hash !== input.frozenSources.hash || context.hash !== parent.contextHash || catalogue.hash !== input.catalogueHash
  || parent.modelHash !== profile.integrity.hash || diagnosis.inputHash !== input.hash || diagnosis.recipeHash !== parent.hash
  || diagnosis.terminalReportHash !== terminal.hash || terminal.failure?.code !== 'CHANNEL_SHAPE_INVALID'
  || !diagnosis.delivery.completeRequestsMatchedByHash || !diagnosis.delivery.rawResponsesMatchedByFingerprint
  || diagnosis.loops.length !== 4 || diagnosis.newProviderCalls !== 0) fail('DEPENDENCY_RECHECK_SOURCE_DRIFT');
const db = new DatabaseSync(filename, { readOnly: true }); let unsentStart;
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(sourceRunId).n) fail('DEPENDENCY_RECHECK_SOURCE_RUNNING');
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(sourceRunId)?.recipe !== parent.hash) fail('DEPENDENCY_RECHECK_SOURCE_DRIFT');
  if (db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(unsentRunId).n
    || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(unsentRunId).n)
    fail('DEPENDENCY_RECHECK_PRIOR_NOT_UNSENT');
  const start = db.prepare("SELECT artifact FROM steps WHERE run=? AND id='production-start' AND state='complete'").get(unsentRunId);
  if (!start) fail('DEPENDENCY_RECHECK_PRIOR_START_MISSING');
  unsentStart = verifySeal(JSON.parse(start.artifact)).value.began;
  const actual = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(sourceRunId, captured.stageId);
  const stepInput = { packetHash: request.packet.hash, contextHash: context.hash,
    task: compileGlobalTask(context, request.instruction, request.workspace), maxOutput: request.maxOutput, arm: 'dsh', limits: LOOP_LIMITS };
  if (!actual || actual.input_hash !== captured.stepInputHash || actual.input_hash !== hash(safe(stepInput))
    || hash(verifySeal(verifySeal(JSON.parse(actual.artifact)).value).output) !== hash(captured.output))
    fail('DEPENDENCY_RECHECK_ORIGINAL_REQUEST_NOT_MATCHED');
} finally { db.close(); }
const plan = planFactionDependencyRecheckV1({ input, captured });
if (!gate.passed || gate.inputHash !== input.hash || gate.captureHash !== captured.hash || gate.planHash !== plan.hash
  || !gate.fullSourcesAndDraftPreserved || !gate.negativeRetained || !gate.cachedRoleReuse
  || !gate.invalidTargetRejected || !gate.partialReviewNotSectionAcceptance || gate.productionRevisionBudgetReset)
  fail('DEPENDENCY_RECHECK_READINESS_INVALID');
for (const c of gate.codeHashes) if (sha256(await readFile(path.join(root, c.file))) !== c.hash) fail('DEPENDENCY_RECHECK_CODE_DRIFT');
const main = await verifyProductionReadiness(root, catalogue), dsh = await prepareDshLoop(root);
if (dsh.binding.hash !== parent.dshBindingHash) fail('DEPENDENCY_RECHECK_DSH_DRIFT');
const files = [...new Set([...gate.codeHashes.map(c => c.file),
  'scripts/run-ticket-18-faction-dependency-recheck-v1.mjs', 'packages/skill-production-v3/context.mjs',
  'packages/skill-production-v3/dependency-recheck-budget-v1.mjs',
  'packages/skill-production-v3/runtime.mjs', 'packages/skill-production/model.mjs',
  'packages/skill-production/loops.mjs', 'packages/skill-production/store.mjs'])];
const limits = { maxCalls: 8, maxCostMicros: 8_000_000, maxTokens: 4_000_000, maxWallMs: 30 * 60 * 1000, maxInputBytes: 1_000_000 };
const budgetPreflight = checkDependencyRecheckBudgetV1(limits);
const recipe = seal({ version: 'faction_dependency_recheck_run_v1', sourceRunId, sourceRecipeHash: parent.hash,
  sourceCaptureHash: captured.hash, sourceDiagnosisHash: diagnosis.hash, inputHash: input.hash, planHash: plan.hash,
  contextHash: context.hash, catalogueHash: catalogue.hash, sourceBinding: input.sourceBinding, modelHash: profile.integrity.hash,
  overallDependencyHash: input.overallDependencyHash, qualificationReceiptHash: input.qualificationReceiptHash,
  mainReadinessHash: main.hash, readinessHash: gate.hash, dshBindingHash: dsh.binding.hash,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  limits, budgetPreflight, replacesUnsentRun: { runId: unsentRunId, attempts: 0, originalStart: unsentStart, oldJournalRetained: true },
  plannedReviewCalls: 2, scope: 'two_target_source_review_intervention_not_production_revision_or_skill_acceptance',
  productionRevisionBudgetReset: false, sourceRefreshPerformed: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, plannedReviewCalls: 2,
    targetIndices: plan.targetIndices, newProviderCalls: 0, limits })); process.exit(0);
}
const runId = 'dependency-recheck-' + recipe.hash.slice(0, 20), out = path.join(base, runId);
await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: unsentStart }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, result = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('DEPENDENCY_RECHECK_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('source-capture', captured); await put('plan', plan);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'dependency-recheck-' + randomUUID(),
    providerProfile: profile, credentialBytes: ingress.credentialBytes }); } finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('DEPENDENCY_RECHECK_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      cumulativeCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh,
    onProgress: row => console.log(JSON.stringify({ event: 'dependency-recheck-role', ticket: 18, slice: 174, ...row })) });
  result = await recheckFactionDependencyContextV1({ input, captured, runtime, store,
    onProgress: row => console.log(JSON.stringify({ event: 'source-recheck-verdict', ...row })) });
  await put('result', result);
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'DEPENDENCY_RECHECK_FAILURE',
  diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'dependency_recheck_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, resultHash: result?.hash || null, sourceRunId, failure, ledger,
    completedSourceRecheck: !!result && !failure, fullSectionSourceReviewPassed: false,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['source_reviewer'],
    actualRepairPerformed: false, actualRoomReplayPerformed: false, formalSkillsAccepted: 0, trainingTruth: false });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, completed: report.completedSourceRecheck, failure,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
