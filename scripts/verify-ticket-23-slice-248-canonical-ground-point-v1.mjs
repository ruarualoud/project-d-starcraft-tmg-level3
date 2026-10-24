// Captured r6 Omega option was accepted by Rules, then rejected by the shared
// parameter contract because Rules returns a nested canonical placement.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectStarcraftTmgActionParametersV1 } from
  "../packages/online-agent-session/action-parameter-contract-v1.mjs";

const captured = JSON.parse(await readFile(process.argv[2], "utf8"));
const original = JSON.stringify(captured.parameters);
const inspect = (parameters, domain = captured.domain) =>
  inspectStarcraftTmgActionParametersV1(domain, parameters);
assert.equal(inspect(captured.parameters).valid, true,
  "Rules-returned canonical placement must pass the same parameter seam");
assert.equal(JSON.stringify(captured.parameters), original);
const incomplete = structuredClone(captured.parameters);
delete incomplete.placement.yMilliInches;
assert.equal(inspect(incomplete).valid, false);
const conflicting = { ...structuredClone(captured.parameters),
  xMilliInches: captured.coordinate.xMilliInches + 1,
  yMilliInches: captured.coordinate.yMilliInches };
assert.equal(inspect(conflicting).valid, false);
const invalidScalar = { ...structuredClone(captured.parameters),
  xMilliInches: null };
assert.equal(inspect(invalidScalar).valid, false);
const unrelated = structuredClone(captured.domain);
delete unrelated.parameterSchema.groundPoint;
assert.equal(inspect(captured.parameters, unrelated).valid, false);
const flat = { ...structuredClone(captured.parameters), ...captured.coordinate };
delete flat.placement;
assert.equal(inspect(flat).valid, true);
console.log(JSON.stringify({ status: "passed", roomId: captured.sourceRoomId,
  stateRevision: captured.sourceRevision, optionId: captured.sourceOptionId,
  originalCanonicalParametersUnchanged: true, providerCalls: 0,
  rulesLegalityNotInferred: true, originalRoomWrites: 0, trainingTruth: false }));
