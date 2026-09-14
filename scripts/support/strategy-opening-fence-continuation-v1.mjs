import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../../packages/skill-production/common.mjs';
import { createStrategyRoleContractsV1 } from '../../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';

export const PARENT_RUN = 'general-strategy-3705e4aa46ecd74a7826207a67b5b096';
export const FAILED_ATTEMPT = 'structured-8a9faae5f0182ee08476466092f37161a586a2e71730e8ab';
export const FAILED_ROLE = 'strategy-role.fe6821014238d6292526dbb61348e3029ddfac2fb8da20ec';
const FIELDS = ['inputHash', 'axis', 'stage', 'round', 'kind', 'payloadHash', 'contractHash', 'executionPolicyHash', 'capabilityReceiptHash'];

// Read-only re-decoding of ONE bound, already billed response. The original
// quarantine and attempt remain immutable; continuation uses an explicit alias.
export async function prepareOpeningFenceContinuationV1({ databasePath, input, binding, capabilities, wire }) {
  verifySeal(input); verifySeal(wire); verifySeal(capabilities);
  const db = new DatabaseSync(databasePath, { readOnly: true });
  const decode = value => verifySeal(JSON.parse(value)).value;
  let row, failed, quarantine;
  try {
    row = db.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(PARENT_RUN, FAILED_ROLE);
    failed = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(PARENT_RUN, FAILED_ATTEMPT);
    quarantine = decode(row.artifact);
  } finally { db.close(); }
  verifySeal(quarantine);
  if (quarantine.schema !== 'strategy_role_quarantine_v1' || quarantine.inputHash !== input.hash
    || quarantine.kind !== 'review' || quarantine.stage !== 'source-review' || quarantine.round !== 0
    || row.state !== 'complete' || failed.state !== 'failed' || !failed.usage
    || failed.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') fail('STRATEGY_RECOVERY_PARENT_INVALID');
  const body = Object.fromEntries(FIELDS.map(k => [k, quarantine[k]]));
  if (hash(body) !== row.input_hash || hash(wire.request.body.input) !== body.payloadHash) fail('STRATEGY_RECOVERY_CONTEXT_DRIFT');
  const contract = createStrategyRoleContractsV1().review;
  const capabilityReceipt = capabilities.receipts.find(r => r.kind === 'review').capabilityReceipt;
  if (contract.contractHash !== body.contractHash || capabilityReceipt.receiptHash !== body.capabilityReceiptHash) fail('STRATEGY_RECOVERY_CONTRACT_DRIFT');
  const providerRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: FAILED_ATTEMPT, roleRef: { id: FAILED_ROLE, version: '1.0.0', hash: hash(body) },
    instructions: wire.request.body.instructions, input: wire.request.body.input,
    outputContractRef: wire.request.outputContractRef, maxOutputUnits: wire.request.body.max_output_tokens };
  if (hash(providerRequest) !== failed.request_hash) fail('STRATEGY_RECOVERY_REQUEST_DRIFT');
  let localReads = 0, reproducedFailure = null;
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    now: () => wire.startedAt,
    send: async request => {
      localReads++;
      const { signal, ...safeRequest } = request;
      if (hash(safeRequest) !== hash(wire.request)) fail('STRATEGY_RECOVERY_WIRE_DRIFT');
      return wire.response; // Recorded transport response, never a new network call.
    } });
  const args = { egressBinding: binding, capabilityReceipt, outputContract: contract, providerRequest };
  try { await adapter.complete(args); } catch (error) { reproducedFailure = error; }
  if (!reproducedFailure || reproducedFailure.safeReceipt?.receiptHash !== decode(failed.response).receiptHash) fail('STRATEGY_RECOVERY_FAILURE_NOT_REPRODUCED');
  const recovered = await withOpeningFenceRecoveryV1({ adapter, readWire: async () => wire }).complete(args);
  const refs = new Set(input.workspace.fullFrozenSources.sources.map(s => s.ref));
  if (recovered.output.findings.some(f => f.ruleRefs.some(r => !refs.has(r)))) fail('STRATEGY_SOURCE_REF_INVALID');
  const recovery = seal({ schema: 'strategy_opening_fence_continuation_v1', parentRun: PARENT_RUN,
    parentQuarantineHash: quarantine.hash, parentAttempt: FAILED_ATTEMPT, parentRequestHash: failed.request_hash,
    parentRoleKey: FAILED_ROLE, roleInputHash: row.input_hash, originalWireHash: wire.hash,
    response: recovered, localRecordedResponseReads: localReads, additionalProviderCalls: 0,
    billingPreserved: true, negativeFindingsPreserved: recovered.output.findings.length,
    sourceReviewIndependentlyVerified: false, runtimeAccepted: false, trainingTruth: false });
  const artifact = seal({ schema: 'strategy_role_artifact_v1', ...body, value: recovered.output,
    structuredCandidateRef: { id: FAILED_ROLE + '.opening-fence-v1', hash: hash(recovered.output) },
    receiptRef: { hash: recovered.usageReceipt.receiptHash }, recoveryRef: recovery.hash,
    runtimeAccepted: false, trainingTruth: false });
  return { recovery, artifact, body };
}

export function withStrategyOpeningFenceContinuationV1(store, prepared) {
  const { recovery, artifact, body } = prepared;
  verifySeal(recovery); verifySeal(artifact);
  return { ...store, acquire(id, actualInput, ...rest) {
    if (id !== FAILED_ROLE) return store.acquire(id, actualInput, ...rest);
    if (hash(actualInput) !== hash(body) || hash(body) !== recovery.roleInputHash) fail('STRATEGY_RECOVERY_CONTEXT_DRIFT');
    const parent = store.acquire(id, actualInput, ...rest);
    if (!parent.cached || parent.artifact.hash !== recovery.parentQuarantineHash) fail('STRATEGY_RECOVERY_PARENT_INVALID');
    const lease = store.acquire(id + '.opening-fence-v1', { recoveryHash: recovery.hash });
    const value = lease.cached ? lease.artifact : store.finish(lease, artifact);
    if (value.hash !== artifact.hash) fail('STRATEGY_RECOVERY_ARTIFACT_DRIFT');
    return { cached: true, artifact: value };
  } };
}
