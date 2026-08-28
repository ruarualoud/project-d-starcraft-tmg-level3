import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../../packages/rule-atoms/official-engagement-graph-v2.mjs";
import { createOfficialMarineMultiModelCasualtyFixtureV1 } from
  "./official-marine-multi-model-casualty-fixture-v1.mjs";

function setPosition(model, position) {
  model.xInches = position.xInches;
  model.yInches = position.yInches;
}

function renamePiece(piece, id) {
  const previousId = piece.id;
  piece.id = id;
  piece.models.forEach((model, index) => {
    model.id = `${id}-m${index + 1}`;
  });
  piece.destroyedModelIds = piece.models
    .filter((model) => model.isDestroyed === true)
    .map((model) => model.id);
  return { previousId, piece };
}

export async function createOfficialMarineMultiEnemyCasualtyFixtureV2(input = {}) {
  const fixture = await createOfficialMarineMultiModelCasualtyFixtureV1({
    attackerSideKey: input.attackerSideKey || "player1",
    attackerMaxModels: 6,
    attackerCurrentModels: 6,
    defenderMaxModels: 6,
    defenderCurrentModels: 3,
    attackerUpgradeNames: input.attackerUpgradeNames || [],
    attackerPositions: [
      { xInches: 18.74, yInches: 10 },
      { xInches: 18.74, yInches: 15.2 },
      { xInches: 8, yInches: 22 },
      { xInches: 11, yInches: 22 },
      { xInches: 14, yInches: 22 },
      { xInches: 17, yInches: 22 },
    ],
    defenderPositions: [
      { xInches: 20, yInches: 10 },
      { xInches: 20, yInches: 12.6 },
      { xInches: 20, yInches: 15.2 },
      { xInches: 40, yInches: 25 },
      { xInches: 43, yInches: 25 },
      { xInches: 46, yInches: 25 },
    ],
  });
  const attacker = fixture.state.pieces.find((piece) => (
    piece.id === fixture.attackerPieceId
  ));
  const coEngagerPieceId = `${fixture.attackerSideKey}-co-engager`;
  const coEngager = renamePiece(structuredClone(attacker), coEngagerPieceId).piece;
  coEngager.selectedUpgradeNames = [];
  coEngager.statuses = [];
  coEngager.damageMarker = 0;
  coEngager.activatedPhases = { movement: false, assault: false, combat: false };
  const coEngagerPositions = [
    { xInches: 21.26, yInches: 12.6 },
    { xInches: 34, yInches: 6 },
    { xInches: 37, yInches: 6 },
    { xInches: 40, yInches: 6 },
    { xInches: 43, yInches: 6 },
    { xInches: 46, yInches: 6 },
  ];
  coEngager.models.forEach((model, index) => setPosition(model, coEngagerPositions[index]));
  fixture.state.pieces.splice(1, 0, coEngager);
  const graph = deriveOfficialEngagementGraphV2(fixture.state);
  const targetEngagedEnemyUnitIds = [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === fixture.targetPieceId) return [edge.rightUnitId];
    if (edge.rightUnitId === fixture.targetPieceId) return [edge.leftUnitId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
  return {
    ...fixture,
    coEngagerPieceId,
    engagementGraph: graph,
    targetEngagedEnemyUnitIds,
    fixtureHash: hashStarcraftTmgContract({
      state: fixture.state,
      attackerPieceId: fixture.attackerPieceId,
      coEngagerPieceId,
      targetPieceId: fixture.targetPieceId,
      engagementGraphHash: graph.graphHash,
    }),
  };
}
