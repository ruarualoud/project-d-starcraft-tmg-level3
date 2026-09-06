import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { inspectFactionCandidateEvidenceV1 } from '../packages/skill-evaluation/faction-candidate-evidence-v1.mjs';
import { evaluateFactionRosterUseV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
if (args.length !== 5 || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--source-run'
  || !/^faction-v1-[a-f0-9]{20}$/.test(args[2]) || args[3] !== '--faction'
  || !['terran_armed_forces', 'zerg_swarm'].includes(args[4])) fail('FACTION_CONSUMER_RUN_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1'), filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(args[2]).n) fail('FACTION_CONSUMER_SOURCE_RUNNING');
} finally { db.close(); }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const input = await json(args[4] + '-input');
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const { candidate, evidence } = await inspectFactionCandidateEvidenceV1({ root, runId: args[2], input, knownRulePolicy, catalogue, context });
const gates = await Promise.all(['production-replay-readiness', 'consumer-evaluation-readiness', 'unit-role-debt-readiness', 'cross-field-source-audit-readiness', 'phase-source-debt-readiness'].map(json));
for (const gate of gates) {
  if (!gate.passed) fail('FACTION_CONSUMER_READINESS_FAILED');
  for (const c of gate.codeHashes) if (sha256(await readFile(path.join(root, c.file))) !== c.hash) fail('FACTION_CONSUMER_READINESS_CODE_DRIFT');
}
if (!gates[1].inputHashes.includes(input.hash) || gates[1].drillManifestHash !== drills.manifest.hash) fail('FACTION_CONSUMER_READINESS_INPUT_DRIFT');
const files = ['scripts/run-ticket-18-faction-consumer-evaluation-v1.mjs', 'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs', 'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs',
  'packages/skill-evaluation/faction-unit-role-debt-v1.mjs',
  'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs',
  'packages/skill-evaluation/faction-phase-source-debt-v1.mjs',
  'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = { maxCalls: 8, maxCostMicros: 5_000_000, maxTokens: 4_000_000, maxWallMs: 30 * 60 * 1000, maxInputBytes: 1_000_000 };
const recipe = seal({ version: 'faction_consumer_evaluation_run_v1', sourceRunId: args[2], inputHash: input.hash,
  candidateHash: candidate.hash, productionEvidenceHash: evidence.hash, knownRulePolicyHash: knownRulePolicy.hash,
  catalogueHash: catalogue.hash, contextHash: context.hash, modelHash: profile.integrity.hash,
  drillManifestHash: drills.manifest.hash, readinessHashes: gates.map(g => g.hash), codeHashes, limits,
  fullSourcesExposedToConsumer: false, productionDialogueExposedToConsumer: false, expectedAnswersExposed: false,
  scope: 'bounded_roster_choice_baseline_vs_augmented_single_pair_not_battle_strength', sourceRefreshPerformed: false, trainingTruth: false });
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, candidateHash: candidate.hash, questions: drills.list(input.factionRecordKey).length,
    plannedCalls: 2, actualProviderCalls: 0, limits })); process.exit(0);
}
const runId = 'faction-consumer-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, result = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (historyMicros + global.reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('FACTION_CONSUMER_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('input', input); await put('candidate', candidate);
  await put('production-evidence', evidence); await put('drill-manifest', drills.manifest);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'faction-consumer-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_CONSUMER_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      cumulativeCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  result = await evaluateFactionRosterUseV1({ input, candidate, knownRulePolicy, drills, store, model,
    onProgress: row => console.log(JSON.stringify({ event: 'consumer', ticket: 18, slice: 174, ...row })) });
  await put('evaluation', result);
  if (!result.boundedRosterChoicePassed) fail('FACTION_CONSUMER_BOUNDED_EVALUATION_FAILED');
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'FACTION_CONSUMER_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'faction_consumer_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, resultHash: result?.hash || null, failure, ledger,
    boundedRosterChoicePassed: result?.boundedRosterChoicePassed || false, productionEvidenceHash: evidence.hash,
    results: result?.results.map(r => ({ arm: r.arm, correct: r.correct, total: r.total })) || [],
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    actualRoomReplayPerformed: false, formalSkillsAccepted: 0, strategyStrengthProven: false, trainingTruth: false });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, boundedRosterChoicePassed: report.boundedRosterChoicePassed, results: report.results,
    failure, cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
