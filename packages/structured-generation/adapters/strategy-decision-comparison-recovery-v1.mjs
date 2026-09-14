import { fail, hash, seal, verifySeal } from '../../skill-production/common.mjs';
import { completeStrategyDecisionComparisonCoverageV1,
  completeStrategyDecisionDynamicCoverageV1 } from '../../strategy-skills/strategy-decision-local-repair-v1.mjs';
import { outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from '../output-contract-registry-v1.mjs';

function verifyProviderReceipt(receipt) {
  const { receiptHash, ...body } = receipt || {};
  if (!receiptHash || hash(body) !== receiptHash) fail('STRATEGY_DECISION_RECOVERY_RECEIPT_DRIFT');
  return receipt;
}

function decisionPrompt(providerRequest, outputContract) {
  if (outputContract.id !== 'strategy.role.decision') return null;
  let payload;
  try { payload = JSON.parse(providerRequest.input); } catch { return null; }
  if (payload?.hostTask?.stage !== 'decision-consumer' || payload.hostTask.kind !== 'decision'
    || !payload.evaluationPrompt || payload.evaluationPrompt.hash !== hash(Object.fromEntries(
      Object.entries(payload.evaluationPrompt).filter(([key]) => key !== 'hash')))) return null;
  return payload.evaluationPrompt;
}

function comparisonCoveragePlan(providerRequest, outputContract, validation, providerValue) {
  if (outputContract.id !== 'strategy.role.decision' || validation?.ok !== false
    || !Array.isArray(validation.issues) || validation.issues.length !== 1
    || validation.issues[0].path !== '$.comparisons'
    || validation.issues[0].code !== 'array_too_short') return null;
  const prompt = decisionPrompt(providerRequest, outputContract);
  const comparisons = providerValue?.comparisons;
  if (!prompt || !Array.isArray(comparisons)
    || validation.issues[0].actualItems !== comparisons.length
    || validation.issues[0].minItems > prompt.candidates.length) return null;
  const ids = prompt.candidates.map(row => row.candidateId);
  const present = comparisons.map(row => row?.candidateId);
  const unique = [...new Set(present)];
  const missing = ids.filter(id => !unique.includes(id));
  return ids.includes(providerValue?.candidateId)
    && present.every(id => ids.includes(id))
    && missing.length === 1 && missing[0] === providerValue.candidateId
    && unique.length === ids.length - 1 && comparisons.length <= ids.length
    ? { prompt } : null;
}

function reviseIfListPlan(outputContract, validation, providerValue) {
  if (outputContract.id !== 'strategy.role.decision' || validation?.ok !== false
    || !Array.isArray(validation.issues) || validation.issues.length !== 1
    || validation.issues[0].path !== '$.reviseIf'
    || validation.issues[0].code !== 'type_string_required'
    || !Array.isArray(providerValue?.reviseIf) || !providerValue.reviseIf.length
    || providerValue.reviseIf.length > 32
    || providerValue.reviseIf.some(value => typeof value !== 'string' || !value.trim())) return null;
  const separator = '\n';
  const joined = providerValue.reviseIf.join(separator);
  const schema = outputContract.providerSchema.properties.reviseIf;
  if (typeof joined !== 'string' || joined.length < schema.minLength
    || joined.length > schema.maxLength) return null;
  return { separator, joined };
}

function providerWireEvidence({ wire, providerRequest, outputContract, failureReceipt,
  capabilityReceipt, code }) {
  const failure = verifyProviderReceipt(failureReceipt);
  verifySeal(wire);
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  const transport = verifyProviderReceipt(wire.response?.transportReceipt);
  const messages = wire.response?.payload?.output?.filter?.(row => row?.type === 'message');
  const part = messages?.length === 1 && messages[0]?.content?.length === 1
    ? messages[0].content[0] : null;
  if (failure.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID' || failure.status !== 200
    || failure.usageKnown !== true || failure.physicalAttempts !== 1
    || failure.automaticRetries !== 0
    || failure.capabilityReceiptHash !== capabilityReceipt.receiptHash
    || wire.request?.requestId !== providerRequest.requestId
    || transport.requestId !== providerRequest.requestId
    || hash(wire.request.body) !== transport.requestBodyHash
    || hash(wire.response.payload) !== transport.payloadHash
    || failure.payloadHash !== transport.payloadHash
    || wire.request.body.input !== providerRequest.input
    || wire.request.body.instructions !== providerRequest.instructions
    || wire.request.body.max_output_tokens !== providerRequest.maxOutputUnits
    || hash(contractRef) !== hash(failure.outputContractRef)
    || hash(contractRef) !== hash(transport.outputContractRef)
    || wire.response.status !== 200 || wire.response.payload.status !== 'completed'
    || messages[0]?.role !== 'assistant' || messages[0]?.status !== 'completed'
    || part?.type !== 'output_text' || hash(part.text) !== failure.outputTextHash) fail(code);
  let providerValue;
  try { providerValue = JSON.parse(part.text); } catch { fail(code); }
  return { failure, contractRef, transport, part, providerValue };
}

function recoveredResponse({ providerRequest, outputContract, capabilityReceipt, completion,
  originalReceipt, recoveryKind }) {
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(outputContract.providerSchema, completion.value);
  if (!validation.ok) fail('STRATEGY_DECISION_RECOVERY_OUTPUT_INVALID');
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  if (hash(contractRef) !== hash(providerRequest.outputContractRef)
    || originalReceipt.capabilityReceiptHash !== capabilityReceipt.receiptHash) {
    fail('STRATEGY_DECISION_RECOVERY_CONTRACT_DRIFT');
  }
  const normalization = seal({ schema: 'strategy_decision_comparison_coverage_recovery_v1', recoveryKind,
    originalReceiptHash: originalReceipt.receiptHash, structuralCompletionHash: completion.hash,
    repairedFields: ['comparisons'], addedComparisonForSelectedCandidate: completion.value.candidateId,
    discardedDuplicateComparisonHashes: completion.localChange.discardedDuplicateComparisonHashes,
    visibleScalarEdits: 0, appendedComparisonRows: 1, preferenceChanged: false,
    semanticAcceptanceInherited: false, providerRegenerationCalls: 0, trainingTruth: false });
  const receiptBody = { schemaVersion: 'strategy_decision_comparison_coverage_recovery_v1.success',
    requestId: providerRequest.requestId, roleRef: providerRequest.roleRef, outputContractRef: contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash, originalReceiptHash: originalReceipt.receiptHash,
    responseFingerprint: hash(completion.value), localSchemaValidationHash: hash(validation),
    responseNormalization: normalization, usage: originalReceipt.usage,
    physicalAttempts: 1, additionalProviderAttempts: 0, automaticRetries: 0,
    semanticAcceptanceInherited: false, trainingTruth: false };
  return { output: completion.value, usageReceipt: { ...receiptBody, receiptHash: hash(receiptBody) },
    localValidationReceipt: { schemaVersion: 'strategy_decision_comparison_coverage_recovery_v1.local-validation',
      outputContractRef: contractRef, valueHash: validation.valueHash, schemaHash: validation.schemaHash,
      responseNormalizationHash: normalization.hash, valid: true, trainingTruth: false } };
}

export function recoverStrategyDecisionComparisonResponseV1({ error, providerRequest,
  outputContract, capabilityReceipt }) {
  if (error?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') throw error;
  const failure = verifyProviderReceipt(error.safeReceipt);
  if (outputContract.id !== 'strategy.role.decision' || failure.status !== 200
    || failure.usageKnown !== true || failure.physicalAttempts !== 1
    || failure.automaticRetries !== 0 || !error.transientCandidate || !error.transientValidation) throw error;
  const plan = comparisonCoveragePlan(providerRequest, outputContract,
    error.transientValidation, error.transientCandidate);
  if (!plan) throw error;
  const completion = completeStrategyDecisionComparisonCoverageV1({ prompt: plan.prompt,
    providerValue: error.transientCandidate, validation: error.transientValidation,
    sourceHash: failure.receiptHash });
  return recoveredResponse({ providerRequest, outputContract, capabilityReceipt, completion,
    originalReceipt: failure, recoveryKind: 'schema_array_too_short_missing_selected_candidate' });
}

// A recurring provider representation uses a string array for the singular
// reviseIf narrative field. Preserve every supplied string and its order, join
// with a neutral newline, and leave strategic/source acceptance to the existing
// independent case gate. Any mixed defect or over-capacity result stays failed.
export function recoverStrategyDecisionShapeResponseV2({ failureReceipt,
  providerValue, validation, wire, providerRequest, outputContract, capabilityReceipt }) {
  const evidence = providerWireEvidence({ wire, providerRequest, outputContract,
    failureReceipt, capabilityReceipt, code: 'STRATEGY_DECISION_SHAPE_WIRE_DRIFT' });
  if (hash(evidence.providerValue) !== hash(providerValue)
    || validation.valueHash !== hash(providerValue)
    || hash(validation.issues) !== hash(evidence.failure.schemaIssues)) {
    fail('STRATEGY_DECISION_SHAPE_EVIDENCE_DRIFT');
  }
  const plan = reviseIfListPlan(outputContract, validation, providerValue);
  if (!plan) fail('STRATEGY_DECISION_SHAPE_RECOVERY_NOT_APPLICABLE');
  const value = structuredClone(providerValue);
  value.reviseIf = plan.joined;
  const accepted = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, value);
  if (!accepted.ok) fail('STRATEGY_DECISION_SHAPE_OUTPUT_INVALID');
  const normalization = seal({
    schema: 'strategy_decision_shape_recovery_v2',
    recoveryKind: 'string_list_to_singular_narrative',
    originalFailureReceiptHash: evidence.failure.receiptHash,
    originalWireHash: wire.hash,
    beforeValueHash: hash(providerValue),
    afterValueHash: hash(value),
    changedFields: ['reviseIf'],
    originalItemHashes: providerValue.reviseIf.map(item => hash(item)),
    originalItemCount: providerValue.reviseIf.length,
    separator: plan.separator,
    textFragmentsPreserved: true,
    itemOrderPreserved: true,
    candidateSelectionChanged: false,
    comparisonsChanged: false,
    providerRegenerationCalls: 0,
    semanticAcceptanceInherited: false,
    sourceAndStrategyEvaluationStillRequired: true,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  const receiptBody = {
    schemaVersion: 'strategy_decision_shape_recovery_v2.success',
    requestId: providerRequest.requestId,
    roleRef: providerRequest.roleRef,
    outputContractRef: evidence.contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    originalFailureReceiptHash: evidence.failure.receiptHash,
    transportReceiptHash: evidence.transport.receiptHash,
    requestedModel: evidence.transport.requestedModel,
    reportedModel: wire.response.payload.model,
    startedAt: evidence.transport.startedAt,
    responseFingerprint: hash(value),
    localSchemaValidationHash: hash(accepted),
    responseNormalization: normalization,
    usage: evidence.failure.usage,
    physicalAttempts: 1,
    additionalProviderAttempts: 0,
    automaticRetries: 0,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  };
  return Object.freeze({
    output: value,
    usageReceipt: { ...receiptBody, receiptHash: hash(receiptBody) },
    localValidationReceipt: {
      schemaVersion: 'strategy_decision_shape_recovery_v2.local-validation',
      outputContractRef: evidence.contractRef,
      valueHash: accepted.valueHash,
      schemaHash: accepted.schemaHash,
      responseNormalizationHash: normalization.hash,
      valid: true,
      trainingTruth: false,
    },
  });
}

// Older comparison wrappers could replace the original schema error before it
// reached the attempt journal. Reconstruct typed failure evidence only from the
// exact authenticated HTTP-200 wire; the old conservative reserve is retained.
export function reconstructStrategyDecisionFailureFromWireV2({ wire,
  providerRequest, outputContract, capabilityReceipt }) {
  verifySeal(wire);
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  const transport = verifyProviderReceipt(wire.response?.transportReceipt);
  const messages = wire.response?.payload?.output?.filter?.(row => row?.type === 'message');
  const part = messages?.length === 1 && messages[0]?.content?.length === 1
    ? messages[0].content[0] : null;
  if (wire.request?.requestId !== providerRequest.requestId
    || transport.requestId !== providerRequest.requestId
    || hash(wire.request.body) !== transport.requestBodyHash
    || hash(wire.response.payload) !== transport.payloadHash
    || wire.request.body.input !== providerRequest.input
    || wire.request.body.instructions !== providerRequest.instructions
    || wire.request.body.max_output_tokens !== providerRequest.maxOutputUnits
    || hash(contractRef) !== hash(transport.outputContractRef)
    || wire.response.status !== 200 || wire.response.payload.status !== 'completed'
    || messages[0]?.role !== 'assistant' || messages[0]?.status !== 'completed'
    || part?.type !== 'output_text') fail('STRATEGY_DECISION_RECONSTRUCTED_WIRE_DRIFT');
  let providerValue;
  try { providerValue = JSON.parse(part.text); }
  catch { fail('STRATEGY_DECISION_RECONSTRUCTED_VALUE_UNAVAILABLE'); }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, providerValue);
  if (!reviseIfListPlan(outputContract, validation, providerValue)) {
    fail('STRATEGY_DECISION_SHAPE_RECOVERY_NOT_APPLICABLE');
  }
  const raw = wire.response.payload.usage;
  const usage = { inputUnits: raw?.input_tokens, outputUnits: raw?.output_tokens,
    totalUnits: raw?.total_tokens };
  const cached = raw?.input_tokens_details?.cached_tokens;
  const reasoning = raw?.output_tokens_details?.reasoning_tokens;
  if (![usage.inputUnits, usage.outputUnits, usage.totalUnits]
    .every(value => Number.isSafeInteger(value) && value >= 0)
    || usage.totalUnits !== usage.inputUnits + usage.outputUnits
    || !Number.isSafeInteger(cached) || cached < 0 || cached > usage.inputUnits) {
    fail('STRATEGY_DECISION_RECONSTRUCTED_USAGE_INVALID');
  }
  usage.inputCacheHitUnits = cached;
  usage.inputCacheMissUnits = usage.inputUnits - cached;
  if (Number.isSafeInteger(reasoning) && reasoning >= 0
    && reasoning <= usage.outputUnits) usage.reasoningOutputUnits = reasoning;
  const body = {
    schemaVersion: 'strategy_decision_wire_reconstructed_failure_v2',
    code: 'STRUCTURED_PROVIDER_SCHEMA_INVALID',
    requestDefinitelyNotSent: false,
    requestMayHaveBeenSent: true,
    status: 200,
    physicalAttempts: 1,
    outputContractRef: contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    usageKnown: true,
    usage,
    causeCode: null,
    incompleteReason: null,
    payloadHash: transport.payloadHash,
    outputTextHash: hash(part.text),
    schemaIssues: validation.issues,
    originalWireHash: wire.hash,
    reconstructedBecause: 'prior_wrapper_replaced_original_schema_error_before_settlement',
    automaticRetries: 0,
    trainingTruth: false,
  };
  return { failureReceipt: { ...body, receiptHash: hash(body) },
    providerValue, validation };
}

export function withStrategyDecisionShapeRecoveryV2({ adapter, readWire }) {
  if (typeof adapter?.complete !== 'function' || typeof readWire !== 'function') {
    fail('STRATEGY_DECISION_SHAPE_ADAPTER_INVALID');
  }
  return Object.freeze({ ...adapter, async complete(args) {
    try { return await adapter.complete(args); }
    catch (error) {
      if (error?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || !error.transientCandidate || !error.transientValidation
        || !reviseIfListPlan(args.outputContract, error.transientValidation,
          error.transientCandidate)) throw error;
      return recoverStrategyDecisionShapeResponseV2({
        failureReceipt: error.safeReceipt,
        providerValue: error.transientCandidate,
        validation: error.transientValidation,
        wire: await readWire(args.providerRequest.requestId),
        providerRequest: args.providerRequest,
        outputContract: args.outputContract,
        capabilityReceipt: args.capabilityReceipt,
      });
    }
  } });
}

export function normalizeAcceptedStrategyDecisionComparisonResponseV1({ response, providerRequest,
  outputContract, capabilityReceipt }) {
  const prompt = decisionPrompt(providerRequest, outputContract);
  if (!prompt) return response;
  const ids = prompt.candidates.map(row => row.candidateId);
  const present = response.output?.comparisons?.map(row => row.candidateId) || [];
  if (present.length === ids.length && new Set(present).size === ids.length
    && ids.every(id => present.includes(id))) return response;
  const originalReceipt = verifyProviderReceipt(response.usageReceipt);
  const completion = completeStrategyDecisionDynamicCoverageV1({ prompt,
    providerValue: response.output, sourceHash: originalReceipt.receiptHash });
  return recoveredResponse({ providerRequest, outputContract, capabilityReceipt, completion,
    originalReceipt, recoveryKind: 'dynamic_candidate_coverage_missing_selected_candidate' });
}

export function withStrategyDecisionComparisonRecoveryV1(adapter) {
  return Object.freeze({ ...adapter, async complete(args) {
    try {
      const response = await adapter.complete(args);
      return normalizeAcceptedStrategyDecisionComparisonResponseV1({ ...args, response });
    } catch (error) {
      if (!comparisonCoveragePlan(args.providerRequest, args.outputContract,
        error?.transientValidation, error?.transientCandidate)) throw error;
      return recoverStrategyDecisionComparisonResponseV1({ ...args, error });
    }
  } });
}
