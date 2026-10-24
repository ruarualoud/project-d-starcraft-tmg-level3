#!/usr/bin/env node
// Specific captured bug: five marker queries plus four other valid needs
// were rejected at eight. Preserve all nine and reuse the paid reply after
// current-contract validation, without allowing cross-context replay.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import * as schemas from
  "../packages/roster-strategist/roster-strategist-output-schemas-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";
import { createRetainedReplayDeliberationPortV1 } from
  "../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs";

const argument = process.argv.find(x => x.startsWith("--captured-draft="));
assert.ok(argument);
const draft = JSON.parse(await readFile(argument.slice("--captured-draft=".length), "utf8"));
const retained = draft.publicOutputs.find(x => x.roundKind === "strategy_foundation");
assert.equal(retained.sanitizedOutput.informationNeeds.length, 9);
const originalHash = hashStarcraftTmgContract(retained.sanitizedOutput);
assert.equal(originalHash, retained.outputHash);
const contract = schemas.rosterStrategistRoundOutputContractV1("strategy_foundation");
const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
  contract.providerSchema, retained.sanitizedOutput);
assert.equal(validation.ok, true, JSON.stringify(validation.issues));
assert.equal(schemas.rosterInformationNeedCountWarningV1(9).fullQueriesPreserved, true);
assert.equal(schemas.rosterInformationNeedCountWarningV1(8), null);
const request = { roundKind: retained.roundKind, roundIndex: retained.roundIndex,
  contextHash: retained.contextHash, responseFormat: {
    outputContractRef: schemas.rosterStrategistRoundOutputContractRefV1("strategy_foundation"),
    schema: contract.providerSchema,
  } };
let liveCalls = 0;
const makePort = () => createRetainedReplayDeliberationPortV1({
  retainedOutputs: [retained], requireContextBoundReplay: true,
  livePort: { deliberate: async () => { liveCalls += 1;
    throw new Error("UNEXPECTED_PAID_RETRY"); } },
});
const reply = await makePort().deliberate(request);
assert.equal(liveCalls, 0);
assert.equal(reply.receipt.paidProviderCall, false);
assert.equal(reply.receipt.replayedRetainedReply, true);
assert.equal(hashStarcraftTmgContract(reply.output), originalHash);
assert.equal(reply.output.informationNeeds.length, 9);
await assert.rejects(makePort().deliberate({ ...request, contextHash: "0".repeat(64) }),
  /UNEXPECTED_PAID_RETRY/);
await assert.rejects(makePort().deliberate({ ...request, roundKind: "candidate_proposals",
  responseFormat: { ...request.responseFormat, outputContractRef:
    schemas.rosterStrategistRoundOutputContractRefV1("candidate_proposals") } }),
  /UNEXPECTED_PAID_RETRY/);
const invalid = structuredClone(retained);
invalid.sanitizedOutput.informationNeeds[0].kind = "invented_tool";
invalid.outputHash = hashStarcraftTmgContract(invalid.sanitizedOutput);
await assert.rejects(createRetainedReplayDeliberationPortV1({
  retainedOutputs: [invalid], requireContextBoundReplay: true,
}).deliberate(request), /ROSTER_WORKSPACE_RESUME_OUTPUT_/);
assert.equal(hashStarcraftTmgContract(retained.sanitizedOutput), originalHash);
process.stdout.write(JSON.stringify({ ok: true, originalNeedCount: 9,
  retainedNeedCount: reply.output.informationNeeds.length, originalHashUnchanged: true,
  paidCallsForCompatibleReplay: 0, crossContextAndRoleRejected: true,
  invalidKindRejected: true, warningOnly: true }) + "\n");
