import { describe, expect, it } from "vitest";

import {
  projectStarcraftTmgBattlefieldPresentationV1,
  projectStarcraftTmgBattlefieldViewportV1,
} from "../battlefield-presentation-v1";

const HASH = "a".repeat(64);

function model(id: string, index: number, baseWidthMm = 32) {
  return {
    id,
    xInches: 4 + (index * 1.5),
    yInches: 7 + ((index % 4) * 1.5),
    baseShape: "round",
    baseWidthMm,
    baseDepthMm: baseWidthMm,
    isOnField: true,
    isDestroyed: false,
  };
}

function fixture() {
  const models = Array.from({ length: 13 }, (_unused, index) => (
    model(`marine-${index + 1}`, index, index === 1 ? 40 : index === 2 ? 80 : 32)
  ));
  const finiteActions = Array.from({ length: 11 }, (_unused, index) => ({
    actionKey: `sc-finite-${String(index + 1).padStart(2, "0")}`,
    action: {
      actionType: "hold",
      sideKey: "player1",
      pieceId: `piece-${index + 1}`,
    },
    confirmationClass: "direct_gesture",
  }));
  return {
    roomProjection: {
      room: { roomId: "slice-132-room", stateRevision: 7, stateHash: HASH },
      state: {
        board: {
          widthInches: 54,
          heightInches: 36,
          terrain: [{
            id: "official-wall",
            shape: "axis_aligned_rectangle",
            blocksPlacement: true,
            footprint: {
              shape: "axis_aligned_rectangle",
              minXMilliInches: 8_000,
              maxXMilliInches: 12_000,
              minYMilliInches: 20_000,
              maxYMilliInches: 22_000,
            },
          }],
          centerMarkers: [{
            id: "centre",
            xInches: 27,
            yInches: 18,
            shape: "round",
            radiusInches: 3,
          }],
          effectMarkers: [{
            id: "effect",
            xInches: 30,
            yInches: 18,
            shape: "round",
            diameterInches: 1,
          }],
          missionMarkers: [{
            id: "board-mission-marker",
            xInches: 32,
            yInches: 18,
            diameterMillimeters: 32,
          }],
        },
        pieces: [
          {
            id: "marine-unit",
            name: "Marine",
            sideKey: "player1",
            currentModels: models.length,
            models,
          },
          {
            id: "legacy-unit",
            name: "Legacy aggregate",
            sideKey: "player2",
            currentModels: 29,
            xInches: 45,
            yInches: 18,
          },
        ],
        officialBattlefieldTokens: [{
          tokenId: "official-token",
          tokenKind: "corrosive_bile",
          coordinate: { x: 10, y: 10 },
          baseDiameterMm: 32,
          rulesFootprint: {
            shape: "circle",
            centre: { x: 10, y: 10 },
            diameterInches: 32 / 25.4,
          },
        }],
        officialBattlefieldMarkers: [{
          markerId: "official-marker",
          markerKind: "faction_indicator",
          markerRole: "mission_marker_control",
          coordinate: { x: 20, y: 10 },
          physicalPresence: false,
          rulesFootprint: null,
        }],
        officialMissionMarkerPlacement: {
          missionMarkers: [{
            number: 5,
            affinity: "neutral",
            xInches: 27,
            yInches: 6,
          }],
        },
      },
    },
    legalSpace: {
      finiteActions,
      parameterDomains: [
        {
          domainId: `sc-domain-${"b".repeat(64)}`,
          parameterKind: "official_standard_move_path_v5",
          actionType: "move",
          sideKey: "player1",
          pieceId: "marine-unit",
          parameterSchema: {
            required: ["leadingModelId", "path", "placements"],
            maxCanonicalPathPoints: 1024,
            exactRemainingPlacementCount: 12,
          },
          constraints: {
            modelIds: models.map((entry) => entry.id),
            modelStartPoints: Object.fromEntries(models.map((entry) => [
              entry.id,
              {
                xMilliInches: Math.round(entry.xInches * 1000),
                yMilliInches: Math.round(entry.yInches * 1000),
              },
            ])),
          },
        },
        {
          domainId: `sc-domain-${"c".repeat(64)}`,
          parameterKind: "future_unknown_domain_v9",
          actionType: "future_action",
          sideKey: "player1",
          parameterSchema: { required: ["opaque"] },
          constraints: {},
        },
        {
          domainId: `sc-domain-${"d".repeat(64)}`,
          actionType: "move",
          sideKey: "player1",
          pieceId: "legacy-unit",
          parameterSchema: { required: ["path"], maxCanonicalPoints: 48 },
          constraints: { start: { xMilliInches: 45_000, yMilliInches: 18_000 } },
        },
      ],
    },
    pendingPreview: {
      previewId: "sc-preview-slice132",
      core: {
        action: {
          actionType: "move",
          movePlan: {
            schemaVersion: "starcraft_tmg_official_standard_move_plan_v1",
            canonicalPath: {
              unit: "milli-inch",
              points: [
                { xMilliInches: 4_000, yMilliInches: 7_000 },
                { xMilliInches: 6_000, yMilliInches: 7_000 },
              ],
            },
            placementSequence: [{
              modelId: "marine-2",
              xMilliInches: 6_500,
              yMilliInches: 8_000,
            }],
            finalModelPositions: [{
              modelId: "marine-1",
              xMilliInches: 6_000,
              yMilliInches: 7_000,
            }, {
              modelId: "marine-2",
              xMilliInches: 6_500,
              yMilliInches: 8_000,
            }],
          },
        },
      },
    },
  };
}

describe("Slice 132 authoritative battlefield presentation", () => {
  it("renders arbitrary model counts and never invents per-model positions for an aggregate", () => {
    const scene = projectStarcraftTmgBattlefieldPresentationV1(fixture());
    expect(scene.models).toHaveLength(13);
    expect(scene.models.map((entry) => entry.id)).toEqual(
      Array.from({ length: 13 }, (_unused, index) => `marine-${index + 1}`),
    );
    expect(scene.unitAnchors).toHaveLength(1);
    expect(scene.unitAnchors[0]).toMatchObject({
      pieceId: "legacy-unit",
      currentModels: 29,
      geometryRenderable: false,
    });
    expect(scene.diagnostics).toContain(
      "unit_anchor:legacy-unit:model_coordinates_unavailable",
    );
  });

  it("keeps board, millimetre bases, marker layers, actions and preview untruncated", () => {
    const scene = projectStarcraftTmgBattlefieldPresentationV1(fixture());
    expect(scene.board).toEqual({
      widthMilliInches: 54_000,
      heightMilliInches: 36_000,
    });
    expect(scene.models.slice(0, 3).map((entry) => entry.baseWidthMilliInches))
      .toEqual([1260, 1575, 3150]);
    expect(scene.models[1].baseWidthMilliInches! / scene.models[0].baseWidthMilliInches!)
      .toBeCloseTo(1.25, 8);
    expect(scene.models[2].baseWidthMilliInches! / scene.models[0].baseWidthMilliInches!)
      .toBeCloseTo(2.5, 8);
    expect(scene.markers.map((entry) => entry.id)).toEqual([
      "centre",
      "board-mission-marker",
      "effect",
      "marker-4",
      "official-marker",
    ]);
    expect(scene.markers.find((entry) => entry.id === "centre"))
      .toMatchObject({ widthMilliInches: 6000, depthMilliInches: 6000 });
    expect(scene.tokens).toHaveLength(1);
    expect(scene.tokens[0]).toMatchObject({
      id: "official-token",
      xMilliInches: 10_000,
      yMilliInches: 10_000,
      widthMilliInches: 1260,
      depthMilliInches: 1260,
      shape: "round",
      geometryRenderable: true,
    });
    expect(scene.terrain).toEqual([expect.objectContaining({
      id: "official-wall",
      shape: "rectangle",
      xMilliInches: 10_000,
      yMilliInches: 21_000,
      widthMilliInches: 4_000,
      depthMilliInches: 2_000,
      geometryRenderable: true,
    })]);
    expect(scene.markers.find((entry) => entry.id === "board-mission-marker"))
      .toMatchObject({
        shape: "round",
        widthMilliInches: 1260,
        depthMilliInches: 1260,
        geometryRenderable: true,
      });
    expect(scene.markers.find((entry) => entry.id === "marker-4"))
      .toMatchObject({
        xMilliInches: 27_000,
        yMilliInches: 6_000,
        geometryRenderable: false,
      });
    expect(scene.finiteActions).toHaveLength(11);
    expect(scene.previewPath).toEqual([
      { xMilliInches: 4_000, yMilliInches: 7_000 },
      { xMilliInches: 6_000, yMilliInches: 7_000 },
    ]);
    expect(scene.previewPlacements).toEqual([
      expect.objectContaining({
        modelId: "marine-1",
        xMilliInches: 6_000,
        yMilliInches: 7_000,
        baseWidthMilliInches: 1260,
        geometryRenderable: true,
      }),
      expect.objectContaining({
        modelId: "marine-2",
        xMilliInches: 6_500,
        yMilliInches: 8_000,
        baseWidthMilliInches: 1575,
        geometryRenderable: true,
      }),
    ]);
  });

  it("uses a parameter registry and fails closed for unknown kinds", () => {
    const scene = projectStarcraftTmgBattlefieldPresentationV1(fixture());
    expect(scene.parameterDomains.map((entry) => entry.support)).toEqual([
      "official_standard_move",
      "unsupported",
      "legacy_path_only",
    ]);
    expect(scene.parameterDomains[0].modelIds).toHaveLength(13);
    expect(scene.parameterDomains[0].exactRemainingPlacementCount).toBe(12);
  });

  it("contains 54x36 uniformly and reverses bottom-left world coordinates", () => {
    const landscape = projectStarcraftTmgBattlefieldViewportV1({
      boardWidthMilliInches: 54_000,
      boardHeightMilliInches: 36_000,
      viewportWidthPixels: 900,
      viewportHeightPixels: 600,
    });
    expect(landscape.boardPixelWidth).toBe(900);
    expect(landscape.boardPixelHeight).toBe(600);
    expect(landscape.worldToViewport({ xMilliInches: 0, yMilliInches: 0 }))
      .toEqual({ xPixels: 0, yPixels: 600 });
    expect(landscape.worldToViewport({ xMilliInches: 54_000, yMilliInches: 36_000 }))
      .toEqual({ xPixels: 900, yPixels: 0 });
    expect(landscape.viewportToWorld({ xPixels: 450, yPixels: 300 }))
      .toEqual({ xMilliInches: 27_000, yMilliInches: 18_000 });

    const portrait = projectStarcraftTmgBattlefieldViewportV1({
      boardWidthMilliInches: 54_000,
      boardHeightMilliInches: 36_000,
      viewportWidthPixels: 360,
      viewportHeightPixels: 640,
    });
    expect(portrait.boardPixelWidth).toBeCloseTo(360, 10);
    expect(portrait.boardPixelHeight).toBeCloseTo(240, 10);
    expect(portrait.letterboxOffsetYPixels).toBeCloseTo(200, 10);
    const source = { xMilliInches: 12_345, yMilliInches: 6_789 };
    expect(portrait.viewportToWorld(portrait.worldToViewport(source))).toEqual(source);
  });
});
