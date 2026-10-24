import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { normalizeRosterStrategistReplyForRequestV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import { PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1 } from
  "../packages/roster-strategist/planned-preset-revision-output-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";
const draft = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
const paid = draft.publicOutputs.filter(entry => entry.roundKind === "revision").at(-1);
const raw = structuredClone(paid.sanitizedOutput);
const schema = PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1.providerSchema;
const request = { roundKind: "revision", responseFormat: {
  schemaName: PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1.schemaName, schema,
} };
const normalized = normalizeRosterStrategistReplyForRequestV1({ output: raw, request });
assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(schema, normalized.output).ok,
  true, "The existing complete schedule/deployment nested inside scoreRoute must be recovered");
for (const key of ["openingDeploymentSchedule", "revisedDeploymentConcept"])
  assert.deepEqual(normalized.output[key], raw.revisedScoreRoute[key]);
assert.deepEqual(raw, paid.sanitizedOutput);
const missing = structuredClone(raw);
delete missing.revisedScoreRoute.openingDeploymentSchedule;
assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(schema,
  normalizeRosterStrategistReplyForRequestV1({ output: missing, request }).output).ok, false);
process.stdout.write(JSON.stringify({ status: "passed", providerCalls: 0,
  paidContentPreserved: true, missingScheduleStillRejected: true,
  shapeRecovery: normalized.outputShapeRecoveryReceipt }) + "\n");
