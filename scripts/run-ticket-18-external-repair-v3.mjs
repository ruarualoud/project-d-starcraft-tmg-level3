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
import { inspectV3Continuation } from '../packages/skill-production-v3/continuation.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { externalBlockersForCandidate, assertNoKnownExternalClaimFailure } from '../packages/skill-production-v3/external-findings.mjs';
import { inspectOverallPacketCandidateV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { createSourceAuditProbesV3, evaluateSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE = path.join(ROOT, 'build/ticket-18-production-v3');
const args = process.argv.slice(2);
if (![1, 3].includes(args.length) || !['--preflight', '--live'].includes(args[0])
  || args.length === 3 && (args[1] !== '--continue-from' || !/^rules-v3-[a-f0-9]{20}$/.test(args[2]))) fail('EXTERNAL_RUN_ARGUMENTS_INVALID');
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue);
const context = createGlobalProductionContext(catalogue), plan = createFirstFivePlan(catalogue);
const main = await verifyProductionReadiness(ROOT, catalogue);
async function readiness(name) {
  const result = verifySeal(JSON.parse(await readFile(path.join(BASE, name + '.json'), 'utf8')));
  if (!result.passed) fail('EXTERNAL_RUN_READINESS_FAILED');
  for (const row of result.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('EXTERNAL_RUN_CODE_DRIFT');
  return result;
}
const contract = await readiness('contract-readiness'), capacity = await readiness('dsh-context-readiness'), auditGate = await readiness('external-repair-readiness');
if (contract.globalContextHash !== context.hash || capacity.contextHash !== context.hash || auditGate.contextHash !== context.hash) fail('EXTERNAL_RUN_SOURCE_DRIFT');
const filename = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentRunId = 'rules-v3-1dc2feb6d351a65c83be';
const parent = verifySeal(JSON.parse(await readFile(path.join(BASE, parentRunId, 'recipe.json'), 'utf8')));
const audit = verifySeal(JSON.parse(await readFile(path.join(BASE, 'external-source-audit.json'), 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
const parents = [], findings = new Map();
try {
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('EXTERNAL_PARENT_RECIPE_DRIFT');
  if (db.prepare("SELECT count(*) AS n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  for (const packet of plan.packets.slice(0, 5)) {
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(parentRunId, packet.id + '.candidate');
    const candidate = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
    inspectOverallPacketCandidateV3({ catalogue, packet, result: candidate, context });
    parents.push(candidate); findings.set(packet.id, externalBlockersForCandidate(db, candidate));
  }
} finally { db.close(); }
if (hash([...findings.values()].flat().map(f => f.hash).sort()) !== hash(audit.findings.map(f => f.hash).sort())) fail('EXTERNAL_AUDIT_LEDGER_DRIFT');
const probes = createSourceAuditProbesV3({ catalogue, reader });
if (probes.hash !== auditGate.probesHash) fail('EXTERNAL_PROBE_DRIFT');
const limits = { maxCalls: 100, maxCostMicros: 5_000_000, maxTokens: 8_000_000,
  maxWallMs: 3 * 60 * 60 * 1000, maxInputBytes: 786432, maxRevisions: 3 };
const baseRecipe = seal({ version: 'v3-external-source-repair', parentRunId, parentRecipeHash: parent.hash,
  parentPacketHashes: parents.map(p => p.hash), externalAuditHash: audit.hash, probesHash: probes.hash,
  planHash: plan.hash, contextHash: context.hash, catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding,
  mainReadinessHash: main.hash, contractReadinessHash: contract.hash, capacityReadinessHash: capacity.hash,
  auditReadinessHash: auditGate.hash, modelHash: profile.integrity.hash, limits,
  targetedPacketIds: plan.packets.slice(0, 5).map(p => p.id), publication: 'candidate_only_pending_complete_skill_and_arena', trainingTruth: false });
let continuation = null;
if (args[2]) {
  const previous = verifySeal(JSON.parse(await readFile(path.join(BASE, args[2], 'recipe.json'), 'utf8')));
  async function archived(file, expected) {
    const current = verifySeal(JSON.parse(await readFile(path.join(ROOT, file), 'utf8')));
    if (current.hash === expected) return current;
    const old = verifySeal(JSON.parse(await readFile(path.join(ROOT, file.replace('.json', '-' + expected + '.json')), 'utf8')));
    if (old.hash !== expected) fail('EXTERNAL_ARCHIVED_READINESS_DRIFT'); return old;
  }
  const parentReports = await Promise.all([
    archived('build/ticket-17-production-redesign-v1/readiness.json', previous.mainReadinessHash),
    archived('build/ticket-18-production-v3/contract-readiness.json', previous.contractReadinessHash),
    archived('build/ticket-18-production-v3/dsh-context-readiness.json', previous.capacityReadinessHash),
    archived('build/ticket-18-production-v3/external-repair-readiness.json', previous.auditReadinessHash),
  ]);
  continuation = inspectV3Continuation({ filename, parentRunId: args[2], parent: previous, next: baseRecipe,
    parentReports, nextReports: [main, contract, capacity, auditGate] });
}
const { hash: baseHash, ...baseBody } = baseRecipe;
const recipe = continuation ? seal({ ...baseBody, continuation: continuation.manifest }) : baseRecipe;
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, paidCalls: 0, recipeHash: recipe.hash,
    affectedPackets: [...findings.values()].filter(f => f.length).length, findings: audit.findings.length, probeCases: probes.cases.length, limits,
    reusableRolesAndControls: continuation?.manifest.reusable.length || 0, inheritedAccounting: continuation?.manifest.accounting || null })); process.exit(0);
}
const runId = 'rules-v3-' + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId); await mkdir(OUT, { recursive: true });
const inherited = continuation?.manifest.accounting || { calls: 0, tokens: 0, costMicros: 0 };
const localStore = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits,
  maxCalls: limits.maxCalls - inherited.calls, maxTokens: limits.maxTokens - inherited.tokens,
  maxCostMicros: limits.maxCostMicros - inherited.costMicros });
const store = continuation ? withCheckpointContinuation(localStore, continuation) : localStore;
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: continuation?.manifest.parentStart || Date.now() }).began;
const historyTokens = 2864424, historyMicros = 5052393 + 28961350;
let worker, attached, failure = null, before = null, after = null; const results = [], repairs = [];
try {
  if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (historyMicros + store.globalSummary().reservedOrSettledMicros + limits.maxCostMicros >= 100000000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('EXTERNAL_RUN_WALL_EXHAUSTED');
  await writeFile(path.join(OUT, 'recipe.json'), JSON.stringify(recipe, null, 2));
  await writeFile(path.join(OUT, 'source-audit-probes.json'), JSON.stringify(probes, null, 2));
  const dsh = await prepareDshLoop(ROOT); if (dsh.binding.hash !== capacity.dshBinding.hash) fail('EXTERNAL_DSH_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'external-v3-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes, complete: (providerRequest, { signal } = {}) => {
    if (Date.now() - began >= limits.maxWallMs) fail('EXTERNAL_RUN_WALL_EXHAUSTED');
    return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
  }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
    runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6, cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  before = await evaluateSourceAuditProbesV3({ packets: parents, probes, store, model, label: 'before' });
  await writeFile(path.join(OUT, 'before-probes.json'), JSON.stringify(before, null, 2));
  if (!before.calibrationPassed) fail('AUDIT_EVALUATOR_CALIBRATION_FAILED');
  console.log(JSON.stringify({ event: 'old-defect-controls', detectedAllFive: before.calibrationPassed, correct: before.correct, total: before.total }));
  const runtime = createProductionRuntimeV3({ store, context, reader, dsh, model, maxRevisions: limits.maxRevisions,
    onProgress: row => console.log(JSON.stringify({ event: 'progress', ticket: 18, slice: 173, ...row })) });
  for (let index = 0; index < parents.length; index++) {
    const parentCandidate = parents[index], packet = plan.packets[index], issues = findings.get(packet.id);
    let candidate;
    if (issues.length) {
      const repaired = await repairExternalPacket({ runtime, packet, candidate: parentCandidate, findings: issues, context, reader });
      candidate = repaired.candidate; repairs.push(repaired.repair);
      await writeFile(path.join(OUT, packet.id + '.external-repair.json'), JSON.stringify(repaired.repair, null, 2));
    } else {
      const lease = store.acquire(packet.id + '.candidate', { reusedParentHash: parentCandidate.hash, parentRecipeHash: parent.hash });
      candidate = lease.cached ? lease.artifact : store.finish(lease, parentCandidate);
    }
    results.push(candidate);
    await writeFile(path.join(OUT, packet.id + '.json'), JSON.stringify(candidate, null, 2));
    if (!candidate.semanticPassed) fail('EXTERNAL_CORRECTION_SOURCE_REVIEW_FAILED');
    console.log(JSON.stringify({ event: 'packet-complete', processed: results.length, target: 5, packet: packet.id, correctedFindings: issues.length, hash: candidate.hash }));
  }
  after = await evaluateSourceAuditProbesV3({ packets: results, probes, store, model, label: 'after' });
  await writeFile(path.join(OUT, 'after-probes.json'), JSON.stringify(after, null, 2));
  if (!after.passed) fail('EXTERNAL_CORRECTION_PROBES_FAILED');
  const check = new DatabaseSync(filename, { readOnly: true });
  try { results.forEach(c => assertNoKnownExternalClaimFailure(check, c)); } finally { check.close(); }
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'EXTERNAL_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'external_repair_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, planHash: plan.hash, contextHash: context.hash,
    processedPackets: results.length, semanticallyPassedPackets: results.filter(r => r.semanticPassed).length,
    resultHashes: results.map(r => r.hash), repairHashes: repairs.map(r => r.hash),
    calibrationPassed: before?.calibrationPassed || false, externalProbePassed: after?.passed || false,
    beforeProbeHash: before?.hash || null, afterProbeHash: after?.hash || null, failure, ledger, continuation: continuation?.manifest || null,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['external_source_editor', 'fresh_source_reviews', 'independent_before_after_probe_reader'],
    sourceRefreshPerformed: false, formalSkillsAccepted: 0, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    promotions: [], blocks: ['remaining_32_packets', 'overall_exam', 'factions_matchups', 'arena_reflection_upgrade'], trainingTruth: false });
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: 'report', path: path.relative(ROOT, path.join(OUT, 'report.json')), processed: results.length,
    calibrationPassed: report.calibrationPassed, externalProbePassed: report.externalProbePassed, failure,
    tokens: ledger.knownTokens, estimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
