import { encodeStarcraftTmgGeometryTableV1, decodeStarcraftTmgGeometryTableV1 }
  from "./exact-geometry-column-table-v1.mjs";

// Presentation only. Compare EVERY value of a column; names/IDs/hashes are
// never accepted as proof that two geometry fields are interchangeable.
export function encodeStarcraftTmgGeometryColumnReuseV2(records) {
  const original = encodeStarcraftTmgGeometryTableV1(records);
  if (Array.isArray(original)) return original;
  let reusedCount = 0;
  const groups = original.groups.map(group => {
    const firstByValues = new Map();
    const retained = [];
    const reusedColumns = [];
    group.columns.forEach((column, index) => {
      const key = JSON.stringify(group.rows.map(row => row[index]));
      const source = firstByValues.get(key);
      if (source) reusedColumns.push({ ...column,
        sourceSlot: source.column.slot, sourcePath: source.column.path });
      else {
        const entry = { column, index };
        firstByValues.set(key, entry);
        retained.push(entry);
      }
    });
    reusedCount += reusedColumns.length;
    return reusedColumns.length ? { ...group,
      columns: retained.map(entry => entry.column), reusedColumns,
      rows: group.rows.map(row => retained.map(entry => row[entry.index])),
    } : group;
  });
  if (!reusedCount) return original;
  const result = { ...original, encoding: "exact_geometry_column_reuse_v2",
    meaning: "Each row uses column paths and constant fields. Each reused column has exactly the value of its sourceSlot/sourcePath in that SAME group and row. Restore both original fields. All geometry, attributes and record order are retained.",
    groups };
  return JSON.stringify(result).length < JSON.stringify(original).length
    ? result : original;
}

export function decodeStarcraftTmgGeometryColumnReuseV2(table) {
  if (table?.encoding !== "exact_geometry_column_reuse_v2") {
    return decodeStarcraftTmgGeometryTableV1(table);
  }
  const groups = table.groups.map(group => {
    const indexBySlot = new Map(group.columns.map((column, index) =>
      [column.slot, index]));
    const aliases = (group.reusedColumns || []).map(column => {
      if (indexBySlot.has(column.slot) || !indexBySlot.has(column.sourceSlot)) {
        throw new TypeError("Invalid reused geometry column");
      }
      return { column: { slot: column.slot, path: column.path },
        sourceIndex: indexBySlot.get(column.sourceSlot) };
    });
    const { reusedColumns: _reusedColumns, ...original } = group;
    return { ...original,
      columns: [...group.columns, ...aliases.map(entry => entry.column)],
      rows: group.rows.map(row => [...row,
        ...aliases.map(entry => row[entry.sourceIndex])]),
    };
  });
  return decodeStarcraftTmgGeometryTableV1({ ...table,
    encoding: "exact_geometry_columns_v1", groups });
}
