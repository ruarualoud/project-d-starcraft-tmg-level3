#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectStarcraftTmgSelectedActionResourceClaimsV1,
  projectStarcraftTmgPlanningActionSpaceForPromptV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
assert(runArgument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  runArgument.slice("--run-directory=".length));
const privateState = JSON.parse(await readFile(
  path.join(runDirectory, "runner-private.json"), "utf8"));
const liveRunId = path.basename(runDirectory);
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec: createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${liveRunId}`,
    trustLevel: "development_persistent",
  }),
});

try {
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  const state = structuredClone(bundle.currentAggregate.envelope.state);
  state.phase = "movement";
  state.activeSideKey = "player2";
  state.pendingAction = null;
  state.pendingReactionWindow = null;
  state.selectedRosterActivationWindow = null;
  state.unitLifecycleUseHistory = [];
  state.players.player2.passedPhases.movement = false;
  for (const card of state.cardResources.player2) card.readiness = "ready";

  const adapter = createOfficialUnitLifecycleFamilyAdapterV1(
    state.officialUnitLifecycleFamilySourceBundle);
  const actionSpace = adapter.legalSpace(state, {
    sideKey: "player2",
    scope: "catalogue",
  });
  const domain = actionSpace.parameterDomains.find((entry) =>
    entry.abilityName === "Roachling Infestation");
  assert(domain, "live Roachling Infestation domain is required");

  const cost = domain.constraints?.resourceCostsByChoice?.default;
  assert(cost,
    "lifecycle LegalSpace must publish the Rules-owned resource cost contract");
  assert.deepEqual({
    resourceType: cost.resourceType,
    printedResourceCost: cost.printedResourceCost,
    resourceCostReduction: cost.resourceCostReduction,
    effectiveResourceCost: cost.effectiveResourceCost,
  }, {
    resourceType: "BM",
    printedResourceCost: 2,
    resourceCostReduction: 0,
    effectiveResourceCost: 2,
  });

  const promptIndex = projectStarcraftTmgPlanningActionSpaceForPromptV1({
    finiteActions: [],
    parameterDomains: [domain],
  });
  assert.equal(promptIndex.parameterDomains[0]
    .resourceCostsByChoice.default.effectiveResourceCost, 2);

  const falseFree = inspectStarcraftTmgSelectedActionResourceClaimsV1({
    spatialActionSpace: { finiteActions: [], parameterDomains: [domain] },
    candidateId: domain.domainId,
    stage: "action",
    value: {
      selectedReason: "Use Roachling Infestation without spending Biomass.",
      intent: {
        currentGoal: "Summon three Roachlings at zero Biomass cost.",
        purpose: "Keep all Biomass available.",
      },
      publicDecisionSummary: {
        plan: "Use Roachling Infestation for 0 BM.",
        purpose: "Spend no Biomass.",
      },
    },
  });
  assert.equal(falseFree.status, "contradicted");
  assert.equal(falseFree.resourceContract.costs[0].effectiveResourceCost, 2);

  process.stdout.write(`${JSON.stringify({
    passed: true,
    roomStateRevision: bundle.currentAggregate.envelope.stateRevision,
    abilityName: domain.abilityName,
    resourceContract: cost,
    promptEffectiveResourceCost: promptIndex.parameterDomains[0]
      .resourceCostsByChoice.default.effectiveResourceCost,
    falseFreeStatus: falseFree.status,
    falseFreeContradictionCount: falseFree.contradictions.length,
    providerCalls: 0,
    paidCostCny: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
} finally {
  roomStore.close();
}
