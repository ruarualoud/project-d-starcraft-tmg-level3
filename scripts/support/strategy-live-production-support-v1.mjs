import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, hash, seal, sha256, verifySeal } from '../../packages/skill-production/common.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from '../../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from '../../packages/secure-provider-runtime/provider-pricing-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStrategyRoleContractsV1 } from '../../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DB_PATH = path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite');
export const BUILD = path.join(ROOT, 'build/ticket-18-general-strategy-live-v1');
export const HISTORY_TOKENS = 2_864_424, HISTORY_MICROS = 5_052_393 + 28_961_350;
export const json = async relative => verifySeal(JSON.parse(await readFile(path.join(ROOT, relative), 'utf8')));
export const safeCode = error => /^[A-Z0-9_.:-]{3,160}$/u.test(String(error?.code || '')) ? error.code : 'STRATEGY_LIVE_RUN_FAILED';
export async function codeHashes(files) {
  return Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
}
export async function verifyPreviousReadiness() {
  const receipt = await json('build/ticket-18-strategy-preexecution-v1/unified-readiness.json');
  if (!receipt.passed || receipt.results.length !== 9 || receipt.providerCalls !== 0) fail('STRATEGY_PREEXECUTION_NOT_PASSED');
  for (const row of receipt.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) {
    fail('STRATEGY_PREEXECUTION_CODE_DRIFT', { file: row.file });
  }
  return receipt;
}
export function ledgerSnapshot() {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const rows = db.prepare('SELECT run,id,state,settled,reserve,usage,code FROM attempts ORDER BY run,id').all();
    const decodeUsage = raw => raw ? verifySeal(JSON.parse(raw)).value : null;
    return seal({ attempts: rows.length, intentCount: rows.filter(a => a.state === 'intent').length,
      paymentRequiredCount: rows.filter(a => a.code === 'PROVIDER_PAYMENT_REQUIRED').length,
      cumulativeTokens: HISTORY_TOKENS + rows.reduce((n, a) => n + (decodeUsage(a.usage)?.totalUnits || 0), 0),
      cumulativeEstimateMicros: HISTORY_MICROS + rows.reduce((n, a) => n + (a.settled ?? a.reserve), 0),
      ledgerHash: hash(rows), invoice: false });
  } finally { db.close(); }
}
export function assertLedgerReady(ledger, additionalMicros) {
  if (ledger.paymentRequiredCount) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (ledger.intentCount) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  if (ledger.cumulativeEstimateMicros + additionalMicros >= 100_000_000) fail('CNY_100_NOTIFICATION_REQUIRED');
}
export function priceUsage(usage, receipt = {}) {
  try {
    const price = priceStarcraftTmgDeepSeekV4FlashUsageV1({ providerId: 'deepseek-openai-compatible-direct',
      requestedModel: receipt.requestedModel || profile.model, reportedModel: receipt.reportedModel || profile.model,
      startedAt: receipt.startedAt, usage });
    return Math.ceil(price.calculatedCostNanoUsd * 8 / 1000);
  } catch {
    // Same deliberately conservative legacy accounting fallback; no claim of invoice equivalence.
    return Math.ceil((usage.inputUnits * 440 + usage.outputUnits * 1320) * 8 / 1000);
  }
}
export function providerRegistry() {
  const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  const binding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash } }).egressBinding;
  return { registry, binding };
}
export async function attachProvider({ beforeSend = () => {}, captureWire = null } = {}) {
  const { registry, binding } = providerRegistry();
  const worker = createStarcraftTmgStructuredProviderWorkerPortV1({ providerProfileRegistry: registry });
  let attached;
  try {
    const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    try { attached = await worker.attachCredential({ attachmentId: `strategy-${randomUUID()}`,
      providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
    finally { ingress.credentialBytes.fill(0); }
    if (!attached?.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  } catch (error) { await worker.close().catch(() => {}); throw error; }
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ maxProbeOutputUnits: 512,
    send: async request => {
      beforeSend();
      const startedAt = new Date().toISOString();
      const response = await worker.send({ workerRef: attached.workerRef, ...request });
      if (captureWire) await captureWire({ request, response, startedAt });
      return response;
    } });
  return { binding, adapter, close: async () => {
    await worker.detachCredential({ workerRef: attached.workerRef, reason: 'strategy_generation_finished' }).catch(() => {});
    await worker.close().catch(() => {});
  } };
}
export function capabilityProbeSamples() {
  const policy = { axis: 'objective_plan', title: 'probe', when: ['a'], objective: 'b', decisionProcedure: ['c'],
    alternatives: [{ option: 'a', preferWhen: 'b' }, { option: 'c', preferWhen: 'd' }],
    opponentBranches: [{ response: 'a', adaptation: 'b' }], risk: 'unproven', reviseIf: ['a'],
    requiredQueries: ['legal_space'], ruleRefs: [], caseIds: [] };
  const values = {
    notes: { observations: [{ claim: 'synthetic', ruleRefs: [] }], questions: ['what?'], unproven: ['synthetic'] },
    policy: { policy }, review: { findings: [], limitations: ['synthetic'] },
    decision: { candidateId: 'a', comparisons: [{ candidateId: 'a', tradeoff: 'x' }, { candidateId: 'b', tradeoff: 'y' }],
      opponentResponse: 'x', reviseIf: 'y' },
  };
  return Object.entries(createStrategyRoleContractsV1()).map(([kind, contract]) => {
    if (!validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, values[kind]).ok) fail('STRATEGY_PROBE_SAMPLE_INVALID');
    return { kind, contract, outputContractRef: outputContractRefStarcraftTmgV1(contract), sample: values[kind] };
  });
}
