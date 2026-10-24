// Bind only a value actually selected in one delivered receipt. This module
// never searches for a similarly named field or verifies the model's argument.
// The probability object is the existing combat-estimation-runtime-v1 format;
// arbitrary objects with a `value` property are deliberately not scalarized.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const unitInterval = value => finite(value) && value >= 0 && value <= 1;

function probabilityEstimate(value) {
  if (!object(value) || Object.keys(value).length !== 5
    || !['value', 'percent', 'successes', 'denominator', 'uncertainty95'].every(key => Object.hasOwn(value, key))
    || !unitInterval(value.value) || !finite(value.percent)
    || !Number.isSafeInteger(value.denominator) || value.denominator <= 0
    || !Number.isSafeInteger(value.successes) || value.successes < 0 || value.successes > value.denominator
    || value.value !== value.successes / value.denominator
    || value.percent !== Math.round(value.value * 10_000) / 100
    || !object(value.uncertainty95) || !unitInterval(value.uncertainty95.low)
    || !unitInterval(value.uncertainty95.high) || value.uncertainty95.low > value.uncertainty95.high) return false;
  return true;
}

// Reader navigation uses JSON Pointer; older paid citations use dot/bracket
// paths, or slash-separated relative paths. They address the SAME receipt.
// Decode exact keys only: no fuzzy field search, coercion or receipt switching.
export function parseRosterTeachEvidencePathV1(path) {
  const text = String(path);
  if (text.startsWith('/')) {
    if (/~(?:[^01]|$)/u.test(text)) return null;
    return { keys: text.slice(1).split('/').map(key => key.replaceAll('~1', '/').replaceAll('~0', '~')),
      allowWildcard: false };
  }
  if (text.includes('/')) {
    const keys = text.split('/');
    return keys.every(key => /^[A-Za-z0-9_-]+$/u.test(key)) ? { keys, allowWildcard: false } : null;
  }
  const keys = text.replace(/^\$\.?/u, '').replace(/\[(\d*)\]/gu,
    (_, index) => `.${index || '*'}`).split('.').filter(Boolean);
  return keys.length && keys.every(key => /^(?:[A-Za-z0-9_-]+|\*)$/u.test(key))
    ? { keys, allowWildcard: true } : null;
}

export function formatRosterTeachEvidencePathV1(keys) {
  return keys.every(key => /^[A-Za-z0-9_-]+$/u.test(key)) ? keys.join('.')
    : '/' + keys.map(key => String(key).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
}

export function readRosterTeachTypedEvidenceV1(root, path) {
  const parsed = parseRosterTeachEvidencePathV1(path);
  if (!parsed) {
    return { ok: false, code: 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND' };
  }
  let selected = [{ value: root, keys: [] }];
  for (const key of parsed.keys) {
    const wildcard = parsed.allowWildcard && key === '*';
    const next = [];
    for (const entry of selected) {
      if (!entry.value || typeof entry.value !== 'object'
        || (wildcard ? !Array.isArray(entry.value) : !Object.hasOwn(entry.value, key))) {
        return { ok: false, code: 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND' };
      }
      const children = wildcard ? entry.value.map((value, index) => [String(index), value])
        : [[key, entry.value[key]]];
      for (const [child, value] of children) next.push({ value, keys: [...entry.keys, child] });
    }
    selected = next;
  }
  if (!selected.length) return { ok: false, code: 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND' };
  const typedValues = selected.map(({ value, keys }) => {
    const sourcePath = formatRosterTeachEvidencePathV1(keys);
    const contextPath = formatRosterTeachEvidencePathV1(keys.slice(0, -1));
    // The exact field can explicitly contain null (e.g. a neutral marker's
    // owner). This is not an absent path, numeric zero, or verified inference.
    // Path traversal above already requires every key to exist.
    if (value === null) return {valueType:'null',value:null,sourcePath,
      resolvedPath:sourcePath,contextPath};
    if (finite(value) || typeof value === 'string' || typeof value === 'boolean') {
      return { valueType: typeof value, value, sourcePath, resolvedPath: sourcePath, contextPath };
    }
    if (probabilityEstimate(value)) return { valueType: 'probability_estimate', value: value.value,
      sourcePath, resolvedPath: formatRosterTeachEvidencePathV1([...keys, 'value']), contextPath,
      representation: 'combat_estimation_probability_v1', unit: 'probability_0_to_1',
      sourceValue: structuredClone(value) };
    // A whole saved table can support a reference/comparison without becoming
    // one invented numeric result. Keep only its exact address and shape here;
    // the original body remains in the identified receipt, not copied into each
    // answer. The caller still checks receipt status and never verifies prose.
    if (value !== null && typeof value === 'object') return {
      valueType: 'structured_reference', sourcePath, resolvedPath: sourcePath, contextPath,
      value: { kind: 'exact_structure_reference', sourcePath,
        containerType: Array.isArray(value) ? 'array' : 'object',
        childCount: Array.isArray(value) ? value.length : Object.keys(value).length,
        numericUseAllowed: false },
    };
    return null;
  });
  // A wildcard cannot silently drop unbound members or mix numbers and text.
  if (typedValues.some(value => value === null)
    || new Set(typedValues.map(value => value.valueType)).size !== 1) {
    return { ok: false, code: 'ROSTER_TEACH_EVIDENCE_VALUE_TYPE_UNSUPPORTED' };
  }
  const valueType = typedValues[0].valueType;
  const values = typedValues.map(entry => entry.value);
  return { ok: true, valueType, category: ['number', 'probability_estimate'].includes(valueType)
    ? 'quantitativeEvidence' : 'qualitativeEvidence', values,
  value: values.length === 1 ? values[0] : null, typedValues };
}
