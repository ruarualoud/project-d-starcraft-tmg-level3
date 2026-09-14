import { fail, hash, seal, verifySeal } from '../../skill-production/common.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 }
  from '../output-contract-registry-v1.mjs';

function verifyReceipt(receipt, code) {
  const { receiptHash, ...body } = receipt || {};
  if (!receiptHash || hash(body) !== receiptHash) fail(code);
  return receipt;
}

function parsePath(path) {
  if (typeof path !== 'string' || !path.startsWith('$')) return null;
  const tokens = [];
  const segment = /\.([A-Za-z][A-Za-z0-9_]*)|\[([0-9]+)\]/gy;
  let offset = 1;
  while (offset < path.length) {
    segment.lastIndex = offset;
    const match = segment.exec(path);
    if (!match) return null;
    tokens.push(match[1] === undefined
      ? { kind: 'index', value: Number(match[2]) }
      : { kind: 'property', value: match[1] });
    offset = segment.lastIndex;
  }
  return tokens;
}

function projectionPlan(contract, validation, value) {
  if (validation?.ok !== false || !Array.isArray(validation.issues)
    || !validation.issues.length || validation.issues.some(issue =>
      !['additional_property_forbidden', 'array_too_long'].includes(issue.code))) return null;
  const plan = [], seen = new Set();
  for (const issue of validation.issues) {
    const tokens = parsePath(issue.path);
    if (!tokens?.length || seen.has(issue.path)) return null;
    if (issue.code === 'array_too_long') {
      let schema = contract.providerSchema, node = value;
      for (const token of tokens) {
        if (token.kind === 'property') {
          if (schema?.type !== 'object'
            || !Object.hasOwn(schema.properties || {}, token.value)
            || !node || typeof node !== 'object' || Array.isArray(node)
            || !Object.hasOwn(node, token.value)) return null;
          schema = schema.properties[token.value]; node = node[token.value];
        } else {
          if (schema?.type !== 'array' || !Array.isArray(node)
            || !Number.isSafeInteger(token.value) || token.value < 0
            || token.value >= node.length) return null;
          schema = schema.items; node = node[token.value];
        }
      }
      if (schema?.type !== 'array' || !Array.isArray(node)
        || !Number.isSafeInteger(schema.maxItems) || schema.maxItems < 0
        || issue.maxItems !== schema.maxItems
        || issue.actualItems !== node.length || node.length <= schema.maxItems) return null;
      seen.add(issue.path); plan.push({ kind: 'truncate_array', path: issue.path,
        tokens, maximum: schema.maxItems,
        omitted: node.slice(schema.maxItems).map((item, index) => ({
          path: `${issue.path}[${schema.maxItems + index}]`, itemHash: hash(item),
        })) });
      continue;
    }
    const final = tokens.at(-1);
    if (final.kind !== 'property') return null;
    let schema = contract.providerSchema, node = value;
    for (const token of tokens.slice(0, -1)) {
      if (token.kind === 'property') {
        if (schema?.type !== 'object' || !Object.hasOwn(schema.properties || {}, token.value)
          || !node || typeof node !== 'object' || Array.isArray(node)
          || !Object.hasOwn(node, token.value)) return null;
        schema = schema.properties[token.value]; node = node[token.value];
      } else {
        if (schema?.type !== 'array' || !Array.isArray(node)
          || !Number.isSafeInteger(token.value) || token.value < 0
          || token.value >= node.length) return null;
        schema = schema.items; node = node[token.value];
      }
    }
    if (schema?.type !== 'object' || schema.additionalProperties !== false
      || Object.hasOwn(schema.properties || {}, final.value)
      || !node || typeof node !== 'object' || Array.isArray(node)
      || !Object.hasOwn(node, final.value)) return null;
    seen.add(issue.path); plan.push({ kind: 'remove_property', path: issue.path,
      tokens, valueHash: hash(node[final.value]) });
  }
  return plan;
}

function removeAt(value, tokens) {
  let node = value;
  for (const token of tokens.slice(0, -1)) node = node[token.value];
  delete node[tokens.at(-1).value];
}

function truncateAt(value, tokens, maximum) {
  let node = value;
  for (const token of tokens) node = node[token.value];
  if (!Array.isArray(node) || node.length <= maximum) {
    fail('BOUNDED_SCHEMA_PROJECTION_NOT_SAFE');
  }
  node.splice(maximum);
}

// JSON Schema projection is permitted only when every reported defect is an
// unknown property or a bounded array overflow. Accepted scalar fields and
// order are byte-for-byte preserved. Removed values remain hash-accounted and
// no source or strategy acceptance follows.
export function recoverAdditionalPropertiesProjectionV1({ failureReceipt,
  providerValue, validation, wire, providerRequest, outputContract, capabilityReceipt }) {
  const failure = verifyReceipt(failureReceipt, 'ADDITIONAL_PROPERTIES_RECEIPT_DRIFT');
  verifySeal(wire);
  const plan = projectionPlan(outputContract, validation, providerValue);
  if (!plan) fail('ADDITIONAL_PROPERTIES_PROJECTION_NOT_APPLICABLE');
  if (failure.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID' || failure.status !== 200
    || failure.usageKnown !== true || failure.physicalAttempts !== 1
    || failure.automaticRetries !== 0
    || failure.capabilityReceiptHash !== capabilityReceipt.receiptHash
    || validation.valueHash !== hash(providerValue)
    || hash(validation.issues) !== hash(failure.schemaIssues)) {
    fail('ADDITIONAL_PROPERTIES_EVIDENCE_DRIFT');
  }
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  const transport = verifyReceipt(wire.response?.transportReceipt,
    'ADDITIONAL_PROPERTIES_WIRE_DRIFT');
  const messages = wire.response?.payload?.output?.filter?.(row => row?.type === 'message');
  const part = messages?.length === 1 && messages[0]?.content?.length === 1
    ? messages[0].content[0] : null;
  if (wire.request?.requestId !== providerRequest.requestId
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
    || part?.type !== 'output_text' || hash(part.text) !== failure.outputTextHash) {
    fail('ADDITIONAL_PROPERTIES_WIRE_DRIFT');
  }
  let parsed;
  try { parsed = JSON.parse(part.text); } catch { fail('ADDITIONAL_PROPERTIES_WIRE_DRIFT'); }
  if (hash(parsed) !== hash(providerValue)) fail('ADDITIONAL_PROPERTIES_WIRE_DRIFT');
  const value = structuredClone(providerValue);
  for (const operation of plan) {
    if (operation.kind === 'remove_property') removeAt(value, operation.tokens);
    else truncateAt(value, operation.tokens, operation.maximum);
  }
  const accepted = validateStarcraftTmgProviderJsonSchemaValueV1(outputContract.providerSchema, value);
  if (!accepted.ok) fail('ADDITIONAL_PROPERTIES_PROJECTION_OUTPUT_INVALID');
  const arrayProjection = plan.some(operation => operation.kind === 'truncate_array');
  const normalization = seal({
    schema: arrayProjection ? 'structured_bounded_schema_projection_v2'
      : 'structured_additional_properties_projection_v1',
    originalFailureReceiptHash: failure.receiptHash,
    originalWireHash: wire.hash,
    outputContractRef: contractRef,
    beforeValueHash: hash(providerValue),
    afterValueHash: hash(value),
    removedProperties: plan.filter(operation => operation.kind === 'remove_property')
      .map(({ path, valueHash }) => ({ path, valueHash })),
    ...(arrayProjection ? { truncatedArrays: plan
      .filter(operation => operation.kind === 'truncate_array')
      .map(({ path, maximum, omitted }) => ({ path, retainedPrefix: maximum,
        omitted })) } : {}),
    acceptedFieldEdits: 0,
    providerRegenerationCalls: 0,
    semanticAcceptanceInherited: false,
    sourceAndStrategyEvaluationStillRequired: true,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  const receiptBody = {
    schemaVersion: arrayProjection
      ? 'structured_bounded_schema_projection_v2.success'
      : 'structured_additional_properties_projection_v1.success',
    requestId: providerRequest.requestId,
    roleRef: providerRequest.roleRef,
    outputContractRef: contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    originalFailureReceiptHash: failure.receiptHash,
    transportReceiptHash: transport.receiptHash,
    requestedModel: transport.requestedModel,
    reportedModel: wire.response.payload.model,
    startedAt: transport.startedAt,
    responseFingerprint: hash(value),
    localSchemaValidationHash: hash(accepted),
    responseNormalization: normalization,
    usage: failure.usage,
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
      schemaVersion: arrayProjection
        ? 'structured_bounded_schema_projection_v2.local-validation'
        : 'structured_additional_properties_projection_v1.local-validation',
      outputContractRef: contractRef,
      valueHash: accepted.valueHash,
      schemaHash: accepted.schemaHash,
      responseNormalizationHash: normalization.hash,
      valid: true,
      trainingTruth: false,
    },
  });
}

export function withAdditionalPropertiesProjectionRecoveryV1({ adapter, readWire }) {
  if (typeof adapter?.complete !== 'function' || typeof readWire !== 'function') {
    fail('ADDITIONAL_PROPERTIES_ADAPTER_INVALID');
  }
  return Object.freeze({ ...adapter, async complete(args) {
    try { return await adapter.complete(args); }
    catch (error) {
      if (error?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || !error.transientCandidate || !error.transientValidation
        || !projectionPlan(args.outputContract, error.transientValidation,
          error.transientCandidate)) throw error;
      const wire = await readWire(args.providerRequest.requestId);
      return recoverAdditionalPropertiesProjectionV1({
        failureReceipt: error.safeReceipt,
        providerValue: error.transientCandidate,
        validation: error.transientValidation,
        wire,
        providerRequest: args.providerRequest,
        outputContract: args.outputContract,
        capabilityReceipt: args.capabilityReceipt,
      });
    }
  } });
}
