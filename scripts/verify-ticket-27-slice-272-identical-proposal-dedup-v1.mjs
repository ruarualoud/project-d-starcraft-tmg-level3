import assert from "node:assert/strict";

import { deduplicateIdenticalRosterProposalsV1 } from
  "../packages/roster-strategist/roster-proposal-deduplication-v1.mjs";

// Reproduces the paid round-5 reply in rws-58722117: the Provider returned
// two structurally identical candidate rows under the same candidateId.
const row = {
  candidateId: "terran-marker-anchor-screen-exact-2000",
  tacticalCardRecordKeys: ["card-a"],
  units: [{ recordKey: "unit-a", compositionKind: "large", upgrades: [] }],
  rationaleText: "Choose the same Builder-audited exact-budget branch.",
};
const output = { schemaVersion: "test", roundKind: "candidate_proposals",
  proposals: [structuredClone(row), structuredClone(row)] };
const repaired = deduplicateIdenticalRosterProposalsV1({ output });
assert.equal(repaired.output.proposals.length, 1);
assert.deepEqual(repaired.output.proposals[0], row);
assert.equal(output.proposals.length, 2);
assert.equal(repaired.receipt.operations.length, 1);
assert.equal(repaired.receipt.operations[0].candidateId, row.candidateId);

const divergent = { ...row, units: [{ recordKey: "unit-b",
  compositionKind: "large", upgrades: [] }] };
const ambiguous = deduplicateIdenticalRosterProposalsV1({ output: {
  ...output, proposals: [row, divergent],
} });
assert.equal(ambiguous.output.proposals.length, 2);
assert.equal(ambiguous.receipt.operations.length, 0);

process.stdout.write("IDENTICAL_PROPOSAL_DEDUP_OK\n");
