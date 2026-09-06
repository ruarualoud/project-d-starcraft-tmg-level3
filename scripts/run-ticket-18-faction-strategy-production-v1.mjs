import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { createFactionWritingPlanV1, produceFactionStrategyV1, renderFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { compileFactionProductionInputV1 } from '../packages/skill-production-v3/faction-production-input-v1.mjs';
import { inspectFactionContinuationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { validateFactionFieldRepairSeedV1 } from '../packages/skill-production-v3/faction-field-repair-seed-v1.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
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
if (![3, 5, 7].includes(args.length) || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--overall-run'
  || !/^guide-repair-[a-f0-9]{20}$/.test(args[2]) || args.length >= 5 && (args[3] !== '--continue-from' || !/^faction-v1-[a-f0-9]{20}$/.test(args[4]))
  || args.length === 7 && (args[5] !== '--field-repair-run' || !/^field-repair-[a-f0-9]{20}$/.test(args[6]))) fail('FACTION_RUN_ARGUMENTS_INVALID');
const base = path.join(root, 'build/ticket-18-faction-production-v1'), filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(root, file), 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }
// Inspect actual base production and actual guide requests/answers before any
// Keychain access. Uploaded or model-authored qualification flags are not used.
const inspected = JSON.parse((await promisify(execFile)(process.execPath,
  [path.join(root, 'scripts/qualify-ticket-18-overall-dependency-v1.mjs'), args[2]],
  { cwd: root, timeout: 240000, maxBuffer: 64 * 1024 })).stdout.trim());
if (!inspected.offlineGenerationQualified) fail('FACTION_OVERALL_NOT_QUALIFIED');
const overallPath = 'build/ticket-18-production-v3/' + args[2] + '/';
const overallDependency = await json(overallPath + 'overall-production-dependency.json'), qualificationReceipt = await json(overallPath + 'overall-dependency-qualification.json');
if (inspected.dependencyHash !== overallDependency.hash || inspected.receiptHash !== qualificationReceipt.hash) fail('FACTION_OVERALL_RECEIPT_DRIFT');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const inputs = [];
for (const name of ['terran_armed_forces', 'zerg_swarm']) {
  const factionEvidence = await json('build/ticket-18-faction-evidence-v1/' + name + '.json');
  const input = compileFactionProductionInputV1({ catalogue, factionEvidence, overallDependency, qualificationReceipt });
  const saved = await json('build/ticket-18-faction-production-v1/' + name + '-input.json');
  if (input.hash !== saved.hash) fail('FACTION_SAVED_INPUT_DRIFT'); inputs.push(input);
}
// Recompute the calibrated kernel finding, never trust a saved model verdict or
// a readiness flag as rule truth. Only the already-known diagnostic is exposed.
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicies = inputs.map(input => createFactionKnownRulePolicyV1({ input, drills }));
const parentRecipe = args[4] ? await json('build/ticket-18-faction-production-v1/' + args[4] + '/recipe.json') : null;
const fieldRepairRunId = args[6] || parentRecipe?.fieldRepairBinding?.runId;
const fieldRepairSeed = fieldRepairRunId ? await inspectFactionFieldRepairEvidenceV1({ root, runId: fieldRepairRunId }) : null;
const fieldRepairBinding = fieldRepairSeed ? validateFactionFieldRepairSeedV1({ input: inputs[0], knownRulePolicy: knownRulePolicies[0], seed: fieldRepairSeed }) : null;
const main = await verifyProductionReadiness(root, catalogue);
const gates = [];
for (const name of ['input-readiness', 'workflow-readiness', 'dsh-context-readiness', 'continuation-readiness', 'json-recovery-readiness', 'targeted-corrections-readiness', 'review-evidence-readiness']) {
  const gate = await json('build/ticket-18-faction-production-v1/' + name + '.json');
  if (!gate.passed) fail('FACTION_READINESS_FAILED');
  for (const r of gate.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('FACTION_READINESS_CODE_DRIFT');
  gates.push(gate);
}
if (hash(gates[1].inputHashes) !== hash(inputs.map(i => i.hash)) || hash(gates[2].inputHashes) !== hash(inputs.map(i => i.hash))
  || gates[2].contextHash !== context.hash) fail('FACTION_READINESS_INPUT_DRIFT');
if (hash(gates[5].inputHashes) !== hash(inputs.map(i => i.hash))
  || hash(gates[5].policyHashes) !== hash(knownRulePolicies.map(p => p.hash))
  || hash(gates[1].policyHashes) !== hash(knownRulePolicies.map(p => p.hash))) fail('FACTION_KNOWN_RULE_READINESS_DRIFT');
let fieldRepairReadiness = null;
if (fieldRepairBinding) {
  fieldRepairReadiness = await json('build/ticket-18-faction-production-v1/field-seed-readiness.json');
  if (!fieldRepairReadiness.passed || fieldRepairReadiness.bindingHash !== fieldRepairBinding.hash) fail('FACTION_FIELD_SEED_READINESS_DRIFT');
  for (const r of fieldRepairReadiness.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('FACTION_FIELD_SEED_READINESS_CODE_DRIFT');
  gates.push(fieldRepairReadiness);
}
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-production-input-v1.mjs',
  'packages/skill-production-v3/faction-review-targets-v1.mjs', 'packages/skill-production-v3/faction-known-rule-findings-v1.mjs',
  'packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs',
  'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/skill-production-v3/context.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'packages/skill-production/loops.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs',
  'packages/secure-provider-runtime/provider-response-outcome-v1.mjs', 'packages/secure-provider-runtime/provider-egress-transport-v1.mjs',
  'packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs'];
if (fieldRepairBinding) files.push('packages/skill-production-v3/faction-field-repair-seed-v1.mjs',
  'packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-evaluation/faction-field-repair-evidence-v1.mjs',
  'packages/skill-evaluation/faction-semantic-debt-v1.mjs', 'packages/skill-evaluation/read-only-production-replay-v1.mjs');
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = { maxCalls: 400, maxCostMicros: 20_000_000, maxTokens: 60_000_000, maxWallMs: 8 * 60 * 60 * 1000, maxInputBytes: 1_000_000, maxRevisions: 3 };
const next = seal({ version: 'faction_strategy_production_v1', overallRunId: args[2], overallDependencyHash: overallDependency.hash,
  qualificationReceiptHash: qualificationReceipt.hash, inputHashes: inputs.map(i => i.hash), planHashes: inputs.map(i => createFactionWritingPlanV1(i).hash),
  catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, contextHash: context.hash, modelHash: profile.integrity.hash,
  mainReadinessHash: main.hash, workflowReadinessHash: gates[1].hash, dshContextReadinessHash: gates[2].hash, jsonRecoveryReadinessHash: gates[4].hash,
  targetedCorrectionsReadinessHash: gates[5].hash, knownRulePolicyHashes: knownRulePolicies.map(p => p.hash),
  dshBindingHash: gates[2].dshBinding.hash, codeHashes, limits, ...(fieldRepairBinding ? { fieldRepairBinding } : {}),
  target: 'two_complete_conditional_faction_strategy_candidates_with_source_review_not_runtime_promotion',
  independentEvaluationAnswersExposed: false, sourceRefreshPerformed: false, trainingTruth: false });
let continuation = null;
if (args[4]) {
  const parent = parentRecipe;
  const parentReport = await json('build/ticket-18-faction-production-v1/' + args[4] + '/report.json');
  const before = await json('build/ticket-17-production-redesign-v1/readiness-' + parent.mainReadinessHash + '.json');
  continuation = inspectFactionContinuationV1({ filename, parentRunId: args[4], parent, parentReport, next,
    normalizationMigration: { before, after: main, recovery: gates[4] }, correctionMigration: gates[5],
    fieldRepairMigration: fieldRepairBinding ? { binding: fieldRepairBinding, readiness: fieldRepairReadiness } : null });
}
const { hash: ignored, ...nextBody } = next;
const recipe = continuation ? seal({ ...nextBody, continuation: continuation.manifest }) : next;
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, providerCalls: 0, factions: inputs.map(i => i.factionRecordKey),
    sections: inputs.map(i => createFactionWritingPlanV1(i).sections.length), overallQualified: true, limits,
    reusableRoles: continuation?.manifest.reusable.length || 0, inheritedAccounting: continuation?.manifest.accounting || null })); process.exit(0);
}
const runId = 'faction-v1-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const inherited = continuation?.manifest.accounting || { calls: 0, tokens: 0, costMicros: 0 };
const localStore = openProductionStore(filename, { runId, recipeHash: recipe.hash,
  maxCalls: limits.maxCalls - inherited.calls, maxTokens: limits.maxTokens - inherited.tokens, maxCostMicros: limits.maxCostMicros - inherited.costMicros });
const store = continuation ? withCheckpointContinuation(localStore, continuation) : localStore;
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: continuation?.manifest.parentStart || Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, failure = null; const candidates = [];
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('FACTION_RUN_WALL_EXHAUSTED');
  await put('recipe', recipe);
  const dsh = await prepareDshLoop(root);
  if (dsh.binding.hash !== recipe.dshBindingHash) fail('FACTION_DSH_BINDING_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'faction-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_RUN_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh,
    onProgress: row => console.log(JSON.stringify({ event: 'role', ticket: 18, slice: 174, ...row })) });
  for (const [index, input] of inputs.entries()) {
    const name = input.factionRecordKey.split(':')[1]; await put(name + '-input', input);
    const candidate = await produceFactionStrategyV1({ input, runtime, store, knownRulePolicy: knownRulePolicies[index],
      fieldRepairSeed: index === 0 ? fieldRepairSeed : null,
      onProgress: row => console.log(JSON.stringify({ event: 'faction-progress', ticket: 18, slice: 174, faction: name, ...row })) });
    candidates.push(candidate); await put(name + '-candidate', candidate);
    await writeFile(path.join(out, name + '-candidate.md'), renderFactionStrategyV1(candidate));
    console.log(JSON.stringify({ event: 'faction-generated', faction: name, hash: candidate.hash, sections: candidate.sections.length, semanticReviewPassed: candidate.semanticReviewPassed }));
    if (!candidate.semanticReviewPassed) fail('FACTION_SOURCE_REVIEW_NOT_PASSED');
  }
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'FACTION_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'faction_production_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, overallDependencyHash: overallDependency.hash,
    readinessHashes: gates.map(g => g.hash),
    candidateHashes: candidates.map(c => c.hash), factionsGenerated: candidates.length,
    sourceReviewPassed: !failure && candidates.length === 2 && candidates.every(c => c.semanticReviewPassed), failure, ledger,
    continuation: continuation?.manifest || null, cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['Teach', 'Ctx2Skill', 'Challenger', 'Reasoner', 'Judge', 'Proposer', 'Generator', 'source_reviewer', 'local_editor'],
    independentEvaluationPerformed: false, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    formalSkillsAccepted: 0, promotions: [], sourceRefreshPerformed: false, trainingTruth: false, elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, factionsGenerated: report.factionsGenerated,
    sourceReviewPassed: report.sourceReviewPassed, failure, tokens: ledger.knownTokens,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
