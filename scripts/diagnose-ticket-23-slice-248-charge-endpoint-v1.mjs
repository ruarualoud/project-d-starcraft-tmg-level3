#!/usr/bin/env node

// Read-only dense endpoint probe for the frozen r148 Hydralisk Charge.
// Sampling can find a possible placement; zero samples is NOT a Rules proof.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { evaluateOfficialChargeLeadingEndpointCoverV1 } from
  "../packages/rule-atoms/official-charge-endpoint-infeasibility-proof-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";

const argument = process.argv.find((entry) => entry.startsWith("--run-directory="));
assert(argument, "--run-directory is required");
const runDirectory = path.resolve(argument.slice("--run-directory=".length));
const runId = path.basename(runDirectory);
const privateState = JSON.parse(await readFile(path.join(runDirectory,
  "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`,
  trustLevel: "development_persistent",
});
const database = new DatabaseSync(path.join(runDirectory, "room.sqlite"),
  { readOnly: true });
let envelope;
try {
  const row = database.prepare(
    "SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?",
  ).get(privateState.roomId);
  assert(row, "frozen room aggregate is required");
  envelope = codec.decode(row.aggregate_cipher,
    `room:${privateState.roomId}:aggregate`).envelope;
} finally {
  database.close();
}
assert.equal(envelope.stateRevision, 148,
  "this concrete probe is bound to the original r148 scene");
const state = envelope.state;
const pending = state.pendingAction;
assert.equal(pending?.stage, "resolve_charge_after_roll");
assert.equal(pending.pieceId, "player2-hydralisk");
const actor = state.pieces.find((piece) => piece.id === pending.pieceId);
const leader = actor.models.find((model) =>
  model.id === pending.chargePlan.leadingModelId);
const declared = pending.chargePlan.targets;
assert.equal(declared.length, 1);
const target = state.pieces.find((piece) => piece.id === declared[0].unitId)
  ?.models.find((model) => model.id === declared[0].modelId);
assert(leader && target);
assert.equal(leader.baseShape, "rectangle");
assert.equal(target.baseShape, "round");
const point = (model) => ({ x: Math.round(model.xInches * 1000),
  y: Math.round(model.yInches * 1000) });
const start = point(leader);
const goal = point(target);
const halfWidth = Math.round(leader.baseWidthInches * 1000) / 2;
const halfDepth = Math.round(leader.baseDepthInches * 1000) / 2;
const circumscribedRadius = Math.hypot(halfWidth, halfDepth);
const targetRadius = Math.round(target.baseWidthInches * 1000) / 2;
const engagementCenterLimit = circumscribedRadius + targetRadius + 1001;
const moveLimit = pending.maxDistanceMilliInches + 1;
const allBlockers = state.pieces.filter((piece) =>
  piece.id !== actor.id && piece.isOnField === true
    && piece.isDestroyed !== true).flatMap((piece) =>
  piece.models.filter((model) => model.isOnField !== false
    && model.isDestroyed !== true));
const blockers = allBlockers.filter((model) => model.baseShape === "round")
  .map((model) => ({ id: model.id, center: point(model),
    radius: Math.round(model.baseWidthInches * 1000) / 2 }))
  .filter((model) => Math.hypot(model.center.x - goal.x,
    model.center.y - goal.y) <= engagementCenterLimit
      + circumscribedRadius + model.radius + 100);
const surfaces = (state.board?.terrain || []).filter((terrain) =>
  terrain.standableHorizontalSurface === true
    && terrain.footprint?.shape === "axis_aligned_rectangle")
  .map((terrain) => ({ id: terrain.id, ...terrain.footprint }));
function rectangleCircleDistance(center, circle, sine, cosine) {
  const dx = circle.x - center.x;
  const dy = circle.y - center.y;
  const localX = Math.abs((dx * cosine) + (dy * sine));
  const localY = Math.abs((-dx * sine) + (dy * cosine));
  return Math.hypot(Math.max(0, localX - halfWidth),
    Math.max(0, localY - halfDepth));
}
function surfaceValid(center, sine, cosine,
  horizontalHalfExtent, verticalHalfExtent) {
  const bounds = { minX: center.x - horizontalHalfExtent,
    maxX: center.x + horizontalHalfExtent,
    minY: center.y - verticalHalfExtent,
    maxY: center.y + verticalHalfExtent };
  for (const terrain of surfaces) {
    if (bounds.maxX <= terrain.minXMilliInches
      || bounds.minX >= terrain.maxXMilliInches
      || bounds.maxY <= terrain.minYMilliInches
      || bounds.minY >= terrain.maxYMilliInches) continue;
    const terrainCenterX = (terrain.minXMilliInches
      + terrain.maxXMilliInches) / 2;
    const terrainCenterY = (terrain.minYMilliInches
      + terrain.maxYMilliInches) / 2;
    const terrainHalfWidth = (terrain.maxXMilliInches
      - terrain.minXMilliInches) / 2;
    const terrainHalfDepth = (terrain.maxYMilliInches
      - terrain.minYMilliInches) / 2;
    const dx = terrainCenterX - center.x;
    const dy = terrainCenterY - center.y;
    // The axis-aligned bounds above cover world X/Y. These two projections
    // complete the separating-axis test for a rotated rectangle against the
    // authoritative axis-aligned standable surface rectangle.
    const projectedX = Math.abs((dx * cosine) + (dy * sine));
    const projectedY = Math.abs((-dx * sine) + (dy * cosine));
    if (projectedX >= halfWidth + terrainHalfWidth * Math.abs(cosine)
        + terrainHalfDepth * Math.abs(sine)
      || projectedY >= halfDepth + terrainHalfWidth * Math.abs(sine)
        + terrainHalfDepth * Math.abs(cosine)) continue;
    if (bounds.minX < terrain.minXMilliInches
      || bounds.maxX > terrain.maxXMilliInches
      || bounds.minY < terrain.minYMilliInches
      || bounds.maxY > terrain.maxYMilliInches) return false;
  }
  return true;
}
const passes = [];
for (const step of [100, 50, 25]) {
  const counts = { sampled: 0, withinMove: 0,
    surfaceValid: 0, targetEngaged: 0, collisionFree: 0 };
  const examples = [];
  for (let degrees = 0; degrees < 180; degrees += 2) {
    const angle = degrees * Math.PI / 180;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const horizontalHalfExtent = Math.abs(halfWidth * cosine)
      + Math.abs(halfDepth * sine);
    const verticalHalfExtent = Math.abs(halfWidth * sine)
      + Math.abs(halfDepth * cosine);
    for (let x = Math.floor((goal.x - engagementCenterLimit) / step) * step;
      x <= goal.x + engagementCenterLimit; x += step) {
      for (let y = Math.floor((goal.y - engagementCenterLimit) / step) * step;
        y <= Math.min(goal.y + engagementCenterLimit,
          start.y + moveLimit); y += step) {
        counts.sampled += 1;
        const center = { x, y };
        if (Math.hypot(x - start.x, y - start.y) > moveLimit) continue;
        counts.withinMove += 1;
        if (!surfaceValid(center, sine, cosine, horizontalHalfExtent,
          verticalHalfExtent)) continue;
        counts.surfaceValid += 1;
        const targetGap = rectangleCircleDistance(center, goal,
          sine, cosine) - targetRadius;
        if (targetGap > 1001 || targetGap < -1) continue;
        counts.targetEngaged += 1;
        if (blockers.some((blocker) => rectangleCircleDistance(center,
          blocker.center, sine, cosine) < blocker.radius - 2)) continue;
        counts.collisionFree += 1;
        if (examples.length < 10) examples.push({ xMilliInches: x,
          yMilliInches: y, rotationDegrees: degrees, targetGapMilliInches:
            Math.round(targetGap) });
      }
    }
  }
  passes.push({ gridStepMilliInches: step,
    angleStepDegrees: 2, counts, examples });
  if (examples.length > 0) break;
}

// This second pass is a conservative branch-and-bound cover of the *entire*
// continuous leading-model center/rotation domain. Each exclusion predicate
// must rule out every pose in its cell. Ignoring paths, other terrain and
// non-round blockers enlarges the possible domain, never creates a false
// impossibility proof. This report remains diagnostic, not a Rules action.
function distanceToCell(center, cell) {
  return Math.hypot(
    Math.max(cell.minX - center.x, center.x - cell.maxX, 0),
    Math.max(cell.minY - center.y, center.y - cell.maxY, 0));
}
function maximumCellDistanceToRectangle(cell, rectangle) {
  const xs = [cell.minX, cell.maxX];
  const ys = [cell.minY, cell.maxY];
  return Math.max(...xs.flatMap((x) => ys.map((y) => Math.hypot(
    Math.max(rectangle.minXMilliInches - x,
      x - rectangle.maxXMilliInches, 0),
    Math.max(rectangle.minYMilliInches - y,
      y - rectangle.maxYMilliInches, 0),
  ))));
}
function excludedCell(cell) {
  if (distanceToCell(start, cell) > moveLimit) return "outside_rolled_move";
  const middle = { x: (cell.minX + cell.maxX) / 2,
    y: (cell.minY + cell.maxY) / 2 };
  const angle = (cell.minAngle + cell.maxAngle) / 2;
  const angleError = (cell.maxAngle - cell.minAngle) / 2;
  const positionError = Math.hypot(
    (cell.maxX - cell.minX) / 2,
    (cell.maxY - cell.minY) / 2);
  const distanceError = positionError + circumscribedRadius * angleError;
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const targetDistance = rectangleCircleDistance(middle, goal,
    sine, cosine);
  if (targetDistance - distanceError > targetRadius + 1001) {
    return "outside_target_engagement";
  }
  const minHorizontalHalfExtent = Math.max(0,
    Math.abs(halfWidth * cosine) + Math.abs(halfDepth * sine)
      - circumscribedRadius * angleError);
  const minVerticalHalfExtent = Math.max(0,
    Math.abs(halfWidth * sine) + Math.abs(halfDepth * cosine)
      - circumscribedRadius * angleError);
  for (const surface of surfaces) {
    const overlapsForEveryPose = maximumCellDistanceToRectangle(cell,
      surface) < Math.min(halfWidth, halfDepth) - 2;
    if (!overlapsForEveryPose) continue;
    const extendsBeyondSurfaceForEveryPose =
      cell.maxX - minHorizontalHalfExtent < surface.minXMilliInches - 1
      || cell.minX + minHorizontalHalfExtent > surface.maxXMilliInches + 1
      || cell.maxY - minVerticalHalfExtent < surface.minYMilliInches - 1
      || cell.minY + minVerticalHalfExtent > surface.maxYMilliInches + 1;
    if (extendsBeyondSurfaceForEveryPose) {
      return `partial_standable_surface:${surface.id}`;
    }
  }
  for (const blocker of blockers) {
    const modelDistance = rectangleCircleDistance(middle,
      blocker.center, sine, cosine);
    if (modelDistance + distanceError < blocker.radius - 2) {
      return `overlaps_model:${blocker.id}`;
    }
  }
  return null;
}
const remainingCells = [{
  minX: goal.x - engagementCenterLimit,
  maxX: goal.x + engagementCenterLimit,
  minY: goal.y - engagementCenterLimit,
  maxY: goal.y + engagementCenterLimit,
  minAngle: 0,
  maxAngle: Math.PI,
  depth: 0,
}];
const excludedByReason = new Map();
const unresolvedCells = [];
let examinedCells = 0;
const maxCells = 1_000_000;
const proofStarted = performance.now();
while (remainingCells.length > 0 && examinedCells < maxCells) {
  const cell = remainingCells.pop();
  examinedCells += 1;
  const reason = excludedCell(cell);
  if (reason) {
    excludedByReason.set(reason, (excludedByReason.get(reason) || 0) + 1);
    continue;
  }
  const spans = [cell.maxX - cell.minX, cell.maxY - cell.minY,
    circumscribedRadius * (cell.maxAngle - cell.minAngle)];
  const widest = Math.max(...spans);
  if (cell.depth >= 72 || widest < 0.001) {
    unresolvedCells.push(cell);
    if (unresolvedCells.length >= 8) break;
    continue;
  }
  const axis = spans.indexOf(widest);
  const key = ["X", "Y", "Angle"][axis];
  const middle = (cell[`min${key}`] + cell[`max${key}`]) / 2;
  remainingCells.push({ ...cell, [`min${key}`]: middle,
    depth: cell.depth + 1 }, { ...cell, [`max${key}`]: middle,
    depth: cell.depth + 1 });
}
const continuousCover = {
  examinedCells,
  maxCells,
  elapsedMs: Math.round(performance.now() - proofStarted),
  excludedByReason: Object.fromEntries([...excludedByReason].sort()),
  unresolvedCellCount: unresolvedCells.length,
  unresolvedSamples: unresolvedCells.slice(0, 2),
  pendingCellCount: remainingCells.length,
  allPosesConservativelyExcluded: remainingCells.length === 0
    && unresolvedCells.length === 0,
  ignoredPathAndNonstandableTerrainConstraints: true,
};
const rulesCandidateCover = evaluateOfficialChargeLeadingEndpointCoverV1(
  state, pending);
assert.equal(rulesCandidateCover.allPosesExcluded,
  continuousCover.allPosesConservativelyExcluded,
  "pure Rules candidate and independent diagnostic cover must agree");
const openedScene = structuredClone(state);
for (const model of openedScene.pieces.find((piece) =>
  piece.id === "player1-marine-1").models) {
  if ([2, 3, 4].some((ordinal) => model.id.endsWith(`model-${ordinal}`))) {
    model.isDestroyed = true;
  }
}
const counterexampleCover = evaluateOfficialChargeLeadingEndpointCoverV1(
  openedScene, pending);
assert.equal(rulesCandidateCover.allPosesExcluded, true,
  "the original r148 geometry must be covered");
assert.equal(counterexampleCover.allPosesExcluded, false,
  "removing the three blocking Marines must not certify failure");
const report = {
  schema: "ticket23_slice248_charge_endpoint_dense_probe_v1",
  roomId: privateState.roomId,
  stateRevision: envelope.stateRevision,
  stateHash: envelope.stateHash,
  actorModelId: leader.id,
  actorBaseShape: leader.baseShape,
  actorBaseWidthMilliInches: halfWidth * 2,
  actorBaseDepthMilliInches: halfDepth * 2,
  targetModelId: target.id,
  moveLimitMilliInches: moveLimit,
  engagementCenterLimitMilliInches: engagementCenterLimit,
  checkedRoundBlockers: blockers.length,
  ignoredNonRoundBlockers: allBlockers.length - allBlockers.filter(
    (model) => model.baseShape === "round").length,
  passes,
  noSampledLeadingEndpoint: passes.at(-1).counts.collisionFree === 0,
  samplingIsNotProofOfImpossibility: true,
  continuousCover,
  rulesCandidateCover,
  counterexampleCover: {
    allPosesExcluded: counterexampleCover.allPosesExcluded,
    reason: counterexampleCover.reason,
    examinedCells: counterexampleCover.examinedCells,
  },
  rulesFailureCertificate: false,
  providerCalls: 0,
  roomMutations: 0,
  trainingTruth: false,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
