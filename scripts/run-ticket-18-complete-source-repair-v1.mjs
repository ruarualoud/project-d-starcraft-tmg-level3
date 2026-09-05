import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { repairExternalPacket } from '../packages/skill-production-v3/external-repair.mjs';
import { createConfirmedOverallOmissionsV1, prepareCompleteSkillRepairV1, repairCompleteSkillV1 } from '../packages/skill-production-v3/complete-source-repair-v1.mjs';
import { recordExternalClaimFinding, assertNoKnownExternalClaimFailure } from '../packages/skill-production-v3/external-findings.mjs';
import { inspectCompletedOverallProductionV3 } from '../packages/skill-production-v3/overall-evidence-gate.mjs';
import { renderOverallRulesCandidateV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { evaluateOverallRulesCandidate } from '../packages/skill-evaluation/evaluate-overall-rules-v2.mjs';
import { evaluateOverallSourceRegressionV3 } from '../packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash, sha256, verifySeal, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE = path.join(ROOT, 'build/ticket-18-production-v3');
const args = process.argv.slice(2);
if (args.length !== 3 || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--overall-run'
  || !/^overall-v3-[a-f0-9]{20}$/.test(args[2])) fail('COMPLETE_REPAIR_ARGUMENTS_INVALID');
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const parentDir = path.join(BASE, args[2]);
const [parent, parentReport, candidate, exam, regression] = await Promise.all(
  ['recipe', 'report', 'overall-rules-candidate', 'actual-model-exam', 'actual-source-regression'].map(n => json(path.join(parentDir, n + '.json'))));
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue);
const plan = createFirstFivePlan(catalogue), context = createGlobalProductionContext(catalogue);
const drills = await createProductionDrills(catalogue), verifier = await createMechanicsVerifier(catalogue);
const legacyDrills = createSemanticDrills(verifier), probes = createSourceAuditProbesV3({ catalogue, reader });
const supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const filename = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentEvidence = inspectCompletedOverallProductionV3({ filename, recipe: parent, report: parentReport, candidate,
  exam, regression, plan, catalogue, context, drills, legacyDrills, probes, purpose: 'diagnostic_audit' });
const packets = await Promise.all(plan.packets.map(p => json(path.join(parentDir, p.id + '.json'))));
if (hash(packets.map(p => p.hash)) !== hash(parentEvidence.packetHashes)) fail('COMPLETE_REPAIR_PARENT_FILES_DRIFT');
const findings = createConfirmedOverallOmissionsV1({ candidate, packets, context, reader });
const deps = { catalogue, plan, context, candidate, packets, findings };
const repairPlan = prepareCompleteSkillRepairV1(deps), main = await verifyProductionReadiness(ROOT, catalogue);
const gates = {};
for (const name of ['contract', 'dsh-context', 'external-repair', 'overall-evidence', 'complete-source-repair',
  'reader-command-policy', 'supplemental-source', 'evaluation', 'overall-source-regression', 'output-capacity']) {
  const report = await json(path.join(BASE, name + '-readiness.json'));
  if (!report.passed) fail('COMPLETE_REPAIR_READINESS_FAILED');
  for (const row of report.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('COMPLETE_REPAIR_READINESS_CODE_DRIFT');
  gates[name] = report;
}
if (gates['complete-source-repair'].parentCandidateHash !== candidate.hash
  || hash(gates['complete-source-repair'].findingsHashes) !== hash(findings.map(f => f.hash))
  || gates['dsh-context'].contextHash !== context.hash) fail('COMPLETE_REPAIR_READINESS_BINDING_INVALID');
const files = ['scripts/run-ticket-18-complete-source-repair-v1.mjs', 'packages/skill-production-v3/complete-source-repair-v1.mjs',
  'packages/skill-production-v3/overall-evidence-gate.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs',
  'packages/skill-evaluation/evaluate-overall-rules-v2.mjs', 'packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs',
  'packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const limits = { maxCalls: 80, maxCostMicros: 5_000_000, maxTokens: 8_000_000, maxWallMs: 60 * 60 * 1000,
  maxInputBytes: 786432, maxRevisions: 3 };
const recipe = seal({ version: 'complete-overall-source-repair-v1', parentRunId: args[2], parentRecipeHash: parent.hash,
  parentEvidenceHash: parentEvidence.hash, parentCandidateHash: candidate.hash, repairPlanHash: repairPlan.hash,
  catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, planHash: plan.hash, contextHash: context.hash,
  mainReadinessHash: main.hash, readinessHashes: Object.entries(gates).map(([id, g]) => ({ id, hash: g.hash })),
  codeHashes, limits, modelHash: profile.integrity.hash, productionCommandPolicy: 'production_tools', readerCommandPolicy: 'finish_only',
  drillManifestHash: drills.manifest.hash, legacyManifestHash: legacyDrills.manifest.hash,
  probesHash: probes.hash, supplementalHash: supplemental.hash, supplementalStepPrefix: 'supplemental.',
  oldBaselineRetained: true, sourceRefreshPerformed: false, formalAcceptance: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, affectedPackets: repairPlan.affectedPackets,
    unchangedPackets: repairPlan.untouchedPackets, changedClaims: findings.length, unchangedClaims: candidate.coverage.claims - findings.length,
    examCases: 105, sourceControls: 22, paidCalls: 0, limits })); process.exit(0);
}
const runId = 'overall-repair-' + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId);
await mkdir(OUT, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
let worker, attached, repaired = null, sourceResult = null, examResult = null, supplementalResult = null, failure = null;
const put = (name, value) => writeFile(path.join(OUT, name + '.json'), JSON.stringify(value, null, 2));
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('COMPLETE_REPAIR_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('parent-evidence', parentEvidence); await put('repair-plan', repairPlan);
  for (const finding of findings) recordExternalClaimFinding(store, finding);
  await put('findings', seal({ findings, parentCandidateHash: candidate.hash, trainingTruth: false }));
  const dsh = await prepareDshLoop(ROOT);
  if (dsh.binding.hash !== gates['dsh-context'].dshBinding.hash) fail('COMPLETE_REPAIR_DSH_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'complete-repair-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const modelOptions = { store, maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('COMPLETE_REPAIR_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) };
  const model = createAccountedModel(modelOptions), evaluator = createAccountedModel({ ...modelOptions, commandPolicy: 'finish_only' });
  const runtime = createProductionRuntimeV3({ store, context, reader, verifier, dsh, model, maxRevisions: limits.maxRevisions,
    onProgress: row => console.log(JSON.stringify({ event: 'progress', ticket: 18, slice: 173, ...row })) });
  repaired = await repairCompleteSkillV1({ ...deps,
    repairPacket: async args => {
      const result = await repairExternalPacket({ ...args, runtime, context, reader });
      await put(args.packet.id + '.external-repair', result.repair); await put(args.packet.id, result.candidate); return result;
    }, importPacket: async ({ packet, candidate: p, manifest }) => {
      const lease = store.acquire(packet.id + '.verified-repair-import', { manifestHash: manifest.hash, packetHash: p.hash });
      const result = lease.cached ? lease.artifact : store.finish(lease, p); await put(packet.id, result); return result;
    }, onProgress: row => console.log(JSON.stringify({ event: 'packet-complete', ticket: 18, slice: 173, ...row })) });
  const db = new DatabaseSync(filename, { readOnly: true });
  try { repaired.packets.forEach(p => assertNoKnownExternalClaimFailure(db, p)); } finally { db.close(); }
  await put('repair-receipt', repaired.receipt); await put('overall-rules-candidate', repaired.candidate);
  await writeFile(path.join(OUT, 'overall-rules-candidate.md'), renderOverallRulesCandidateV3(repaired.candidate));
  sourceResult = await evaluateOverallSourceRegressionV3({ candidate: repaired.candidate, probes, store, model: evaluator });
  await put('actual-source-regression', sourceResult);
  // Distinct namespaces for two source-control suites with the same evaluator.
  const supplementalStore = { acquire: (id, ...rest) => store.acquire('supplemental.' + id, ...rest), finish: store.finish, release: store.release };
  supplementalResult = await evaluateOverallSourceRegressionV3({ candidate: repaired.candidate, probes: supplemental, store: supplementalStore,
    model: args => evaluator({ ...args, stageId: 'supplemental.' + args.stageId }) });
  await put('actual-supplemental-source-audit', supplementalResult);
  examResult = await evaluateOverallRulesCandidate({ candidate: repaired.candidate, drills, legacyDrills, store, model: evaluator });
  await put('actual-model-exam', examResult);
  if (!sourceResult.passed || !supplementalResult.passed || !examResult.passed) fail('COMPLETE_REPAIR_EVALUATION_NOT_PASSED');
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'COMPLETE_REPAIR_FAILURE', diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'complete_source_repair_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, parentEvidenceHash: parentEvidence.hash, repairPlanHash: repairPlan.hash,
    parentCandidateHash: candidate.hash, candidateHash: repaired?.candidate.hash || null, repairReceiptHash: repaired?.receipt.hash || null,
    processedPackets: repaired?.packets.length || 0, resultHashes: repaired?.packets.map(p => p.hash) || [],
    sourceResultHash: sourceResult?.hash || null, sourceCorrect: sourceResult?.correct || 0, sourceTotal: probes.cases.length,
    supplementalResultHash: supplementalResult?.hash || null, supplementalCorrect: supplementalResult?.correct || 0, supplementalTotal: supplemental.cases.length,
    examResultHash: examResult?.hash || null, examSummary: examResult?.summary || null,
    evaluationPassed: !!sourceResult?.passed && !!supplementalResult?.passed && !!examResult?.passed && !failure,
    failure, ledger, cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['source_bound_local_editor', 'fresh_full_source_reviews', 'independent_finish_only_complete_skill_reader'],
    sourceRefreshPerformed: false, formalSkillsAccepted: 0, oldBaselineOverwritten: false,
    actualRoomReplayPerformed: false, strategyEffectivenessProven: false, promotions: [], trainingTruth: false,
    elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, evaluationPassed: report.evaluationPassed, failure,
    sourceCorrect: report.sourceCorrect, supplementalCorrect: report.supplementalCorrect, examSummary: report.examSummary,
    tokens: ledger.knownTokens, cumulativeTokens: report.cumulativeKnownTokensLowerBound,
    cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
