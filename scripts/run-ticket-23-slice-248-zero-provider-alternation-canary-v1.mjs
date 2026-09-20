#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIRECTORY = path.join(ROOT,
  "build/ticket-23-slice-248-zero-provider-alternation-canary-v1");
const ROOM_ID = "ticket23-slice248-zero-provider-alternation-canary";

const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: ROOT,
  roomId: ROOM_ID,
  roomProfile: "standard_2000_live",
  mapConfiguration: {
    seedId: "sc1_lost_temple_v1",
    elementSelections: [],
    passageSelections: [],
  },
  autoDrive: false,
  attachBot: false,
  enableSpatialPreexecution: false,
  issueHumanRecovery: false,
});
const initial = await fixture.roomRuntime.roomStore.loadRoom(ROOM_ID);
const matchBinding = initial.envelope.matchBinding;
let state = initial.envelope.state;
let revision = 0;
const trace = [];

function legal(sideKey) {
  return fixture.rulesRuntime.enumerate(state, {
    sideKey,
    includeDisabled: false,
    matchBinding,
  });
}

function applyAction(action, label) {
  const before = state.activeSideKey;
  revision += 1;
  const transition = fixture.rulesRuntime.apply(state, action, {
    postRevision: revision,
    matchBinding,
  });
  state = transition.state;
  trace.push({
    revision,
    label,
    actionType: action.actionType,
    sideKey: action.sideKey,
    pieceId: action.pieceId || null,
    activeSideBefore: before,
    activeSideAfter: state.activeSideKey,
    activationWindowPieceId: state.selectedRosterActivationWindow?.pieceId || null,
  });
}

function applyFinite(sideKey, predicate, label) {
  const action = legal(sideKey).candidates.find(predicate);
  assert(action, `${label} finite action is required`);
  applyAction(action, label);
}

function solveDeploy(sideKey, pieceId) {
  const domain = legal(sideKey).parameterDomains.find((candidate) => (
    candidate.actionType === "deploy" && candidate.pieceId === pieceId
  ));
  assert(domain, `${pieceId} deploy domain is required`);
  const solved = searchStarcraftTmgLegalFormationOptionsV1({
    state,
    domain,
    request: {
      maximumOptions: 1,
      maximumCandidateAttempts: 256,
      formationObjectives: [{ kind: "compact", weight: 1, targetIds: [] }],
    },
    instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
    instantiateOptions: { matchBinding },
  });
  assert.equal(solved.optionCount, 1,
    `${pieceId} must have one exact legal deployment formation`);
  const option = solved.formationOptions[0];
  const instantiated = fixture.rulesRuntime.instantiate(
    state, domain, option.canonicalParameters, { matchBinding },
  );
  applyAction(instantiated.action, `${pieceId}-deploy`);
}

function finishActivation(sideKey, pieceId) {
  const current = legal(sideKey);
  const leaked = current.parameterDomains.filter((domain) => (
    domain.pieceId && domain.pieceId !== pieceId
  ));
  assert.deepEqual(leaked.map((domain) => ({
    actionType: domain.actionType,
    pieceId: domain.pieceId,
  })), [], `${pieceId} activation window must not leak another unit`);
  const domain = current.parameterDomains.find((candidate) => (
    candidate.actionType === "finish_activation" && candidate.pieceId === pieceId
  ));
  assert(domain, `${pieceId} finish_activation domain is required`);
  const instantiated = fixture.rulesRuntime.instantiate(
    state, domain, {}, { matchBinding },
  );
  applyAction(instantiated.action, `${pieceId}-finish`);
}

applyFinite("player1", (action) => (
  action.actionType === "resolve_mission_start_of_round"
), "start-round");
applyFinite("player1", (action) => (
  action.actionType === "choose_first_actor"
    && action.chosenFirstActorSideKey === "player1"
), "choose-player1-first");

solveDeploy("player1", "player1-goliath-1");
assert.equal(state.selectedRosterActivationWindow?.pieceId,
  "player1-goliath-1");
finishActivation("player1", "player1-goliath-1");
assert.equal(state.activeSideKey, "player2",
  "player2 live reserves must receive the next activation");

solveDeploy("player2", "player2-kerrigan");
assert.equal(state.selectedRosterActivationWindow?.pieceId,
  "player2-kerrigan");
finishActivation("player2", "player2-kerrigan");
assert.equal(state.activeSideKey, "player1",
  "alternation must return to player1 after player2 finishes");

const report = {
  schema: "ticket23_slice248_zero_provider_alternation_canary_v1",
  ok: true,
  roomId: ROOM_ID,
  startedFromRevision: 0,
  finalRevision: revision,
  deploymentOrder: ["player1-goliath-1", "player2-kerrigan"],
  finalActiveSideKey: state.activeSideKey,
  trace,
  providerCalls: 0,
  estimatedCostCny: 0,
  sourceRefreshPerformed: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await writeFile(path.join(OUTPUT_DIRECTORY, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
fixture.roomRuntime.roomStore.close?.();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
