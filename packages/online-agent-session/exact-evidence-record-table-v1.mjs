// Model-facing JSON only: share record keys/constants without flattening whole
// variable-length outcome trees into a separate schema for every casualty list.
export const EXACT_EVIDENCE_RECORD_ROWS_V1 = 'exact_evidence_record_rows_v1';
export const EXACT_EVIDENCE_RECORD_ROWS_MEANING =
  'An exact_evidence_record_rows_v1 object represents an ordered array, not a summary. '
  + 'For each group, combine constants with each row mapped to columns, then place '
  + 'that complete record at indices[rowIndex]. Nested tables use the same rule. '
  + 'All records, probabilities, model IDs, positions, losses, reactions and control '
  + 'consequences remain present; different rows are never averaged or discarded.';

export function encodeExactEvidenceRecordTreeV1(value) {
  if (!value || typeof value !== 'object') return value;
  if (!Array.isArray(value)) return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, encodeExactEvidenceRecordTreeV1(child)]));
  const records = value.map(encodeExactEvidenceRecordTreeV1);
  if (records.length < 2 || !records.every(record => record
    && typeof record === 'object' && !Array.isArray(record))) return records;
  const groups = new Map();
  records.forEach((record, index) => {
    const keys = Object.keys(record);
    const shape = JSON.stringify(keys);
    if (!groups.has(shape)) groups.set(shape, { keys, items: [] });
    groups.get(shape).items.push({ index, record });
  });
  const table = {
    encoding: EXACT_EVIDENCE_RECORD_ROWS_V1,
    recordCount: records.length,
    groups: [...groups.values()].map(({ keys, items }) => {
      const constants = [];
      const columns = [];
      for (const key of keys) {
        const first = JSON.stringify(items[0].record[key]);
        if (items.every(item => JSON.stringify(item.record[key]) === first)) {
          constants.push([key, items[0].record[key]]);
        } else columns.push(key);
      }
      return { indices: items.map(item => item.index),
        constants: Object.fromEntries(constants), columns,
        rows: items.map(item => columns.map(key => item.record[key])) };
    }),
  };
  return JSON.stringify(table).length < JSON.stringify(records).length
    ? table : records;
}

export function restoreExactEvidenceRecordTreeV1(value) {
  if (!value || typeof value !== 'object') return value;
  if (value.encoding !== EXACT_EVIDENCE_RECORD_ROWS_V1) {
    return Array.isArray(value) ? value.map(restoreExactEvidenceRecordTreeV1)
      : Object.fromEntries(Object.entries(value).map(([key, child]) =>
        [key, restoreExactEvidenceRecordTreeV1(child)]));
  }
  if (!Number.isSafeInteger(value.recordCount) || value.recordCount < 0
    || !Array.isArray(value.groups)) throw new TypeError('Invalid evidence record table');
  const records = new Array(value.recordCount);
  const seen = new Set();
  for (const group of value.groups) {
    if (!Array.isArray(group.indices) || !Array.isArray(group.columns)
      || !Array.isArray(group.rows) || group.rows.length !== group.indices.length
      || !group.constants || typeof group.constants !== 'object'
      || Array.isArray(group.constants)
      || group.columns.some(key => typeof key !== 'string'
        || Object.hasOwn(group.constants, key))
      || new Set(group.columns).size !== group.columns.length) {
      throw new TypeError('Invalid evidence record group');
    }
    group.rows.forEach((row, rowIndex) => {
      const index = group.indices[rowIndex];
      if (!Array.isArray(row) || row.length !== group.columns.length
        || !Number.isSafeInteger(index) || index < 0 || index >= records.length
        || seen.has(index)) throw new TypeError('Invalid evidence record row');
      seen.add(index);
      records[index] = restoreExactEvidenceRecordTreeV1(Object.fromEntries([
        ...Object.entries(group.constants),
        ...group.columns.map((key, columnIndex) => [key, row[columnIndex]]),
      ]));
    });
  }
  if (seen.size !== records.length) throw new TypeError('Missing evidence record');
  return records;
}
