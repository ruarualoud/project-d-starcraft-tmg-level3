import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seal, hash, fail, verifySeal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { BUILD, ROOT, DB_PATH, verifyPreviousReadiness, ledgerSnapshot, assertLedgerReady,
  capabilityProbeSamples, providerRegistry, attachProvider, priceUsage, safeCode, codeHashes } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('STRATEGY_PROBE_ARGUMENTS_INVALID');
const readiness = await verifyPreviousReadiness();
const samples = capabilityProbeSamples();
const { binding } = providerRegistry();
const limits = { maxCalls: 4, maxTokens: 40000, maxCostMicros: 100000, maxOutputUnits: 512 };
const files = ['scripts/run-ticket-18-strategy-capability-canary-v1.mjs', 'scripts/support/strategy-live-production-support-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v1.mjs', 'packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs',
  'packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs', 'packages/secure-provider-runtime/provider-pricing-v1.mjs'];
const recipe = seal({ schema: 'ticket18_strategy_capability_recipe_v1', readinessHash: readiness.hash,
  outputContractRefs: samples.map(s => s.outputContractRef), samplesHash: hash(samples),
  providerProfileRef: binding.providerProfileRef, limits, codeHashes: await codeHashes(files),
  automaticRetries: 0, sourceRefreshPerformed: false, trainingTruth: false });
const ledgerBefore = ledgerSnapshot(); assertLedgerReady(ledgerBefore, limits.maxCostMicros);
const runId = `strategy-probe-${recipe.hash.slice(0, 32)}`;
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, runId, probes: samples.length, maximumCny: 0.1,
    cumulativeCny: ledgerBefore.cumulativeEstimateMicros / 1e6, providerCalls: 0 }));
  process.exit(0);
}
const out = path.join(BUILD, runId); await mkdir(out, { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
await save('recipe', recipe);
const store = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash, ...limits });
let port = null, failure = null; const receipts = [];
try {
  for (const sample of samples) {
    const roleRef = { id: `strategy.capability.${sample.kind}`, version: '1.0.0', hash: hash(sample) };
    const request = { schemaVersion: STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
      requestId: `strategy-probe-${hash({ recipe: recipe.hash, kind: sample.kind }).slice(0, 40)}`, roleRef,
      instructions: 'Tiny format capability probe, NOT game advice or evaluation. Return exactly the supplied synthetic JSON object under the required schema. No markdown or extra fields.',
      input: JSON.stringify(sample.sample), outputContractRef: sample.outputContractRef, maxOutputUnits: 512 };
    const reservation = store.reserve(request.requestId, request, 25000, 10000);
    if (reservation.failed) fail(reservation.code);
    let result = reservation.response;
    if (!reservation.cached) {
      let reachedProvider = false;
      try {
        port ||= await attachProvider();
        reachedProvider = true;
        result = await port.adapter.probeCapability({ egressBinding: binding, outputContract: sample.contract,
          providerRequest: request, expiresAt: new Date(Date.now() + 24 * 3600000).toISOString() });
        if (!result.ok) throw Object.assign(new Error(result.errorCode), { code: result.errorCode, safeReceipt: result.safeReceipt });
        store.settle(request.requestId, { response: result, usage: result.usage,
          costMicros: priceUsage(result.usage, { startedAt: result.capabilityReceipt.probedAt }) });
      } catch (error) {
        const receipt = error.safeReceipt || null, usage = receipt?.usageKnown ? receipt.usage : null;
        if (store.summary().attempts.some(a => a.id === request.requestId && a.state === 'intent')) {
          store.settle(request.requestId, { usage, costMicros: usage ? priceUsage(usage, { startedAt: new Date().toISOString() }) : null,
            code: safeCode(error), failureReceipt: receipt, definitelyNotSent: !reachedProvider || receipt?.requestDefinitelyNotSent === true });
        }
        throw error;
      }
    }
    if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: result.capabilityReceipt,
      providerProfileRef: binding.providerProfileRef, endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect,
      model: binding.model, capability: 'responses_json_schema', outputContractRef: sample.outputContractRef, now: new Date().toISOString() }).ok) {
      fail('STRATEGY_CAPABILITY_NOT_CURRENT');
    }
    const value = { kind: sample.kind, capabilityReceipt: result.capabilityReceipt };
    receipts.push(value); await save(sample.kind + '-capability', seal(value));
    console.log(JSON.stringify({ event: 'probe', kind: sample.kind, passed: true, cached: reservation.cached,
      tokens: result.usage.totalUnits, totalRunCny: store.summary().reservedOrSettledMicros / 1e6 }));
  }
} catch (error) { failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) }; }
finally { await port?.close(); }
const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_strategy_capability_report_v1', ticket: 18, slice: 174, runId,
  recipeHash: recipe.hash, passed: !failure && receipts.length === 4, receipts, failure, ledger, cumulative,
  semanticAcceptanceInherited: false, sourceRefreshPerformed: false, trainingTruth: false });
await save('report', report);
if (report.passed) await writeFile(path.join(BUILD, 'capabilities.json'), JSON.stringify(report, null, 2));
store.close();
console.log(JSON.stringify({ event: 'report', runId, passed: report.passed, probes: receipts.length, failure,
  tokens: ledger.knownTokens, runCny: ledger.reservedOrSettledMicros / 1e6,
  cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
