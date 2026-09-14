import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { inspectFactionConsumerReplayV2 } from '../packages/skill-evaluation/faction-consumer-evidence-v2.mjs';
import { evaluateFactionRosterUseV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { evaluateFactionRuleUseGroupedV2 } from '../packages/skill-evaluation/faction-rule-use-evaluation-v2.mjs';
import { createFactionConsumerGuidedRevisionV2 } from '../packages/skill-production-v3/faction-consumer-guided-revision-v2.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { bindFactionGeneralDependencyV1 } from '../packages/strategy-skills/faction-general-dependency-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { selectFactionConsumerExecutionV1, factionConsumerExecutionOptionsV1 } from '../packages/skill-evaluation/faction-consumer-execution-v1.mjs';
import { factionBudgetEpochProgressV1 } from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
if (args.length !== 3 || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--parent-consumer-run'
  || !/^faction-consumer-[a-f0-9]{20}$/u.test(args[2])) fail('FACTION_CONSUMER_REVISION_V2_ARGUMENTS');
const parentRunId = args[2], base = path.join(root, 'build/ticket-18-faction-production-v1');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentJson = async name => verifySeal(JSON.parse(await readFile(path.join(base, parentRunId, name + '.json'), 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n)
    fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n)
    fail('FACTION_CONSUMER_REVISION_V2_PARENT_RUNNING');
} finally { db.close(); }
const [parentRecipe, parentReport, input, parentCandidate, parentProductionEvidence,
  parentRosterEvaluation, parentRuleEvaluation, savedGeneral] = await Promise.all(
  ['recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation',
    'rule-application-evaluation', 'final-general-dependency'].map(parentJson));
const catalogue = await loadFrozenSkillEvidence(root);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const finalGeneral = bindFactionGeneralDependencyV1({ input,
  generalSkill: savedGeneral.generalSkill, generalLayer: savedGeneral.generalLayer });
if (finalGeneral.hash !== savedGeneral.hash) fail('FACTION_CONSUMER_REVISION_V2_GENERAL_DRIFT');
const parentConsumerEvidence = await inspectFactionConsumerReplayV2({ root, filename,
  runId: parentRunId, recipe: parentRecipe, report: parentReport, input, candidate: parentCandidate,
  productionEvidence: parentProductionEvidence, knownRulePolicy, drills, applicationDrills,
  evaluation: parentRosterEvaluation, applicationEvaluation: parentRuleEvaluation, finalGeneral });
const revision = createFactionConsumerGuidedRevisionV2({ input, candidate: parentCandidate,
  knownRulePolicy, rosterEvaluation: parentRosterEvaluation, ruleEvaluation: parentRuleEvaluation,
  consumerEvidence: parentConsumerEvidence, rosterDrills: drills, applicationDrills,
  draftEnvelopeBinding, parentProductionEvidence });
const readiness = verifySeal(JSON.parse(await readFile(path.join(base, 'consumer-guided-revision-readiness-v2.json'), 'utf8')));
if (!readiness.passed || readiness.parentRunId !== parentRunId
  || readiness.parentCandidateHash !== parentCandidate.hash
  || readiness.revisedCandidateHash !== revision.candidate.hash
  || readiness.revisionSpecHash !== revision.revisionSpec.hash
  || readiness.groupedRuleCalls !== 18 || readiness.actualProviderCalls !== 0
  || !readiness.unaffectedRecommendationFieldsByteExact)
  fail('FACTION_CONSUMER_REVISION_V2_READINESS_INVALID');
for (const row of readiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_CONSUMER_REVISION_V2_READINESS_CODE_DRIFT');

const selectedExecution = selectFactionConsumerExecutionV1(), profile = selectedExecution.profile;
const files = ['scripts/run-ticket-18-faction-consumer-guided-revision-evaluation-v2.mjs',
  'packages/skill-evaluation/faction-consumer-evidence-v2.mjs',
  'packages/skill-evaluation/faction-rule-use-evaluation-v2.mjs',
  'packages/skill-production-v3/faction-consumer-guided-revision-v2.mjs',
  'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs',
  'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs',
  'packages/skill-evaluation/faction-rule-application-drills-v1.mjs',
  'packages/skill-evaluation/faction-consumer-execution-v1.mjs',
  'packages/skill-production-v3/faction-budget-epoch-v1.mjs',
  'packages/skill-production-v3/faction-model-lifecycle-v1.mjs',
  'packages/skill-production-v3/faction-execution-model-v1.mjs',
  'content/skill-generation/offline-provider-profile-v3.mjs',
  'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file,
  hash: sha256(await readFile(path.join(root, file))) })));
const budgetEpoch = verifySeal(JSON.parse(await readFile(path.join(base, 'budget-epoch-2026-09-09-reset-v1.json'), 'utf8')));
const limits = { maxCalls: 24, maxCostMicros: 15_000_000, maxTokens: 24_000_000,
  maxWallMs: 90 * 60 * 1000, maxInputBytes: 1_000_000 };
const recipe = seal({ version: 'faction_consumer_grouped_revision_run_v1', parentConsumerRunId: parentRunId,
  inputHash: input.hash, parentCandidateHash: parentCandidate.hash,
  candidateHash: revision.candidate.hash, parentProductionEvidenceHash: parentProductionEvidence.hash,
  productionEvidenceHash: revision.revisionEvidence.hash,
  parentConsumerEvidenceHash: parentConsumerEvidence.hash,
  revisionSpecHash: revision.revisionSpec.hash, sourceProofHash: revision.sourceProof.hash,
  knownRulePolicyHash: knownRulePolicy.hash, catalogueHash: catalogue.hash,
  finalGeneralDependencyHash: finalGeneral.hash, drillManifestHash: drills.manifest.hash,
  applicationDrillManifestHash: applicationDrills.manifest.hash,
  applicationRepetitionsPerArm: 3, applicationGrouping: 'one_rule_family_per_request',
  plannedCalls: 20, consumerExecutionBinding: selectedExecution.binding,
  modelHash: profile.integrity.hash, budgetEpochHash: budgetEpoch.hash,
  readinessHash: readiness.hash, codeHashes, limits,
  fullSourcesExposedToConsumer: false, productionDialogueExposedToConsumer: false,
  priorAnswersExposedToConsumer: false, expectedAnswersExposed: false,
  sourceRefreshPerformed: false,
  scope: 'bounded_roster_and_grouped_rule_application_not_complete_legality_or_battle_strength',
  runtimeAccepted: false, trainingTruth: false });
const execution = factionConsumerExecutionOptionsV1(recipe);
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash,
    parentCandidateHash: parentCandidate.hash, candidateHash: revision.candidate.hash,
    plannedCalls: 20, rosterCalls: 2, groupedRuleCalls: 18,
    ruleFamilies: 3, repetitionsPerArm: 3, actualProviderCalls: 0, limits }));
  process.exit(0);
}

const runId = 'faction-consumer-v2-' + recipe.hash.slice(0, 20);
const out = path.join(base, runId); await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, rosterResult = null, ruleResult = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(row => row.code === 'PROVIDER_PAYMENT_REQUIRED'))
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(row => row.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  const epochProgress = factionBudgetEpochProgressV1({ extension: budgetEpoch, global });
  if (epochProgress.estimateOrReservedMicros
    + Math.max(0, limits.maxCostMicros - store.summary().reservedOrSettledMicros) > budgetEpoch.allowance.costMicros)
    fail('FACTION_BUDGET_EPOCH_NEXT_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('FACTION_CONSUMER_REVISION_V2_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('input', input); await put('candidate', revision.candidate);
  await put('parent-candidate', parentCandidate); await put('production-evidence', revision.revisionEvidence);
  await put('parent-production-evidence', parentProductionEvidence);
  await put('parent-consumer-evidence', parentConsumerEvidence);
  await put('consumer-guided-revision-spec', revision.revisionSpec);
  await put('source-proof', revision.sourceProof); await put('final-general-dependency', finalGeneral);
  await put('drill-manifest', drills.manifest); await put('application-drill-manifest', applicationDrills.manifest);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile,
    completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry,
    maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'faction-consumer-v2-' + randomUUID(),
    providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, commandPolicy: 'finish_only',
    maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    ...execution.modelOptions,
    complete: (providerRequest, { signal } = {}) => {
      execution.beforeNewSend?.();
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_CONSUMER_REVISION_V2_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls,
      tokens: ledger.knownTokens,
      cumulativeCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  rosterResult = await evaluateFactionRosterUseV1({ input, candidate: revision.candidate,
    knownRulePolicy, drills, store, model, finalGeneral,
    onProgress: row => console.log(JSON.stringify({ event: 'consumer-v2', ticket: 18, slice: 174, ...row })) });
  await put('evaluation', rosterResult);
  ruleResult = await evaluateFactionRuleUseGroupedV2({ input, candidate: revision.candidate,
    knownRulePolicy, drills: applicationDrills, store, model, finalGeneral,
    onProgress: row => console.log(JSON.stringify({ event: 'rule-consumer-v2', ticket: 18, slice: 174, ...row })) });
  await put('rule-application-evaluation', ruleResult);
  if (!rosterResult.boundedRosterChoicePassed) fail('FACTION_CONSUMER_V2_BOUNDED_EVALUATION_FAILED');
  if (!ruleResult.boundedRuleApplicationPassed) fail('FACTION_RULE_CONSUMER_V2_BOUNDED_EVALUATION_FAILED');
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/u.test(error.code || '')
    ? error.code : 'FACTION_CONSUMER_REVISION_V2_RUN_FAILURE', diagnosticHash: hash(String(error.message)) };
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef,
    reason: 'faction_consumer_v2_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, resultHash: rosterResult?.hash || null,
    applicationResultHash: ruleResult?.hash || null, productionEvidenceHash: revision.revisionEvidence.hash,
    parentCandidateHash: parentCandidate.hash, candidateHash: revision.candidate.hash,
    revisionSpecHash: revision.revisionSpec.hash, failure, ledger,
    boundedRosterChoicePassed: rosterResult?.boundedRosterChoicePassed || false,
    boundedRuleApplicationPassed: ruleResult?.boundedRuleApplicationPassed || false,
    rosterResults: rosterResult?.results.map(row => ({ arm: row.arm, correct: row.correct, total: row.total })) || [],
    ruleApplicationSummary: ruleResult?.summary || [], groupedRuleCalls: ruleResult?.calls || 0,
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    budgetEpoch: factionBudgetEpochProgressV1({ extension: budgetEpoch, global }),
    actualRoomReplayPerformed: false, formalSkillsAccepted: 0,
    strategyStrengthProven: false, runtimeAccepted: false, trainingTruth: false });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, candidateHash: revision.candidate.hash,
    boundedRosterChoicePassed: report.boundedRosterChoicePassed,
    boundedRuleApplicationPassed: report.boundedRuleApplicationPassed,
    rosterResults: report.rosterResults, ruleApplicationSummary: report.ruleApplicationSummary,
    failure, cumulativeTokens: report.cumulativeKnownTokensLowerBound,
    cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
