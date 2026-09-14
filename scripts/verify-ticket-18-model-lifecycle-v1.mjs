import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1 as binding, selectFactionExecutionModelV1,
  observeFactionModelUnavailableV1 } from '../packages/skill-production-v3/faction-model-lifecycle-v1.mjs';
import { factionProfileRefV1, factionExecutionProfileV1, FACTION_EXECUTION_MODEL_BINDING_V1 as oldBinding }
  from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as oldBase } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as oldCapacity } from '../content/skill-generation/offline-provider-profile-v2.mjs';

let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, { code }); checks++; };
const reseal = ({ hash: ignored, ...body }, patch) => seal({ ...body, ...patch });
const files = ['packages/skill-production-v3/faction-model-lifecycle-v1.mjs',
  'packages/skill-production-v3/faction-execution-model-v1.mjs', 'scripts/verify-ticket-18-model-lifecycle-v1.mjs'];
const snapshot = () => Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const before = await snapshot();
for (const legacy of [oldBase, oldCapacity]) {
  const args = { selectedBinding: binding, legacyProfileRef: factionProfileRefV1(legacy), now: '2026-09-09T03:00:00.000Z' };
  const preferred = selectFactionExecutionModelV1(args);
  eq(preferred.profile.model, binding.preferredModel);
  eq(preferred.profile.outputBudget, legacy.outputBudget);
  eq(selectFactionExecutionModelV1({ ...args, priorDecision: preferred.decision }).decision.hash, preferred.decision.hash);
  const expired = selectFactionExecutionModelV1({ ...args, now: binding.localStop, priorDecision: preferred.decision });
  eq(expired.profile.integrity.hash, legacy.integrity.hash);
  eq(expired.decision.reason, 'local_beta_window_closed');
  eq(selectFactionExecutionModelV1({ ...args, now: '2026-09-11T00:00:00.000Z', priorDecision: expired.decision }).decision.hash, expired.decision.hash);
  eq(expired.decision.fallbackTransitions, 1);
  eq(factionExecutionProfileV1({ legacyProfileRef: factionProfileRefV1(legacy) }).integrity.hash, legacy.integrity.hash);
  rejects(() => selectFactionExecutionModelV1({ ...args, now: 'bad' }), 'FACTION_MODEL_LIFECYCLE_CLOCK_INVALID');
  rejects(() => selectFactionExecutionModelV1({ ...args, priorDecision: expired.decision }), 'FACTION_MODEL_LIFECYCLE_CLOCK_ROLLBACK');
  rejects(() => selectFactionExecutionModelV1({ ...args, modalities: ['text', 'image'] }), 'FACTION_MODEL_LIFECYCLE_MODALITY_UNSUPPORTED');
  rejects(() => selectFactionExecutionModelV1({ ...args, selectedBinding: oldBinding }), 'FACTION_MODEL_LIFECYCLE_BINDING_INVALID');
}
const args = { selectedBinding: binding, legacyProfileRef: factionProfileRefV1(oldBase), now: '2026-09-09T03:00:00.000Z' };
const observationArgs = { runId: 'fixture-retirement', requestId: 'fixture-retirement-request',
  model: binding.preferredModel, endpointPath: '/responses', transport: { delivery: 'response_received',
    status: 404, physicalAttempts: 1, payload: { error: { code: 'model_not_found', param: 'model', message: 'fixture only' } } } };
const observation = observeFactionModelUnavailableV1(observationArgs);
eq(observation.selfAuthenticating, false);
eq(observation.disposition, 'http_rejected_unknown_usage_reserve_retained');
const authenticate = value => { eq(value.hash, observation.hash); return observeFactionModelUnavailableV1(observationArgs); };
const fallbackArgs = { ...args, unavailable: observation, authenticateUnavailable: authenticate };
const fallback = selectFactionExecutionModelV1(fallbackArgs);
eq(fallback.profile.model, 'deepseek-v4-flash');
eq(fallback.decision.reason, 'authenticated_model_unavailable_response');
eq(selectFactionExecutionModelV1({ ...fallbackArgs, priorDecision: fallback.decision }).decision.hash, fallback.decision.hash);
rejects(() => selectFactionExecutionModelV1({ ...args, unavailable: observation }), 'FACTION_MODEL_LIFECYCLE_EVIDENCE_REQUIRED');
rejects(() => selectFactionExecutionModelV1({ ...args, priorDecision: fallback.decision }), 'FACTION_MODEL_LIFECYCLE_EVIDENCE_REQUIRED');
rejects(() => selectFactionExecutionModelV1({ ...fallbackArgs, authenticateUnavailable: () => null }), 'FACTION_MODEL_LIFECYCLE_EVIDENCE_DRIFT');
rejects(() => selectFactionExecutionModelV1({ ...args, priorDecision: reseal(fallback.decision, { model: 'wrong' }) }), 'FACTION_MODEL_LIFECYCLE_DECISION_DRIFT');
for (const status of [200, 401, 402, 403, 422, 429, 500, 503])
  eq(observeFactionModelUnavailableV1({ ...observationArgs, transport: { ...observationArgs.transport, status } }), null);
for (const patch of [{ delivery: 'unknown' }, { physicalAttempts: 2 }, { payload: '<html>404 Forbidden</html>' },
  { payload: { error: { code: 'invalid_request_error', message: 'model not found' } } },
  { payload: { error: { code: 'model_not_found', param: 'response_format' } } },
  { payload: { ...observationArgs.transport.payload, output: [] } },
  { payload: { ...observationArgs.transport.payload, choices: [] } },
  { payload: { ...observationArgs.transport.payload, usage: { input_tokens: 1 } } }])
  eq(observeFactionModelUnavailableV1({ ...observationArgs, transport: { ...observationArgs.transport, ...patch } }), null);
eq(oldBinding.silentFallback, false);
eq(oldBinding.ambiguousDeliveryRemainsIsolated, true);
eq(await snapshot(), before);
const report = seal({ version: 'faction_model_lifecycle_component_v1', passed: true, checks,
  bindingHash: binding.hash, originalExecutionBindingUnchanged: true,
  bothOutputCapacitiesCovered: true, oldProfileIdentitiesPreserved: true,
  unknownDeliveryNotClassifiedAsRetirement: true, sourceErrorObservationFixtureOnly: true,
  providerRetirementObservedInProduction: false, productionEntrypointWired: false,
  providerCalls: 0, actualDshSessions: 0, codeHashes: before, trainingTruth: false });
await writeFile('build/ticket-18-faction-production-v1/model-lifecycle-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, productionEntrypointWired: false, hash: report.hash }));
