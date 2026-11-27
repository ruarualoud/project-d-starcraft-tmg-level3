import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_OUTPUT_CONTRACT_VERSION =
  "starcraft_tmg_output_contract_v1";
export const STARCRAFT_TMG_OUTPUT_CONTRACT_REGISTRY_VERSION =
  "starcraft_tmg_output_contract_registry_v1";
export const STARCRAFT_TMG_OUTPUT_CONTRACT_CHAIN_VERSION =
  "starcraft_tmg_output_contract_chain_v1";
export const STARCRAFT_TMG_JSON_SCHEMA_DIALECT =
  "https://json-schema.org/draft/2020-12/schema";
export const STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION =
  "project_d_provider_json_schema_strict_v1";

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const SCHEMA_NAME = /^[a-z][a-z0-9_]{2,63}$/u;
const REF_FIELDS = new Set(["id", "version", "hash"]);
const COMPONENT_REF_FIELDS = new Set(["id", "version", "hash"]);
const CONTRACT_INPUT_FIELDS = new Set([
  "id", "version", "schemaName", "providerSchema", "modelOwnedFields",
  "hostOwnedFields", "mapperRef", "semanticValidatorRef", "description",
]);
const CONTRACT_FIELDS = new Set([
  "schemaVersion", "id", "version", "schemaName", "schemaDialect",
  "schemaSubsetVersion", "providerSchema", "modelOwnedFields",
  "hostOwnedFields", "mapperRef", "semanticValidatorRef", "description",
  "trainingTruth", "contractHash",
]);
const CHAIN_SEAMS = Object.freeze([
  "workflow", "provider_request", "capability_receipt", "transport_receipt",
  "local_validation", "stored_artifact", "continuation_manifest",
]);
const ROOT_SCHEMA_KEYS = new Set([
  "type", "properties", "required", "additionalProperties", "description",
]);
const OBJECT_SCHEMA_KEYS = ROOT_SCHEMA_KEYS;
const ARRAY_SCHEMA_KEYS = new Set([
  "type", "items", "minItems", "maxItems", "uniqueItems", "description",
]);
const STRING_SCHEMA_KEYS = new Set([
  "type", "minLength", "maxLength", "enum", "description",
]);
const INTEGER_SCHEMA_KEYS = new Set([
  "type", "minimum", "maximum", "enum", "description",
]);
const BOOLEAN_SCHEMA_KEYS = new Set(["type", "description"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbidden = Object.keys(value).filter((key) => !allowed.has(key));
  if (forbidden.length) {
    throw new TypeError(`${label} contains forbidden fields: ${forbidden.join(",")}`);
  }
}

function safeId(value, field, pattern = ID) {
  const normalized = String(value || "").trim();
  if (!pattern.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeHash(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function boundedInteger(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < minimum
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function stringArray(value, field, { minimum = 0, maximum = 128 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  const result = value.map((entry, index) =>
    safeId(entry, `${field}[${index}]`));
  if (new Set(result).size !== result.length) {
    throw new TypeError(`${field} contains duplicates`);
  }
  return result;
}

function componentRef(value, field) {
  exactFields(value, COMPONENT_REF_FIELDS, field);
  return freeze({
    id: safeId(value.id, `${field}.id`),
    version: safeId(value.version, `${field}.version`),
    hash: safeHash(value.hash, `${field}.hash`),
  });
}

export function normalizeStarcraftTmgOutputContractRefV1(value) {
  exactFields(value, REF_FIELDS, "outputContractRef");
  return freeze({
    id: safeId(value.id, "outputContractRef.id"),
    version: safeId(value.version, "outputContractRef.version"),
    hash: safeHash(value.hash, "outputContractRef.hash"),
  });
}

// Untagged tool steps are safe only when their semantic schemas are provably
// disjoint. This admits Host-owned discriminators without accepting ambiguity.
function disjointSchemaVariants(a,b){
  if(a.anyOf)return a.anyOf.every(v=>disjointSchemaVariants(v,b));
  if(b.anyOf)return b.anyOf.every(v=>disjointSchemaVariants(a,v));
  if(a.type!==b.type&&!(['number','integer'].includes(a.type)&&['number','integer'].includes(b.type)))return true;
  if(a.enum&&b.enum&&!a.enum.some(v=>b.enum.includes(v)))return true;
  if(a.type==='object'&&b.type==='object'&&a.additionalProperties===false&&b.additionalProperties===false){
    if(a.required.some(k=>!Object.hasOwn(b.properties,k))||b.required.some(k=>!Object.hasOwn(a.properties,k)))return true;
    return a.required.some(k=>b.required.includes(k)&&disjointSchemaVariants(a.properties[k],b.properties[k]));
  }
  return false;
}

function assertSchemaNode(value, path = "$", depth = 0, root = false) {
  if (!object(value) || depth > 32) {
    throw new TypeError(`${path} is outside the JSON Schema subset`);
  }
  // Nullable values, tagged commands, or provably disjoint semantic tool steps.
  // Overlapping/general unions remain outside this subset.
  if (Object.hasOwn(value, "anyOf")) {
    const branches=value.anyOf;
    const nullable=Array.isArray(branches)&&branches.length===2
      &&branches.filter(s=>s?.type==='null').length===1;
    const tags=Array.isArray(branches)?branches.map(s=>s?.type==='object'
      &&s.properties?.kind?.type==='string'&&s.properties.kind.enum?.length===1
      ?s.properties.kind.enum[0]:null):[];
    const tagged=tags.length>=2&&tags.length<=64&&tags.every(t=>typeof t==='string')
      &&new Set(tags).size===tags.length;
    const disjoint=Array.isArray(branches)&&branches.length>=2&&branches.length<=64
      &&branches.every(s=>s?.type==='object'&&s.additionalProperties===false&&Array.isArray(s.required)&&object(s.properties))
      &&branches.every((a,i)=>branches.slice(i+1).every(b=>disjointSchemaVariants(a,b)));
    if(root||Object.keys(value).length!==1||!nullable&&!tagged&&!disjoint)
      throw new TypeError(`${path} must be nullable, uniquely tagged, or closed disjoint object variants`);
    for (const branch of value.anyOf) {
      if (branch.type === "null") {
        if (Object.keys(branch).length !== 1) throw new TypeError(`${path} null branch must contain only type`);
      } else assertSchemaNode(branch, path, depth + 1, false);
    }
    return value;
  }
  const type = value.type;
  const allowed = type === "object" ? OBJECT_SCHEMA_KEYS
    : type === "array" ? ARRAY_SCHEMA_KEYS
      : type === "string" ? STRING_SCHEMA_KEYS
        : type === "integer" || type === "number" ? INTEGER_SCHEMA_KEYS
          : type === "boolean" ? BOOLEAN_SCHEMA_KEYS : null;
  if (!allowed || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${path} uses an unsupported JSON Schema keyword or type`);
  }
  if (root && type !== "object") {
    throw new TypeError("Provider output schema root must be an object");
  }
  if (value.description !== undefined
    && (typeof value.description !== "string" || value.description.length > 2_000)) {
    throw new TypeError(`${path}.description is invalid`);
  }
  if (type === "object") {
    if (!object(value.properties) || value.additionalProperties !== false) {
      throw new TypeError(`${path} must close additional object properties`);
    }
    const keys = Object.keys(value.properties);
    if (!keys.length || keys.length > 64
      || keys.some((key) => !/^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(key))) {
      throw new TypeError(`${path}.properties is invalid`);
    }
    if (!Array.isArray(value.required) || value.required.length !== keys.length
      || new Set(value.required).size !== value.required.length
      || keys.some((key) => !value.required.includes(key))) {
      throw new TypeError(`${path}.required must contain every property exactly once`);
    }
    for (const key of keys) {
      assertSchemaNode(value.properties[key], `${path}.properties.${key}`,
        depth + 1, false);
    }
  } else if (type === "array") {
    const minimum = boundedInteger(value.minItems, `${path}.minItems`, 0, Number.MAX_SAFE_INTEGER);
    // Zero is a valid maximum for a read-only/control return that cannot submit
    // actions. Omitted maxima remain unbounded; min/max consistency is checked below.
    const maximum = value.maxItems === undefined ? null
      : boundedInteger(value.maxItems, `${path}.maxItems`, 0, Number.MAX_SAFE_INTEGER);
    if (maximum !== null && minimum > maximum || !object(value.items)
      || value.uniqueItems !== undefined && value.uniqueItems !== true) {
      throw new TypeError(`${path} array bounds are invalid`);
    }
    assertSchemaNode(value.items, `${path}.items`, depth + 1, false);
  } else if (type === "string") {
    const minimum = boundedInteger(value.minLength, `${path}.minLength`, 0, 8_192);
    const maximum = boundedInteger(value.maxLength, `${path}.maxLength`, 1, 65_536);
    if (minimum > maximum) throw new TypeError(`${path} string bounds are invalid`);
    if (value.enum !== undefined
      && (!Array.isArray(value.enum) || !value.enum.length
        || value.enum.length > 64 || new Set(value.enum).size !== value.enum.length
        || value.enum.some((entry) => typeof entry !== "string"
          || entry.length < minimum || entry.length > maximum))) {
      throw new TypeError(`${path}.enum is invalid`);
    }
  } else if (type === "number") {
    for (const key of ["minimum", "maximum"]) {
      if (value[key] !== undefined && !Number.isFinite(value[key])) {
        throw new TypeError(`${path}.${key} must be a finite number`);
      }
    }
    if (value.minimum !== undefined && value.maximum !== undefined && value.minimum > value.maximum) {
      throw new TypeError(`${path} number bounds are invalid`);
    }
    if (value.enum !== undefined && (!Array.isArray(value.enum) || !value.enum.length
      || value.enum.length > 64 || new Set(value.enum).size !== value.enum.length
      || value.enum.some(entry => !Number.isFinite(entry)
        || value.minimum !== undefined && entry < value.minimum
        || value.maximum !== undefined && entry > value.maximum))) {
      throw new TypeError(`${path}.enum is invalid`);
    }
  } else if (type === "integer") {
    const minimum = boundedInteger(value.minimum, `${path}.minimum`,
      Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const maximum = boundedInteger(value.maximum, `${path}.maximum`,
      Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    if (minimum > maximum) throw new TypeError(`${path} integer bounds are invalid`);
    if (value.enum !== undefined
      && (!Array.isArray(value.enum) || !value.enum.length
        || value.enum.length > 64 || new Set(value.enum).size !== value.enum.length
        || value.enum.some((entry) => !Number.isSafeInteger(entry)
          || entry < minimum || entry > maximum))) {
      throw new TypeError(`${path}.enum is invalid`);
    }
  }
  return value;
}

export function assertStarcraftTmgProviderJsonSchemaSubsetV1(value) {
  const normalized = clone(value);
  // Schema shape is validated below. Request transport owns byte capacity;
  // a growing semantic-choice catalogue is not an invalid schema.
  assertSchemaNode(normalized, "$", 0, true);
  return freeze(normalized);
}

function collectValidationIssues(schema, value, path, issues) {
  if (issues.length >= 32) return;
  if (schema.anyOf) {
    const nullable=schema.anyOf.some(s=>s.type==='null');
    if(nullable){
      if(value===null)return;
      collectValidationIssues(schema.anyOf.find(s=>s.type!=='null'),value,path,issues);
    }else if(schema.anyOf.every(s=>s.properties?.kind?.enum?.length===1)){
      const branch=object(value)&&schema.anyOf.find(s=>s.properties.kind.enum[0]===value.kind);
      if(!branch)issues.push({path:`${path}.kind`,code:'tagged_operation_required',
        allowedValues:schema.anyOf.map(s=>s.properties.kind.enum[0])});
      else collectValidationIssues(branch,value,path,issues);
    }else{
      const operationMatches=schema.anyOf.filter(s=>s.properties?.operation?.enum?.includes(value?.operation));
      const candidates=operationMatches.length?operationMatches:schema.anyOf;
      const results=candidates.map(branch=>{const found=[];collectValidationIssues(branch,value,path,found);return found;});
      const valid=results.filter(found=>found.length===0);
      if(valid.length>1)issues.push({path,code:'ambiguous_semantic_variant'});
      else if(!valid.length)issues.push(...results.sort((a,b)=>a.length-b.length)[0]);
    }
    return;
  }
  if (schema.type === "object") {
    if (!object(value)) {
      issues.push({ path, code: "type_object_required",
        expectedType: "object" });
      return;
    }
    const keys = Object.keys(value);
    for (const required of schema.required) {
      if (!Object.hasOwn(value, required)) {
        issues.push({ path: `${path}.${required}`,
          code: "required_field_missing", required: true });
      }
    }
    for (const key of keys) {
      if (!Object.hasOwn(schema.properties, key)) {
        issues.push({ path: `${path}.${key}`,
          code: "additional_property_forbidden",
          additionalProperties: false });
      } else {
        collectValidationIssues(schema.properties[key], value[key],
          `${path}.${key}`, issues);
      }
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      issues.push({ path, code: "type_array_required",
        expectedType: "array" });
      return;
    }
    if (value.length < schema.minItems) issues.push({ path,
      code: "array_too_short", actualItems: value.length,
      minItems: schema.minItems, maxItems: schema.maxItems });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push({ path,
      code: "array_too_long", actualItems: value.length,
      minItems: schema.minItems, maxItems: schema.maxItems });
    if (schema.uniqueItems === true
      && new Set(value.map((entry) => hashStarcraftTmgContract(entry))).size
        !== value.length) issues.push({ path, code: "array_items_not_unique",
      actualItems: value.length, uniqueItems: true });
    value.forEach((entry, index) => collectValidationIssues(
      schema.items, entry, `${path}[${index}]`, issues));
    return;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") {
      issues.push({ path, code: "type_string_required",
        expectedType: "string" });
      return;
    }
    if (value.length < schema.minLength) issues.push({ path,
      code: "string_too_short", actualLength: value.length,
      minLength: schema.minLength, maxLength: schema.maxLength });
    if (value.length > schema.maxLength) issues.push({ path,
      code: "string_too_long", actualLength: value.length,
      minLength: schema.minLength, maxLength: schema.maxLength });
    if (schema.enum && !schema.enum.includes(value)) issues.push({ path,
      code: "enum_mismatch", allowedValues: schema.enum });
    return;
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push({ path, code: "type_finite_number_required", expectedType: "number" });
      return;
    }
    if (schema.minimum !== undefined && value < schema.minimum) issues.push({ path,
      code: "number_too_small", actualValue: value, minimum: schema.minimum });
    if (schema.maximum !== undefined && value > schema.maximum) issues.push({ path,
      code: "number_too_large", actualValue: value, maximum: schema.maximum });
    if (schema.enum && !schema.enum.includes(value)) issues.push({ path,
      code: "enum_mismatch", allowedValues: schema.enum });
    return;
  }
  if (schema.type === "integer") {
    if (!Number.isSafeInteger(value)) {
      issues.push({ path, code: "type_integer_required",
        expectedType: "integer" });
      return;
    }
    if (value < schema.minimum) issues.push({ path,
      code: "integer_too_small", actualValue: value,
      minimum: schema.minimum, maximum: schema.maximum });
    if (value > schema.maximum) issues.push({ path,
      code: "integer_too_large", actualValue: value,
      minimum: schema.minimum, maximum: schema.maximum });
    if (schema.enum && !schema.enum.includes(value)) issues.push({ path,
      code: "enum_mismatch", allowedValues: schema.enum });
    return;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") {
    issues.push({ path, code: "type_boolean_required",
      expectedType: "boolean" });
  }
}

export function validateStarcraftTmgProviderJsonSchemaValueV1(schema, value) {
  const normalizedSchema = assertStarcraftTmgProviderJsonSchemaSubsetV1(schema);
  return validateNormalizedSchemaValue(normalizedSchema, value);
}

// Host discriminators and retained repair branches are never sent to a Provider.
// Keep the same dialect/node checks; a wire-size budget is not a value-validity
// rule for these expanded, locally generated schemas.
export function validateStarcraftTmgHostJsonSchemaValueV1(schema, value) {
  const normalizedSchema = clone(schema);
  assertSchemaNode(normalizedSchema, "$", 0, true);
  return validateNormalizedSchemaValue(normalizedSchema, value);
}

function validateNormalizedSchemaValue(normalizedSchema, value) {
  const issues = [];
  collectValidationIssues(normalizedSchema, value, "$", issues);
  return freeze({
    ok: issues.length === 0,
    issues,
    valueHash: hashStarcraftTmgContract(value),
    schemaHash: hashStarcraftTmgContract(normalizedSchema),
  });
}

export function createStarcraftTmgOutputContractV1(input = {}) {
  exactFields(input, CONTRACT_INPUT_FIELDS, "Output contract input");
  const providerSchema = assertStarcraftTmgProviderJsonSchemaSubsetV1(
    input.providerSchema);
  const modelOwnedFields = stringArray(input.modelOwnedFields,
    "modelOwnedFields", { minimum: 1, maximum: 64 });
  const hostOwnedFields = stringArray(input.hostOwnedFields || [],
    "hostOwnedFields", { maximum: 128 });
  const rootFields = Object.keys(providerSchema.properties).sort();
  if (modelOwnedFields.slice().sort().join("\n") !== rootFields.join("\n")) {
    throw new TypeError("modelOwnedFields must equal the provider schema root fields");
  }
  if (hostOwnedFields.some((field) => modelOwnedFields.includes(field))) {
    throw new TypeError("Host-owned fields must not be model-owned");
  }
  const body = {
    schemaVersion: STARCRAFT_TMG_OUTPUT_CONTRACT_VERSION,
    id: safeId(input.id, "Output contract id"),
    version: safeId(input.version, "Output contract version"),
    schemaName: safeId(input.schemaName, "Output contract schemaName", SCHEMA_NAME),
    schemaDialect: STARCRAFT_TMG_JSON_SCHEMA_DIALECT,
    schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
    providerSchema: clone(providerSchema),
    modelOwnedFields,
    hostOwnedFields,
    mapperRef: componentRef(input.mapperRef, "mapperRef"),
    semanticValidatorRef: componentRef(
      input.semanticValidatorRef, "semanticValidatorRef"),
    description: String(input.description || "").trim().slice(0, 2_000),
    trainingTruth: false,
  };
  return freeze({ ...body, contractHash: hashStarcraftTmgContract(body) });
}

export function assertStarcraftTmgOutputContractV1(value) {
  exactFields(value, CONTRACT_FIELDS, "Output contract");
  const { contractHash, ...body } = clone(value);
  if (body.schemaVersion !== STARCRAFT_TMG_OUTPUT_CONTRACT_VERSION
    || body.schemaDialect !== STARCRAFT_TMG_JSON_SCHEMA_DIALECT
    || body.schemaSubsetVersion !== STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION
    || body.trainingTruth !== false
    || safeHash(contractHash, "Output contract hash")
      !== hashStarcraftTmgContract(body)) {
    throw new TypeError("Output contract integrity is invalid");
  }
  return createStarcraftTmgOutputContractV1({
    id: body.id,
    version: body.version,
    schemaName: body.schemaName,
    providerSchema: body.providerSchema,
    modelOwnedFields: body.modelOwnedFields,
    hostOwnedFields: body.hostOwnedFields,
    mapperRef: body.mapperRef,
    semanticValidatorRef: body.semanticValidatorRef,
    description: body.description,
  });
}

export function outputContractRefStarcraftTmgV1(value) {
  const contract = assertStarcraftTmgOutputContractV1(value);
  return freeze({ id: contract.id, version: contract.version,
    hash: contract.contractHash });
}

export function createStarcraftTmgOutputContractRegistryV1(options = {}) {
  const entries = Array.isArray(options.entries) ? options.entries : [];
  if (!entries.length) throw new TypeError("Output contract entries are required");
  const records = new Map();
  for (const entry of entries) {
    const contract = assertStarcraftTmgOutputContractV1(entry);
    const key = `${contract.id}@${contract.version}`;
    if (records.has(key)) throw new TypeError("Output contract entry is duplicated");
    records.set(key, contract);
  }
  function resolve(input = {}) {
    exactFields(input, new Set(["outputContractRef"]),
      "Output contract resolve input");
    const ref = normalizeStarcraftTmgOutputContractRefV1(
      input.outputContractRef);
    const contract = records.get(`${ref.id}@${ref.version}`);
    if (!contract || contract.contractHash !== ref.hash) {
      return freeze({ ok: false, reason: "output_contract_not_found",
        trainingTruth: false });
    }
    return freeze({ ok: true, outputContract: clone(contract),
      outputContractRef: clone(ref), trainingTruth: false });
  }
  function validate(input = {}) {
    exactFields(input, new Set(["outputContractRef", "value"]),
      "Output contract validate input");
    const resolved = resolve({ outputContractRef: input.outputContractRef });
    if (!resolved.ok) return resolved;
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
      resolved.outputContract.providerSchema, input.value);
    return freeze({ ...validation,
      outputContractRef: clone(resolved.outputContractRef),
      trainingTruth: false });
  }
  function listPublic() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_OUTPUT_CONTRACT_REGISTRY_VERSION}.list`,
      contracts: [...records.values()].map((contract) => ({
        outputContractRef: outputContractRefStarcraftTmgV1(contract),
        schemaName: contract.schemaName,
        schemaSubsetVersion: contract.schemaSubsetVersion,
        modelOwnedFields: [...contract.modelOwnedFields],
        hostOwnedFields: [...contract.hostOwnedFields],
      })),
      trainingTruth: false,
    });
  }
  return Object.freeze({ resolve, validate, listPublic });
}

export function createStarcraftTmgOutputContractChainReceiptV1(input = {}) {
  exactFields(input, new Set(["expectedRef", "seams"]),
    "Output contract chain input");
  const expectedRef = normalizeStarcraftTmgOutputContractRefV1(input.expectedRef);
  exactFields(input.seams, new Set(CHAIN_SEAMS), "Output contract chain seams");
  const observedSeams = {};
  for (const seam of CHAIN_SEAMS) {
    if (!Object.hasOwn(input.seams, seam)) {
      const error = new Error("CONTRACT_CHAIN_DRIFT");
      error.code = "CONTRACT_CHAIN_DRIFT";
      throw error;
    }
    const observed = normalizeStarcraftTmgOutputContractRefV1(input.seams[seam]);
    if (hashStarcraftTmgContract(observed) !== hashStarcraftTmgContract(expectedRef)) {
      const error = new Error("CONTRACT_CHAIN_DRIFT");
      error.code = "CONTRACT_CHAIN_DRIFT";
      throw error;
    }
    observedSeams[seam] = observed;
  }
  const body = {
    schemaVersion: STARCRAFT_TMG_OUTPUT_CONTRACT_CHAIN_VERSION,
    expectedRef,
    seams: observedSeams,
    chainComplete: true,
    trainingTruth: false,
  };
  return freeze({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}

export { CHAIN_SEAMS as STARCRAFT_TMG_OUTPUT_CONTRACT_CHAIN_SEAMS_V1 };
