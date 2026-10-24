import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recoverRosterComparisonSelectionFromQuotedEvidenceV1 } from
  "../packages/roster-strategist/roster-comparison-selection-repair-v1.mjs";

const draftPath = process.argv[2];
assert.ok(draftPath, "pass the saved failed live draft path");
const draft = JSON.parse(readFileSync(draftPath, "utf8"));
const saved = draft.publicOutputs.findLast((entry) =>
  entry.roundKind === "comparison_selection");
assert.ok(saved, "saved paid comparison required");
assert.equal(saved.sanitizedOutput.comparison.selectedCandidateId, undefined);

const candidateId = "terran-marker-anchor-screen-exact-2000";
const candidateHash =
  "c2b038218720f3c1dc386cfa069919319b78e50ad6f1fb56dc6c78aa008fc64f";
const evaluated = [{ proposal: { candidateId }, candidate: {
  candidateHash, legalityStatus: "legal" } }];
const original = JSON.stringify(saved.sanitizedOutput);
const repaired = recoverRosterComparisonSelectionFromQuotedEvidenceV1({
  output: saved.sanitizedOutput, evaluated,
});
assert.equal(repaired.output.comparison.selectedCandidateId, candidateId);
assert.equal(repaired.receipt?.sourcePath, "comparison.basisTexts[4]");
assert.equal(repaired.receipt?.candidateHash, candidateHash);
assert.equal(JSON.stringify(saved.sanitizedOutput), original,
  "the paid response must remain immutable");
assert.equal(repaired.receipt?.originalOutputHash?.length, 64);
assert.equal(repaired.receipt?.normalizedOutputHash?.length, 64);

const wrongHash = recoverRosterComparisonSelectionFromQuotedEvidenceV1({
  output: saved.sanitizedOutput,
  evaluated: [{ proposal: { candidateId }, candidate: {
    candidateHash: "0".repeat(64), legalityStatus: "legal" } }],
});
assert.equal(wrongHash.receipt, null);
assert.equal(wrongHash.output.comparison.selectedCandidateId, undefined);

const illegal = recoverRosterComparisonSelectionFromQuotedEvidenceV1({
  output: saved.sanitizedOutput,
  evaluated: [{ proposal: { candidateId }, candidate: {
    candidateHash, legalityStatus: "illegal" } }],
});
assert.equal(illegal.receipt, null);

const ambiguous = recoverRosterComparisonSelectionFromQuotedEvidenceV1({
  output: { ...saved.sanitizedOutput, comparison: {
    ...saved.sanitizedOutput.comparison,
    basisTexts: [...saved.sanitizedOutput.comparison.basisTexts,
      `Selected candidate: ${candidateId} (candidateHash ${candidateHash})`],
  } }, evaluated,
});
assert.equal(ambiguous.receipt, null);

const explicitConflict = recoverRosterComparisonSelectionFromQuotedEvidenceV1({
  output: { ...saved.sanitizedOutput, comparison: {
    ...saved.sanitizedOutput.comparison,
    selectedCandidateId: "different-candidate",
  } }, evaluated,
});
assert.equal(explicitConflict.receipt, null);
assert.equal(explicitConflict.output.comparison.selectedCandidateId,
  "different-candidate");

process.stdout.write(JSON.stringify({ status: "pass", savedRound: saved.roundIndex,
  selectedCandidateId: candidateId, providerCalls: 0 }) + "\n");
