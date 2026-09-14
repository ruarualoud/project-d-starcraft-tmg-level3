import { fail, seal, hash } from '../skill-production/common.mjs';
import { outputContractRefStarcraftTmgV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION } from '../structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { PRODUCTION_FAILURE_ROUTING_BINDING_V1 } from '../skill-production/production-failure-routing-v1.mjs';

export async function renewFactionCapabilityV1({ store, adapter, binding,
  contract, prior, priceUsage, probeSample, bindingScopedIdentity = false, probeMaxOutputUnits = 512,
  now = () => new Date().toISOString() }) {
  if (probeMaxOutputUnits !== 512 || bindingScopedIdentity && binding.maxOutputUnits !== 8192)
    fail('FACTION_CAPABILITY_PROBE_CAPACITY_INVALID');
  const outputContractRef = outputContractRefStarcraftTmgV1(contract);
  const current = receipt => verifyStarcraftTmgProviderCapabilityCurrentV1({
    receipt, providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect,
    model: binding.model, capability: 'responses_json_schema', outputContractRef, now: now() }).ok;
  if (current(prior)) return prior;
  const identity = { prior: prior.receiptHash, outputContractRef,
    ...(bindingScopedIdentity ? { egressBindingHash: hash(binding), maxOutputUnits: probeMaxOutputUnits } : {}) };
  const id = 'capability-renewal.' + hash(identity).slice(0, 40);
  const saved = store.artifact(id);
  if (saved) {
    if (!current(saved)) fail('FACTION_RENEWED_CAPABILITY_EXPIRED');
    return saved;
  }
  const review = contract.id === 'starcraft-tmg.faction-target-review';
  const sample = probeSample ?? (contract.id === 'starcraft-tmg.faction-teach'
    ? { lesson: ['Synthetic capability probe only'], uncertainties: ['Not game facts'] }
    : review ? { verdicts: [{ targetSlot: 0,
    focus: [{ path: 'risk', quote: 'synthetic review quote' }], verdict: 'uncertain',
    reason: 'Synthetic probe only', sourceSlots: [0] }], coverage: [] }
    : { title: 'probe', when: ['synthetic'], procedure: ['synthetic'],
      alternatives: ['synthetic'], risk: 'synthetic', reviseIf: ['synthetic'],
      sourceRefs: ['synthetic'], unproven: ['synthetic'] });
  const request = { schemaVersion: STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
    requestId: id, roleRef: { id, version: 'v1', hash: hash(id) },
    instructions: 'Capability renewal only. Return the supplied synthetic object exactly, following the JSON Schema.',
    input: JSON.stringify(sample), outputContractRef, maxOutputUnits: probeMaxOutputUnits };
  const reserved = store.reserve(id, request, 100000, 50000);
  if (reserved.failed) fail(reserved.code);
  let result = reserved.response;
  if (!reserved.cached) {
    try {
      result = await adapter.probeCapability({ egressBinding: binding,
        outputContract: contract, providerRequest: request,
        expiresAt: new Date(Date.parse(now()) + 6 * 86400000).toISOString() });
      if (!result.ok) throw Object.assign(new Error(result.errorCode),
        { code: result.errorCode, safeReceipt: result.safeReceipt });
      store.settle(id, { usage: result.usage,
        costMicros: priceUsage(result.usage, { startedAt: result.capabilityReceipt.probedAt }), response: result });
    } catch (error) {
      const safe = error.safeReceipt;
      const usage = safe?.usageKnown ? safe.usage : null;
      store.settle(id, { usage, costMicros: usage ? priceUsage(usage) : null,
        failureReceipt: safe || null, code: error.code || 'FACTION_CAPABILITY_RENEWAL_FAILED',
        definitelyNotSent: safe?.requestDefinitelyNotSent === true });
      throw error;
    }
  }
  if (!current(result.capabilityReceipt)) fail('FACTION_CAPABILITY_RENEWAL_INVALID');
  const lease = store.acquire(id, { priorHash: prior.receiptHash, outputContractRef,
    ...(bindingScopedIdentity ? { egressBindingHash: hash(binding), maxOutputUnits: probeMaxOutputUnits } : {}) });
  if (!lease.cached) store.finish(lease, result.capabilityReceipt);
  return result.capabilityReceipt;
}

export const FACTION_PARALLEL_BINDING_V1 = seal({
  version: 'faction_parallel_v1', maximumLanes: 2,
  workers: 'dedicated_legacy_and_structured_provider_processes_per_faction',
  dsh: 'isolated_session_per_role',
  journal: 'one_coordinator_transactional_reservations_and_faction_scoped_roles',
  failures: 'settle_all_lanes_preserve_independent_success_stop_new_calls_on_global_failure',
  sourceRefreshPerformed: false, trainingTruth: false,
});

const GLOBAL_FAILURE = /^(API_BALANCE_EXHAUSTED_STOP_ALL_WORK|PROVIDER_PAYMENT_REQUIRED|PRODUCTION_BUDGET_EXHAUSTED|FACTION_RUN_WALL_EXHAUSTED|AMBIGUOUS_EGRESS_NO_RETRY)$/u;

// Only the coordinator owns the SQLite connection. All physical requests
// reserve synchronously before awaiting their dedicated Provider process.
export function createFactionParallelControlV1(store, { failureRouter = null } = {}) {
  if (failureRouter && (failureRouter.binding?.hash !== PRODUCTION_FAILURE_ROUTING_BINDING_V1.hash
    || typeof failureRouter.route !== 'function')) fail('FACTION_FAILURE_ROUTER_BINDING_INVALID');
  let stopped = null;
  function noteFailure(error) {
    if (!failureRouter) {
      if (GLOBAL_FAILURE.test(error?.code || '')) stopped ||= error;
      return;
    }
    const route = failureRouter.route(error);
    if (['global', 'run', 'provider'].includes(route.scope)) stopped ||= error;
  }
  function assertActive() { if (stopped) throw stopped; }
  const controlledStore = Object.freeze({ ...store,
    reserve(...args) {
      assertActive();
      try { return store.reserve(...args); }
      catch (error) { noteFailure(error); throw error; }
    },
    settle(id, outcome) {
      const result = store.settle(id, outcome);
      if (outcome?.code === 'PROVIDER_PAYMENT_REQUIRED') {
        noteFailure(Object.assign(new Error('Provider balance exhausted'),
          { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }));
      }
      return result;
    },
  });
  return { store: controlledStore, noteFailure, assertActive,
    get stoppedCode() { return stopped?.code || null; } };
}

export function bindFactionLaneRuntimeV1(runtime, input) {
  const packetId = 'faction.' + input.factionRecordKey.split(':')[1];
  return Object.freeze({ ...runtime, async role(request) {
    if (request.packet?.id !== packetId
      || request.packet?.inputHash !== input.hash
      || request.workspace?.inputHash && request.workspace.inputHash !== input.hash) {
      fail('FACTION_PARALLEL_LANE_SCOPE_INVALID');
    }
    return runtime.role(request);
  } });
}

export async function runFactionLanesV1({ inputs, runLane, control,
  onProgress = () => {}, failureRouter = null }) {
  if (inputs.length !== 2 || new Set(inputs.map(i => i.factionRecordKey)).size !== 2) {
    fail('FACTION_PARALLEL_INPUT_INVALID');
  }
  if (failureRouter && (failureRouter.binding?.hash !== PRODUCTION_FAILURE_ROUTING_BINDING_V1.hash
    || typeof failureRouter.route !== 'function')) fail('FACTION_FAILURE_ROUTER_BINDING_INVALID');
  let active = 0, peak = 0;
  const results = await Promise.allSettled(inputs.map(async (input, index) => {
    control.assertActive(); active++; peak = Math.max(peak, active);
    const faction = input.factionRecordKey;
    onProgress({ faction, stage: 'lane_started', active });
    try { return await runLane(input, index); }
    catch (error) {
      control.noteFailure(error);
      const candidate = error?.code || error?.message || '';
      const code = /^[A-Z0-9_]{3,100}$/u.test(candidate) ? candidate : 'FACTION_LANE_FAILURE';
      const diagnostic = { code, messageHash: hash(String(error?.message || '')),
        errorType: ['Error', 'TypeError', 'RangeError'].includes(error?.name) ? error.name : 'Error' };
      if (failureRouter) {
        diagnostic.failureRouting = failureRouter.route(error);
        if (diagnostic.failureRouting.class === 'payment_exhausted')
          control.noteFailure(Object.assign(new Error('Provider balance exhausted'), { code: 'PROVIDER_PAYMENT_REQUIRED' }));
      }
      onProgress({ faction, stage: 'lane_failed', ...diagnostic });
      throw Object.assign(new Error(code), { code, diagnostic });
    }
    finally { active--; onProgress({ faction, stage: 'lane_settled', active }); }
  }));
  return { results, receipt: seal({ version: failureRouter ? 'faction_parallel_execution_v2' : 'faction_parallel_execution_v1',
    bindingHash: FACTION_PARALLEL_BINDING_V1.hash,
    ...(failureRouter ? { failureRoutingBindingHash: failureRouter.binding.hash } : {}),
    maximumConcurrentLanes: peak, pendingLanes: active,
    lanes: results.map((result, i) => ({ faction: inputs[i].factionRecordKey,
      status: result.status,
      ...(result.status === 'fulfilled' ? { resultHash: hash(result.value) }
        : { failureCode: result.reason?.code || 'FACTION_LANE_FAILURE',
          ...(failureRouter ? { failureRouting: result.reason?.diagnostic?.failureRouting || null } : {}) }) })),
    stoppedCode: control.stoppedCode, trainingTruth: false }) };
}
