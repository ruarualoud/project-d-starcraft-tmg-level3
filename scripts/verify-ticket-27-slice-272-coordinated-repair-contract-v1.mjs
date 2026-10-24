#!/usr/bin/env node

// Concrete V3 review incident: eight distinct High paths could not fit the
// historical five-path repair interface, forcing partial cross-claim edits.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAgentScheduledClaimRepairOutputContractV3 } from
  "../packages/roster-strategist/agent-scheduled-claim-repair-output-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const review = JSON.parse(await readFile(path.join(root,
  "build/ticket-27-slice-272-iterative-live-v1/agent-selected-teach-5c6f47fe6a92c230-revised-review-v2.json"),
"utf8"));
const paths = [...new Set(review.findings.filter((finding) =>
  finding.severity === "high").map((finding) => finding.claimPath))];
assert.equal(paths.length, 8);
const { contract, contractRef } =
  createAgentScheduledClaimRepairOutputContractV3(paths);
assert.equal(contractRef.version, "3.0.0");
assert.equal(contract.providerSchema.properties.repairs.minItems, 8);
assert.equal(contract.providerSchema.properties.repairs.maxItems, 8);
assert.deepEqual(new Set(contract.providerSchema.properties.repairs.items
  .properties.claimPath.enum), new Set(paths));
process.stdout.write("Coordinated eight-claim repair contract: passed\n");
