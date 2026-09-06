import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionPhaseFieldPlanV1, repairFactionPhaseFieldsV1 } from '../packages/skill-production-v3/faction-phase-field-repair-v1.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
if (args.length !== 3 || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--source-run'
  || !/^faction-v1-[a-f0-9]{20}$/.test(args[2])) fail('FACTION_PHASE_FIELD_RUN_ARGUMENTS_INVALID');
const base = path.join(root, 'build/ticket-18-faction-production-v1'), filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(base, file + '.json'), 'utf8')));
const [input, knownRulePolicy, parent, parentReport] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'), json(args[2] + '/recipe'), json(args[2] + '/report')]);
if (args[2] !== 'faction-v1-' + parent.hash.slice(0, 20) || parentReport.recipeHash !== parent.hash
  || !parent.inputHashes.includes(input.hash) || !parent.knownRulePolicyHashes.includes(knownRulePolicy.hash)
  || parent.modelHash !== profile.integrity.hash) fail('FACTION_PHASE_FIELD_RUN_SOURCE_DRIFT');
const capture = await json(args[2] + '/failed-review-role-input');
if (capture.runId !== args[2] || capture.recipeHash !== parent.hash || capture.request.workspace.inputHash !== input.hash)
  fail('FACTION_PHASE_FIELD_CAPTURE_DRIFT');
const { section, draft } = capture.request.workspace;
const sectionResult = seal({ section, draft, captureHash: capture.hash, sourceReviewPassed: false, trainingTruth: false });
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(args[2])?.recipe !== parent.hash
    || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(args[2]).n) fail('FACTION_PHASE_FIELD_RUN_PARENT_NOT_TERMINAL');
} finally { db.close(); }
const inspection = JSON.parse((await promisify(execFile)(process.execPath,
  [path.join(root, 'scripts/qualify-ticket-18-overall-dependency-v1.mjs'), parent.overallRunId],
  { cwd: root, timeout: 240000, maxBuffer: 65536 })).stdout.trim());
if (!inspection.offlineGenerationQualified || inspection.dependencyHash !== parent.overallDependencyHash
  || inspection.receiptHash !== parent.qualificationReceiptHash) fail('FACTION_PHASE_FIELD_OVERALL_DRIFT');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
if (catalogue.hash !== input.catalogueHash || context.hash !== parent.contextHash) fail('FACTION_PHASE_FIELD_RUN_CONTEXT_DRIFT');
const main = await verifyProductionReadiness(root, catalogue), gates = [];
for (const name of ['phase-field-repair-readiness']) {
  const gate = await json(name);
  if (!gate.passed || gate.inputHash !== input.hash) fail('FACTION_PHASE_FIELD_READINESS_FAILED');
  for (const c of gate.codeHashes) if (sha256(await readFile(path.join(root, c.file))) !== c.hash) fail('FACTION_PHASE_FIELD_READINESS_CODE_DRIFT');
  gates.push(gate);
}
if (gates[0].captureHash !== capture.hash || gates[0].knownFields !== 11 || gates[0].actualDshSessions !== 4
  || !gates[0].fullSourceDeliveryVerified || !gates[0].completedBatchReused || !gates[0].atomicApplicationAcrossBatches)
  fail('FACTION_PHASE_FIELD_READINESS_SECTION_DRIFT');
const priorRecovery = await json(args[2] + '/review-metadata-recovery-readiness');
if (!priorRecovery.passed || !priorRecovery.exactPriorProviderRequestsMatched || priorRecovery.providerCalls !== 0
  || priorRecovery.capturedRoleHash !== capture.hash || priorRecovery.parentRunId !== args[2])
  fail('FACTION_PHASE_FIELD_SOURCE_REQUEST_UNVERIFIED');
const plan = createFactionPhaseFieldPlanV1({ input, section, draft });
if (plan.hash !== gates[0].planHash) fail('FACTION_PHASE_FIELD_PLAN_DRIFT');
const files = ['packages/skill-production-v3/faction-phase-field-repair-v1.mjs', 'packages/skill-evaluation/faction-phase-source-debt-v1.mjs',
  'packages/skill-evaluation/faction-unit-role-debt-v1.mjs', 'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-known-rule-findings-v1.mjs',
  'packages/skill-production-v3/runtime.mjs', 'packages/skill-production/loops.mjs', 'packages/skill-production/model.mjs',
  'packages/skill-production/store.mjs', 'scripts/run-ticket-18-faction-phase-field-repair-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = { maxCalls: 8, maxCostMicros: 5_000_000, maxTokens: 4_000_000, maxWallMs: 30 * 60 * 1000, maxInputBytes: 1_000_000 };
const recipe = seal({ version: 'faction_phase_field_repair_run_v1', sourceRunId: args[2], sourceRecipeHash: parent.hash,
  sectionResultHash: sectionResult.hash, sourceCaptureHash: capture.hash, priorRequestEvidenceHash: priorRecovery.hash, inputHash: input.hash, planHash: plan.hash, knownRulePolicyHash: knownRulePolicy.hash,
  overallDependencyHash: parent.overallDependencyHash, qualificationReceiptHash: inspection.receiptHash,
  catalogueHash: catalogue.hash, contextHash: context.hash, sourceBinding: input.sourceBinding, modelHash: profile.integrity.hash,
  mainReadinessHash: main.hash, readinessHashes: gates.map(g => g.hash), dshBindingHash: gates[0].dshBinding.hash,
  codeHashes, limits, sourceRefreshPerformed: false, formalAcceptance: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, targetFields: plan.targets.map(t => ({ index: t.index, path: t.path })), providerCalls: 0, limits })); process.exit(0);
}
const runId = 'phase-repair-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, candidate = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('FACTION_PHASE_FIELD_RUN_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('source-section', sectionResult); await put('source-capture', capture); await put('plan', plan);
  const dsh = await prepareDshLoop(root); if (dsh.binding.hash !== recipe.dshBindingHash) fail('FACTION_PHASE_FIELD_DSH_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'faction-field-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_PHASE_FIELD_RUN_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      cumulativeCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh,
    onProgress: row => console.log(JSON.stringify({ event: 'field-repair-role', ticket: 18, slice: 174, ...row })) });
  candidate = await repairFactionPhaseFieldsV1({ input, section, draft, runtime, store });
  await put('candidate', candidate);
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'FACTION_PHASE_FIELD_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'faction_field_repair_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, sourceRunId: args[2], candidateHash: candidate?.hash || null,
    actualPatchProduced: !!candidate && !failure, changedFields: candidate?.patch.changes || [], failure, ledger,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['source_backed_field_editor'],
    fullSourceContextRequired: true, wholeSectionReviewStillRequired: true,
    actualRoomReplayPerformed: false, formalSkillsAccepted: 0, trainingTruth: false });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, actualPatchProduced: report.actualPatchProduced, failure,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
