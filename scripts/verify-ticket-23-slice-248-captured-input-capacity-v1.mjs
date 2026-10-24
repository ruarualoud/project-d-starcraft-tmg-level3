// Reproduce the actual C r70 Action envelope and its deterministic local retry.
// Original room/paid replies are read-only; the port and supervisor use memory.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgLiveFlashDecisionPortV1,
  buildStarcraftTmgLivePromptArtifactV1, compactQueryReceiptForPrompt } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { restoreStarcraftTmgFormationFireFactsForPromptV1,
  projectStarcraftTmgIncomingFireEstimateForPromptV1 } from
  "../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES } from
  "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const original = await readFile(capturePath, "utf8");
const saved = JSON.parse(original);
const choice = saved.choices[0];
const a = choice.authority;
assert.equal(a.stateRevision, 70);
assert.equal(choice.stage, "action");
const attempt = Object.values(choice.attempts).at(-1);
assert.equal(attempt.status, "provider_failed_not_sent");
const scope = { gameId: "starcraft-tmg", roomId: a.roomId,
  matchBindingHash: a.matchBindingHash, seatKey: a.seatKey };
const input = { scope, promptPack: "selfplay_agent_prompt",
  roomProjection: { room: { roomId: a.roomId, stateRevision: 70, stateHash: a.stateHash },
    matchBinding: { bindingHash: a.matchBindingHash }, viewer: { seatKey: a.seatKey },
    state: { round: 2, phase: "movement", activeSideKey: a.seatKey } },
  legalSpace: { ...a, finiteActions: [] },
  spatialObservation: { observationHash: a.spatialObservationHash,
    units: choice.queryReceipts[0].result.nodes.units.map(u => ({ ...u, unitId: u.nodeId })) },
  spatialActionSpace: { authority: a, actionSpaceHash: a.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.map(e => ({ candidateId: e.id, action: e.action })),
    parameterDomains: [] }, matchMemory: null, planState: { plan: choice.currentPlan } };
const snapshot = { skillSetHash: a.stateHash, skillRefs: [], skills: [] };
const match = { providerInteractionMode: "json_channels_v1",
  providerSession: { sessionId: "captured-capacity-only", sessionBindingHash: a.matchBindingHash },
  strategySkillSnapshot: snapshot, promptPack: "selfplay_agent_prompt" };
const built = buildStarcraftTmgLivePromptArtifactV1(match, input, choice, 10,
  choice.queryReceipts, "action");
const node = built.artifact.nodes.find(n => n.nodeId === "current-query-receipts");
const oldNodeBytes = attempt.promptNodeByteLengths.find(n => n.nodeId === node.nodeId).byteLength;
assert.equal(oldNodeBytes, 1819191, "bind the real failed envelope, not a synthetic whole room");
const estimatedCapturedArtifactBytes = attempt.promptByteLength - oldNodeBytes
  + Buffer.byteLength(JSON.stringify(node));
const raw = choice.queryReceipts.find(r => r.queryKind === "space.solve_formation");
const projected = compactQueryReceiptForPrompt(raw);
const restored = restoreStarcraftTmgFormationFireFactsForPromptV1(
  projected.result.formationOptions, projected.result.sharedIncomingFireFacts);
const unpooled = structuredClone(projected.result.formationOptions);
// Compare each entire fire estimate, including every probability/loss example.
for (let i = 0; i < restored.length; i += 1) for (const field of
  ["incomingStationaryFireEstimate", "incomingMoveThenFireEstimate"]) {
  assert.deepEqual(restored[i].relationshipComparison[field],
    projectStarcraftTmgIncomingFireEstimateForPromptV1(raw.result.formationOptions[i]
      .relationshipComparison[field]));
}
assert.equal(restored.length, 4);
assert.deepEqual(restoreStarcraftTmgFormationFireFactsForPromptV1(
  [{ sharedIncomingFireFactRef: "fire-fact-1" }], {
    encoding: "exact_shared_incoming_fire_facts_v1", referenceField: "sharedIncomingFireFactRef",
    facts: [{ id: "fire-fact-1", value: { damage: 3, supply: 1 } }],
  }), [{ damage: 3, supply: 1 }], "old evidence keeps its original codec");
const table = projected.result.sharedIncomingFireFacts;
const refs = new Map();
const count = value => {
  if (!value || typeof value !== "object") return;
  if (Object.keys(value).length === 1 && Object.hasOwn(value, table.referenceField)) {
    const id = value[table.referenceField]; refs.set(id, (refs.get(id) || 0) + 1); return;
  }
  for (const child of Object.values(value)) count(child);
};
count(unpooled);
for (const fact of table.facts) count(fact.value);
const singletonFacts = table.facts.filter(f => (refs.get(f.id) || 0) <= 1).length;

let record = null;
let supervisorCalls = 0;
let artifactReleases = 0;
const artifacts = createInMemoryStarcraftTmgPromptArtifactStoreV1({ maxArtifactBytes: 8 * 1024 * 1024 });
const port = createStarcraftTmgLiveFlashDecisionPortV1({
  providerInteractionMode: "json_channels_v1",
  profileCandidates: [{ providerId: "deepseek-openai-compatible-direct", model: "deepseek-flash",
    maxOutputUnits: 32768, profileRef: { id: "captured-capacity-only", version: "1", hash: a.stateHash } }],
  providerSupervisor: { async readState() { return {}; }, async sendTurn() {
    supervisorCalls += 1; return { ok: false, reason: "invalid_provider_supervisor_request" };
  } },
  promptArtifactStore: { put: value => artifacts.put(value), release(value) {
    artifactReleases += 1; return artifacts.release(value);
  } },
  profileAvailabilityPort: { async check() { return { ok: true, available: true }; } },
  strategySkillPort: { async resolve() { return { ok: true, snapshot }; } },
  spatialQueryPort: { async query() { throw new Error("captured Action must not requery"); } },
  store: { async load() { return record ? structuredClone(record) : null; },
    async commit(_key, revision, next) { assert.equal(revision, record?.revision ?? null);
      record = structuredClone(next); return { ok: true }; } },
});
const preflight = await port.preflight({ scope, matchMode: "agent_vs_agent" });
assert.equal(preflight.ok, true);
assert.equal((await port.openMatch({ scope, preflightReceipt: preflight,
  providerSession: { sessionId: "captured-capacity-port", connectionEpoch: 1,
    sessionBindingHash: a.matchBindingHash } })).ok, true);
record.decisions[choice.choiceKey] = structuredClone(choice);
const usageBefore = structuredClone(record.usage);
const oversized = structuredClone(input);
oversized.roomProjection.control = { capacityBugFixture: "x".repeat(3 * 1024 * 1024) };
const result = await port.decide(oversized);
const failures = [];
if (singletonFacts) failures.push(`counterproductive_single_reference_facts:${singletonFacts}`);
if (estimatedCapturedArtifactBytes > STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES) {
  failures.push(`captured_artifact_over_limit:${estimatedCapturedArtifactBytes}`);
}
if (result.reason !== "LIVE_DECISION_PROVIDER_INPUT_CAPACITY_EXCEEDED"
  || result.findingSeverity !== "High" || supervisorCalls !== 0
  || JSON.stringify(record.usage) !== JSON.stringify(usageBefore)) {
  failures.push(`deterministic_capacity_reaches_retry_lane:${result.reason}/${result.findingSeverity}/${supervisorCalls}`);
}
assert(artifactReleases >= 1);
assert.equal(await readFile(capturePath, "utf8"), original);
const report = { passed: failures.length === 0, failures, capturedRevision: 70,
  oldArtifactBytes: attempt.promptByteLength, oldQueryNodeBytes: oldNodeBytes,
  queryNodeBytes: Buffer.byteLength(JSON.stringify(node)), estimatedCapturedArtifactBytes,
  singletonFacts, formationOptions: restored.length, completeFireFactsRestored: true,
  capacityResult: { reason: result.reason, severity: result.findingSeverity },
  supervisorCalls, providerNetworkCalls: 0, originalRoomWrites: 0,
  originalPaidRepliesUnchanged: true, fullOriginalHttpEnvelopeRebuilt: false, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
assert.equal(failures.length, 0, failures.join(";"));
