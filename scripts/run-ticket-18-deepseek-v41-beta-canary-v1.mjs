import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V3 as profile,
  DEEPSEEK_V41_FLASH_BETA_LOCAL_STOP_V1 as localStop,
  assertDeepSeekV41BetaWindowV1 } from '../content/skill-generation/offline-provider-profile-v3.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V4 as contractRef } from
  '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from '../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs';
import { hash, seal, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1,
  STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION } from
  '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(process.argv[2])) fail('BETA_CANARY_ARGUMENTS');
assertDeepSeekV41BetaWindowV1();
const dbPath = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });
let global;
try {
  global = db.prepare('SELECT count(*) calls, sum(COALESCE(settled,reserve)) micros,'
    + 'sum(COALESCE(json_extract(usage,?),0)) tokens, sum(state=?) intents, sum(code=?) payments FROM attempts')
    .get('$.value.totalUnits', 'intent', 'PROVIDER_PAYMENT_REQUIRED');
} finally { db.close(); }
if (global.payments) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
if (global.intents) fail('AMBIGUOUS_EGRESS_NO_RETRY');
const cap = { maxCalls: 1, maxCostMicros: 100_000, maxTokens: 10_000 };
if (global.micros + 34_013_743 + cap.maxCostMicros >= 200_000_000) fail('CNY_200_NOTIFICATION_REQUIRED');
const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'],
});
const binding = registry.resolveEgressBinding({ profileRef: {
  id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash,
} }).egressBinding;
const codeFiles = ['content/skill-generation/offline-provider-profile-v3.mjs',
  'scripts/run-ticket-18-deepseek-v41-beta-canary-v1.mjs',
  'packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs',
  'content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs',
  'packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs',
  'packages/secure-provider-runtime/structured-provider-worker-child-v1.mjs',
  'packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs'];
const recipe = seal({ version: 'ticket_18_deepseek_v41_beta_canary_v1', ticket: 18, slice: 174,
  providerProfileRef: binding.providerProfileRef, model: binding.model,
  endpoint: binding.endpoint, outputContractRef: contractRef, limits: cap, localStop,
  codeHashes: await Promise.all(codeFiles.map(async file => ({file, hash: sha256(await readFile(path.join(root, file)))}))),
  // Deliberately conservative estimate: current official Flash PEAK CNY rates,
  // without cache discount. Beta price equivalence is not independently verified.
  accounting: { kind: 'conservative_flash_peak_estimate_not_beta_tariff', inputCnyPerMillion: 3,
    outputCnyPerMillion: 9, source: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/', invoice: false },
  automaticRetries: 0, silentFallback: false, sourceRefreshPerformed: false,
  semanticAcceptanceInherited: false, trainingTruth: false });
const runId = `v41-beta-probe-${recipe.hash.slice(0, 32)}`;
if (process.argv[2] === '--preflight') {
  console.log(JSON.stringify({ ready: true, runId, recipeHash: recipe.hash, model: binding.model,
    providerCalls: 0, limits: cap, formalSkillQueueChanged: false }));
} else {
  const out = path.join(root, 'build/ticket-18-deepseek-v41-beta-v1', runId);
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'recipe.json'), JSON.stringify(recipe, null, 2) + '\n');
  const store = openProductionStore(dbPath, { runId, recipeHash: recipe.hash, ...cap });
  const providerRequest = { schemaVersion: STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
    requestId: `v41-probe-${recipe.hash.slice(0, 40)}`,
    roleRef: { id: 'structured.capability.probe.v41-faction-review', version: 'v1', hash: hash('v41-faction-review-probe-v1') },
    instructions: 'This is a synthetic structured-output probe, not game advice. Return exactly one schema object with one synthetic verdict and an empty coverage array. Use targetSlot 0, path risk, quote synthetic review quote, verdict uncertain, sourceSlots [0], and a brief reason. Do not add markdown or identities.',
    input: 'Synthetic target slot 0 has risk text: synthetic review quote. No coverage slots are supplied.',
    outputContractRef: contractRef, maxOutputUnits: 256 };
  const attemptId = `v41-beta-probe-${recipe.hash.slice(0, 40)}`;
  const reservation = store.reserve(attemptId, { bindingHash: binding.policyHash, providerRequest }, cap.maxCostMicros, cap.maxTokens);
  let worker, attached, result, transportObservation, failure = null, physicalCalls = 0;
  const estimate = usage => Math.ceil(usage.inputUnits * 3 + usage.outputUnits * 9);
  const safeCode = error => /^[A-Z0-9_.:-]{3,160}$/u.test(error?.code || '') ? error.code : 'BETA_CANARY_FAILED';
  try {
    if (reservation.failed) fail(reservation.code);
    if (reservation.cached) result = reservation.response;
    else {
      worker = createStarcraftTmgStructuredProviderWorkerPortV1({ providerProfileRegistry: registry });
      const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
      try { attached = await worker.attachCredential({ attachmentId: `v41-${randomUUID()}`, providerProfile: profile,
        credentialBytes: ingress.credentialBytes }); } finally { ingress.credentialBytes.fill(0); }
      if (!attached?.ok) fail('PROVIDER_ATTACHMENT_FAILED');
      const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async request => {
        assertDeepSeekV41BetaWindowV1();
        physicalCalls += 1;
        const response = await worker.send({ workerRef: attached.workerRef, ...request });
        transportObservation = seal({ status: response.status,
          requestedModel: response.transportReceipt.requestedModel,
          reportedModel: response.payload?.model ?? null,
          transportReceipt: response.transportReceipt,
          payloadHash: hash(response.payload), trainingTruth: false });
        return response;
      } });
      result = await adapter.probeCapability({ egressBinding: binding, outputContract: contract, providerRequest,
        expiresAt: new Date(Math.min(Date.now() + 24 * 60 * 60 * 1000, Date.parse(localStop))).toISOString() });
      if (!result.ok) throw Object.assign(new Error(result.errorCode), { code: result.errorCode, safeReceipt: result.safeReceipt });
      result = { ...result, transportObservation };
      store.settle(attemptId, { usage: result.usage, costMicros: estimate(result.usage), response: result });
    }
    if (result.transportObservation?.requestedModel !== profile.model
      || result.transportObservation?.reportedModel !== profile.model) fail('BETA_CANARY_MODEL_IDENTITY_MISMATCH');
    if (result.usage.totalUnits > cap.maxTokens || estimate(result.usage) > cap.maxCostMicros) fail('BETA_CANARY_BUDGET_EXCEEDED');
    await writeFile(path.join(out, 'capability-receipt.json'), JSON.stringify(result.capabilityReceipt, null, 2) + '\n');
  } catch (error) {
    failure = { code: safeCode(error), status: error.safeReceipt?.status ?? null };
    if (store.summary().attempts.some(row => row.id === attemptId && row.state === 'intent')) {
      const safe = error.safeReceipt || null;
      const known = safe?.usageKnown ? safe.usage : null;
      store.settle(attemptId, { usage: known, costMicros: known ? estimate(known) : null,
        failureReceipt: safe, code: failure.status === 402 ? 'PROVIDER_PAYMENT_REQUIRED' : failure.code,
        definitelyNotSent: physicalCalls === 0 || safe?.requestDefinitelyNotSent === true });
    }
  } finally {
    if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'v41_beta_probe_finished' }).catch(() => {});
    await worker?.close().catch(() => {});
  }
  const ledger = store.summary();
  const report = seal({ version: 'ticket_18_deepseek_v41_beta_canary_report_v1', ticket: 18, slice: 174,
    runId, recipeHash: recipe.hash, model: profile.model, passed: failure === null && result?.ok === true,
    failure, physicalCalls, ledger, transportObservation: result?.transportObservation || transportObservation || null,
    capabilityReceiptHash: result?.capabilityReceipt?.receiptHash ?? null,
    automaticRetries: 0, silentFallback: false, formalSkillQueueChanged: false,
    sourceRefreshPerformed: false, semanticAcceptanceInherited: false, trainingTruth: false });
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  store.close();
  console.log(JSON.stringify({ runId, passed: report.passed, model: profile.model, failure, physicalCalls,
    tokens: ledger.knownTokens, estimatedCny: ledger.reservedOrSettledMicros / 1e6, reportHash: report.hash }));
  if (failure) process.exitCode = 1;
}
