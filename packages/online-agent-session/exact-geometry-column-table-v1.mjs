// Model-facing transport only. Every JSON leaf, record and original order is
// retained; the Rules and durable tool receipts continue to use full objects.
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function flatten(value, path, values, paths) {
  if (value !== null && typeof value === "object") {
    if (Array.isArray(value)) return {
      array: value.map((entry, index) =>
        flatten(entry, [...path, index], values, paths)),
    };
    return { object: Object.keys(value).map((key) => [key,
      flatten(value[key], [...path, key], values, paths)]) };
  }
  const slot = values.length;
  values.push(value);
  paths.push(path);
  return { slot };
}

export function encodeStarcraftTmgGeometryTableV1(records) {
  if (!Array.isArray(records) || records.length < 2) return records;
  const source = clone(records);
  const groups = new Map();
  source.forEach((record, index) => {
    const values = [];
    const paths = [];
    const structure = flatten(record, [], values, paths);
    const key = JSON.stringify(structure);
    if (!groups.has(key)) groups.set(key, { structure, paths, items: [] });
    groups.get(key).items.push({ index, values });
  });
  const table = {
    encoding: "exact_geometry_columns_v1",
    meaning: "Each row uses column paths; constant fields apply to every row. All original geometry values are retained.",
    recordCount: source.length,
    groups: [...groups.values()].map((group) => {
      const constantFields = [];
      const columns = [];
      group.paths.forEach((path, slot) => {
        const first = group.items[0].values[slot];
        if (group.items.every((item) =>
          JSON.stringify(item.values[slot]) === JSON.stringify(first))) {
          constantFields.push({ slot, path, value: first });
        } else columns.push({ slot, path });
      });
      return { structure: group.structure, constantFields, columns,
        indices: group.items.map((item) => item.index),
        rows: group.items.map((item) => columns.map(({ slot }) =>
          item.values[slot])) };
    }),
  };
  return JSON.stringify(table).length < JSON.stringify(source).length
    ? table : records;
}

export function decodeStarcraftTmgGeometryTableV1(table) {
  if (Array.isArray(table)) return clone(table);
  if (table?.encoding !== "exact_geometry_columns_v1") {
    throw new TypeError("Unsupported geometry transport table");
  }
  const records = new Array(table.recordCount);
  const restore = (structure, values) => {
    if (structure.object) return Object.fromEntries(structure.object.map(
      ([key, child]) => [key, restore(child, values)]));
    if (structure.array) return structure.array.map((child) =>
      restore(child, values));
    return clone(values[structure.slot]);
  };
  for (const group of table.groups) {
    group.rows.forEach((row, rowIndex) => {
      const values = [];
      for (const field of group.constantFields) values[field.slot] = field.value;
      group.columns.forEach((column, columnIndex) => {
        values[column.slot] = row[columnIndex];
      });
      records[group.indices[rowIndex]] = restore(group.structure, values);
    });
  }
  return records;
}
