import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan, verifyFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createPacketRuntime } from '../packages/skill-production/packet-runtime.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { inspectPacketContinuation } from '../packages/skill-production/packet-continuation.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { seal, verifySeal, sha256, fail, hash } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'build/ticket-18-first-five-v1');
const args = process.argv.slice(2);
if (args.length && !(args[0] === '--live' && (args.length === 1 || args.length === 3 && args[1] === '--continue'
  && /^rules-v2-[a-f0-9]{20}$/.test(args[2])))) fail('RULES_PRODUCTION_ARGUMENTS_INVALID');
const catalogue = await loadFrozenSkillEvidence(ROOT), plan = createFirstFivePlan(catalogue);
verifyFirstFivePlan(plan, catalogue);
const productionReadiness = await verifyProductionReadiness(ROOT, catalogue);
const readiness = verifySeal(JSON.parse(await readFile(path.join(BASE, 'production-readiness.json'), 'utf8')));
if (!readiness.passed || readiness.planHash !== plan.hash || readiness.catalogueHash !== catalogue.hash) fail('RULES_PRODUCTION_READINESS_MISSING');
for (const row of readiness.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('RULES_PRODUCTION_CODE_DRIFT');
const drills = await createProductionDrills(catalogue);
if (drills.manifest.hash !== readiness.drillManifestHash) fail('RULES_PRODUCTION_DRILL_DRIFT');
const limits = { maxCalls: 600, maxCostMicros: 40_000_000, maxTokens: 10_000_000, maxWallMs: 5 * 60 * 60 * 1000 };
const baseRecipe = seal({ version: 'overall-rules-production-v2', planHash: plan.hash,
  productionReadinessHash: productionReadiness.hash, readinessHash: readiness.hash,
  sourceBinding: catalogue.sourceBinding, catalogueHash: catalogue.hash,
  modelHash: profile.integrity.hash, drillManifestHash: drills.manifest.hash, limits,
  publication: 'candidate_only_pending_drills_arena_registry', trainingTruth: false });
const filename = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
let continuation = null;
if (args[2]) {
  const parent = verifySeal(JSON.parse(await readFile(path.join(BASE, args[2], 'recipe.json'), 'utf8')));
  const parentReadiness = verifySeal(JSON.parse(await readFile(path.join(BASE, 'production-readiness-' + parent.readinessHash + '.json'), 'utf8')));
  const parentExecutionReadiness = verifySeal(JSON.parse(await readFile(path.join(ROOT,
    'build/ticket-17-production-redesign-v1/readiness-' + parent.productionReadinessHash + '.json'), 'utf8')));
  continuation = inspectPacketContinuation({ filename, parentRunId: args[2], parent, next: baseRecipe,
    parentReadiness, nextReadiness: readiness, parentExecutionReadiness, nextExecutionReadiness: productionReadiness });
}
const { hash: ignoredBaseHash, ...baseBody } = baseRecipe;
const recipe = continuation ? seal({ ...baseBody, continuation: continuation.manifest }) : baseRecipe;
if (!args.length) { console.log(JSON.stringify({ ready: true, paidCalls: 0, counts: plan.counts, recipeHash: recipe.hash })); process.exit(0); }
const runId = 'rules-v2-' + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId);
await mkdir(OUT, { recursive: true });
const inherited = continuation?.manifest.accounting || { calls: 0, tokens: 0, costMicros: 0 };
const localStore = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits,
  maxCalls: limits.maxCalls - inherited.calls, maxCostMicros: limits.maxCostMicros - inherited.costMicros,
  maxTokens: limits.maxTokens - inherited.tokens });
const store = continuation ? withCheckpointContinuation(localStore, continuation) : localStore;
const historicalKnownTokens = 2_864_424, historicalKnownMicros = 5_052_393, historicalReserveMicros = 28_961_350;
const before = historicalKnownMicros + historicalReserveMicros;
let worker, attached, failure = null;
const results = [];
// Output defects after bounded repair are local job failures. Infrastructure,
// budget, ambiguous egress, source/code drift and balance errors stop the run.
const LOCAL_OUTPUT_ERRORS = new Set(['OUTPUT_SCHEMA_INVALID', 'TEXT_INVALID', 'PACKET_CLAIM_COUNT_INVALID',
  'PACKET_CLAIM_KIND_INVALID', 'PACKET_EVIDENCE_COUNT_INVALID', 'PACKET_EVIDENCE_OUT_OF_SCOPE', 'PACKET_SOURCE_NOT_READ',
  'PASSAGE_REVIEW_DENOMINATOR_INVALID', 'PASSAGE_REVIEW_INVALID', 'PASSAGE_REVIEW_CITATION_INVALID',
  'REVIEW_DENOMINATOR_INVALID', 'REVIEW_CLAIM_INVALID', 'REVIEW_EVIDENCE_REQUIRED',
  'PACKET_PATCH_STALE', 'PACKET_PATCH_EMPTY', 'PACKET_PATCH_PATH_REJECTED', 'PACKET_PATCH_NO_CHANGE',
  'PACKET_PATCH_ADDITION_UNAUTHORIZED']);
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: continuation?.manifest.parentStart || Date.now() }).began;
try {
  if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (before + store.globalSummary().reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('RULES_PRODUCTION_WALL_EXHAUSTED');
  await writeFile(path.join(OUT, 'recipe.json'), JSON.stringify(recipe, null, 2));
  // Freeze the private held-out manifest before the first egress. Expected
  // answers and test inputs are never staged to generation/reviewer sessions.
  await writeFile(path.join(OUT, 'heldout-manifest.json'), JSON.stringify(drills.manifest, null, 2));
  const dsh = await prepareDshLoop(ROOT);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'rules-v2-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, complete: (providerRequest, { signal } = {}) => {
    if (Date.now() - began >= limits.maxWallMs) fail('RULES_PRODUCTION_WALL_EXHAUSTED');
    return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
  }, onUsage: summary => console.log(JSON.stringify({ event: 'usage', calls: summary.calls, tokens: summary.knownTokens,
    runEstimateOrReserveCny: summary.reservedOrSettledMicros / 1e6,
    cumulativeEstimateOrReserveCny: (before + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createPacketRuntime({ store, reader: createEvidenceReader(catalogue),
    verifier: await createMechanicsVerifier(catalogue), model, dsh,
    onProgress: row => console.log(JSON.stringify({ event: 'progress', ticket: 18, slice: 173, ...row })) });
  for (const packet of plan.packets) {
    let result;
    const quarantineId = packet.id + '.output-quarantine';
    try { result = store.artifact(quarantineId) || await runtime.produce(packet); }
    catch (error) {
      if (!LOCAL_OUTPUT_ERRORS.has(error.code)) throw error;
      const lease = store.acquire(quarantineId, { packetHash: packet.hash });
      result = lease.cached ? lease.artifact : store.finish(lease, seal({ packetId: packet.id, packetHash: packet.hash,
        semanticPassed: false, failure: { code: error.code, diagnosticHash: hash(String(error.message)) },
        candidateOnly: true, runtimeAccepted: false, trainingTruth: false }));
    }
    results.push(result);
    await writeFile(path.join(OUT, packet.id + '.json'), JSON.stringify(result, null, 2));
    // Retain independently usable completed packets even if another packet is
    // semantically quarantined; downstream dependency acceptance stays closed.
    console.log(JSON.stringify({ event: 'packet-complete', complete: results.length, total: plan.packets.length,
      semanticPassed: result.semanticPassed, hash: result.hash }));
  }
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'RULES_PRODUCTION_FAILURE',
    diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'rules_production_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const current = store.summary(), global = store.globalSummary();
  const report = seal({ recipeHash: recipe.hash, runId, planHash: plan.hash,
    completedPackets: results.length, plannedPackets: plan.packets.length,
    semanticallyPassedPackets: results.filter(r => r.semanticPassed).length,
    resultHashes: results.map(r => r.hash), failure, ledger: current, continuation: continuation?.manifest || null,
    cumulativeKnownTokensLowerBound: historicalKnownTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (before + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    skillsGenerated: 0, formalSkillsAccepted: 0, promotions: [],
    blocks: ['package_synthesis_and_heldout_then_room_arena_registry_required'],
    roomReplayPerformed: false, trainingTruth: false, elapsedMs: Date.now() - began });
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: 'report', path: path.relative(ROOT, path.join(OUT, 'report.json')),
    complete: results.length, total: plan.packets.length, failure,
    tokens: current.knownTokens, estimateOrReserveCny: current.reservedOrSettledMicros / 1e6,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny,
    hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
