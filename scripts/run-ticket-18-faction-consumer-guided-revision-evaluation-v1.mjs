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
import { inspectFactionConsumerReplayV1 } from '../packages/skill-evaluation/faction-consumer-evidence-v1.mjs';
import { evaluateFactionRosterUseV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { evaluateFactionRuleUseV1 } from '../packages/skill-evaluation/faction-rule-use-evaluation-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { checkProductionCostNotificationV1 } from '../packages/skill-evaluation/cost-notification-v1.mjs';
import { bindFactionGeneralDependencyV1 } from '../packages/strategy-skills/faction-general-dependency-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { selectFactionConsumerExecutionV1, factionConsumerExecutionOptionsV1 } from '../packages/skill-evaluation/faction-consumer-execution-v1.mjs';
import { factionBudgetEpochProgressV1 } from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';
import { createFactionConsumerGuidedRevisionV1 } from '../packages/skill-production-v3/faction-consumer-guided-revision-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const selectedExecution = selectFactionConsumerExecutionV1(), profile = selectedExecution.profile;
const revisionFrom = args.length === 7 && args[5] === '--revision-from' && /^faction-consumer-[a-f0-9]{20}$/u.test(args[6])
  ? args[6] : null;
if (![5, 7].includes(args.length) || (args.length === 7 && !revisionFrom)
  || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--source-run'
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
const generalBase = path.join(root, 'build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-final-v1');
const generalJson = async name => verifySeal(JSON.parse(await readFile(path.join(generalBase, name + '.json'), 'utf8')));
const finalGeneral = bindFactionGeneralDependencyV1({ input,
  generalSkill: await generalJson('final-general-skill'), generalLayer: await generalJson('final-general-strategy-layer') });
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const inspected = await inspectFactionCandidateEvidenceV1({ root, runId: args[2], input, knownRulePolicy, catalogue, context });
const parentCandidate = inspected.candidate, parentProductionEvidence = inspected.evidence;
const gateNames = ['production-replay-readiness', 'consumer-evaluation-readiness', 'unit-role-debt-readiness',
  'cross-field-source-audit-readiness', 'phase-source-debt-readiness', 'rule-application-drill-readiness', 'rule-use-evaluation-readiness',
  'repair-regression-guard-readiness', 'structured-replay-readiness', 'cost-notification-readiness',
  'consumer-evidence-readiness', 'finalization-readiness', 'unique-cross-field-readiness', 'zerg-card-economy-readiness',
  'consumer-execution-component-v1'];
if (revisionFrom) gateNames.push('consumer-guided-revision-readiness-v1');
const gates = await Promise.all(gateNames.map(json));
for (const gate of gates) {
  if (!gate.passed) fail('FACTION_CONSUMER_READINESS_FAILED');
  for (const c of gate.codeHashes) if (sha256(await readFile(path.join(root, c.file))) !== c.hash) fail('FACTION_CONSUMER_READINESS_CODE_DRIFT');
}
if (!gates[1].inputHashes.includes(input.hash) || gates[1].drillManifestHash !== drills.manifest.hash) fail('FACTION_CONSUMER_READINESS_INPUT_DRIFT');
if (!gates[6].inputHashes.includes(input.hash) || gates[6].drillManifestHash !== applicationDrills.manifest.hash
  || gates[6].repetitionsPerArm !== 3 || gates[6].questions !== 22 || !gates[6].answerKeysAbsentFromPrompts
  || !gates[6].midEvaluationResumeWithoutRepeatedCalls) fail('FACTION_RULE_CONSUMER_READINESS_INPUT_DRIFT');
if (!gates[7].consumerGuardWired || gates[7].newProviderCalls !== 0) fail('FACTION_REPAIR_GUARD_READINESS_INVALID');
if (revisionFrom) {
  const gate = gates.at(-1);
  if (!gate.freshIndependentConsumerEvaluationStillRequired || gate.parentCandidateHash !== parentCandidate.hash
    || gate.actualProviderCalls !== 0 || !gate.unaffectedRecommendationFieldsByteExact)
    fail('FACTION_CONSUMER_GUIDED_REVISION_READINESS_INVALID');
}
let candidate = parentCandidate, productionEvidence = parentProductionEvidence;
let revision = null, authenticatedPriorConsumerEvidence = null;
if (revisionFrom) {
  const priorJson = async name => verifySeal(JSON.parse(await readFile(path.join(base, revisionFrom, name + '.json'), 'utf8')));
  const [priorRecipe, priorReport, priorInput, priorCandidate, priorProductionEvidence,
    rosterEvaluation, ruleEvaluation, priorGeneral] = await Promise.all(
    ['recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation',
      'rule-application-evaluation', 'final-general-dependency'].map(priorJson));
  if (priorInput.hash !== input.hash || priorCandidate.hash !== parentCandidate.hash || priorGeneral.hash !== finalGeneral.hash)
    fail('FACTION_CONSUMER_GUIDED_REVISION_PARENT_DRIFT');
  authenticatedPriorConsumerEvidence = await inspectFactionConsumerReplayV1({ filename, runId: revisionFrom,
    recipe: priorRecipe, report: priorReport, input, candidate: parentCandidate,
    productionEvidence: priorProductionEvidence, knownRulePolicy, drills, applicationDrills,
    evaluation: rosterEvaluation, applicationEvaluation: ruleEvaluation, finalGeneral });
  revision = createFactionConsumerGuidedRevisionV1({ input, candidate: parentCandidate, knownRulePolicy,
    rosterEvaluation, ruleEvaluation, consumerEvidence: authenticatedPriorConsumerEvidence,
    rosterDrills: drills, applicationDrills, draftEnvelopeBinding,
    parentProductionEvidence });
  candidate = revision.candidate; productionEvidence = revision.revisionEvidence;
}
const files = ['scripts/run-ticket-18-faction-consumer-evaluation-v1.mjs', 'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'packages/skill-evaluation/faction-consumer-execution-v1.mjs', 'packages/skill-evaluation/faction-consumer-evidence-v1.mjs',
  'packages/skill-production-v3/faction-budget-epoch-v1.mjs', 'packages/skill-production-v3/faction-model-lifecycle-v1.mjs',
  'packages/skill-production-v3/faction-execution-model-v1.mjs', 'content/skill-generation/offline-provider-profile-v3.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs', 'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/cost-notification-v1.mjs', 'packages/strategy-skills/faction-general-dependency-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs', 'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs',
  'packages/skill-evaluation/faction-unit-role-debt-v1.mjs',
  'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs',
  'packages/skill-evaluation/faction-unique-cross-field-audit-v1.mjs',
  'packages/skill-evaluation/faction-zerg-card-economy-audit-v1.mjs',
  'packages/skill-evaluation/faction-phase-source-debt-v1.mjs',
  'packages/skill-production-v3/faction-repair-regression-guard-v1.mjs',
  'packages/skill-evaluation/faction-rule-application-drills-v1.mjs', 'packages/skill-evaluation/faction-rule-use-evaluation-v1.mjs',
  'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs',
  'packages/skill-production-v3/faction-consumer-guided-revision-v1.mjs',
  'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
let budgetEpoch = null;
try { budgetEpoch = await json('budget-epoch-2026-09-09-reset-v1'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const costNotification = budgetEpoch || await json('cny-100-notification-receipt');
const limits = { maxCalls: 20, maxCostMicros: 8_000_000, maxTokens: 10_000_000, maxWallMs: 60 * 60 * 1000, maxInputBytes: 1_000_000 };
const recipe = seal({ version: revision ? 'faction_consumer_evaluation_run_v3' : 'faction_consumer_evaluation_run_v2',
  sourceRunId: args[2], inputHash: input.hash,
  consumerExecutionBinding: selectedExecution.binding, ...(budgetEpoch ? { budgetEpochHash: budgetEpoch.hash } : {}),
  finalGeneralDependencyHash: finalGeneral.hash,
  costNotificationHash: costNotification.hash,
  candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash, knownRulePolicyHash: knownRulePolicy.hash,
  ...(revision ? { parentCandidateHash: parentCandidate.hash,
    parentProductionEvidenceHash: parentProductionEvidence.hash,
    revisionFromConsumerRunId: revisionFrom,
    authenticatedPriorConsumerEvidenceHash: authenticatedPriorConsumerEvidence.hash,
    revisionSpecHash: revision.revisionSpec.hash,
    revisionEvidenceHash: revision.revisionEvidence.hash } : {}),
  catalogueHash: catalogue.hash, contextHash: context.hash, modelHash: profile.integrity.hash,
  drillManifestHash: drills.manifest.hash, readinessHashes: gates.map(g => g.hash), codeHashes, limits,
  applicationDrillManifestHash: applicationDrills.manifest.hash, applicationRepetitionsPerArm: 3,
  fullSourcesExposedToConsumer: false, productionDialogueExposedToConsumer: false, expectedAnswersExposed: false,
  scope: 'bounded_roster_choice_and_repeated_development_rule_probes_not_complete_legality_or_battle_strength', sourceRefreshPerformed: false, trainingTruth: false });
const execution = factionConsumerExecutionOptionsV1(recipe);
if (args[0] === '--preflight') {
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, candidateHash: candidate.hash, questions: drills.list(input.factionRecordKey).length,
    applicationQuestions: 22, applicationRepetitionsPerArm: 3, plannedCalls: 8,
    consumerGuidedRevision: !!revision, parentCandidateHash: revision ? parentCandidate.hash : null,
    actualProviderCalls: 0, limits })); process.exit(0);
}
const runId = 'faction-consumer-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, result = null, applicationResult = null, failure = null;
try {
  const global = store.globalSummary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (budgetEpoch) {
    const epochProgress = factionBudgetEpochProgressV1({ extension: budgetEpoch, global });
    if (epochProgress.estimateOrReservedMicros + Math.max(0, limits.maxCostMicros - store.summary().reservedOrSettledMicros)
      > budgetEpoch.allowance.costMicros) fail('FACTION_BUDGET_EPOCH_NEXT_NOTIFICATION_REQUIRED');
  } else checkProductionCostNotificationV1({ cumulativeMicros: historyMicros + global.reservedOrSettledMicros,
    additionalMicros: Math.max(0, limits.maxCostMicros - store.summary().reservedOrSettledMicros), notification: costNotification });
  if (Date.now() - began >= limits.maxWallMs) fail('FACTION_CONSUMER_WALL_EXHAUSTED');
  await put('recipe', recipe); await put('input', input); await put('candidate', candidate);
  await put('final-general-dependency', finalGeneral);
  await put('production-evidence', productionEvidence); await put('drill-manifest', drills.manifest);
  if (revision) {
    await put('parent-candidate', parentCandidate); await put('parent-production-evidence', parentProductionEvidence);
    await put('consumer-guided-revision-spec', revision.revisionSpec);
    await put('authenticated-prior-consumer-evidence', authenticatedPriorConsumerEvidence);
  }
  await put('application-drill-manifest', applicationDrills.manifest);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'faction-consumer-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    ...execution.modelOptions,
    complete: (providerRequest, { signal } = {}) => {
      execution.beforeNewSend?.();
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_CONSUMER_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      cumulativeCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  result = await evaluateFactionRosterUseV1({ input, candidate, knownRulePolicy, drills, store, model, finalGeneral,
    onProgress: row => console.log(JSON.stringify({ event: 'consumer', ticket: 18, slice: 174, ...row })) });
  await put('evaluation', result);
  applicationResult = await evaluateFactionRuleUseV1({ input, candidate, knownRulePolicy, drills: applicationDrills, store, model, finalGeneral,
    onProgress: row => console.log(JSON.stringify({ event: 'rule-consumer', ticket: 18, slice: 174, ...row })) });
  await put('rule-application-evaluation', applicationResult);
  if (!result.boundedRosterChoicePassed) fail('FACTION_CONSUMER_BOUNDED_EVALUATION_FAILED');
  if (!applicationResult.boundedRuleApplicationPassed) fail('FACTION_RULE_CONSUMER_BOUNDED_EVALUATION_FAILED');
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'FACTION_CONSUMER_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'faction_consumer_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, resultHash: result?.hash || null, failure, ledger,
    boundedRosterChoicePassed: result?.boundedRosterChoicePassed || false, productionEvidenceHash: productionEvidence.hash,
    ...(revision ? { parentCandidateHash: parentCandidate.hash,
      revisionSpecHash: revision.revisionSpec.hash, revisionFromConsumerRunId: revisionFrom } : {}),
    applicationResultHash: applicationResult?.hash || null, boundedRuleApplicationPassed: applicationResult?.boundedRuleApplicationPassed || false,
    ruleApplicationSummary: applicationResult?.summary || [], independentlyHeldOutApplicationCases: 0,
    results: result?.results.map(r => ({ arm: r.arm, correct: r.correct, total: r.total })) || [],
    cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    budgetEpoch: factionBudgetEpochProgressV1({ extension: budgetEpoch, global }),
    actualRoomReplayPerformed: false, formalSkillsAccepted: 0, strategyStrengthProven: false, trainingTruth: false });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, boundedRosterChoicePassed: report.boundedRosterChoicePassed, results: report.results,
    boundedRuleApplicationPassed: report.boundedRuleApplicationPassed, ruleApplicationSummary: report.ruleApplicationSummary,
    failure, cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
