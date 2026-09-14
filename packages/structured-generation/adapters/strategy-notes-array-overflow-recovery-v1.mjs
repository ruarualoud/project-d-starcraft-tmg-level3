import { fail, hash, seal, verifySeal } from '../../skill-production/common.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 }
  from '../output-contract-registry-v1.mjs';

const ARRAY_PATH = /^\$\.(observations|questions|unproven)$/u;
const NESTED_REFS_PATH = /^\$\.observations\[(\d+)\]\.ruleRefs$/u;
const PROPERTY_PATH = /^\$\.([A-Za-z][A-Za-z0-9_]*)$/u;
const MISSING_UNPROVEN = '模型未提供未证实项列表；该缺失不构成来源或策略验收，必须由后续独立来源与决策评估处理。';
const TRUNCATED_QUESTION = '本次 teach notes 在容量边界截断，未返回完整问题列表；后续角色必须重新检查遗漏问题。';
const TRUNCATED_UNPROVEN = '截断后的文本与未返回字段均不构成来源或策略结论；后续独立来源与决策评估仍为必需。';

function verifyReceipt(receipt, code) {
  const { receiptHash, ...body } = receipt || {};
  if (!receiptHash || hash(body) !== receiptHash) fail(code);
  return receipt;
}

function recoveryPlan(contract, validation) {
  if (contract.id !== 'strategy.role.notes' || validation?.ok !== false
    || !Array.isArray(validation.issues) || !validation.issues.length) return null;
  const arrays = [], nestedRefs = [], extraProperties = [];
  let addUnprovenBoundary = false;
  for (const issue of validation.issues) {
    if (issue.code === 'array_too_long' && ARRAY_PATH.test(issue.path)) {
      const field = ARRAY_PATH.exec(issue.path)[1];
      const maximum = contract.providerSchema.properties[field]?.maxItems;
      if (!Number.isSafeInteger(maximum) || maximum < 1
        || issue.maxItems !== maximum || issue.actualItems <= maximum) return null;
      arrays.push({ field, maximum });
      continue;
    }
    if (issue.code === 'array_too_long' && NESTED_REFS_PATH.test(issue.path)) {
      const index = Number(NESTED_REFS_PATH.exec(issue.path)[1]);
      const maximum = contract.providerSchema.properties.observations.items
        .properties.ruleRefs.maxItems;
      if (!Number.isSafeInteger(index) || index < 0
        || !Number.isSafeInteger(maximum) || maximum < 1
        || issue.maxItems !== maximum || issue.actualItems <= maximum) return null;
      nestedRefs.push({ index, maximum });
      continue;
    }
    if (issue.code === 'additional_property_forbidden' && PROPERTY_PATH.test(issue.path)) {
      const field = PROPERTY_PATH.exec(issue.path)[1];
      if (Object.hasOwn(contract.providerSchema.properties, field)) return null;
      extraProperties.push(field);
      continue;
    }
    if (issue.code === 'required_field_missing' && issue.path === '$.unproven') {
      addUnprovenBoundary = true;
      continue;
    }
    return null;
  }
  return { arrays, nestedRefs, extraProperties, addUnprovenBoundary };
}

function normalizeNotesValue(outputContract, providerValue, plan) {
  const value = structuredClone(providerValue), omitted = [], removedProperties = [];
  const retainedObservationMaximum = plan.arrays
    .find(row => row.field === 'observations')?.maximum ?? null;
  for (const { field, maximum } of plan.arrays) {
    if (!Array.isArray(value[field]) || value[field].length <= maximum) {
      fail('STRATEGY_NOTES_OVERFLOW_NOT_SAFE');
    }
    value[field].slice(maximum).forEach((item, offset) => omitted.push({
      path: `$.${field}[${maximum + offset}]`, itemHash: hash(item),
    }));
    value[field] = value[field].slice(0, maximum);
  }
  for (const { index, maximum } of plan.nestedRefs) {
    // The enclosing observation and all of its refs are already represented
    // by the parent item's omission hash.  Do not try to project a child of an
    // observation that the same recovery plan has removed.
    if (retainedObservationMaximum !== null
      && index >= retainedObservationMaximum) continue;
    const refs = value.observations?.[index]?.ruleRefs;
    if (!Array.isArray(refs) || refs.length <= maximum) {
      fail('STRATEGY_NOTES_OVERFLOW_NOT_SAFE');
    }
    refs.slice(maximum).forEach((item, offset) => omitted.push({
      path: `$.observations[${index}].ruleRefs[${maximum + offset}]`,
      itemHash: hash(item),
    }));
    value.observations[index].ruleRefs = refs.slice(0, maximum);
  }
  for (const field of plan.extraProperties) {
    if (!Object.hasOwn(value, field)) fail('STRATEGY_NOTES_OVERFLOW_NOT_SAFE');
    removedProperties.push({ path: `$.${field}`, valueHash: hash(value[field]) });
    delete value[field];
  }
  if (plan.addUnprovenBoundary) {
    if (Object.hasOwn(value, 'unproven')) fail('STRATEGY_NOTES_OVERFLOW_NOT_SAFE');
    value.unproven = [MISSING_UNPROVEN];
  }
  const accepted = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, value);
  if (!accepted.ok) fail('STRATEGY_NOTES_OVERFLOW_OUTPUT_INVALID');
  return { value, omitted, removedProperties, accepted };
}

function salvageMisplacedObservationNotes(outputContract, text) {
  const observationsStart = text.indexOf('{"observations":[');
  const questionsMarker = '],"questions":[';
  const unprovenMarker = '],"unproven":[';
  const questionsAt = text.indexOf(questionsMarker);
  const unprovenAt = text.lastIndexOf(unprovenMarker);
  if (observationsStart !== 0 || questionsAt < 0 || unprovenAt <= questionsAt
    || !text.endsWith(']}')) return null;
  const observationsBody = text.slice('{"observations":['.length, questionsAt);
  const questionsStart = questionsAt + questionsMarker.length;
  const mixed = text.slice(questionsStart, unprovenAt);
  const misplacedAt = mixed.indexOf('},{"claim":');
  if (misplacedAt < 0) return null;
  // The observed defect is: <last question string>},{"claim":... .  The
  // first brace is the wrong questions-array closer; exclude it, retain the
  // string's closing quote, and start surplus observations at the next brace.
  const questionBody = mixed.slice(0, misplacedAt);
  const misplacedBody = mixed.slice(misplacedAt + 2);
  const unprovenBody = text.slice(unprovenAt + unprovenMarker.length, -2);
  let observations, questions, misplaced, unproven;
  try {
    observations = JSON.parse(`[${observationsBody}]`);
    questions = JSON.parse(`[${questionBody}]`);
    misplaced = JSON.parse(`[${misplacedBody}]`);
    unproven = JSON.parse(`[${unprovenBody}]`);
  } catch { return null; }
  if (!observations.every(item => item && typeof item.claim === 'string'
      && Array.isArray(item.ruleRefs))
    || !misplaced.every(item => item && typeof item.claim === 'string'
      && Array.isArray(item.ruleRefs))
    || !questions.every(item => typeof item === 'string')
    || !unproven.every(item => typeof item === 'string')) return null;
  const maximum = outputContract.providerSchema.properties.observations.maxItems;
  const room = Math.max(0, maximum - observations.length);
  const retainedMisplaced = misplaced.slice(0, room);
  const omittedMisplaced = misplaced.slice(room);
  const value = { observations: [...observations, ...retainedMisplaced],
    questions, unproven };
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, value);
  if (!validation.ok) return null;
  return { value, validation, omitted: omittedMisplaced.map((item, index) => ({
    path: `$.misplacedObservations[${room + index}]`, itemHash: hash(item),
  })), retainedMisplaced: retainedMisplaced.length };
}

function salvageIncompleteObservationPrefix(outputContract, text) {
  const marker = '{"observations":[';
  if (!text.startsWith(marker)) return null;
  const complete = [];
  let depth = 0, quoted = false, escaped = false, start = -1;
  for (let index = marker.length; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === '{') {
      if (depth === 0) start = index;
      depth++;
    } else if (character === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try { complete.push(JSON.parse(text.slice(start, index + 1))); }
        catch { return null; }
        start = -1;
      }
    }
  }
  const maximum = outputContract.providerSchema.properties.observations.maxItems;
  const minimum = outputContract.providerSchema.properties.observations.minItems;
  const maximumRefs = outputContract.providerSchema.properties.observations
    .items.properties.ruleRefs.maxItems;
  if (complete.length < minimum
    || complete.some(item => !item || typeof item.claim !== 'string'
      || !Array.isArray(item.ruleRefs))) return null;
  const observations = complete.slice(0, maximum).map(item => ({ ...item,
    ruleRefs: item.ruleRefs.slice(0, maximumRefs) }));
  const value = { observations, questions: [TRUNCATED_QUESTION],
    unproven: [TRUNCATED_UNPROVEN] };
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, value);
  if (!validation.ok) return null;
  return { value, validation,
    omitted: [
      ...complete.slice(0, maximum).flatMap((item, observationIndex) =>
        item.ruleRefs.slice(maximumRefs).map((ref, refIndex) => ({
          path: `$.observations[${observationIndex}].ruleRefs[${maximumRefs + refIndex}]`,
          itemHash: hash(ref),
        }))),
      ...complete.slice(maximum).map((item, index) => ({
        path: `$.observations[${maximum + index}]`, itemHash: hash(item),
      })),
      ...(start >= 0 ? [{ path: '$.incompleteObservationTail',
        itemHash: hash(text.slice(start)) }] : []),
    ],
    completeObservations: complete.length,
    incompleteTailPresent: start >= 0 };
}

function salvageTrailingArrayCloser(outputContract, text) {
  if (!text.endsWith('"}]}')) return null;
  const repairedText = text.slice(0, -3) + text.slice(-2);
  let value;
  try { value = JSON.parse(repairedText); } catch { return null; }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, value);
  if (!validation.ok) return null;
  return { value, validation, kind: 'trailing_array_delimiter', omitted: [{
    path: '$.trailingDelimiter', itemHash: hash('}'),
  }], repairedTextHash: hash(repairedText) };
}

function salvageKnownTopLevelBoundary(outputContract, text) {
  const boundaries = [
    { field: 'questions', next: 'unproven' },
    { field: 'observations', next: 'questions' },
  ];
  for (const boundary of boundaries) {
    const invalid = `]}],"${boundary.next}":[`;
    const valid = `],"${boundary.next}":[`;
    const first = text.indexOf(invalid);
    if (first < 0 || text.indexOf(invalid, first + 1) >= 0) continue;
    const repairedText = text.slice(0, first) + valid
      + text.slice(first + invalid.length);
    let value;
    try { value = JSON.parse(repairedText); } catch { continue; }
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
      outputContract.providerSchema, value);
    if (!validation.ok && !recoveryPlan(outputContract, validation)) continue;
    return { value, validation, kind: 'known_top_level_array_boundary',
      omitted: [{ path: `$.${boundary.field}.surplusDelimiter`,
        itemHash: hash('}]') }], repairedTextHash: hash(repairedText) };
  }
  return null;
}

function salvageTrailingRootCloser(outputContract, text) {
  if (!text.endsWith('}}')) return null;
  const repairedText = text.slice(0, -1);
  let value;
  try { value = JSON.parse(repairedText); } catch { return null; }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, value);
  if (!validation.ok && !recoveryPlan(outputContract, validation)) return null;
  return { value, validation, kind: 'trailing_root_delimiter',
    omitted: [{ path: '$.trailingRootDelimiter', itemHash: hash('}') }],
    repairedTextHash: hash(repairedText) };
}

function salvageMinimalSurplusClosers(outputContract, text) {
  const positions = [];
  let quoted = false, escaped = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '}' || character === ']') positions.push(index);
  }
  if (positions.length > 96) return null;
  for (const removalCount of [1, 2]) {
    const candidates = new Map();
    const inspect = removed => {
      const removedSet = new Set(removed);
      let repairedText = '';
      for (let index = 0; index < text.length; index++) {
        if (!removedSet.has(index)) repairedText += text[index];
      }
      let value;
      try { value = JSON.parse(repairedText); } catch { return; }
      const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
        outputContract.providerSchema, value);
      if (!validation.ok && !recoveryPlan(outputContract, validation)) return;
      const key = hash(value);
      if (!candidates.has(key)) candidates.set(key, { value, validation,
        kind: 'minimal_surplus_closer_projection', repairedTextHash: hash(repairedText),
        omitted: removed.map(index => ({
          path: `$.surplusStructuralDelimiter[${index}]`,
          itemHash: hash(text[index]),
        })) });
    };
    for (let left = 0; left < positions.length; left++) {
      if (removalCount === 1) inspect([positions[left]]);
      else for (let right = left + 1; right < positions.length; right++) {
        inspect([positions[left], positions[right]]);
      }
    }
    if (candidates.size === 1) return [...candidates.values()][0];
    if (candidates.size > 1) return null;
  }
  return null;
}

// A notes array is supporting analysis, not a policy or source verdict. When a
// complete paid response contains only surplus notes, retain the declared
// prefix and record every omitted item hash. No scalar, order, claim or policy
// value is rewritten, and downstream source/decision evaluation still applies.
export function recoverStrategyNotesSchemaResponseV2({ failureReceipt,
  providerValue, validation, wire, providerRequest, outputContract, capabilityReceipt }) {
  const failure = verifyReceipt(failureReceipt, 'STRATEGY_NOTES_OVERFLOW_RECEIPT_DRIFT');
  verifySeal(wire);
  if (failure.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID' || failure.status !== 200
    || failure.usageKnown !== true || failure.physicalAttempts !== 1
    || failure.automaticRetries !== 0 || failure.capabilityReceiptHash !== capabilityReceipt.receiptHash
    || validation.valueHash !== hash(providerValue)
    || hash(validation.issues) !== hash(failure.schemaIssues)) {
    fail('STRATEGY_NOTES_OVERFLOW_EVIDENCE_DRIFT');
  }
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  const transport = verifyReceipt(wire.response?.transportReceipt,
    'STRATEGY_NOTES_OVERFLOW_WIRE_DRIFT');
  const message = wire.response?.payload?.output?.filter?.(row => row?.type === 'message');
  const part = message?.length === 1 && message[0]?.content?.length === 1
    ? message[0].content[0] : null;
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
    || message?.[0]?.role !== 'assistant' || message?.[0]?.status !== 'completed'
    || part?.type !== 'output_text' || hash(part.text) !== failure.outputTextHash) {
    fail('STRATEGY_NOTES_OVERFLOW_WIRE_DRIFT');
  }
  let parsed;
  try { parsed = JSON.parse(part.text); } catch { fail('STRATEGY_NOTES_OVERFLOW_WIRE_DRIFT'); }
  if (hash(parsed) !== hash(providerValue)) fail('STRATEGY_NOTES_OVERFLOW_WIRE_DRIFT');
  const plan = recoveryPlan(outputContract, validation);
  if (!plan) fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
  const { value, omitted, removedProperties, accepted }
    = normalizeNotesValue(outputContract, providerValue, plan);
  const normalization = seal({
    schema: 'strategy_notes_schema_recovery_v2',
    originalFailureReceiptHash: failure.receiptHash,
    originalWireHash: wire.hash,
    beforeValueHash: hash(providerValue),
    afterValueHash: hash(value),
    retainedPrefixByField: Object.fromEntries(plan.arrays.map(({ field, maximum }) => [field, maximum])),
    retainedRuleRefPrefixByObservation: Object.fromEntries(plan.nestedRefs
      .map(({ index, maximum }) => [index, maximum])),
    omitted,
    removedProperties,
    addedUnprovenBoundary: plan.addUnprovenBoundary ? MISSING_UNPROVEN : null,
    changedFields: [...plan.arrays.map(row => row.field), ...plan.extraProperties,
      ...(plan.addUnprovenBoundary ? ['unproven'] : [])],
    scalarEdits: 0,
    reorderedItems: 0,
    providerRegenerationCalls: 0,
    semanticAcceptanceInherited: false,
    sourceAndStrategyEvaluationStillRequired: true,
    trainingTruth: false,
  });
  const receiptBody = {
    schemaVersion: 'strategy_notes_schema_recovery_v2.success',
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
      schemaVersion: 'strategy_notes_schema_recovery_v2.local-validation',
      outputContractRef: contractRef,
      valueHash: accepted.valueHash,
      schemaHash: accepted.schemaHash,
      responseNormalizationHash: normalization.hash,
      valid: true,
      trainingTruth: false,
    },
  });
}

// Recover an already-paid notes response for a versioned child run.  It
// accepts either ordinary schema overflow or the observed delimiter defect
// where surplus observation objects were placed after the questions array.
// The returned value is schema-valid analysis only; no semantic acceptance is
// inherited and every omitted surplus item remains hash-addressable.
export function recoverSavedStrategyNotesRoleValueV3({ failureReceipt, wire,
  outputContract, capabilityReceipt }) {
  const failure = verifyReceipt(failureReceipt,
    'STRATEGY_NOTES_SAVED_RECOVERY_RECEIPT_DRIFT');
  verifySeal(wire);
  const transport = verifyReceipt(wire.response?.transportReceipt,
    'STRATEGY_NOTES_SAVED_RECOVERY_WIRE_DRIFT');
  const message = wire.response?.payload?.output?.filter?.(row => row?.type === 'message');
  const part = message?.length === 1 && message[0]?.content?.length === 1
    ? message[0].content[0] : null;
  const schemaFailure = failure.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID';
  const incompleteFailure = failure.code === 'STRUCTURED_PROVIDER_INCOMPLETE'
    && failure.incompleteReason === 'max_output_tokens';
  if (!schemaFailure && !incompleteFailure
    || failure.status !== 200 || failure.usageKnown !== true
    || failure.physicalAttempts !== 1 || failure.automaticRetries !== 0
    || failure.capabilityReceiptHash !== capabilityReceipt.receiptHash
    || failure.payloadHash !== transport.payloadHash
    || hash(wire.response.payload) !== transport.payloadHash
    || part?.type !== 'output_text'
    || schemaFailure && hash(part.text) !== failure.outputTextHash
    || incompleteFailure && (wire.response.payload.status !== 'incomplete'
      || message[0].status !== 'incomplete')
    || outputContract.id !== 'strategy.role.notes') {
    fail('STRATEGY_NOTES_SAVED_RECOVERY_EVIDENCE_DRIFT');
  }
  let value, accepted, omitted = [], kind;
  if (incompleteFailure) {
    const salvaged = salvageIncompleteObservationPrefix(outputContract, part.text);
    if (!salvaged) fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
    value = salvaged.value; accepted = salvaged.validation;
    omitted = salvaged.omitted; kind = 'incomplete_notes_prefix';
  } else try {
    const parsed = JSON.parse(part.text);
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
      outputContract.providerSchema, parsed);
    if (hash(validation.issues) !== hash(failure.schemaIssues)) {
      fail('STRATEGY_NOTES_SAVED_RECOVERY_EVIDENCE_DRIFT');
    }
    const plan = recoveryPlan(outputContract, validation);
    if (!plan) fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
    const normalized = normalizeNotesValue(outputContract, parsed, plan);
    ({ value, accepted, omitted } = normalized);
    kind = 'schema_projection';
  } catch (error) {
    if (error?.code) throw error;
    if (failure.schemaIssues?.length !== 1
      || failure.schemaIssues[0].code !== 'provider_json_not_parseable') {
      fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
    }
    const salvaged = salvageMisplacedObservationNotes(outputContract, part.text)
      || salvageTrailingArrayCloser(outputContract, part.text)
      || salvageKnownTopLevelBoundary(outputContract, part.text)
      || salvageTrailingRootCloser(outputContract, part.text)
      || salvageMinimalSurplusClosers(outputContract, part.text);
    if (!salvaged) fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
    value = salvaged.value; accepted = salvaged.validation;
    omitted = salvaged.omitted;
    kind = salvaged.kind || (salvaged.repairedTextHash
      ? 'trailing_array_delimiter' : 'misplaced_observation_delimiter');
    if (!accepted.ok) {
      const plan = recoveryPlan(outputContract, accepted);
      if (!plan) fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
      const normalized = normalizeNotesValue(outputContract, value, plan);
      value = normalized.value; accepted = normalized.accepted;
      omitted = [...omitted, ...normalized.omitted];
      kind += '_then_schema_projection';
    }
  }
  return seal({ schema: 'strategy_notes_saved_role_recovery_v3', kind,
    originalFailureReceiptHash: failure.receiptHash,
    originalWireHash: wire.hash,
    recoveredValue: value,
    recoveredValueHash: hash(value),
    localSchemaValidationHash: hash(accepted),
    omitted,
    incompleteOutputRecovered: incompleteFailure,
    additionalProviderCalls: 0,
    semanticAcceptanceInherited: false,
    sourceAndStrategyEvaluationStillRequired: true,
    runtimeAccepted: false,
    trainingTruth: false });
}

export function materializeSavedNotesRecoveryResponseV3({ recovery, failureReceipt,
  wire, providerRequest, outputContract, capabilityReceipt }) {
  verifySeal(recovery); verifySeal(wire);
  const failure = verifyReceipt(failureReceipt,
    'STRATEGY_NOTES_SAVED_RESPONSE_RECEIPT_DRIFT');
  const transport = verifyReceipt(wire.response.transportReceipt,
    'STRATEGY_NOTES_SAVED_RESPONSE_WIRE_DRIFT');
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  const accepted = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, recovery.recoveredValue);
  if (!accepted.ok || failure.capabilityReceiptHash !== capabilityReceipt.receiptHash
    || wire.request.requestId !== providerRequest.requestId
    || transport.requestId !== providerRequest.requestId
    || hash(contractRef) !== hash(failure.outputContractRef)) {
    fail('STRATEGY_NOTES_SAVED_RESPONSE_BINDING_DRIFT');
  }
  const receiptBody = {
    schemaVersion: 'strategy_notes_saved_response_recovery_v3.success',
    requestId: providerRequest.requestId,
    roleRef: providerRequest.roleRef,
    outputContractRef: contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    originalFailureReceiptHash: failure.receiptHash,
    transportReceiptHash: transport.receiptHash,
    requestedModel: transport.requestedModel,
    reportedModel: wire.response.payload.model,
    startedAt: transport.startedAt,
    responseFingerprint: recovery.recoveredValueHash,
    localSchemaValidationHash: hash(accepted),
    responseNormalization: recovery,
    usage: failure.usage,
    physicalAttempts: 1,
    additionalProviderAttempts: 0,
    automaticRetries: 0,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  };
  return Object.freeze({
    output: recovery.recoveredValue,
    usageReceipt: { ...receiptBody, receiptHash: hash(receiptBody) },
    localValidationReceipt: {
      schemaVersion: 'strategy_notes_saved_response_recovery_v3.local-validation',
      outputContractRef: contractRef,
      valueHash: accepted.valueHash,
      schemaHash: accepted.schemaHash,
      responseNormalizationHash: recovery.hash,
      valid: true,
      trainingTruth: false,
    },
  });
}

// Rebuild typed adapter failure evidence from an authenticated saved wire when
// an older wrapper accidentally replaced the original error before settlement.
// This does not claim to be the missing original receipt and does not alter its
// conservative ledger reservation.
export function reconstructStrategyNotesFailureFromWireV2({ wire, providerRequest,
  outputContract, capabilityReceipt }) {
  verifySeal(wire);
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  const transport = verifyReceipt(wire.response?.transportReceipt,
    'STRATEGY_NOTES_RECONSTRUCTED_WIRE_DRIFT');
  const message = wire.response?.payload?.output?.filter?.(row => row?.type === 'message');
  const part = message?.length === 1 && message[0]?.content?.length === 1
    ? message[0].content[0] : null;
  if (wire.request?.requestId !== providerRequest.requestId
    || transport.requestId !== providerRequest.requestId
    || hash(wire.request.body) !== transport.requestBodyHash
    || hash(wire.response.payload) !== transport.payloadHash
    || wire.request.body.input !== providerRequest.input
    || wire.request.body.instructions !== providerRequest.instructions
    || wire.request.body.max_output_tokens !== providerRequest.maxOutputUnits
    || hash(contractRef) !== hash(transport.outputContractRef)
    || wire.response.status !== 200 || wire.response.payload.status !== 'completed'
    || message?.[0]?.role !== 'assistant' || message?.[0]?.status !== 'completed'
    || part?.type !== 'output_text') fail('STRATEGY_NOTES_RECONSTRUCTED_WIRE_DRIFT');
  let providerValue;
  try { providerValue = JSON.parse(part.text); }
  catch { fail('STRATEGY_NOTES_RECONSTRUCTED_VALUE_UNAVAILABLE'); }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(outputContract.providerSchema, providerValue);
  if (!recoveryPlan(outputContract, validation)) fail('STRATEGY_NOTES_SCHEMA_RECOVERY_NOT_APPLICABLE');
  const raw = wire.response.payload.usage;
  const usage = { inputUnits: raw?.input_tokens, outputUnits: raw?.output_tokens,
    totalUnits: raw?.total_tokens };
  const cached = raw?.input_tokens_details?.cached_tokens;
  const reasoning = raw?.output_tokens_details?.reasoning_tokens;
  if (![usage.inputUnits, usage.outputUnits, usage.totalUnits].every(value => Number.isSafeInteger(value) && value >= 0)
    || usage.totalUnits !== usage.inputUnits + usage.outputUnits
    || !Number.isSafeInteger(cached) || cached < 0 || cached > usage.inputUnits) {
    fail('STRATEGY_NOTES_RECONSTRUCTED_USAGE_INVALID');
  }
  usage.inputCacheHitUnits = cached;
  usage.inputCacheMissUnits = usage.inputUnits - cached;
  if (Number.isSafeInteger(reasoning) && reasoning >= 0 && reasoning <= usage.outputUnits) {
    usage.reasoningOutputUnits = reasoning;
  }
  const body = {
    schemaVersion: 'strategy_notes_wire_reconstructed_failure_v2',
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
  return { failureReceipt: { ...body, receiptHash: hash(body) }, providerValue, validation };
}

export function withStrategyNotesSchemaRecoveryV2({ adapter, readWire }) {
  if (typeof adapter?.complete !== 'function' || typeof readWire !== 'function') {
    fail('STRATEGY_NOTES_OVERFLOW_ADAPTER_INVALID');
  }
  return Object.freeze({ ...adapter, async complete(args) {
    try { return await adapter.complete(args); }
    catch (error) {
      if (!['STRUCTURED_PROVIDER_SCHEMA_INVALID',
        'STRUCTURED_PROVIDER_INCOMPLETE'].includes(error?.code)) throw error;
      const wire = await readWire(args.providerRequest.requestId);
      if (error.transientCandidate && error.transientValidation
        && recoveryPlan(args.outputContract, error.transientValidation)) {
        try {
          return recoverStrategyNotesSchemaResponseV2({
            failureReceipt: error.safeReceipt,
            providerValue: error.transientCandidate,
            validation: error.transientValidation,
            wire,
            providerRequest: args.providerRequest,
            outputContract: args.outputContract,
            capabilityReceipt: args.capabilityReceipt,
          });
        } catch { throw error; }
      }
      try {
        const recovery = recoverSavedStrategyNotesRoleValueV3({
          failureReceipt: error.safeReceipt, wire,
          outputContract: args.outputContract,
          capabilityReceipt: args.capabilityReceipt,
        });
        return materializeSavedNotesRecoveryResponseV3({ recovery,
          failureReceipt: error.safeReceipt, wire,
          providerRequest: args.providerRequest,
          outputContract: args.outputContract,
          capabilityReceipt: args.capabilityReceipt });
      } catch { throw error; }
    }
  } });
}
