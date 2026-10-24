#!/usr/bin/env node

import assert from "node:assert/strict";

import { createStarcraftTmgLiveFlashDecisionPortV1,
  projectStarcraftTmgSubmittedPlanningV1,
  projectStarcraftTmgSubmittedActionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import * as liveDecisionModule from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";

const bindingHash = "a".repeat(64);
const stateHash = "b".repeat(64);
const legalSpaceHash = "c".repeat(64);
const actionSpaceHash = "d".repeat(64);
const scope = {
  gameId: "starcraft-tmg", roomId: "json-channel-recovery-fixture",
  matchBindingHash: bindingHash, seatKey: "player1",
};
const providerSession = {
  sessionId: "json-channel-recovery-session", connectionEpoch: 1,
  sessionBindingHash: bindingHash,
};
const input = {
  scope, promptPack: "selfplay_agent_prompt",
  roomProjection: {
    room: { roomId: scope.roomId, stateRevision: 1, stateHash },
    matchBinding: { bindingHash }, viewer: { seatKey: scope.seatKey },
    state: { phase: "movement", round: 1 },
  },
  legalSpace: {
    roomId: scope.roomId, matchBindingHash: bindingHash,
    stateRevision: 1, stateHash, legalSpaceHash, finiteActions: [],
  },
  spatialActionSpace: {
    authority: { stateRevision: 1, stateHash, legalSpaceHash },
    actionSpaceHash,
    finiteActions: [
      { candidateId: "pass", action: { actionType: "pass" } },
      { candidateId: "deploy", action: { actionType: "deploy" } },
    ],
    parameterDomains: [],
  },
  spatialObservation: { observationHash: bindingHash },
  matchMemory: null, planState: null,
};
const skillSnapshot = {
  skillSetHash: bindingHash,
  skillRefs: [{ skillId: "general", hash: bindingHash }],
  skills: [{ skillId: "general", hash: bindingHash, procedure: [], knowledge: [] }],
};
const profileCandidates = [{
  providerId: "deepseek-openai-compatible-direct", model: "deepseek-flash",
  profileRef: { id: "recovery-fixture", version: "1", hash: bindingHash },
  maxOutputUnits: 1024,
}];
let record = null;
const durableStore = {
  async load() { return record ? structuredClone(record) : null; },
  async commit(_key, revision, next) {
    assert.equal(revision, record?.revision ?? null);
    record = structuredClone(next);
    return { ok: true };
  },
};
const storedArtifacts = [];
const artifactStore = createInMemoryStarcraftTmgPromptArtifactStoreV1();
const promptArtifactStore = {
  put(value) {
    storedArtifacts.push(structuredClone(value.artifact));
    return artifactStore.put(value);
  },
  release(value) { return artifactStore.release(value); },
};
let spatialQueries = 0;
let memoryQueries = 0;
let spatialQueriesBeforeNakedPlanning = null;
function port(mode, responses, allowMigration = false) {
  return createStarcraftTmgLiveFlashDecisionPortV1({
    providerInteractionMode: mode,
    allowFailedInteractionModeMigration: allowMigration,
    providerSupervisor: {
      async sendTurn() {
        const next = responses.shift();
        if (next?.output?.recommendedCandidateId) {
          spatialQueriesBeforeNakedPlanning = spatialQueries;
        }
        return next || {
        ok: false, reason: "DIAGNOSTIC_STOP_BEFORE_EGRESS",
        };
      },
      async readState() { return {}; },
    },
    promptArtifactStore,
    profileAvailabilityPort: { async check() {
      return { ok: true, available: true };
    } },
    strategySkillPort: { async resolve() {
      return { ok: true, snapshot: skillSnapshot };
    } },
    spatialQueryPort: { async query() {
      spatialQueries += 1;
      throw Error("Skill and memory requests must not use spatial query");
    } },
    memoryQueryPort: { async query() {
      memoryQueries += 1;
      return { queryResultHash: bindingHash, events: [] };
    } },
    store: durableStore, profileCandidates,
  });
}
async function open(decisionPort) {
  const preflight = await decisionPort.preflight({ scope,
    matchMode: "agent_vs_agent" });
  assert.equal(preflight.ok, true);
  return decisionPort.openMatch({ scope, preflightReceipt: preflight,
    providerSession });
}
function queryResponse(queryKind, args, extraRequests = []) {
  return { ok: true, output: {
    query_requests: [{ requestId: queryKind, queryKind, arguments: args },
      ...extraRequests],
  }, usageReceipt: { inputUnits: 10, outputUnits: 5, totalUnits: 15 },
  providerEvidence: { reportedModel: "deepseek-flash" } };
}

if (process.argv.includes("--formation-intent-correction-only")) {
  const selectedCandidateId =
    "sc-domain-cc02ae52d4764c362020b0cabf42ca5f475821bc9f47b8d98a67639b15bc7f5e";
  const describe = liveDecisionModule
    .describeStarcraftTmgFormationIntentCorrectionV1;
  assert.equal(typeof describe, "function",
    "a failed formation choice needs a candidate-aware typed repair");
  const detail = describe({
    selected: { id: selectedCandidateId, kind: "parameterized",
      action: { actionType: "run", pieceId: "player1-marine-2" } },
    recommendedCandidateId: selectedCandidateId,
  });
  for (const expected of [selectedCandidateId, "run", "player1-marine-2",
    "formationSearchRequested", "formationTacticalPurpose",
    "formationObjectives", "current action index"]) {
    assert(detail.includes(expected), `typed repair omitted ${expected}`);
  }
  console.log(JSON.stringify({ ok: true, focusedChecks: 7,
    providerCalls: 0, roomMutations: 0 }));
  process.exit(0);
}

if (process.argv.includes("--transport-progress-persistence-only")) {
  const transportProgress = {
    phase: "waiting_response_headers", elapsedMs: 300_000,
    milestonesMs: {
      dnsResolved: 4, tcpConnected: 8, tlsConnected: 15,
      requestWritten: 20, responseHeaders: null, responseCompleted: null,
    },
  };
  const failurePort = port("json_channels_v1", [{
    ok: false, reason: "provider_transport_timeout",
    turn: { chargedUnits: 100, failure: { code: "provider_transport_timeout",
      transportProgress } },
  }]);
  assert.equal((await open(failurePort)).ok, true);
  await failurePort.decide(input);
  const attempt = Object.values(record.decisions)[0].attempts[
    Object.values(record.decisions)[0].attemptKeys[0]];
  assert.equal(attempt.failure, "provider_transport_timeout");
  assert.deepEqual(attempt.providerTransportProgress, transportProgress);
  console.log(JSON.stringify({ ok: true, focusedChecks: 1,
    providerCalls: 0, roomMutations: 0 }));
  process.exit(0);
}

if (process.argv.includes("--transport-failed-progress-persistence-only")) {
  const transportProgress = {
    phase: "reading_response_body", elapsedMs: 76_000,
    milestonesMs: {
      dnsResolved: 4, tcpConnected: 8, tlsConnected: 15,
      requestWritten: 20, responseHeaders: 30, responseCompleted: null,
    },
  };
  const failurePort = port("json_channels_v1", [{
    ok: false, reason: "provider_transport_failed",
    turn: { chargedUnits: 100, failure: { code: "provider_transport_failed",
      transportProgress } },
  }]);
  assert.equal((await open(failurePort)).ok, true);
  await failurePort.decide(input);
  const attempt = Object.values(record.decisions)[0].attempts[
    Object.values(record.decisions)[0].attemptKeys[0]];
  assert.equal(attempt.failure, "provider_transport_failed");
  assert.deepEqual(attempt.providerTransportProgress, transportProgress);
  console.log(JSON.stringify({ ok: true, focusedChecks: 1,
    providerCalls: 0, roomMutations: 0 }));
  process.exit(0);
}

if (process.argv.includes("--planner-single-plan-only")) {
  const decisionPort = port("native_tools", []);
  assert.equal((await open(decisionPort)).ok, true);
  await decisionPort.decide(input);
  const planningTool = storedArtifacts[0]?.agentLoop?.tools?.find((tool) =>
    tool.function?.name === "submit_planning");
  assert(planningTool, "the Planner must retain its structured submission");
  const fields = planningTool.function.parameters.properties;
  assert(fields.plan, "the Planner must submit its current proposed plan");
  assert(fields.assessment, "plan continuation or revision remains explicit");
  assert.equal(fields.planRevision, undefined,
    "duplicate full-plan output must not be required on every action");
  console.log(JSON.stringify({ ok: true, focusedChecks: 3,
    providerCalls: 0, roomMutations: 0 }));
  process.exit(0);
}

const native = port("native_tools", []);
assert.equal((await open(native)).ok, true);
await native.decide(input);
assert.equal(record.usage.providerCalls, 1);
assert.equal(storedArtifacts[0].agentLoop.mode, "native_tools");

const json = port("json_channels_v1", [
  queryResponse("retrieve_strategy_skill", { query: "objective control" }, [{
    requestId: "forbidden-host-deferred-query",
    queryKind: "legal_formation_options", arguments: {},
  }]),
  queryResponse("retrieve_match_memory", { limit: 1 }),
  { ok: true, output: { recommendedCandidateId: "pass", plan: {} },
    usageReceipt: { inputUnits: 10, outputUnits: 5, totalUnits: 15 },
    providerEvidence: { reportedModel: "deepseek-flash" } },
], true);
const resumed = await open(json);
assert.equal(resumed.ok, true, "explicit failed-attempt migration retains this match");
assert.equal(record.usage.providerCalls, 1,
  "migration preserves the already dispatched attempt ledger");
assert.equal(record.providerInteractionMode, "json_channels_v1");
await json.decide(input);

const jsonArtifacts = storedArtifacts.slice(1);
assert(jsonArtifacts.length >= 2);
assert(jsonArtifacts.every((artifact) => !artifact.agentLoop),
  "JSON channel attempts must not silently send native tools");
assert(jsonArtifacts.every((artifact) => artifact.responseContract
  .allowedChannels.includes("query_requests")));
assert(jsonArtifacts[0].nodes.some((node) =>
  node.nodeId === "json-agent-query-interface"));
const choice = Object.values(record.decisions)[0];
assert(choice.queryReceipts.some((entry) => entry.queryReceiptHash
  && entry.source === "frozen_match_strategy_skill_snapshot"));
assert(choice.queryReceipts.some((entry) => entry.queryKind === "match_memory"));
assert.equal(memoryQueries, 1);
assert.equal(spatialQueriesBeforeNakedPlanning, 0,
  "unsupported JSON query must not reach the spatial port");
assert(choice.warnings.includes(
  "JSON_QUERY_KIND_UNSUPPORTED:legal_formation_options"));
assert(!choice.warnings.includes(
  "SEMANTIC_CORRECTION_REQUIRED:PLANNER_FINAL_OUTPUT_MISSING"),
"a naked but recognizable planning object must reach plan validation");
assert(record.usage.providerCalls >= 5);
assert(record.issues.some((entry) => entry.code
  === "LIVE_DECISION_FAILED_INTERACTION_MODE_MIGRATED"));
const formationInput = structuredClone(input);
formationInput.spatialActionSpace.parameterDomains = [{
  domainId: "deploy-domain", actionType: "deploy",
  parameterKind: "official_selected_roster_spatial_path_v1",
}];
const rawPlanning = {
  recommendedCandidateId: "deploy-domain",
  formationSearchRequested: true,
  formationPreferredX: 12_000,
  formationPreferredY: 24_000,
  formationMaximumOptions: 4,
  formationTacticalPurpose: "Hold mission marker 1 with the first Goliath.",
  formationObjectives: [{ kind: "control_objective", weight: 5,
    targetIds: ["mission-marker-1"] }],
  assetPlacementSearchRequested: false,
};
const submittedPlanning = projectStarcraftTmgSubmittedPlanningV1(
  rawPlanning, formationInput, { terminal: false });
assert.deepEqual(submittedPlanning.formationSearchRequest, {
  preferredAnchor: { xMilliInches: 12_000, yMilliInches: 24_000 },
  maximumOptions: 4,
  tacticalPurpose: rawPlanning.formationTacticalPurpose,
  formationObjectives: rawPlanning.formationObjectives,
}, "JSON Planner submission must reach the existing formation-intent mapper");
const rawAction = { candidateId: "deploy-domain", selection: {
  kind: "formation", optionId: "formation-option-1",
  slotAssignments: [], publicReason: "Protect marker 1.",
} };
const submittedAction = projectStarcraftTmgSubmittedActionV1(
  rawAction, formationInput, {
    plannerResult: { recommendedCandidateId: "deploy-domain" },
    semanticCorrectionRounds: 0, attemptKeys: [], attempts: {},
  }, { terminal: false });
assert.equal(submittedAction.formationSelection?.formationOptionId,
  "formation-option-1",
  "JSON Action selection must reach the existing formation mapper");
assert.equal(submittedAction.selection, undefined);
assert.equal(rawAction.selection.kind, "formation",
  "mapping must not mutate the persisted paid answer");
record = null;
storedArtifacts.length = 0;
const repeatedEvidence = port("json_channels_v1", [
  queryResponse("retrieve_strategy_skill", { query: "objective control" }),
  queryResponse("retrieve_strategy_skill", { query: "objective control" }),
  { ok: true, output: { recommendedCandidateId: "pass", plan: {} },
    usageReceipt: { inputUnits: 10, outputUnits: 5, totalUnits: 15 },
    providerEvidence: { reportedModel: "deepseek-flash" } },
]);
assert.equal((await open(repeatedEvidence)).ok, true);
await repeatedEvidence.decide(input);
const repeatedChoice = Object.values(record.decisions)[0];
assert.equal(repeatedChoice.queryReceipts.length, 1,
  "the second identical Skill request must not fabricate a new receipt");
assert.equal(storedArtifacts[2].nodes.find((node) =>
  node.nodeId === "agent-stage")?.content?.terminalSubmissionForced, true,
"a repeated query with no new evidence must force terminal planning");
console.log(JSON.stringify({ passed: true, mode: record.providerInteractionMode,
  priorAttemptsPreserved: 1, jsonQueryReceipts: choice.queryReceipts.length,
  memoryQueries, spatialQueriesAfterPlannerValidation: spatialQueries,
  providerNetworkCalls: 0,
  roomMutations: 0, trainingTruth: false }));
