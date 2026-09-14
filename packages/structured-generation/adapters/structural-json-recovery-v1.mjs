import { hash, seal, fail } from '../../skill-production/common.mjs';
import { assertStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from '../output-contract-registry-v1.mjs';

export const STRUCTURAL_JSON_RECOVERY_BINDING_V1 = seal({ version: 'structural_json_recovery_v1',
  grammar: 'delete_mismatched_closer_only_after_complete_object_property_or_array_element',
  maximumEdits: 4, maximumRawBytes: 65536, maximumDepth: 64,
  insertionAllowed: false, replacementAllowed: false, scalarEditsAllowed: false,
  duplicateKeysAllowed: false, missingContentInvented: false, originalContractRequired: true,
  originalParseableDocumentsUnchanged: true, originalFailedAttemptUnchanged: true,
  acceptanceScope: 'structured_representation_only', semanticAcceptanceInherited: false, trainingTruth: false });
const binding = STRUCTURAL_JSON_RECOVERY_BINDING_V1;
const invalid = code => fail('STRUCTURAL_JSON_' + code);

// A bounded grammar, not a JSON5 parser or an LLM formatter. It never inserts
// delimiters/fields, edits strings, coerces numbers, drops properties or guesses
// missing content. Native valid responses retain their original adapter path.
export function decodeStructuralJsonV1(text, contract) {
  assertStarcraftTmgOutputContractV1(contract);
  if (typeof text !== 'string' || !text.length || Buffer.byteLength(text) > binding.maximumRawBytes)
    invalid('INPUT_LIMIT');
  let at = 0;
  const edits = [], scalars = [];
  const whitespace = () => { while (at < text.length && /[ \t\r\n]/u.test(text[at])) at++; };
  const scalar = (start, kind) => scalars.push({ startUtf16: start, endUtf16: at, kind, tokenHash: hash(text.slice(start, at)) });
  const string = kind => {
    const start = at++;
    while (at < text.length) {
      const char = text[at++];
      if (char === '\\') at++;
      else if (char === '"') {
        let result;
        try { result = JSON.parse(text.slice(start, at)); } catch { invalid('SYNTAX_UNSUPPORTED'); }
        scalar(start, kind); return result;
      }
    }
    invalid('SYNTAX_UNSUPPORTED');
  };
  const mismatched = (char, path) => {
    whitespace();
    while (text[at] === char) {
      if (edits.length === binding.maximumEdits) invalid('EDIT_LIMIT');
      edits.push({ offsetUtf16: at, removed: char, afterValuePath: path }); at++; whitespace();
    }
  };
  const value = (depth, path) => {
    if (depth > binding.maximumDepth) invalid('DEPTH_LIMIT');
    whitespace();
    if (text[at] === '{') {
      at++; whitespace(); const result = {}, keys = new Set();
      if (text[at] === '}') { at++; return result; }
      for (;;) {
        whitespace(); if (text[at] !== '"') invalid('SYNTAX_UNSUPPORTED');
        const key = string('key');
        if (keys.has(key)) invalid('DUPLICATE_KEY'); keys.add(key);
        whitespace(); if (text[at++] !== ':') invalid('SYNTAX_UNSUPPORTED');
        const childPath = path + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1');
        const child = value(depth + 1, childPath);
        Object.defineProperty(result, key, { value: child, enumerable: true, configurable: true, writable: true });
        mismatched(']', childPath);
        const delimiter = text[at++];
        if (delimiter === '}') return result;
        if (delimiter !== ',') invalid('SYNTAX_UNSUPPORTED');
      }
    }
    if (text[at] === '[') {
      at++; whitespace(); const result = [];
      if (text[at] === ']') { at++; return result; }
      for (;;) {
        const childPath = path + '/' + result.length;
        result.push(value(depth + 1, childPath));
        mismatched('}', childPath);
        const delimiter = text[at++];
        if (delimiter === ']') return result;
        if (delimiter !== ',') invalid('SYNTAX_UNSUPPORTED');
      }
    }
    if (text[at] === '"') return string('string');
    const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/u.exec(text.slice(at));
    if (!match) invalid('SYNTAX_UNSUPPORTED');
    const start = at; at += match[0].length;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed === 'number' && (!Number.isFinite(parsed) || Number.isInteger(parsed) && !Number.isSafeInteger(parsed)))
      invalid('NUMERIC_PRECISION_UNSUPPORTED');
    scalar(start, typeof parsed === 'number' ? 'number' : 'literal'); return parsed;
  };
  const output = value(0, ''); whitespace();
  if (at !== text.length) invalid('SYNTAX_UNSUPPORTED');
  if (!edits.length) invalid('NOT_APPLICABLE');
  let repaired = text;
  for (const edit of [...edits].reverse()) repaired = repaired.slice(0, edit.offsetUtf16) + repaired.slice(edit.offsetUtf16 + 1);
  let parsed;
  try { parsed = JSON.parse(repaired); } catch { invalid('SYNTAX_UNSUPPORTED'); }
  if (hash(parsed) !== hash(output)) invalid('PARSER_DIFFERENTIAL');
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, parsed);
  if (!validation.ok) invalid('SCHEMA_INVALID');
  return { value: parsed, receipt: seal({ version: binding.version + '.decode', bindingHash: binding.hash,
    outputContractRef: outputContractRefStarcraftTmgV1(contract), originalTextHash: hash(text),
    repairedTextHash: hash(repaired), outputHash: hash(parsed), localSchemaValidationHash: hash(validation),
    rawBytes: Buffer.byteLength(text), repairedBytes: Buffer.byteLength(repaired), edits,
    scalarTokenCount: scalars.length, scalarTokenHash: hash(scalars), scalarEdits: 0, appendedCharacters: 0,
    duplicateKeysRejected: true, originalFailurePreserved: true,
    semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false }) };
}
