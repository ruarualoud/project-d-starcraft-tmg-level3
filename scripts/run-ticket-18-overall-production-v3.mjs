import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan, verifyFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { assembleOverallRulesCandidateV3, renderOverallRulesCandidateV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { evaluateOverallRulesCandidate } from '../packages/skill-evaluation/evaluate-overall-rules-v2.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, sha256, fail, hash } from '../packages/skill-production/common.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { inspectCompletedRepair } from '../packages/skill-production-v3/repair-gate.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'build/ticket-18-production-v3'), args = process.argv.slice(2);
if (args.length !== 3 || !['--live', '--preflight'].includes(args[0]) || args[1] !== '--repair-run'
  || !/^rules-v3-[a-f0-9]{20}$/.test(args[2])) fail('V3_OVERALL_ARGUMENTS_INVALID');
const catalogue = await loadFrozenSkillEvidence(ROOT), plan = createFirstFivePlan(catalogue);
verifyFirstFivePlan(plan, catalogue);
const context = createGlobalProductionContext(catalogue), filename = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
const main = await verifyProductionReadiness(ROOT, catalogue);
async function readiness(name) {
  const report = verifySeal(JSON.parse(await readFile(path.join(BASE, name + '.json'), 'utf8')));
  if (!report.passed) fail('V3_OVERALL_READINESS_FAILED');
  for (const row of report.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('V3_OVERALL_CODE_DRIFT');
  return report;
}
const contract = await readiness('contract-readiness'), capacity = await readiness('dsh-context-readiness'), evaluationGate = await readiness('evaluation-readiness');
if (contract.globalContextHash !== context.hash || capacity.contextHash !== context.hash
  || evaluationGate.catalogueHash !== catalogue.hash || evaluationGate.packageVersion !== 3) fail('V3_OVERALL_SOURCE_DRIFT');
const parent = verifySeal(JSON.parse(await readFile(path.join(BASE, args[2], 'recipe.json'), 'utf8')));
const parentReport = verifySeal(JSON.parse(await readFile(path.join(BASE, args[2], 'report.json'), 'utf8')));
const repair = inspectCompletedRepair({ filename, recipe: parent, report: parentReport, plan, catalogue, context });
const drills = await createProductionDrills(catalogue), verifier = await createMechanicsVerifier(catalogue);
const legacyDrills = createSemanticDrills(verifier);
const limits = { maxCalls: 600, maxCostMicros: 20_000_000, maxTokens: 30_000_000,
  maxWallMs: 6 * 60 * 60 * 1000, maxInputBytes: 786432, maxRevisions: 3 };
const extraFiles = ['scripts/run-ticket-18-overall-production-v3.mjs', 'packages/skill-production-v3/repair-gate.mjs',
  'packages/skill-production-v3/external-findings.mjs',
  'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(extraFiles.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const recipe = seal({ version: 'overall-rules-production-v3-complete-and-exam',
  planHash: plan.hash, catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, contextHash: context.hash,
  modelHash: profile.integrity.hash, mainReadinessHash: main.hash, contractReadinessHash: contract.hash,
  capacityReadinessHash: capacity.hash, evaluationReadinessHash: evaluationGate.hash, codeHashes,
  repairManifest: repair.manifest, drillManifestHash: drills.manifest.hash, regressionManifestHash: legacyDrills.manifest.hash,
  limits, target: 'complete_remaining_32_packets_then_lossless_overall_skill_and_actual_105_case_exam',
  publication: 'candidate_only_pending_arena_and_registry', trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, paidCalls: 0, recipeHash: recipe.hash, validatedRepairPackets: repair.packets.length,
    remainingPackets: repair.manifest.remainingPackets, examCases: drills.manifest.cases + legacyDrills.manifest.cases, limits })); process.exit(0);
}
const runId = 'overall-v3-' + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId);
await mkdir(OUT, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const started = store.acquire('production-start', { recipeHash: recipe.hash });
const began = started.cached ? started.artifact.began : store.finish(started, { began: Date.now() }).began;
let worker, attached, failure = null, candidate = null, exam = null; const results = [];
try {
  if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (historyMicros + store.globalSummary().reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('V3_OVERALL_WALL_EXHAUSTED');
  await writeFile(path.join(OUT, 'recipe.json'), JSON.stringify(recipe, null, 2));
  await writeFile(path.join(OUT, 'repair-inspection.json'), JSON.stringify(repair.manifest, null, 2));
  await writeFile(path.join(OUT, 'heldout-manifest.json'), JSON.stringify(drills.manifest, null, 2));
  const dsh = await prepareDshLoop(ROOT);
  if (dsh.binding.hash !== capacity.dshBinding.hash) fail('V3_OVERALL_DSH_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'overall-v3-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('V3_OVERALL_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier,
    model, dsh, maxRevisions: limits.maxRevisions,
    onProgress: row => console.log(JSON.stringify({ event: 'progress', ticket: 18, slice: 173, ...row })) });
  for (const packet of plan.packets) {
    let result = repair.packets.find(p => p.packetId === packet.id);
    if (result) {
      const lease = store.acquire(packet.id + '.verified-repair-import', { manifestHash: repair.manifest.hash, packetHash: result.hash });
      result = lease.cached ? lease.artifact : store.finish(lease, result);
    } else result = await runtime.produce(packet);
    results.push(result);
    await writeFile(path.join(OUT, packet.id + '.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ event: 'packet-complete', processed: results.length, total: plan.packets.length,
      semanticPassed: result.semanticPassed, openIssues: result.issueJournal.openIssues, hash: result.hash }));
    if (!result.semanticPassed) fail('V3_OVERALL_PACKET_REQUIRES_TARGETED_REPAIR');
  }
  candidate = assembleOverallRulesCandidateV3({ catalogue, plan, packets: results });
  await writeFile(path.join(OUT, 'overall-rules-candidate.json'), JSON.stringify(candidate, null, 2));
  await writeFile(path.join(OUT, 'overall-rules-candidate.md'), renderOverallRulesCandidateV3(candidate));
  console.log(JSON.stringify({ event: 'candidate-compiled', hash: candidate.hash, claims: candidate.coverage.claims, formalSkillsAccepted: 0 }));
  exam = await evaluateOverallRulesCandidate({ candidate, drills, legacyDrills, store, model });
  await writeFile(path.join(OUT, 'actual-model-exam.json'), JSON.stringify(exam, null, 2));
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'V3_OVERALL_PRODUCTION_FAILURE', diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'overall_production_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, planHash: plan.hash, contextHash: context.hash,
    reusedRepairPackets: repair.packets.length, processedPackets: results.length, plannedPackets: plan.packets.length,
    semanticallyPassedPackets: results.filter(r => r.semanticPassed).length, resultHashes: results.map(r => r.hash),
    candidateHash: candidate?.hash || null, actualExamHash: exam?.hash || null, actualExamSummary: exam?.summary || null,
    actualExamPassed: exam?.passed || false, failure, ledger,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['Tutor', 'Generator', 'fresh_supportive', 'fresh_adversarial', 'typed_diagnosis', 'local_editor', 'independent_exam'],
    tools: ['read', 'query', 'development_only_probe'], sourceRefreshPerformed: false,
    skillsGenerated: candidate ? 1 : 0, formalSkillsAccepted: 0, promotions: [],
    actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    blocks: ['factions_and_directed_matchups', 'actual_arena_and_online_loading', 'reflection_upgrade_regression_rollback'],
    trainingTruth: false, elapsedMs: Date.now() - began });
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: 'report', path: path.relative(ROOT, path.join(OUT, 'report.json')),
    processed: results.length, total: plan.packets.length, failure, actualExamPassed: report.actualExamPassed,
    tokens: ledger.knownTokens, estimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
