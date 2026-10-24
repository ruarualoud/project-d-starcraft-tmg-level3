// Reproduce the real 2026-10-13 paid Medic-purpose duplication at the
// workspace resume seam. Only the correction answer is a local fake.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const option = key => process.argv.find(arg => arg.startsWith(`--${key}=`))
  ?.slice(key.length + 3);
const captured = JSON.parse(await readFile(option("capture"), "utf8"));
const mapConfiguration = JSON.parse(await readFile(option("map"), "utf8"));
const outputPath = option("output");
assert.equal(captured.failure.code, "ROSTER_PLAN_COMPONENT_PURPOSE_DUPLICATE");
assert.equal(captured.planSerialized, null);
assert.equal(captured.publicOutputs.length, 4);
const original = captured.publicOutputs.at(-1).sanitizedOutput;
const duplicates = original.componentPurposes.filter(purpose =>
  purpose.componentKind === "unit"
    && purpose.instanceId === "player1-exact-repair-3");
assert.equal(duplicates.length, 2);
const correction = structuredClone(original);
// The same real reply duplicated both this Medic and its first upgrade.
// This fake models a correction of ALL identities reported in one feedback,
// not host-side production deduplication or newly invented strategy prose.
const seen = new Set();
correction.componentPurposes = correction.componentPurposes.filter(purpose => {
  const key = `${purpose.componentKind}:${purpose.instanceId}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

await mkdir(path.join(root, "build"), { recursive: true });
const dataDirectory = await mkdtemp(path.join(root, "build/precompile-repro-"));
await mkdir(path.join(dataDirectory, "drafts"));
await writeFile(path.join(dataDirectory, "drafts", `${captured.sessionId}.json`),
  JSON.stringify(captured), { mode: 0o600 });
let correctionCalls = 0;
let repairRequest = null;
const factory = { createForRun: async ({ onEvent }) => ({
  descriptor: () => ({ kind: "local_concrete_bug_repro",
    modelVersion: "deepseek-flash", promptVersion: "precompile_repro_v1" }),
  deliberate: async request => {
    correctionCalls += 1;
    repairRequest = request;
    assert.equal(request.roundKind, "preset_plan_deepening");
    assert.equal(request.roundIndex, 5);
    const feedback = request.promptNodes.find(node =>
      node.nodeType === "roster-output-contract-repair")?.content;
    assert.equal(feedback.failure.code, captured.failure.code);
    assert.deepEqual(feedback.failure.details.duplicates.map(item => item.key),
      ["unit:player1-exact-repair-3",
        "upgrade:player1-exact-repair-3-upgrade-1"]);
    assert.deepEqual(feedback.rejectedOutput, original);
    assert.equal(feedback.rosterAndArrivalScheduleLocked, true);
    const outputHash = hashStarcraftTmgContract(correction);
    await onEvent({ type: "round_started", roundKind: request.roundKind,
      roundIndex: request.roundIndex });
    await onEvent({ type: "round_completed", roundKind: request.roundKind,
      roundIndex: request.roundIndex, paidProviderCall: false,
      sanitizedOutputRecord: { roundKind: request.roundKind,
        roundIndex: request.roundIndex, contextHash: request.contextHash,
        outputContractRef: request.responseFormat.outputContractRef,
        outputHash, sanitizedOutput: correction } });
    return { output: correction, receipt: { paidProviderCall: false } };
  },
}) };
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: option("fixture"), dataDirectory, mapConfiguration,
  deliberationFactory: factory });
const settle = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const state = product.service.readSession(captured.sessionId);
    if (state.status !== "running") return state;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("CONCRETE_REPRO_DID_NOT_SETTLE");
};
await product.service.startPlanning(captured.sessionId, { resume: true });
const completed = await settle();
assert.equal(completed.status, "planned", JSON.stringify(completed.failure));
assert.equal(correctionCalls, 1);
assert.ok(repairRequest.contextHash !== captured.publicOutputs.at(-1).contextHash);
assert.equal(completed.plan.rosterCandidate.candidateHash,
  captured.lockedRoster.lock.candidate.candidateHash);
assert.equal(completed.plan.openingDeploymentSchedule.scheduleHash,
  captured.agentSelectedArrivalSchedule.scheduleHash);
assert.equal(completed.plan.componentPurposes.filter(purpose =>
  purpose.componentKind === "unit"
    && purpose.instanceId === "player1-exact-repair-3").length, 1);
assert.ok(completed.progress.rounds.slice(0, 4).every(round =>
  round.status === "replayed" && round.paidProviderCall === false));
const persisted = JSON.parse(await readFile(path.join(dataDirectory, "drafts",
  `${captured.sessionId}.json`), "utf8"));
assert.deepEqual(persisted.publicOutputs.slice(0, 4), captured.publicOutputs);
assert.equal(persisted.publicOutputs.length, 5);
// A subsequent resume must reuse the correction too, not purchase it again.
await product.service.startPlanning(captured.sessionId, { resume: true });
const replayed = await settle();
assert.equal(replayed.status, "planned", JSON.stringify(replayed.failure));
assert.equal(correctionCalls, 1);
assert.equal(replayed.plan.planHash, completed.plan.planHash);
assert.ok(replayed.progress.rounds.every(round => round.status === "replayed"));
const report = { status: "passed", providerCalls: 0, roomMutations: 0,
  localCorrectionAnswers: correctionCalls, originalPaidRepliesPreserved: 4,
  correctionReplayedWithoutSend: true, candidateHash:
    completed.plan.rosterCandidate.candidateHash,
  planHash: completed.plan.planHash, dataDirectory,
  sourceFailure: captured.failure.code };
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
process.stdout.write(JSON.stringify(report) + "\n");
