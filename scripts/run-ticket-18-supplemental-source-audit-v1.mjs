import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { inspectCompletedOverallProductionV3 } from '../packages/skill-production-v3/overall-evidence-gate.mjs';
import { evaluateOverallSourceRegressionV3 } from '../packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash, sha256, verifySeal, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'build/ticket-18-production-v3'), args = process.argv.slice(2);
if (args.length !== 3 || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--overall-run'
  || !/^overall-v3-[a-f0-9]{20}$/.test(args[2])) fail('SUPPLEMENTAL_AUDIT_ARGUMENTS_INVALID');
const json = async filename => verifySeal(JSON.parse(await readFile(filename, 'utf8')));
const parentDir = path.join(BASE, args[2]);
let parent, parentReport, candidate, exam, regression;
try {
  [parent, parentReport, candidate, exam, regression] = await Promise.all([
    'recipe', 'report', 'overall-rules-candidate', 'actual-model-exam', 'actual-source-regression',
  ].map(name => json(path.join(parentDir, name + '.json'))));
} catch (error) { if (error.code === 'ENOENT') fail('SUPPLEMENTAL_PARENT_OUTPUT_MISSING'); throw error; }
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue);
const plan = createFirstFivePlan(catalogue), context = createGlobalProductionContext(catalogue);
const drills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const probes = createSourceAuditProbesV3({ catalogue, reader }), supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const filename = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentEvidence = inspectCompletedOverallProductionV3({ filename, recipe: parent, report: parentReport,
  candidate, exam, regression, plan, catalogue, context, drills, legacyDrills, probes, purpose: 'diagnostic_audit' });
const main = await verifyProductionReadiness(ROOT, catalogue), readiness = [];
for (const name of ['overall-evidence-readiness', 'supplemental-source-readiness']) {
  const report = await json(path.join(BASE, name + '.json'));
  if (!report.passed) fail('SUPPLEMENTAL_AUDIT_READINESS_FAILED');
  for (const row of report.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('SUPPLEMENTAL_AUDIT_CODE_DRIFT');
  readiness.push(report);
}
const files = ['scripts/run-ticket-18-supplemental-source-audit-v1.mjs',
  'packages/skill-production-v3/overall-evidence-gate.mjs', 'packages/skill-evaluation/supplemental-source-probes-v1.mjs',
  'packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs', 'packages/skill-production/model.mjs',
  'packages/skill-production/store.mjs', 'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const limits = { maxCalls: 6, maxCostMicros: 5_000_000, maxTokens: 3_000_000, maxWallMs: 600000, maxInputBytes: 786432 };
const recipe = seal({ version: 'overall-supplemental-source-audit-v1', parentRunId: args[2], parentRecipeHash: parent.hash,
  parentEvidenceHash: parentEvidence.hash, candidateHash: candidate.hash, catalogueHash: catalogue.hash,
  sourceBinding: catalogue.sourceBinding, probesHash: supplemental.hash, modelHash: profile.integrity.hash,
  mainReadinessHash: main.hash, readinessHashes: readiness.map(r => r.hash), codeHashes, limits,
  sourceRefreshPerformed: false, independentReaderNotProductionRetry: true, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, candidateHash: candidate.hash,
    verifiedParentPackets: parentEvidence.packetHashes.length, rescoredParentCases: 119, supplementalCases: 8,
    paidCalls: 0, limits })); process.exit(0);
}
const runId = 'overall-audit-' + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId);
await mkdir(OUT, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
let worker, attached, result = null, failure = null;
try {
  if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (historyMicros + store.globalSummary().reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('SUPPLEMENTAL_AUDIT_WALL_EXHAUSTED');
  await writeFile(path.join(OUT, 'recipe.json'), JSON.stringify(recipe, null, 2));
  await writeFile(path.join(OUT, 'parent-evidence.json'), JSON.stringify(parentEvidence, null, 2));
  await writeFile(path.join(OUT, 'probes.json'), JSON.stringify(supplemental, null, 2));
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'supplemental-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('SUPPLEMENTAL_AUDIT_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  result = await evaluateOverallSourceRegressionV3({ candidate, probes: supplemental, store, model });
  await writeFile(path.join(OUT, 'actual-supplemental-source-audit.json'), JSON.stringify(result, null, 2));
  if (!result.passed) fail('SUPPLEMENTAL_SOURCE_CASES_FAILED');
  if (!parentEvidence.exams.qualityPassed) fail('SUPPLEMENTAL_PARENT_QUALITY_NOT_PASSED');
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'SUPPLEMENTAL_SOURCE_AUDIT_FAILED', diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'supplemental_audit_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, parentEvidenceHash: parentEvidence.hash,
    candidateHash: candidate.hash, resultHash: result?.hash || null, correct: result?.correct || 0, total: supplemental.cases.length,
    baseExamsPassed: parentEvidence.exams.qualityPassed, additionalCasesPassed: !!result?.passed,
    passed: !!result?.passed && !failure, failure, ledger, knownRiskNotFreshHeldout: true,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['independent_complete_skill_reader', 'source_bound_host_judge'], skillsGenerated: 0,
    formalSkillsAccepted: 0, promotions: [], sourceRefreshPerformed: false, actualRoomReplayPerformed: false,
    strategyEffectivenessProven: false, trainingTruth: false, elapsedMs: Date.now() - began });
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: 'report', runId, passed: report.passed, correct: report.correct,
    total: report.total, failure, cumulativeTokens: report.cumulativeKnownTokensLowerBound,
    cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
