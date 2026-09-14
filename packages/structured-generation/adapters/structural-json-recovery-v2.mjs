import { hash, seal, fail } from '../../skill-production/common.mjs';
import { assertStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from '../output-contract-registry-v1.mjs';

export const STRUCTURAL_JSON_RECOVERY_BINDING_V2 = seal({ version: 'structural_json_recovery_v2',
  grammar: 'exhaustive_closer_deletion_after_complete_value_unique_typed_container_layout',
  maximumEdits: 4, maximumRawBytes: 65536, maximumDepth: 64,
  maximumLiveStates: 512, maximumTransitions: 262144,
  insertionAllowed: false, replacementAllowed: false, scalarEditsAllowed: false,
  duplicateKeysAllowed: false, missingContentInvented: false,
  uniquenessRequiredBeforeValueConstraintValidation: true, schemaFailureRemainsRejectedCandidate: true,
  layoutUsesOnlyDeclaredContainerTypesAndRequiredContainers: true,
  unknownPropertiesPreservedForSchemaCorrection: true,
  originalParseableDocumentsUnchanged: true, originalFailedAttemptUnchanged: true,
  acceptanceScope: 'parsed_representation_only', semanticAcceptanceInherited: false, trainingTruth: false });
const binding = STRUCTURAL_JSON_RECOVERY_BINDING_V2;
const invalid = code => fail('STRUCTURAL_JSON_V2_' + code);

// This is NOT the full acceptance schema. It locates named containers without
// consulting verdict values, enums, bounds, desired outcomes or source IDs.
// Unknown properties remain intact; missing scalar fields remain schema debt.
function containerLayoutMatches(schema, value) {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    for (const name of schema.required || []) {
      const child = schema.properties?.[name];
      if (['array', 'object'].includes(child?.type) && !Object.hasOwn(value, name)) return false;
    }
    return Object.entries(schema.properties || {}).every(([name, child]) =>
      !Object.hasOwn(value, name) || containerLayoutMatches(child, value[name]));
  }
  if (schema.type === 'array') return Array.isArray(value) && value.every(v => containerLayoutMatches(schema.items, v));
  // Scalar type/range/value repair belongs to the following schema stage.
  return value === null || typeof value !== 'object';
}

function assertLayoutSchema(schema) {
  if (!schema || typeof schema !== 'object' || !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(schema.type)
    || ['$ref', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else', 'patternProperties', 'dependentSchemas', 'prefixItems']
      .some(key => Object.hasOwn(schema, key))) invalid('LAYOUT_SCHEMA_UNSUPPORTED');
  if (schema.type === 'array') assertLayoutSchema(schema.items);
  if (schema.type === 'object') Object.values(schema.properties || {}).forEach(assertLayoutSchema);
}

// Lexing never reads a schema or changes a scalar. All offsets refer to the
// original UTF-16 text; malformed strings, unsafe numbers and prose fail closed.
function lex(text) {
  const tokens = [];
  for (let at = 0; at < text.length;) {
    if (/[ \t\r\n]/u.test(text[at])) { at++; continue; }
    const start = at, char = text[at];
    if ('{}[],:'.includes(char)) { tokens.push({ kind: char, at: at++ }); continue; }
    let kind, value;
    if (char === '"') {
      at++; let closed = false;
      while (at < text.length) {
        const c = text[at++];
        if (c === '\\') at++;
        else if (c === '"') { closed = true; break; }
      }
      if (!closed) invalid('LEXICAL_INVALID');
      try { value = JSON.parse(text.slice(start, at)); } catch { invalid('LEXICAL_INVALID'); }
      kind = 'string';
    } else {
      const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/u.exec(text.slice(at));
      if (!match) invalid('LEXICAL_INVALID');
      at += match[0].length; value = JSON.parse(match[0]); kind = 'scalar';
      if (typeof value === 'number' && (!Number.isFinite(value) || Number.isInteger(value) && !Number.isSafeInteger(value)))
        invalid('NUMERIC_PRECISION_UNSUPPORTED');
    }
    tokens.push({ kind, at: start, end: at, value, tokenHash: hash(text.slice(start, at)) });
  }
  return tokens;
}

export function decodeStructuralJsonV2(text, contract) {
  assertStarcraftTmgOutputContractV1(contract);
  assertLayoutSchema(contract.providerSchema);
  if (typeof text !== 'string' || !text.length || Buffer.byteLength(text) > binding.maximumRawBytes) invalid('INPUT_LIMIT');
  // Valid native documents belong to the existing native adapter, not recovery.
  let nativeParsed = false;
  try { JSON.parse(text); nativeParsed = true; } catch { /* Continue with bounded grammar. */ }
  if (nativeParsed) invalid('NOT_APPLICABLE');
  const tokens = lex(text);
  const excess = { ']': 0, '}': 0 };
  for (const token of tokens) {
    if (token.kind === '[') excess[']']--; else if (token.kind === '{') excess['}']--;
    else if (token.kind in excess) excess[token.kind]++;
  }
  const needed = excess[']'] + excess['}'];
  if (excess[']'] < 0 || excess['}'] < 0 || needed < 1) invalid('MISSING_OR_UNSUPPORTED_STRUCTURE');
  if (needed > binding.maximumEdits) invalid('EDIT_LIMIT');
  let states = [{ stack: [{ kind: 'root', mode: 'value', keys: [] }], edits: [], deleted: { ']': 0, '}': 0 }, duplicate: false }];
  let transitions = 0;
  const advance = (state, token) => {
    const next = structuredClone(state), frame = next.stack.at(-1), kind = token.kind;
    const complete = () => { frame.mode = frame.kind === 'root' ? 'end' : 'delimiter'; };
    if (frame.mode === 'value' || frame.mode === 'valueOrEnd') {
      if (frame.mode === 'valueOrEnd' && kind === ']') { next.stack.pop(); return next; }
      if (kind === '[' || kind === '{') {
        complete();
        if (next.stack.length > binding.maximumDepth) invalid('DEPTH_LIMIT');
        next.stack.push({ kind: kind === '[' ? 'array' : 'object', mode: kind === '[' ? 'valueOrEnd' : 'keyOrEnd', keys: [] });
      } else if (kind === 'string' || kind === 'scalar') complete();
      else return null;
    } else if (frame.mode === 'key' || frame.mode === 'keyOrEnd') {
      if (frame.mode === 'keyOrEnd' && kind === '}') { next.stack.pop(); return next; }
      if (kind !== 'string') return null;
      if (frame.keys.includes(token.value)) next.duplicate = true;
      frame.keys.push(token.value); frame.mode = 'colon';
    } else if (frame.mode === 'colon') {
      if (kind !== ':') return null; frame.mode = 'value';
    } else if (frame.mode === 'delimiter') {
      if (kind === (frame.kind === 'object' ? '}' : ']')) next.stack.pop();
      else if (kind === ',') frame.mode = frame.kind === 'object' ? 'key' : 'value';
      else return null;
    } else return null;
    return next;
  };
  for (const token of tokens) {
    const next = [];
    for (const state of states) {
      if (++transitions > binding.maximumTransitions) invalid('SEARCH_LIMIT');
      const frame = state.stack.at(-1);
      if (token.kind in excess && state.deleted[token.kind] < excess[token.kind]
        && (frame.mode === 'delimiter' || frame.mode === 'end')) {
        const deleted = structuredClone(state);
        deleted.deleted[token.kind]++;
        deleted.edits.push({ offsetUtf16: token.at, removed: token.kind }); next.push(deleted);
      }
      const consumed = advance(state, token);
      if (consumed) next.push(consumed);
      if (next.length > binding.maximumLiveStates) invalid('SEARCH_LIMIT');
    }
    states = next;
    if (!states.length) invalid('SYNTAX_UNSUPPORTED');
  }
  const complete = states.filter(s => s.stack.length === 1 && s.stack[0].mode === 'end'
    && s.edits.length === needed);
  if (!complete.length) invalid('SYNTAX_UNSUPPORTED');
  if (complete.some(s => s.duplicate)) invalid('DUPLICATE_KEY');
  const syntacticCandidates = complete.map(state => {
    let repaired = text;
    for (const edit of [...state.edits].reverse()) repaired = repaired.slice(0, edit.offsetUtf16) + repaired.slice(edit.offsetUtf16 + 1);
    let value;
    try { value = JSON.parse(repaired); } catch { invalid('PARSER_DIFFERENTIAL'); }
    return { value, repaired, edits: state.edits };
  });
  const candidates = syntacticCandidates.filter(c => containerLayoutMatches(contract.providerSchema, c.value));
  if (!candidates.length) invalid('CONTAINER_LAYOUT_UNSUPPORTED');
  if (new Set(candidates.map(c => hash(c.value))).size !== 1) invalid('AMBIGUOUS_STRUCTURE');
  candidates.sort((a, b) => {
    for (let n = 0; n < a.edits.length; n++) {
      const d = a.edits[n].offsetUtf16 - b.edits[n].offsetUtf16;
      if (d) return d;
    }
    return 0;
  });
  const selected = candidates[0];
  // Full schema/value validation is deliberately NOT used for disambiguation.
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, selected.value);
  const scalars = tokens.filter(t => t.kind === 'string' || t.kind === 'scalar')
    .map(t => ({ startUtf16: t.at, endUtf16: t.end, tokenHash: t.tokenHash }));
  return { value: selected.value, validation,
    receipt: seal({ version: binding.version + '.decode', bindingHash: binding.hash,
      outputContractRef: outputContractRefStarcraftTmgV1(contract), originalTextHash: hash(text),
      repairedTextHash: hash(selected.repaired), outputHash: hash(selected.value),
      localSchemaValidationHash: hash(validation), schemaPassed: validation.ok,
      nextStage: validation.ok ? 'host_materialization_required' : 'bounded_schema_correction_required',
      rawBytes: Buffer.byteLength(text), edits: selected.edits, equivalentDeletionPaths: candidates.length,
      syntacticValueCount: new Set(syntacticCandidates.map(c => hash(c.value))).size,
      layoutRejectedPaths: syntacticCandidates.length - candidates.length,
      parsedValueCount: 1, exhaustiveSearchCompleted: true, transitions,
      scalarTokenCount: scalars.length, scalarTokenHash: hash(scalars), scalarEdits: 0, appendedCharacters: 0,
      fieldsRemoved: 0, duplicateKeysRejected: true, originalFailurePreserved: true,
      semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false }) };
}
