import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan, verifyFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, sha256, fail, hash } from '../packages/skill-production/common.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { readLegacyPacketSeeds } from '../packages/skill-production-v3/seeds.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'build/ticket-18-production-v3');
const args = process.argv.slice(2);
if (args.length && !(args.length === 1 && args[0] === '--live')) fail('V3_RUN_ARGUMENTS_INVALID');
const catalogue = await loadFrozenSkillEvidence(ROOT), plan = createFirstFivePlan(catalogue);
verifyFirstFivePlan(plan, catalogue);
const context = createGlobalProductionContext(catalogue);
const mainReadiness = await verifyProductionReadiness(ROOT, catalogue);
async function checkedReadiness(file) {
  const report = verifySeal(JSON.parse(await readFile(path.join(ROOT, file), 'utf8')));
  if (!report.passed) fail('V3_PREFLIGHT_NOT_PASSED');
  for (const row of report.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('V3_PREFLIGHT_CODE_DRIFT');
  return report;
}
const contract = await checkedReadiness('build/ticket-18-production-v3/contract-readiness.json');
const capacity = await checkedReadiness('build/ticket-18-production-v3/dsh-context-readiness.json');
if (contract.globalContextHash !== context.hash || capacity.contextHash !== context.hash
  || contract.planHash !== plan.hash || contract.checkGroups < 10 || capacity.actualDshSessions < 2) fail('V3_PREFLIGHT_CONTEXT_DRIFT');
const drills = await createProductionDrills(catalogue);
const filename = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentRunId = 'rules-v2-441e39a97d937df7327c';
const parentRecipe = verifySeal(JSON.parse(await readFile(path.join(ROOT, 'build/ticket-18-first-five-v1', parentRunId, 'recipe.json'), 'utf8')));
const seeds = readLegacyPacketSeeds({ filename, parentRunId, parentRecipe, plan, catalogue, modelHash: profile.integrity.hash });
const limits = { maxCalls: 140, maxCostMicros: 10_000_000, maxTokens: 8_000_000,
  maxWallMs: 3 * 60 * 60 * 1000, maxInputBytes: 786432, maxRevisions: 3 };
const codeFiles = ['scripts/run-ticket-18-overall-rules-v3.mjs', 'packages/skill-evaluation/production-drills-v1.mjs',
  'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(codeFiles.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const recipe = seal({ version: 'overall-rules-production-v3-repair-five', planHash: plan.hash,
  sourceBinding: catalogue.sourceBinding, catalogueHash: catalogue.hash, contextHash: context.hash,
  sourceRefreshPerformed: false, modelHash: profile.integrity.hash,
  mainReadinessHash: mainReadiness.hash, contractReadinessHash: contract.hash, capacityReadinessHash: capacity.hash,
  codeHashes, seedHashes: seeds.map(s => s.hash), drillManifestHash: drills.manifest.hash,
  limits, targetedPacketIds: plan.packets.slice(0, 5).map(p => p.id), allPackets: plan.packets.length,
  validationStage: 'repair_real_failures_before_remaining_mass_production',
  publication: 'candidate_only_pending_independent_drills_arena_registry', trainingTruth: false });
if (!args.length) {
  console.log(JSON.stringify({ ready: true, paidCalls: 0, recipeHash: recipe.hash, fullSourceBytes: Buffer.byteLength(JSON.stringify(context.prompt)),
    importedDrafts: seeds.length, targetPackets: 5, allPackets: plan.packets.length, limits })); process.exit(0);
}
const runId = 'rules-v3-' + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId);
await mkdir(OUT, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const historicalKnownTokens = 2_864_424, historicalKnownMicros = 5_052_393, historicalReserveMicros = 28_961_350;
const historicalMicros = historicalKnownMicros + historicalReserveMicros;
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
let worker, attached, failure = null; const results = [];
try {
  if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (historicalMicros + store.globalSummary().reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('V3_RUN_WALL_EXHAUSTED');
  await writeFile(path.join(OUT, 'recipe.json'), JSON.stringify(recipe, null, 2));
  await writeFile(path.join(OUT, 'global-context-manifest.json'), JSON.stringify({ contextHash: context.hash, ...context.manifest }, null, 2));
  await writeFile(path.join(OUT, 'heldout-manifest.json'), JSON.stringify(drills.manifest, null, 2));
  const dsh = await prepareDshLoop(ROOT);
  if (dsh.binding.hash !== capacity.dshBinding.hash) fail('V3_DSH_BINDING_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'rules-v3-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('V3_RUN_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: summary => console.log(JSON.stringify({ event: 'usage', calls: summary.calls, tokens: summary.knownTokens,
      runEstimateOrReserveCny: summary.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historicalMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context,
    verifier: await createMechanicsVerifier(catalogue), model, dsh, maxRevisions: limits.maxRevisions,
    onProgress: row => console.log(JSON.stringify({ event: 'progress', ticket: 18, slice: 173, ...row })) });
  for (const packet of plan.packets.slice(0, 5)) {
    const result = await runtime.produce(packet, seeds.find(s => s.packetId === packet.id));
    results.push(result);
    await writeFile(path.join(OUT, packet.id + '.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ event: 'packet-complete', processed: results.length, target: 5, overallPackets: plan.packets.length,
      semanticPassed: result.semanticPassed, openIssues: result.issueJournal.openIssues, hash: result.hash }));
  }
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'V3_PRODUCTION_FAILURE', diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'v3_repair_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ recipeHash: recipe.hash, runId, planHash: plan.hash, contextHash: context.hash,
    processedPackets: results.length, repairTargetPackets: 5, overallPackets: plan.packets.length,
    semanticallyPassedPackets: results.filter(r => r.semanticPassed).length, resultHashes: results.map(r => r.hash),
    failure, ledger, cumulativeKnownTokensLowerBound: historicalKnownTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historicalMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['fresh_supportive', 'fresh_adversarial', 'typed_diagnosis', 'local_editor'],
    tools: ['read', 'query', 'development_only_probe'], sourceRefreshPerformed: false,
    independentContextsNotIndependentModels: true, actualRoomReplayPerformed: false,
    formalSkillsAccepted: 0, promotions: [], blocks: ['independent_repair_inspection', 'remaining_32_packets',
      'overall_package_synthesis', 'heldout_and_arena', 'factions_matchups_reflection_regression'],
    trainingTruth: false, elapsedMs: Date.now() - began });
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: 'report', path: path.relative(ROOT, path.join(OUT, 'report.json')),
    processed: results.length, semanticPassed: report.semanticallyPassedPackets, target: 5, failure,
    tokens: ledger.knownTokens, estimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
