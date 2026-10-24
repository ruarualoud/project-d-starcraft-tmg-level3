// Directly affected full-query proof for the original r71 slow comparison.
// This is a private copied snapshot: no Room/Provider/client is constructed.
import assert from "node:assert/strict";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsAsyncV1,
  projectStarcraftTmgFormationRelationshipComparisonV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [inputPath, outputPath, progressPath] = process.argv.slice(2);
assert.ok(inputPath && outputPath && progressPath);
for (const target of [inputPath, outputPath, progressPath]) {
  assert.ok(path.resolve(target).startsWith(path.join(root, "build") + path.sep));
}
const startedAt = new Date().toISOString();
const started = performance.now();
const capture = JSON.parse(await readFile(inputPath, "utf8"));
const current = capture.current;
assert.equal(current.stateRevision, 71);
assert.equal(current.roomId, capture.initial.roomId);
assert.equal(current.matchBindingHash, capture.initial.matchBindingHash);
assert.equal(current.stateHash, hash(current.state));
assert.equal(capture.domain.domainId, capture.selectedCandidateId);
assert.equal(capture.domain.sideKey, capture.authority.seatKey);
assert.equal(capture.authority.stateHash, current.stateHash);
assert.equal(capture.request.maximumOptions, 4);
const initialHash = hash(capture.initial);
const currentHash = hash(current);
const sourceRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: sourceRoot });
const runtime = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: structuredClone(capture.initial.state),
});
assert.equal(runtime.descriptor.runtimeHash,
  current.matchBinding.rulesRuntimeBinding.runtimeHash,
  "same frozen runtime required; never create a replacement authority");
// The paid journal's action index is model-facing and intentionally omits
// sourceDomain/sourceDomainHash. Obtain the exact current Rules domain by its
// already selected ID; never pass the prompt projection to instantiate.
const domain = runtime.enumerate(current.state, {
  sideKey: capture.authority.seatKey, includeDisabled: true,
  matchBinding: current.matchBinding,
}).parameterDomains.find((entry) => entry.domainId === capture.selectedCandidateId);
assert.ok(domain, "original selected domain remains in the exact frozen snapshot");
assert.equal(domain.sourceDomainHash, hash(domain.sourceDomain));
const setupElapsedMs = performance.now() - started;
const comparisons = [];
const setupRecord = { stage: "frozen_runtime_ready", at: new Date().toISOString(),
  setupElapsedMs, runtimeHash: runtime.descriptor.runtimeHash,
  stateHash: current.stateHash, providerCalls: 0, roomWrites: 0 };
await appendFile(progressPath, JSON.stringify(setupRecord) + "\n", { mode: 0o600 });
const queryStarted = performance.now();
const result = await searchStarcraftTmgLegalFormationOptionsAsyncV1({
  state: current.state, domain, request: capture.request,
  instantiate: (...args) => runtime.instantiate(...args),
  instantiateOptions: { matchBinding: current.matchBinding },
}, { compareBatch: async (jobs) => {
  // Same pure comparison and ordering as production. Use one diagnostic CPU
  // lane instead of cloning four large snapshots beside the live old workers.
  const outputs = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const jobStarted = performance.now();
    await appendFile(progressPath, JSON.stringify({
      stage: "comparison_started", index, count: jobs.length,
      at: new Date().toISOString(),
    }) + "\n", { mode: 0o600 });
    const output = projectStarcraftTmgFormationRelationshipComparisonV1(jobs[index]);
    const evidence = { index, elapsedMs: performance.now() - jobStarted,
      resultHash: hash(output), status: output.status };
    comparisons.push(evidence);
    outputs.push(output);
    await appendFile(progressPath, JSON.stringify({
      stage: "comparison_completed", at: new Date().toISOString(), ...evidence,
    }) + "\n", { mode: 0o600 });
  }
  return outputs;
} });
const queryElapsedMs = performance.now() - queryStarted;
assert.equal(hash(capture.initial), initialHash, "initial snapshot unchanged");
assert.equal(hash(current), currentHash, "complete current snapshot unchanged");
assert.ok(result.optionCount > 0 && result.optionCount <= 4);
assert.equal(result.formationOptions.length, result.optionCount);
assert.equal(comparisons.length, result.optionCount);
assert.deepEqual(result.formationIntent.objectives, capture.request.formationObjectives);
assert.equal(result.formationIntent.tacticalPurpose, capture.request.tacticalPurpose);
assert.ok(result.formationOptions.every((option) =>
  option.completeFormationPlacementChecked === true
    && option.relationshipComparison?.status === "available"));
await writeFile(outputPath, JSON.stringify({
  schema: "ticket23_slice248_r71_frozen_full_formation_query_v1",
  startedAt, completedAt: new Date().toISOString(),
  sourceAuthority: capture.authority,
  sourceChoiceKey: capture.sourceChoiceKey,
  sourceDatasetHash: source.dataset.datasetHash,
  sourceDomainHash: domain.sourceDomainHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  setupElapsedMs, queryElapsedMs, comparisons,
  inputHash: hash(capture), resultHash: hash(result), result,
  sequentialDiagnosticLane: true,
  originalLiveQueryCompared: false,
  providerCalls: 0, originalRoomWrites: 0,
  doesNotProveWholeActionOneMinute: true, trainingTruth: false,
}, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ passed: true, setupElapsedMs, queryElapsedMs,
  optionCount: result.optionCount, attemptedCandidateCount: result.attemptedCandidateCount,
  completeModelCounts: result.formationOptions.map((option) => option.slots.length),
  comparisonTimings: comparisons, resultHash: hash(result),
  originalLiveQueryCompared: false, providerCalls: 0, roomWrites: 0,
  doesNotProveWholeActionOneMinute: true, trainingTruth: false }));
