#!/usr/bin/env node

import assert from "node:assert/strict";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialMultiModelCasualtyResolutionKernelV1,
  OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1,
} from
  "../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs";

function engagementGraph(modelEdges) {
  const body = {
    schema: "starcraft_tmg_official_engagement_graph_v2",
    modelEdges,
    engagedUnitIds: [...new Set(modelEdges.flatMap((edge) => [
      edge.leftUnitId,
      edge.rightUnitId,
    ]))].sort(),
    rulesTruth: "official_engagement_fixture",
    trainingTruth: false,
  };
  return { ...body, graphHash: hashStarcraftTmgContract(body) };
}

function targetPiece(modelIds, input = {}) {
  return {
    id: "target-marines",
    sideKey: "player2",
    maxModels: input.maxModels || modelIds.length,
    currentModels: modelIds.length,
    currentSupply: input.currentSupply ?? 1,
    damageMarker: input.damageMarker ?? 0,
    isOnField: true,
    isDestroyed: false,
    models: modelIds.map((id) => ({
      id,
      isOnField: true,
      isDestroyed: false,
    })),
    destroyedModelIds: [],
  };
}

function edge(targetModelId, enemyModelId, enemyUnitId, baseGap) {
  return {
    leftModelId: targetModelId,
    leftUnitId: "target-marines",
    leftElevation: "ground",
    rightModelId: enemyModelId,
    rightUnitId: enemyUnitId,
    rightElevation: "ground",
    horizontalBaseGapMilliInches: baseGap,
    sharedAccessPointIds: [],
    blockedTerrainIds: [],
  };
}

const kernel = createOfficialMultiModelCasualtyResolutionKernelV1();
assert.deepEqual(OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
assert.equal(
  OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1.part8DocumentHash,
  "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
);
assert.equal(
  OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1.part12DocumentHash,
  "153cb27295dfa4bfa2069aa1617836d81a2d4a3f15d19568de497ce19fd16868",
);

const engagedGraph = engagementGraph([
  edge("a1", "queen-1", "enemy-queen", 0),
  edge("a2", "queen-1", "enemy-queen", 0),
  edge("a3", "queen-1", "enemy-queen", 0),
  edge("b", "hydralisk-1", "enemy-hydralisk", 500),
]);
const engagedDomain = kernel.createDomain({
  targetPiece: targetPiece(["a1", "a2", "a3", "b"]),
  targetHitPoints: 2,
  visibleModelIds: [],
  engagementGraph: engagedGraph,
  priorDamageMarker: 0,
  incomingDamage: 6,
  attackResolutionHash: "a".repeat(64),
  rulesRuntimeHash: "b".repeat(64),
});
assert.equal(engagedDomain.targetEngaged, true);
assert.equal(engagedDomain.casualtyCount, 3);
assert.equal(engagedDomain.legalSelections.length, 12);
assert.deepEqual(
  [...new Set(engagedDomain.legalSelections.map((row) => row.casualtyModelIds[0]))],
  ["a1", "a2", "a3"],
);
assert.equal(
  engagedDomain.legalSelections.some((row) => (
    row.casualtyModelIds[0] === "b"
  )),
  false,
);
assert.equal(
  engagedDomain.legalSelections.some((row) => (
    row.casualtyModelIds.join(":") === "a1:a2:b"
  )),
  true,
);
assert.equal(
  engagedDomain.legalSelections.some((row) => (
    row.casualtyModelIds.join(":") === "a1:a2:a3"
  )),
  true,
);

const selected = engagedDomain.legalSelections.find((row) => (
  row.casualtyModelIds.join(":") === "a1:a2:b"
));
const engagedResolution = kernel.resolve({
  domain: engagedDomain,
  selectionHash: selected.selectionHash,
});
assert.deepEqual(engagedResolution.casualtyModelIds, ["a1", "a2", "b"]);
assert.deepEqual(engagedResolution.remainingModelIds, ["a3"]);
assert.equal(engagedResolution.postDamageMarker, 0);
assert.equal(engagedResolution.targetDestroyed, false);
assert.deepEqual(engagedResolution.remainingEngagedEnemyUnitIds, ["enemy-queen"]);

const unengagedDomain = kernel.createDomain({
  targetPiece: targetPiece(["m1", "m2", "m3", "m4"], { damageMarker: 1 }),
  targetHitPoints: 2,
  visibleModelIds: ["m1", "m2"],
  engagementGraph: engagementGraph([]),
  priorDamageMarker: 1,
  incomingDamage: 6,
  attackResolutionHash: "c".repeat(64),
  rulesRuntimeHash: "d".repeat(64),
});
assert.equal(unengagedDomain.targetEngaged, false);
assert.equal(unengagedDomain.uncappedCasualtyCount, 3);
assert.equal(unengagedDomain.casualtyCount, 2);
assert.equal(unengagedDomain.legalSelections.length, 2);
assert.deepEqual(
  unengagedDomain.legalSelections.map((row) => row.casualtyModelIds),
  [["m1", "m2"], ["m2", "m1"]],
);
assert.equal(unengagedDomain.postDamageMarker, 0);
assert.equal(unengagedDomain.discardedOverflowDamage, 3);
assert.equal(unengagedDomain.targetDestroyed, false);

assert.throws(
  () => kernel.resolve({
    domain: { ...unengagedDomain, incomingDamage: 7 },
    selectionHash: unengagedDomain.legalSelections[0].selectionHash,
  }),
  /MULTI_MODEL_CASUALTY_DOMAIN_INVALID/,
);
assert.throws(
  () => kernel.resolve({
    domain: unengagedDomain,
    selectionHash: "f".repeat(64),
  }),
  /MULTI_MODEL_CASUALTY_SELECTION_STALE/,
);

console.log(JSON.stringify({
  verifier: "official-multi-model-casualty-resolution-kernel-v1",
  acceptancePassed: 2,
  acceptanceTotal: 2,
  domainHash: engagedDomain.domainHash,
  legalSelections: engagedDomain.legalSelections.length,
  unengagedVisibleCapSelections: unengagedDomain.legalSelections.length,
  kernelHash: kernel.descriptor.kernelHash,
  failures: [],
}, null, 2));
