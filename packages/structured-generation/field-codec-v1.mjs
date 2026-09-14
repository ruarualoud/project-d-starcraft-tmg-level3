import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { assertStarcraftTmgOutputContractV1, createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from './output-contract-registry-v1.mjs';

// One role-independent Interface: compile, inspect, complete, verify.
// No Provider, identity inference, source authority, journal or credentials.
export const STRUCTURED_FIELD_CODEC_BINDING_V1 = seal({
  version: 'structured_field_codec_v1', schemaAuthority: 'output_contract_registry_v1',
  extensionPolicy: 'preserve_unknown_nulls_as_sidecar_except_host_control_names',
  nonNullUnknownPolicy: 'retain_and_require_adjudication',
  missingValuePolicy: 'typed_local_generation_not_default_fill',
  newSemanticContentRequiresReview: true, providerCalls: 0,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
export const STRUCTURED_FIELD_CODEC_BINDING_V2 = seal({
  version: 'structured_field_codec_v2', schemaAuthority: 'output_contract_registry_v1',
  extensionPolicy: 'preserve_unknown_null_or_exact_empty_string_as_sidecar_except_host_control_names',
  nonNullUnknownPolicy: 'exact_empty_string_is_representation_empty_other_values_require_adjudication',
  missingValuePolicy: 'typed_local_generation_not_default_fill',
  newSemanticContentRequiresReview: true, providerCalls: 0,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
export const STRUCTURED_FIELD_CODEC_BINDING_V3 = seal({
  version: 'structured_field_codec_v3', schemaAuthority: 'output_contract_registry_v1',
  extensionPolicy: 'preserve_all_unknown_model_fields_as_audit_sidecar_then_drop_except_host_control_names',
  unknownFieldPolicy: 'schema_declared_fields_are_authoritative_unknown_fields_never_supply_required_content',
  missingValuePolicy: 'typed_local_generation_not_default_fill',
  newSemanticContentRequiresReview: true, providerCalls: 0,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});

const CONTROL = new Set(['__proto__', 'prototype', 'constructor', 'hash', 'contractHash',
  'trainingTruth', 'runtimeAccepted', 'published', 'semanticAcceptance', 'semanticAcceptanceInherited',
  'acceptanceStatus', 'publicationStatus', 'canAffectRules', 'canAffectStrategy', 'humanReviewed']);
const own = (v, key) => Object.hasOwn(v, key);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const freeze = v => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); }
  return v;
};
const ref = id => ({ id, version: 'v1', hash: hash(id) });
const pointer = parts => '/' + parts.map(p => String(p).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
const jsonPath = parts => '$' + parts.map(p => typeof p === 'number' ? `[${p}]` : '.' + p).join('');
function data(value) {
  let nodes = 0;
  const visit = (v, depth = 0) => {
    if (++nodes > 50000 || depth > 32) fail('FIELD_CODEC_VALUE_LIMIT');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number' && Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v)) && !Object.is(v, -0)) return;
    if (!v || typeof v !== 'object') fail('FIELD_CODEC_NON_JSON_VALUE');
    if (!Array.isArray(v) && ![Object.prototype, null].includes(Object.getPrototypeOf(v))) fail('FIELD_CODEC_NON_JSON_VALUE');
    if (Reflect.ownKeys(v).some(key => typeof key !== 'string' || !Array.isArray(v) &&
      !Object.getOwnPropertyDescriptor(v, key)?.enumerable)) fail('FIELD_CODEC_NON_JSON_VALUE');
    if (Array.isArray(v) && (Object.keys(v).length !== v.length || Object.keys(v).some((key, i) => key !== String(i))))
      fail('FIELD_CODEC_NON_JSON_VALUE');
    for (const key of Object.keys(v)) {
      const descriptor = Object.getOwnPropertyDescriptor(v, key);
      if (!own(descriptor, 'value')) fail('FIELD_CODEC_NON_JSON_VALUE');
      visit(descriptor.value, depth + 1);
    }
  };
  visit(value);
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > 1024 * 1024) fail('FIELD_CODEC_VALUE_LIMIT');
  return JSON.parse(text);
}
function schemaRows(schema, path = '$', rows = []) {
  const { properties, items, description, ...constraints } = schema;
  rows.push({ path, constraints, ...(description ? { description } : {}) });
  if (properties) for (const [key, value] of Object.entries(properties)) schemaRows(value, path + '.' + key, rows);
  if (items) schemaRows(items, path + '[]', rows);
  return rows;
}

export function createStructuredFieldCodecV1(suppliedContract,
  { binding = STRUCTURED_FIELD_CODEC_BINDING_V1 } = {}) {
  const contract = assertStarcraftTmgOutputContractV1(suppliedContract);
  verifySeal(binding);
  if (![STRUCTURED_FIELD_CODEC_BINDING_V1.hash,
    STRUCTURED_FIELD_CODEC_BINDING_V2.hash,
    STRUCTURED_FIELD_CODEC_BINDING_V3.hash].includes(binding.hash))
    fail('FIELD_CODEC_BINDING_UNSUPPORTED');
  const allowExactEmptyString =
    [STRUCTURED_FIELD_CODEC_BINDING_V2.hash, STRUCTURED_FIELD_CODEC_BINDING_V3.hash].includes(binding.hash);
  const dropAllUnknown = binding.hash === STRUCTURED_FIELD_CODEC_BINDING_V3.hash;
  const contractRef = outputContractRefStarcraftTmgV1(contract);
  const reserved = new Set([...CONTROL, ...contract.hostOwnedFields]);
  function compile(transport = 'responses_json_schema') {
    if (!['responses_json_schema', 'deepseek_strict_tool'].includes(transport)) fail('FIELD_CODEC_TRANSPORT_UNSUPPORTED');
    const deferredConstraints = [];
    const lower = (node, path = '$') => {
      const next = structuredClone(node);
      if (transport === 'deepseek_strict_tool') {
        const deferred = node.type === 'string' ? ['minLength', 'maxLength']
          : node.type === 'array' ? ['minItems', 'maxItems', 'uniqueItems'] : [];
        for (const key of deferred) if (own(next, key)) {
          deferredConstraints.push({ path, keyword: key, value: next[key], enforcedBy: 'local_validator' });
          delete next[key];
        }
      }
      if (node.properties) next.properties = Object.fromEntries(Object.entries(node.properties)
        .map(([key, value]) => [key, lower(value, path + '.' + key)]));
      if (node.items) next.items = lower(node.items, path + '[]');
      return next;
    };
    const providerSchema = lower(contract.providerSchema), rows = schemaRows(contract.providerSchema);
    const instructions = [
      'Return exactly the model-owned fields declared below; no prose outside the result.',
      'A required field may not be omitted. Empty arrays are legal only when the task has no corresponding obligations.',
      'Use supplied identities only. Do not invent missing judgments, citations, addresses or acceptance status.',
      'Every numerical/cardinality/string limit below is generated from the same authoritative output contract.',
      `Model-owned root fields: ${JSON.stringify(contract.modelOwnedFields)}.`,
      `Host-owned fields (never generate): ${JSON.stringify(contract.hostOwnedFields)}.`,
      ...rows.map(row => `${row.path}: ${JSON.stringify(row.constraints)}${row.description ? ' ' + row.description : ''}`),
      'Schema conformance does not establish source truth or strategy effectiveness.',
    ].join('\n');
    return freeze(seal({ version: 'structured_field_compilation_v1', bindingHash: binding.hash,
      contractRef, transport, schemaName: contract.schemaName, providerSchema,
      localSchema: contract.providerSchema, rows, instructions, deferredConstraints,
      providerCapabilityVerified: false, semanticAcceptance: false, trainingTruth: false }));
  }

  function inspect(suppliedValue) {
    const originalValue = data(suppliedValue), value = data(originalValue), sidecar = [], blocks = [];
    const nodes = new Map();
    function walk(schema, actual, parts) {
      nodes.set(jsonPath(parts), { parts, schema });
      if (schema.type === 'object' && object(actual)) {
        for (const key of Object.keys(actual)) if (!own(schema.properties, key)) {
          const representationEmpty = actual[key] === null
            || allowExactEmptyString && actual[key] === '';
          const entry = { pointer: pointer([...parts, key]), parts: [...parts, key], value: data(actual[key]),
            valueHash: hash(actual[key]), reason: reserved.has(key) ? 'host_control_field'
              : actual[key] === null ? 'unknown_null_extension'
              : allowExactEmptyString && actual[key] === ''
                ? 'unknown_empty_string_extension'
                : dropAllUnknown ? 'unknown_schema_extension'
                : 'unconsumed_semantic_content' };
          sidecar.push(entry);
          if ((representationEmpty || dropAllUnknown) && entry.reason !== 'host_control_field')
            delete actual[key];
          else blocks.push({ pointer: entry.pointer, reason: entry.reason });
        }
        for (const [key, child] of Object.entries(schema.properties)) {
          const childParts = [...parts, key];
          nodes.set(jsonPath(childParts), { parts: childParts, schema: child });
          if (own(actual, key)) walk(child, actual[key], childParts);
        }
      } else if (schema.type === 'array' && Array.isArray(actual)) {
        actual.forEach((child, i) => walk(schema.items, child, [...parts, i]));
      }
    }
    walk(contract.providerSchema, value, []);
    const originalValidation = validate(contract.providerSchema, originalValue);
    const validation = validate(contract.providerSchema, value);
    const requested = [];
    if (!blocks.length) for (const issue of validation.issues) {
      const node = nodes.get(issue.path);
      if (!node || node.parts.some(part => typeof part === 'string' && reserved.has(part))) {
        blocks.push({ pointer: issue.path, reason: 'unbound_or_protected_issue' }); continue;
      }
      if (!requested.some(row => hash(row.parts) === hash(node.parts))) requested.push({ ...node });
    }
    // An invalid parent subsumes its child jobs. The model never supplies paths.
    const parents = requested.filter(row => !requested.some(other => other.parts.length < row.parts.length
      && other.parts.every((part, i) => part === row.parts[i])));
    if (parents.length > 64) blocks.push({ pointer: '$', reason: 'repair_batch_limit' });
    const jobs = blocks.length ? [] : parents.map((row, slot) => ({ slot, key: 'field' + slot,
      pointer: row.parts.length ? pointer(row.parts) : '', parts: row.parts, schema: row.schema,
      issuePaths: validation.issues.filter(issue => issue.path === jsonPath(row.parts)
        || issue.path.startsWith(jsonPath(row.parts) + '.') || issue.path.startsWith(jsonPath(row.parts) + '[')).map(issue => issue.path),
      requiresSemanticReview: true }));
    let repairContract = null;
    if (jobs.length) {
      const signature = hash({ contractRef, jobs: jobs.map(({ key, schema }) => ({ key, schema })) });
      repairContract = createStarcraftTmgOutputContractV1({
        id: 'starcraft-tmg.field-values.' + signature.slice(0, 24), version: '2026.09.09.1',
        schemaName: 'field_values_' + signature.slice(0, 24),
        providerSchema: { type: 'object', properties: Object.fromEntries(jobs.map(job => [job.key, job.schema])),
          required: jobs.map(job => job.key), additionalProperties: false },
        modelOwnedFields: jobs.map(job => job.key), hostOwnedFields: ['paths', 'originalHash', 'acceptanceStatus', 'trainingTruth'],
        mapperRef: ref('structured_field_codec_host_apply_v1'), semanticValidatorRef: contract.semanticValidatorRef,
        description: 'Host-bound replacement values only. Missing judgments require source-aware generation and independent review.',
      });
    }
    return freeze(seal({ version: 'structured_field_inspection_v1', bindingHash: binding.hash,
      contractRef, originalValue, originalValueHash: hash(originalValue), value, valueHash: hash(value),
      originalValidation, validation, sidecar, blocks, jobs, repairContract,
      status: blocks.length ? 'needs_adjudication' : jobs.length ? 'needs_values' : 'shape_ready',
      unknownFieldsSilentlyDropped: false, semanticAcceptance: false, trainingTruth: false }));
  }

  function complete(suppliedInspection, suppliedValues = null) {
    verifySeal(suppliedInspection);
    const plan = inspect(suppliedInspection.originalValue);
    if (plan.hash !== suppliedInspection.hash) fail('FIELD_CODEC_INSPECTION_DRIFT');
    if (plan.blocks.length) fail('FIELD_CODEC_ADJUDICATION_REQUIRED');
    let value = data(plan.value), replacements = null;
    if (plan.jobs.length) {
      if (suppliedValues === null) fail('FIELD_CODEC_VALUES_REQUIRED');
      replacements = data(suppliedValues);
      const checked = validate(plan.repairContract.providerSchema, replacements);
      if (!checked.ok) fail('FIELD_CODEC_REPLACEMENTS_INVALID');
      for (const job of plan.jobs) {
        if (!job.parts.length) { value = data(replacements[job.key]); continue; }
        let parent = value;
        for (const part of job.parts.slice(0, -1)) {
          if (parent === null || typeof parent !== 'object' || !own(parent, part)) fail('FIELD_CODEC_PARENT_MISSING');
          parent = parent[part];
        }
        Object.defineProperty(parent, job.parts.at(-1), { value: data(replacements[job.key]),
          enumerable: true, configurable: true, writable: true });
      }
    } else if (suppliedValues !== null) fail('FIELD_CODEC_UNREQUESTED_REPLACEMENTS');
    const validation = validate(contract.providerSchema, value);
    if (!validation.ok) fail('FIELD_CODEC_MERGED_SCHEMA_INVALID');
    return freeze(seal({ version: 'structured_field_completion_v1', bindingHash: binding.hash,
      contractRef, inspectionHash: plan.hash, originalValueHash: plan.originalValueHash,
      value, valueHash: hash(value), replacements, sidecar: plan.sidecar,
      changedPointers: plan.jobs.map(job => job.pointer), newModelValuesUsed: plan.jobs.length > 0,
      validation, originalProviderResultReclassified: false, schemaOnly: true,
      semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false }));
  }
  function verify({ originalValue, completion, replacements = null }) {
    verifySeal(completion);
    const expected = complete(inspect(originalValue), replacements);
    if (hash(completion) !== hash(expected)) fail('FIELD_CODEC_COMPLETION_DRIFT');
    return expected;
  }
  return Object.freeze({ compile, inspect, complete, verify });
}
