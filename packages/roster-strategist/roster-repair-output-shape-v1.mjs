// Versioned transport-only recovery for a paid structured reply whose
// top-level field was misplaced inside one otherwise contracted object.
// Values move byte-for-byte; the caller's full schema/Rules validation still
// decides whether the recovered reply is usable. No semantic field is filled.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_REPAIR_OUTPUT_SHAPE_SCHEMA =
  "starcraft_tmg_roster_repair_output_shape_v1";

function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}

export function liftSchemaUniqueTopLevelFieldsV1({ output, schema } = {}) {
  const copy = structuredClone(output);
  const operations = [];
  if (object(copy) && object(schema?.properties)) {
    const candidates = new Map();
    function visit(value, node, path) {
      if (!object(value) || !object(node?.properties)) return;
      for (const [key, child] of Object.entries(value)) {
        if (Object.hasOwn(node.properties, key)) {
          visit(child, node.properties[key], `${path}.${key}`);
        } else if (node.additionalProperties === false
          && Object.hasOwn(schema.properties, key)
          && copy[key] === undefined) {
          if (!candidates.has(key)) candidates.set(key, []);
          candidates.get(key).push({ parent: value, path: `${path}.${key}` });
        }
      }
    }
    for (const [key, child] of Object.entries(copy)) {
      if (Object.hasOwn(schema.properties, key)) {
        visit(child, schema.properties[key], `$.${key}`);
      }
    }
    for (const [key, sources] of candidates) {
      if (sources.length !== 1 || copy[key] !== undefined) continue;
      const source = sources[0];
      const valueHash = hashStarcraftTmgContract(source.parent[key]);
      copy[key] = source.parent[key];
      delete source.parent[key];
      operations.push({ from: source.path, to: `$.${key}`, valueHash });
    }
  }
  const body = {
    schema: ROSTER_REPAIR_OUTPUT_SHAPE_SCHEMA,
    contractSchemaHash: hashStarcraftTmgContract(schema ?? null),
    inputHash: hashStarcraftTmgContract(output ?? null),
    outputHash: hashStarcraftTmgContract(copy ?? null),
    operations,
    valuesMovedUnchanged: true,
    semanticContentAdded: false,
    fullSchemaAndRulesValidationRequired: true,
    trainingTruth: false,
  };
  return Object.freeze({ output: copy,
    receipt: Object.freeze({ ...body,
      receiptHash: hashStarcraftTmgContract(body) }) });
}
