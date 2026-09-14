import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { openProductionStore } from '../skill-production/store.mjs';
import { createStructuredFieldCodecV1, STRUCTURED_FIELD_CODEC_BINDING_V1 } from '../structured-generation/field-codec-v1.mjs';
import { createStarcraftTmgContextCapsuleV1, createStarcraftTmgContextCapsuleRegistryV1,
  contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1, outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgStructuredDshModelBridgeV1 } from '../structured-generation/dsh-command-mapper-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../structured-generation/failure-classifier-v2.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { createFactionFieldRepairTaskV1 } from './faction-field-repair-task-v1.mjs';
import { verifyFactionNativeSlotSchemaFailureV1, materializeFactionSlotReviewV1 }
  from './faction-review-slot-namespace-v1.mjs';
import { factionProviderModelIdentityMatchesV1 }
  from './faction-execution-model-v1.mjs';
import { prepareFactionFieldValueAmbiguousReplacementV1 }
  from './faction-field-value-ambiguous-replacement-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as originalContract,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

export const FACTION_FIELD_VALUE_BINDING_V1 = seal({ version: 'faction_field_value_review_v1',
  codecBindingHash: STRUCTURED_FIELD_CODEC_BINDING_V1.hash, maximumNewValueAttempts: 3,
  familyIdentity: 'original_paid_owner_request_and_complete_context_independent_of_run_model_or_capability',
  executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
    encryptedRawQuarantineAvailable: false },
  feedback: 'complete_context_plus_previous_small_value_and_actual_validator_issues',
  originalProviderFailurePreserved: true, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
const binding = FACTION_FIELD_VALUE_BINDING_V1, policy = binding.executionPolicy;
const policyRef = { id: 'policy.faction-field-values.production', version: 'v1', hash: hash(policy) };
const decode = raw => raw == null ? null : verifySeal(JSON.parse(raw)).value;
const originalCodec = createStructuredFieldCodecV1(originalContract);
const zeroUsage = { inputUnits: 0, outputUnits: 0, totalUnits: 0 };
const noTools = { execute: () => fail('FACTION_FIELD_VALUE_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] };
// Journal only public wire settings. The full egress binding also describes
// the secret-attachment boundary and is not a portable artifact.
const portableWire = e => Object.fromEntries(['providerProfileRef', 'endpoint', 'endpointDialect',
  'model', 'temperature', 'topP', 'maxOutputUnits'].map(key => [key, e[key]]));

// Dispatch compatibility is defined by request-affecting wire fields. Older
// choices may retain a full-policy egress hash, while current replacement
// choices store the portable hash; both remain sealed historical evidence.
export function factionFieldValueDispatchWireMatchesV1({ dispatchChoice, egressBinding }) {
  verifySeal(dispatchChoice);
  return hash(dispatchChoice.wireBinding) === hash(portableWire(egressBinding));
}

const exactCoordinateSet = (rows, field, count) => Array.isArray(rows) && rows.length === count
  && new Set(rows.map(row => row?.[field])).size === count
  && rows.every(row => Number.isSafeInteger(row?.[field]) && row[field] >= 0 && row[field] < count);

// A field-value repair can replace omitted/invalid leaves, but it cannot add a
// missing verdict or coverage row. Classify that immutable shape before any
// field-only Provider request so a complete-context review repair owns it.
export function classifyFactionFieldValueRepairScopeV1({ providerOutput, targetCount, coverageCount }) {
  if (!providerOutput || !Number.isSafeInteger(targetCount) || targetCount < 0
    || !Number.isSafeInteger(coverageCount) || coverageCount < 0)
    throw new TypeError('Faction field-value repair scope is invalid');
  const reasonCode = !exactCoordinateSet(providerOutput.verdicts, 'targetSlot', targetCount)
    ? 'incomplete_target_slot_set'
    : !exactCoordinateSet(providerOutput.coverage, 'coverageSlot', coverageCount)
      ? 'incomplete_coverage_slot_set' : null;
  return seal({ version: 'faction_field_value_repair_scope_v1',
    route: reasonCode ? 'full_output' : 'field_values', reasonCode,
    targetCount, coverageCount,
    originalTargetSlots: Array.isArray(providerOutput.verdicts)
      ? providerOutput.verdicts.map(row => row?.targetSlot) : [],
    originalCoverageSlots: Array.isArray(providerOutput.coverage)
      ? providerOutput.coverage.map(row => row?.coverageSlot) : [],
    newFieldValueProviderCallsAllowed: reasonCode ? 0 : binding.maximumNewValueAttempts,
    semanticAcceptance: false, trainingTruth: false });
}

export function requireFactionFieldValueRepairScopeV1(options) {
  const repairScope = classifyFactionFieldValueRepairScopeV1(options);
  if (repairScope.route === 'full_output')
    fail('FACTION_FIELD_VALUE_FULL_OUTPUT_REQUIRED', { repairScope });
  return repairScope;
}

export function prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence }) {
  const originalProof = verifyFactionNativeSlotSchemaFailureV1({ ...prepared.mapping, input,
    capsule: prepared.capsule, reviewReasonMaximum: 16384, reviewSourceMaximum: 128, evidence: originalEvidence });
  const task = createFactionFieldRepairTaskV1({ capsule: prepared.capsule,
    rejectedCandidate: originalEvidence.rejected, contract: originalContract });
  const family = seal({ version: 'faction_field_value_family_v1', bindingHash: binding.hash,
    inputHash: input.hash, originalContextHash: prepared.capsule.hash, taskHash: task.hash,
    originalOwnerRunId: originalEvidence.attempt.run, originalAttemptId: originalEvidence.attempt.id,
    originalRequestHash: originalEvidence.attempt.request_hash,
    originalRejectedCandidateHash: originalEvidence.rejected.hash, originalProof,
    maximumNewValueAttempts: binding.maximumNewValueAttempts, trainingTruth: false });
  return { task, family };
}

function roundContext(task, round, feedback) {
  if (round === 0) {
    if (feedback) fail('FACTION_FIELD_VALUE_INITIAL_FEEDBACK_INVALID');
    return task.context;
  }
  verifySeal(feedback);
  if (feedback.taskHash !== task.hash || feedback.round !== round - 1 || !feedback.retryable)
    fail('FACTION_FIELD_VALUE_FEEDBACK_CHAIN_INVALID');
  const c = task.context, id = c.roleRef.id + '.correction.' + round;
  return createStarcraftTmgContextCapsuleV1({ kind: c.kind,
    roleRef: { id, version: 'field-values-v1', hash: hash(id + '.field-values-v1') }, outputContractRef: c.outputContractRef,
    immutableBase: c.immutableBase, section: c.section, dependencyGraph: c.dependencyGraph,
    sourceIndexRef: c.sourceIndexRef, expansionToolRef: c.expansionToolRef, omittedDomains: c.omittedDomains,
    protectedFields: c.protectedFields, localIssue: { ...c.localIssue, fieldValueFeedback: feedback },
    instructions: c.instructions + '\nThe previous small field-value response failed the supplied local validator. Correct those errors in fieldN values only; preserve supported content and do not reprint the full review. The complete original chapter and sources remain supplied.' });
}

function invocation(context, capability, continuationRef = null) {
  return { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation', roleRef: context.roleRef,
    contextManifestRef: contextManifestRefStarcraftTmgV1(context), outputContractRef: context.outputContractRef,
    executionPolicyRef: policyRef, continuationRef,
    contextPayloadHash: hash({ instructions: context.instructions, input: context.compiledInput }),
    capabilityReceiptHash: capability.receiptHash, trainingTruth: false };
}
function requestFor(context, cap, continuationRef = null) {
  return { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: 'structured-' + hash(invocation(context, cap, continuationRef)).slice(0, 48),
    roleRef: context.roleRef, instructions: context.instructions, input: context.compiledInput,
    outputContractRef: context.outputContractRef, maxOutputUnits: policy.maxOutputUnits };
}
function checkCapability(cap, context, egress, now) {
  if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: cap, providerProfileRef: egress.providerProfileRef,
    endpointPath: egress.endpoint.path, endpointDialect: egress.endpointDialect, model: egress.model,
    capability: 'responses_json_schema', outputContractRef: context.outputContractRef, now }).ok)
    fail('FACTION_FIELD_VALUE_CAPABILITY_REQUIRED');
}

function readPaid(db, choice, allowedRunIds) {
  const rows = db.prepare('SELECT * FROM attempts WHERE id=?').all(choice.request.requestId);
  if (rows.length !== 1 || !allowedRunIds.includes(rows[0].run) || rows[0].run !== choice.ownerRunId)
    fail('FACTION_FIELD_VALUE_PAID_OWNER_INVALID');
  const attempt = rows[0];
  if (attempt.code === 'PROVIDER_PAYMENT_REQUIRED') fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (attempt.state === 'intent') fail('AMBIGUOUS_EGRESS_NO_RETRY');
  const step = suffix => {
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(attempt.run, attempt.id + suffix);
    if (!row) fail('FACTION_FIELD_VALUE_PAID_ARTIFACT_MISSING');
    return verifySeal(decode(row.artifact));
  };
  const failed = attempt.state === 'failed' && attempt.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID';
  if (attempt.state !== 'received' && !failed) fail(attempt.code || 'FACTION_FIELD_VALUE_NON_REPAIRABLE_FAILURE');
  return { attempt, candidate: step(failed ? '.rejected-candidate' : '.candidate'),
    runtimeReceipt: step('.runtime-receipt'), issue: failed ? step('.issue') : null, failed };
}

export function readFactionFieldValuePaidEvidenceV1({ filename, choice, allowedRunIds }) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    return readPaid(db, choice, allowedRunIds);
  } finally { db.close(); }
}

// This consumer handles the actual new output contract, not the original V6
// contract or a relabeled failure. The caller supplies an actual owner reader.
function authenticatePaid({ paid, choice, context, contract }) {
  const { attempt, candidate, runtimeReceipt, failed, issue } = paid;
  const request = requestFor(context, choice.capability, choice.continuationRef || null);
  const inv = invocation(context, choice.capability, choice.continuationRef || null);
  const response = decode(attempt.response), receipt = failed ? response : response.usageReceipt;
  const { receiptHash, ...receiptBody } = receipt;
  const egress = choice.wireBinding, checked = validate(contract.providerSchema, candidate.providerValue);
  const usage = decode(attempt.usage);
  const choiceRequestHash = choice.request.requestHash || hash(choice.request);
  if (hash(receiptBody) !== receiptHash || attempt.id !== request.requestId || attempt.request_hash !== hash(request)
    || choiceRequestHash !== hash(request) || choice.contextHash !== context.hash || attempt.run !== choice.ownerRunId
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0 || !usage
    || failed && receipt.status !== 200 || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || receipt.capabilityReceiptHash !== choice.capability.receiptHash || hash(receipt.usage) !== hash(usage)
    || hash(receipt.outputContractRef) !== hash(context.outputContractRef)
    || hash(candidate.roleRef) !== hash(context.roleRef) || candidate.contextManifestRef.hash !== context.hash
    || hash(candidate.outputContractRef) !== hash(context.outputContractRef) || candidate.invocationHash !== hash(inv)
    || candidate.trainingTruth !== false || runtimeReceipt.trainingTruth !== false
    || runtimeReceipt.invocationHash !== hash(inv) || runtimeReceipt.attemptId !== attempt.id)
    fail('FACTION_FIELD_VALUE_PAID_PROVENANCE_DRIFT');
  if (failed) {
    if (checked.ok || hash(candidate.validation) !== hash(checked) || receipt.usageKnown !== true
      || receipt.incompleteReason !== null || hash(receipt.schemaIssues) !== hash(checked.issues)
      || candidate.safeReceiptHash !== receiptHash || issue.safeReceiptHash !== receiptHash
      || issue.rejectedCandidateRef.hash !== candidate.hash || issue.invocationHash !== hash(inv)
      || runtimeReceipt.issueHash !== issue.hash || runtimeReceipt.status !== 'quarantined')
      fail('FACTION_FIELD_VALUE_FAILED_PROVENANCE_DRIFT');
  } else {
    const wire = { model: egress.model, instructions: request.instructions, input: request.input,
      reasoning: { effort: 'none' }, temperature: egress.temperature, top_p: egress.topP,
      max_output_tokens: policy.maxOutputUnits, stream: false,
      text: { format: { type: 'json_schema', name: contract.schemaName, schema: contract.providerSchema } } };
    if (!checked.ok || receipt.requestBodyHash !== hash(wire) || receipt.requestId !== attempt.id
      || !factionProviderModelIdentityMatchesV1(receipt, egress.model)
      || hash(receipt.roleRef) !== hash(context.roleRef) || receipt.responseFingerprint !== hash(candidate.providerValue)
      || hash(response.output) !== hash(candidate.providerValue) || candidate.providerReceiptHash !== receiptHash
      || runtimeReceipt.providerReceiptHash !== receiptHash || runtimeReceipt.candidateHash !== candidate.hash
      || runtimeReceipt.status !== 'accepted' || runtimeReceipt.providerAttempts !== 1 || runtimeReceipt.automaticRetries !== 0
      || runtimeReceipt.semanticAcceptance !== false || candidate.semanticAcceptanceInherited !== false
      || candidate.published !== false || candidate.runtimeAccepted !== false)
      fail('FACTION_FIELD_VALUE_SUCCESS_PROVENANCE_DRIFT');
  }
  checkCapability(choice.capability, context, egress, receipt.startedAt || choice.capability.probedAt);
  return seal({ version: 'faction_field_value_paid_proof_v1', ownerRunId: attempt.run, attemptId: attempt.id,
    originalRowHash: hash(attempt), providerReceiptHash: receiptHash, candidateHash: candidate.hash,
    runtimeReceiptHash: runtimeReceipt.hash, providerSchemaPassed: !failed,
    reportedModelVerified: !failed, providerRequestBodyHashVerified: !failed, rawWireBodyVerified: false, trainingTruth: false });
}

function inspectValues({ task, prepared, input, paid, round }) {
  const codec = createStructuredFieldCodecV1(task.contract), inspection = codec.inspect(paid.candidate.providerValue);
  const diagnostics = inspection.validation.issues;
  if (inspection.status === 'needs_adjudication') return { inspection,
    feedback: seal({ version: 'faction_field_value_feedback_v1', taskHash: task.hash, round,
      priorValue: paid.candidate.providerValue, issues: inspection.blocks, class: 'unconsumed_content', retryable: false }) };
  if (inspection.status === 'needs_values') return { inspection,
    feedback: seal({ version: 'faction_field_value_feedback_v1', taskHash: task.hash, round,
      priorValue: paid.candidate.providerValue, issues: diagnostics, class: 'schema_instance', retryable: true }) };
  const values = codec.complete(inspection);
  const completion = originalCodec.complete(task.inspection, values.value);
  try {
    const mapped = materializeFactionFieldValueCompletionV1({ ...prepared.mapping, input, capsule: prepared.capsule,
      reviewReasonMaximum: 16384, reviewSourceMaximum: 128, providerOutput: completion.value });
    return { inspection, values, completion, mapped, feedback: null };
  } catch (error) {
    if (!/^FACTION_(?:STRUCTURED_REVIEW|REVIEW_SLOT_NAMESPACE)_/u.test(error.code || '')) throw error;
    return { inspection, values, feedback: seal({ version: 'faction_field_value_feedback_v1', taskHash: task.hash, round,
      priorValue: values.value, issues: [{ code: error.code }], class: 'host_mapping', retryable: true }) };
  }
}

// Field completion preserves the paid review's explicit focus paths. If a
// paraphrased quote becomes visible only after missing schema fields are
// restored, bind those exact paths to Host-owned field text. No fuzzy prose
// matching, judgment rewrite, source addition, or additional Provider call.
export function materializeFactionFieldValueCompletionV1(options) {
  const materialized = materializeFactionSlotReviewV1(options);
  if (materialized.receipt.version !== 'faction_review_explicit_focus_path_materialization_v1') return materialized;
  const commonReceipt = materialized.receipt;
  const { hash: ignoredReceiptHash, ...receipt } = commonReceipt;
  return { ...materialized, receipt: seal({ ...receipt,
    version: 'faction_field_value_focus_binding_materialization_v1',
    commonFocusPathMaterializationReceipt: commonReceipt,
    originalProviderOutputHash: hash(options.providerOutput),
    repairedProviderOutputHash: commonReceipt.repairedMappedProviderOutputHash,
    semanticAcceptanceInherited: false, trainingTruth: false }) };
}

function verifyLoop(loop, value, receiptHash, dshBindingHash) {
  verifySeal(loop);
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.toolTrace.length !== 0
    || loop.transcript.length !== 1 || loop.transcript[0].receiptHash !== receiptHash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify({ action: 'finish', content: value }))
    || hash(loop.final) !== hash(value)) fail('FACTION_FIELD_VALUE_DSH_DRIFT');
}

// Authenticate a terminal field-value checkpoint independently of whether its
// assembled review passed the Host. A caller may route a proved context gap to
// a separately authorized source-expansion phase; this does not accept it.
export function inspectFactionFieldValueCheckpointV1({ input, prepared, originalEvidence, records,
  readPaidEvidence, dshBindingHash }) {
  const { task, family } = prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence });
  if (!Array.isArray(records) || !records.length || records.length > family.maximumNewValueAttempts)
    fail('FACTION_FIELD_VALUE_CHECKPOINT_ROUNDS_INVALID');
  let feedback = null, result;
  const receiptHashes = [family.originalProof.providerReceiptHash];
  for (const [round, record] of records.entries()) {
    verifySeal(record); verifySeal(record.choice);
    const context = roundContext(task, round, feedback);
    if (record.round !== round || record.choice.round !== round || record.choice.familyHash !== family.hash
      || record.choice.contextHash !== context.hash) fail('FACTION_FIELD_VALUE_ROUND_DRIFT');
    const paid = readPaidEvidence(record.choice);
    const paidProof = authenticatePaid({ paid, choice: record.choice, context, contract: task.contract });
    result = inspectValues({ task, prepared, input, paid, round });
    if (hash(record.paidProof) !== hash(paidProof) || hash(record.result) !== hash(result))
      fail('FACTION_FIELD_VALUE_RESULT_DRIFT');
    if (record.loop) verifyLoop(record.loop, paid.candidate.providerValue, paid.runtimeReceipt.hash, dshBindingHash);
    else if (!paid.failed) fail('FACTION_FIELD_VALUE_SUCCESS_LOOP_MISSING');
    if (round < records.length - 1 && !result.feedback?.retryable) fail('FACTION_FIELD_VALUE_UNAUTHORIZED_CORRECTION');
    receiptHashes.push(paidProof.providerReceiptHash); feedback = result.feedback;
  }
  const completion = result.values ? originalCodec.complete(task.inspection, result.values.value) : null;
  return { task, family, result, completion, receiptHashes, semanticAcceptance: false };
}

export function verifyFactionFieldValueRoleV1({ value, input, prepared, originalEvidence, readPaidEvidence, dshBindingHash }) {
  verifySeal(value);
  const { task, family } = prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence });
  if (value.protocol !== binding.version || value.familyHash !== family.hash || value.taskHash !== task.hash
    || value.roleId !== prepared.fullRoleId || value.initialContextCapsuleHash !== prepared.capsule.hash
    || value.contextCapsuleHash !== prepared.capsule.hash || value.structuredDecodePassed !== true
    || value.reviewSlotNamespaceBindingHash !== slotBinding.hash
    || hash(value.outputContractRef) !== hash(prepared.capsule.outputContractRef)
    || value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule'
    || value.sharedScenarioSourcesIncluded !== true || value.originalProviderSchemaPassed !== false
    || value.semanticAcceptance !== false || value.runtimeAccepted !== false || value.trainingTruth !== false
    || !Array.isArray(value.rounds) || value.rounds.length < 1 || value.rounds.length > family.maximumNewValueAttempts)
    fail('FACTION_FIELD_VALUE_ROLE_BINDING_DRIFT');
  let feedback = null, result;
  const receipts = [family.originalProof.providerReceiptHash];
  for (const [round, record] of value.rounds.entries()) {
    verifySeal(record); verifySeal(record.choice);
    const context = roundContext(task, round, feedback);
    if (record.round !== round || record.choice.round !== round || record.choice.familyHash !== family.hash
      || record.choice.contextHash !== context.hash) fail('FACTION_FIELD_VALUE_ROUND_DRIFT');
    const paid = readPaidEvidence(record.choice);
    const proof = authenticatePaid({ paid, choice: record.choice, context, contract: task.contract });
    result = inspectValues({ task, prepared, input, paid, round });
    if (hash(record.paidProof) !== hash(proof) || hash(record.result) !== hash(result)) fail('FACTION_FIELD_VALUE_RESULT_DRIFT');
    if (record.loop) verifyLoop(record.loop, paid.candidate.providerValue, paid.runtimeReceipt.hash, dshBindingHash);
    else if (!paid.failed) fail('FACTION_FIELD_VALUE_SUCCESS_LOOP_MISSING');
    if (round < value.rounds.length - 1 && !result.feedback?.retryable) fail('FACTION_FIELD_VALUE_UNAUTHORIZED_CORRECTION');
    feedback = result.feedback; receipts.push(proof.providerReceiptHash);
  }
  if (feedback || hash(value.completion) !== hash(result.completion) || hash(value.output) !== hash(result.mapped.output)
    || hash(value.hostMappingReceipt) !== hash(result.mapped.receipt)) fail('FACTION_FIELD_VALUE_ASSEMBLY_DRIFT');
  verifyLoop(value.loop, value.output, hash({ familyHash: family.hash, rounds: value.rounds.map(r => r.hash),
    completionHash: result.completion.hash }), dshBindingHash);
  return { providerReceiptHashes: receipts, importedCanaryHash: null, semanticAcceptance: false };
}

// One persistent family owns all new field-value requests. New run, model or
// capability identities cannot reset rounds. Only concrete schema/Host issues
// authorize another value request; unknown delivery and 402 never do.
export function createFactionFieldValueRuntimeV1({ filename, input, store, dsh, providerAdapter, wireRecovery,
  egressBinding, ensureCapability, priceUsage, readOriginalEvidence, allowedRunIds,
  ambiguousReplacementBinding = null,
  now = () => new Date().toISOString(), onProgress, stopForSourceContext = false }) {
  if (!store?.reserve || !dsh?.binding || typeof ensureCapability !== 'function'
    || typeof readOriginalEvidence !== 'function' || !Array.isArray(allowedRunIds)) fail('FACTION_FIELD_VALUE_DEPENDENCIES');
  if (ambiguousReplacementBinding
    && (verifySeal(ambiguousReplacementBinding).version !== 'faction_ambiguous_replacement_v1'
      || ambiguousReplacementBinding.eligibleFailure !== 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
      || ambiguousReplacementBinding.maximumReplacementAttemptsPerOrigin !== 1))
    fail('FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_BINDING_INVALID');
  return Object.freeze({ async run(prepared) {
    const db = new DatabaseSync(filename, { readOnly: true });
    let control, lock;
    const stop = () => { if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK'); };
    try {
      stop();
      const originalEvidence = await readOriginalEvidence(prepared);
      const { task, family } = prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence });
      requireFactionFieldValueRepairScopeV1({
        providerOutput: originalEvidence.rejected.providerValue,
        targetCount: prepared.mapping.targets.targets.length,
        coverageCount: prepared.mapping.requiredSourceRefs.length,
      });
      control = openProductionStore(filename, { runId: 'faction-field-control-' + family.hash.slice(0, 32),
        recipeHash: family.hash, maxCalls: 1, maxCostMicros: 1, maxTokens: 1 });
      lock = control.acquire('family-execution', { familyHash: family.hash }, 1800000);
      if (lock.cached) fail('FACTION_FIELD_VALUE_MUTEX_CORRUPT');
      const paidReader = choice => readPaid(db, choice, allowedRunIds);
      const checkOrigin = async () => {
        stop();
        const fresh = await readOriginalEvidence(prepared);
        if (prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence: fresh }).family.hash !== family.hash)
          fail('FACTION_FIELD_VALUE_ORIGINAL_DRIFT');
        return fresh;
      };
      const finalInput = { familyHash: family.hash, roleInputHash: hash(prepared.roleInput), dshBindingHash: dsh.binding.hash };
      const finalLease = store.acquire(prepared.fullRoleId + '.field-values-v1', finalInput, 1800000);
      try {
        if (finalLease.cached) {
          const value = verifySeal(finalLease.artifact);
          verifyFactionFieldValueRoleV1({ value, input, prepared, originalEvidence, readPaidEvidence: paidReader, dshBindingHash: dsh.binding.hash });
          return value;
        }
        const rounds = []; let feedback = null;
        for (let round = 0; round < family.maximumNewValueAttempts; round++) {
          await checkOrigin();
          const context = roundContext(task, round, feedback), stepId = 'round.' + round;
          const chosen = control.artifact(stepId + '.choice');
          const capability = chosen?.capability || await ensureCapability(task.contract);
          const choice = chosen || seal({ version: 'faction_field_value_dispatch_v1', familyHash: family.hash,
            round, contextHash: context.hash, ownerRunId: store.summary().runId, capability,
            wireBinding: portableWire(egressBinding), egressBindingHash: hash(portableWire(egressBinding)),
            request: requestFor(context, capability), trainingTruth: false });
          if (choice.familyHash !== family.hash || choice.round !== round || choice.contextHash !== context.hash
            || !allowedRunIds.includes(choice.ownerRunId)) fail('FACTION_FIELD_VALUE_CHOICE_DRIFT');
          if (!chosen) {
            checkCapability(capability, context, egressBinding, now());
            const lease = control.acquire(stepId + '.choice', { familyHash: family.hash, round });
            if (lease.cached) fail('FACTION_FIELD_VALUE_CHOICE_RACE');
            control.finish(lease, choice);
          }
          let dispatchChoice = choice;
          const originalAttempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?')
            .get(choice.ownerRunId, choice.request.requestId);
          if (originalAttempt?.state === 'failed'
            && originalAttempt.code === 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND') {
            if (!ambiguousReplacementBinding) fail('FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_REQUIRED');
            const replacementId = stepId + '.ambiguous-replacement.choice';
            const savedReplacement = control.artifact(replacementId);
            const replacementCapability = savedReplacement?.capability || await ensureCapability(task.contract);
            const replacementWireBinding = savedReplacement?.wireBinding || portableWire(egressBinding);
            const issue = decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
              .get(choice.ownerRunId, choice.request.requestId + '.issue')?.artifact);
            const runtimeReceipt = decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
              .get(choice.ownerRunId, choice.request.requestId + '.runtime-receipt')?.artifact);
            const preparedReplacement = prepareFactionFieldValueAmbiguousReplacementV1({
              authorizationBinding: ambiguousReplacementBinding, family, round, context,
              originalChoice: choice, originalAttempt,
              originalFailureReceipt: decode(originalAttempt.response), originalIssue: issue,
              originalRuntimeReceipt: runtimeReceipt,
              originalInvocation: invocation(context, choice.capability),
              originalRequest: requestFor(context, choice.capability),
              replacementCapability, replacementWireBinding,
              replacementOwnerRunId: savedReplacement?.ownerRunId || store.summary().runId,
            });
            if (savedReplacement) {
              if (verifySeal(savedReplacement).hash !== preparedReplacement.choice.hash)
                fail('FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_CHOICE_DRIFT');
              dispatchChoice = savedReplacement;
            } else {
              checkCapability(replacementCapability, context, egressBinding, now());
              const replacementLease = control.acquire(replacementId, { grantHash: preparedReplacement.grant.hash });
              if (replacementLease.cached) fail('FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_RACE');
              try { dispatchChoice = control.finish(replacementLease, preparedReplacement.choice); }
              catch (error) { control.release(replacementLease); throw error; }
            }
            onProgress?.({ stage: 'field_value_ambiguous_replacement', round,
              originAttemptId: originalAttempt.id, replacementRequestId: dispatchChoice.request.requestId,
              maximumReplacementAttempts: 1, providerCalls: 0 });
          }
          const dispatchRequest = dispatchChoice.request.requestHash
            ? requestFor(context, dispatchChoice.capability, dispatchChoice.continuationRef)
            : dispatchChoice.request;
          if (dispatchRequest.requestId !== dispatchChoice.request.requestId
            || (dispatchChoice.request.requestHash
              && hash(dispatchRequest) !== dispatchChoice.request.requestHash))
            fail('FACTION_FIELD_VALUE_REPLACEMENT_REQUEST_DRIFT');
          let record = control.artifact(stepId + '.record');
          if (!record) {
            let loop = null;
            const existing = db.prepare('SELECT state FROM attempts WHERE run=? AND id=?')
              .get(dispatchChoice.ownerRunId, dispatchRequest.requestId);
            if (!existing || existing.state === 'received') {
              if (dispatchChoice.ownerRunId !== store.summary().runId && !existing) fail('FACTION_FIELD_VALUE_UNSENT_OWNER_CHANGED');
              if (!existing && !factionFieldValueDispatchWireMatchesV1({ dispatchChoice, egressBinding }))
                fail('FACTION_FIELD_VALUE_DISPATCH_MODEL_CHANGED');
              const stepStore = { ...store, reserve(id, request, ...args) {
                stop();
                if (id !== dispatchRequest.requestId || hash(request) !== hash(dispatchRequest)) fail('FACTION_FIELD_VALUE_REQUEST_DRIFT');
                if (existing) return { cached: true, response: decode(db.prepare('SELECT response FROM attempts WHERE run=? AND id=?').get(dispatchChoice.ownerRunId, id).response) };
                return store.reserve(id, request, ...args);
              } };
              const generated = createStructuredRuntimeWithWireRecoveryV2({ wireRecovery: existing ? null : wireRecovery, providerAdapter,
                store: stepStore, egressBinding: existing ? dispatchChoice.wireBinding : egressBinding, priceUsage, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
                outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [task.contract] }),
                contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [context] }),
                executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(policyRef)
                  && hash(q.roleRef) === hash(context.roleRef) && hash(q.outputContractRef) === hash(context.outputContractRef)
                  ? { ok: true, executionPolicy: policy } : { ok: false } },
                capabilityReceiptRegistry: { resolve: q => hash(q.providerProfileRef) === hash(dispatchChoice.wireBinding.providerProfileRef)
                  && hash(q.outputContractRef) === hash(context.outputContractRef) && q.capability === 'responses_json_schema'
                  ? { ok: true, capabilityReceipt: dispatchChoice.capability } : { ok: false } },
                readCandidate: ref => { const c = store.artifact(dispatchRequest.requestId + '.candidate'); return c?.hash === ref.hash ? c : null; } });
              let outcome;
              const invoke = { roleRef: context.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(context),
                outputContractRef: context.outputContractRef, executionPolicyRef: policyRef,
                continuationRef: dispatchChoice.continuationRef || null };
              const bridge = createStarcraftTmgStructuredDshModelBridgeV1({ generate: async () => {
                outcome = await generated.generateStructured(invoke); return outcome;
              }, readCandidate: generated.readCandidate, bindInvocation: () => invoke });
              try { loop = await dsh.run({ task: 'Complete only field-value jobs from the full source context; use actual validator feedback when present.',
                callModel: bridge.callModel, toolPort: noTools,
                limits: { maxCalls: 1, maxTools: 0, maxOutput: policy.maxOutputUnits, maxWallMs: 180000 } }); }
              catch (error) {
                stop();
                if (outcome?.issueRef?.class !== 'schema_instance') {
                  const failed = db.prepare('SELECT code,state FROM attempts WHERE run=? AND id=?')
                    .get(dispatchChoice.ownerRunId, dispatchRequest.requestId);
                  if (failed?.code) throw Object.assign(error, { code: failed.code });
                  throw error;
                }
              }
            }
            const paid = paidReader(dispatchChoice);
            const paidProof = authenticatePaid({ paid, choice: dispatchChoice, context, contract: task.contract });
            const result = inspectValues({ task, prepared, input, paid, round });
            record = seal({ version: 'faction_field_value_round_v1', round, choice: dispatchChoice, paidProof, result, loop, trainingTruth: false });
            await checkOrigin();
            const lease = control.acquire(stepId + '.record', { choiceHash: dispatchChoice.hash });
            if (lease.cached) fail('FACTION_FIELD_VALUE_RECORD_RACE');
            control.finish(lease, record);
          }
          // Re-read the actual paid row even for a cached round.
          const paid = paidReader(dispatchChoice), paidProof = authenticatePaid({ paid, choice: dispatchChoice, context, contract: task.contract });
          const result = inspectValues({ task, prepared, input, paid, round });
          if (hash(record.choice) !== hash(dispatchChoice) || hash(record.paidProof) !== hash(paidProof)
            || hash(record.result) !== hash(result)) fail('FACTION_FIELD_VALUE_CACHED_ROUND_DRIFT');
          if (record.loop) verifyLoop(record.loop, paid.candidate.providerValue, paid.runtimeReceipt.hash, dsh.binding.hash);
          rounds.push(record);
          onProgress?.({ stage: 'field_value_round', round, newAttemptMaximum: family.maximumNewValueAttempts,
            feedbackClass: result.feedback?.class || null, providerSchemaPassed: paidProof.providerSchemaPassed });
          if (stopForSourceContext && result.feedback?.class === 'host_mapping'
            && result.feedback.issues.some(i => i.code === 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID'))
            fail('FACTION_FIELD_VALUE_SOURCE_CONTEXT_REQUIRED');
          if (!result.feedback) {
            const receiptHash = hash({ familyHash: family.hash, rounds: rounds.map(r => r.hash), completionHash: result.completion.hash });
            const loop = await dsh.run({ task: 'Host assembles the verified field values into the original review. No additional model request.',
              callModel: async () => ({ command: { action: 'finish', content: result.mapped.output }, receiptHash, usage: zeroUsage }),
              toolPort: noTools, limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
            const value = seal({ roleId: prepared.fullRoleId, protocol: binding.version, familyHash: family.hash, taskHash: task.hash,
              rounds, loop, output: result.mapped.output, completion: result.completion, hostMappingReceipt: result.mapped.receipt,
              outputContractRef: prepared.capsule.outputContractRef, reviewSlotNamespaceBindingHash: slotBinding.hash,
              initialContextCapsuleHash: prepared.capsule.hash, contextCapsuleHash: prepared.capsule.hash,
              sourceDelivery: 'proof_carrying_whole_section_review_capsule', sharedScenarioSourcesIncluded: true,
              structuredDecodePassed: true, originalProviderSchemaPassed: false,
              semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
            const fresh = await checkOrigin();
            verifyFactionFieldValueRoleV1({ value, input, prepared, originalEvidence: fresh,
              readPaidEvidence: paidReader, dshBindingHash: dsh.binding.hash });
            return store.finish(finalLease, value);
          }
          if (!result.feedback.retryable) fail('FACTION_FIELD_VALUE_ADJUDICATION_REQUIRED');
          const fingerprint = f => hash({ class: f.class, value: f.priorValue, issues: f.issues });
          if (feedback && fingerprint(feedback) === fingerprint(result.feedback)) fail('FACTION_FIELD_VALUE_NO_PROGRESS');
          feedback = result.feedback;
        }
        fail('FACTION_FIELD_VALUE_ATTEMPT_LIMIT');
      } catch (error) { if (!finalLease.cached) store.release(finalLease); throw error; }
    } finally { if (lock && !lock.cached) control.release(lock); control?.close(); db.close(); }
  } });
}
