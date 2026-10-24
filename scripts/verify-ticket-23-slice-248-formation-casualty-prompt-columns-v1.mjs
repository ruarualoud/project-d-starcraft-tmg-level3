// Actual B84 Action failed NOT SENT: 3.05MB input, mostly casualty examples.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { compactQueryReceiptForPrompt } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { deduplicateStarcraftTmgSpatialPromptReceiptsV1,
  decodeStarcraftTmgGeometryTableV1,
  restoreStarcraftTmgFormationFireFactsForPromptV1 } from
  "../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES } from
  "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";

const [choicePath, baselinePath, reportPath] = process.argv.slice(2);
assert.ok(choicePath && baselinePath && reportPath);
const [choice] = JSON.parse(await readFile(choicePath, "utf8"));
const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
assert.equal(choice.authority.stateRevision, 84);
const originalHash = hash(choice);
const last = Object.values(choice.attempts).at(-1);
assert.equal(last.status, "provider_failed_not_sent");
assert.equal(last.promptByteLength, 3053190);
const baselineBytes = Buffer.byteLength(JSON.stringify(baseline));
const projected = deduplicateStarcraftTmgSpatialPromptReceiptsV1(
  choice.queryReceipts.map(compactQueryReceiptForPrompt));
const restored = structuredClone(projected);
let encodedTables = 0;
let sharedFactCount = 0;
for (const receipt of restored) {
  if (receipt.result?.sharedIncomingFireFacts) {
    sharedFactCount += receipt.result.sharedIncomingFireFacts.facts.length;
    receipt.result.formationOptions = restoreStarcraftTmgFormationFireFactsForPromptV1(
      receipt.result.formationOptions, receipt.result.sharedIncomingFireFacts);
    delete receipt.result.sharedIncomingFireFacts;
  }
  for (const option of receipt.result?.formationOptions || []) {
    for (const key of ["incomingStationaryFireEstimate", "incomingMoveThenFireEstimate"]) {
      for (const attack of option.relationshipComparison?.[key]?.attackEstimates || []) {
        for (const loss of attack.outcomes?.lossStateDistribution || []) {
          if (loss.casualtySelectionExamples?.encoding === "exact_geometry_columns_v1") {
            loss.casualtySelectionExamples = decodeStarcraftTmgGeometryTableV1(
              loss.casualtySelectionExamples);
            encodedTables += 1;
          }
        }
      }
    }
  }
}
assert.deepEqual(restored, baseline,
  "EVERY model-facing field/order/value must recover, not only selected casualty facts");
assert.equal(hash(choice), originalHash, "original complete paid record unchanged");
const projectedBytes = Buffer.byteLength(JSON.stringify(projected));
const projectedPromptBytes = last.promptByteLength - baselineBytes + projectedBytes;
const report = {
  schema: "ticket23_slice248_formation_casualty_prompt_columns_bug_v1",
  stateRevision: 84, baselineReceiptBytes: baselineBytes,
  projectedReceiptBytes: projectedBytes,
  originalPromptBytes: last.promptByteLength, projectedPromptBytes,
  transportMaxRequestBytes: STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES,
  wrapperMarginBytes: 256 * 1024, encodedTables, sharedFactCount,
  completeDecodedModelProjectionEqual: true, completePaidRecordUnchanged: true,
  formationOptionCounts: projected.flatMap(r => r.result?.formationOptions
    ? [r.result.formationOptions.length] : []),
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false,
  doesNotProveTokenCostLatencyOrStrategyGain: true,
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
assert.ok(projectedPromptBytes + report.wrapperMarginBytes
  < STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES,
"actual B84 facts must fit the unchanged transport cap with wrapper headroom");
assert.ok(encodedTables > 0, "encode repeated examples instead of discarding them");
