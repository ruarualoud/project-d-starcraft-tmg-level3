#!/usr/bin/env node

import assert from "node:assert/strict";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRetainedReplayDeliberationPortV1 } from
  "../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs";
import { rosterTeachOutputContractRefV1 } from
  "../packages/roster-strategist/roster-teach-output-contracts-v1.mjs";

const output = { publicReply: "retained public answer" };
const currentRef = rosterTeachOutputContractRefV1("teach_challenge");
const base = {
  roundKind: "teach_challenge", roundIndex: 2,
  contextHash: "same-context", sanitizedOutput: output,
  outputHash: hashStarcraftTmgContract(output),
};
const request = {
  roundKind: base.roundKind, roundIndex: base.roundIndex,
  contextHash: base.contextHash,
  responseFormat: { outputContractRef: currentRef },
};

for (const legacy of [base, { ...base, outputContractRef: {
  ...currentRef, version: "legacy-contract-version",
} }]) {
  const replay = createRetainedReplayDeliberationPortV1({
    retainedOutputs: [legacy], requireContextBoundReplay: true,
  });
  await assert.rejects(replay.deliberate(request),
    /ROSTER_WORKSPACE_RESUME_OUTPUT_CONTRACT_MISMATCH/u);
}

const matching = createRetainedReplayDeliberationPortV1({
  retainedOutputs: [{ ...base, outputContractRef: currentRef }],
  requireContextBoundReplay: true,
});
const result = await matching.deliberate(request);
assert.deepEqual(result.output, output);
assert.equal(result.receipt.replayedRetainedReply, true);
assert.deepEqual(result.receipt.outputContractRef, currentRef);
process.stdout.write("RETAINED_CONTRACT_BOUND_REPLAY_OK\n");
