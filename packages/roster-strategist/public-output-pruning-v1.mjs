// Discard only fields that a strict round schema does not declare. Keep the
// discarded-value hashes as review evidence; never fill, rename, or alter a
// declared field. The Strategist's full schema and Rules checks run next.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_PUBLIC_OUTPUT_PRUNING_SCHEMA =
  "starcraft_tmg_roster_public_output_pruning_v1";

function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}

export function pruneRosterUndeclaredPublicFieldsV1(input = {}) {
  const operations = [];
  function visit(value, schema, path) {
    if (Array.isArray(value) && schema?.type === "array") {
      return value.map((entry, index) => visit(entry, schema.items,
        `${path}[${index}]`));
    }
    if (!object(value) || schema?.type !== "object") {
      return structuredClone(value);
    }
    const properties = object(schema.properties) ? schema.properties : {};
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        output[key] = visit(child, properties[key], `${path}.${key}`);
      } else if (schema.additionalProperties === false) {
        operations.push({ path: `${path}.${key}`,
          discardedValueHash: hashStarcraftTmgContract(child) });
      } else {
        output[key] = structuredClone(child);
      }
    }
    return output;
  }
  const output = visit(input.output, input.schema, "$");
  const body = {
    schema: ROSTER_PUBLIC_OUTPUT_PRUNING_SCHEMA,
    inputHash: hashStarcraftTmgContract(input.output),
    outputHash: hashStarcraftTmgContract(output),
    contractSchemaHash: hashStarcraftTmgContract(input.schema),
    operations,
    modelOwnedExtraFieldsDiscarded: operations.length > 0,
    declaredFieldsUnchanged: true,
    missingFieldsFilled: false,
    fullSchemaAndRulesValidationStillRequired: true,
    trainingTruth: false,
  };
  return Object.freeze({ output,
    receipt: Object.freeze({ ...body,
      receiptHash: hashStarcraftTmgContract(body) }) });
}
