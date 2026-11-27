export type BattlefieldBaseShape = "round" | "oval" | "rectangle" | "orthogonal_cross" | "measured_contour";

export interface BattlefieldPointV1 { xMilliInches: number; yMilliInches: number; }
export interface BattlefieldModelV1 extends BattlefieldPointV1 {
  kind: "model"; id: string; pieceId: string; unitId: string | null; officialUnitRecordKey?: string | null;
  label: string; sideKey: string;
  baseShape: BattlefieldBaseShape | null; baseWidthMilliInches: number | null;
  baseDepthMilliInches: number | null; baseRotationDegrees: number;
  horizontalArmDepthMilliInches?: number | null;
  verticalArmWidthMilliInches?: number | null;
  localVerticesMilliInches?: readonly BattlefieldPointV1[] | null;
  baseBounds: BattlefieldBaseBoundsV1 | null; withinBoard: boolean;
  geometryRenderable: boolean; selected: boolean; destroyed: boolean;
  statuses: readonly string[];
  weaponRangeReferences: readonly BattlefieldWeaponRangeReferenceV1[];
  maxProjectedWeaponRangeMilliInches: number | null;
}
export interface BattlefieldUnitAnchorV1 extends BattlefieldPointV1 {
  kind: "unit_anchor"; id: string; pieceId: string; unitId: string | null;
  label: string; sideKey: string;
  currentModels: number | null; selected: boolean; geometryRenderable: false;
}
export interface BattlefieldBaseBoundsV1 {
  minXMilliInches: number; maxXMilliInches: number;
  minYMilliInches: number; maxYMilliInches: number;
  extentXMilliInches: number; extentYMilliInches: number;
}
export interface BattlefieldWeaponRangeReferenceV1 {
  weaponName: string; printedRange: string | null;
  projectedRangeMilliInches: number | null;
}
export interface BattlefieldAreaV1 extends BattlefieldPointV1 {
  id: string; kind: "terrain" | "marker" | "token"; label: string; sourceTokenId?: string;
  shape: BattlefieldBaseShape | null; widthMilliInches: number | null;
  depthMilliInches: number | null; rotationDegrees: number; geometryRenderable: boolean;
  terrainKind: string | null; terrainSize: number | null;
  elevation: string | null; elevationSurface: boolean;
  footprintCells?: readonly {
    minXMilliInches: number; maxXMilliInches: number;
    minYMilliInches: number; maxYMilliInches: number;
  }[];
}
export interface BattlefieldPlacementV1 extends BattlefieldPointV1 {
  modelId: string; baseShape: BattlefieldBaseShape | null;
  baseWidthMilliInches: number | null; baseDepthMilliInches: number | null;
  horizontalArmDepthMilliInches?: number | null;
  verticalArmWidthMilliInches?: number | null;
  localVerticesMilliInches?: readonly BattlefieldPointV1[] | null;
  baseRotationDegrees: number; geometryRenderable: boolean;
}
export interface BattlefieldActionV1 {
  actionKey: string; actionType: string; pieceId: string | null; label: string;
  confirmationClass: string | null;
}
export type BattlefieldParameterSupport =
  | "legacy_path_only" | "official_standard_move"
  | "official_standard_deploy" | "parameterless" | "unsupported";
export type BattlefieldEntrySegmentV1 = {
  kind?: undefined; segmentId: string; side: "top" | "bottom" | "left" | "right";
  startInches: number; endInches: number;
} | {
  kind: "unit_base_perimeter"; segmentId: string; sourcePieceId: string; sourceModelId: string;
  center: BattlefieldPointV1; radiusMilliInches: number; maximumAlongEdgeMilliInches: number;
  remainingSupply: number | null; supplyLimit: number | null;
};
export interface BattlefieldModelProfileV1 {
  modelId: string; baseShape: BattlefieldBaseShape | null;
  baseWidthMilliInches: number | null; baseDepthMilliInches: number | null;
  horizontalArmDepthMilliInches?: number | null;
  verticalArmWidthMilliInches?: number | null;
  localVerticesMilliInches?: readonly BattlefieldPointV1[] | null;
  baseRotationDegrees: number;
}
export interface BattlefieldParameterDomainV1 {
  domainId: string; parameterKind: string | null; actionType: string;
  pieceId: string | null; label: string; support: BattlefieldParameterSupport;
  modelIds: readonly string[];
  modelStartPoints: Readonly<Record<string, BattlefieldPointV1>>;
  supportsTokenDisplacements: boolean;
  modelProfiles: readonly BattlefieldModelProfileV1[];
  entrySegments: readonly BattlefieldEntrySegmentV1[];
  deploymentSupply: { requested: number; available: number | null; mode?: string } | null;
  start: BattlefieldPointV1 | null; maxDistanceMilliInches: number | null;
  maxPathPoints: number | null;
  exactRemainingPlacementCount: number | null; raw: Record<string, unknown>;
}
export interface BattlefieldSceneV1 {
  schemaVersion: "starcraft_tmg_battlefield_presentation_v1";
  roomId: string | null; stateRevision: number | null; stateHash: string | null;
  board: { widthMilliInches: number; heightMilliInches: number;
    scenarioMapId: string | null; scenarioMapName: string | null;
    mapSeedId: string | null; mapDisplayName: string | null;
    mapGameEra: string | null; mapArtAssetPath: string | null;
    mapArtOverlays: readonly { overlayId: string; assetPath: string;
      sha256: string; rectangleNormalized: { xMin: number; yMin: number;
        xMax: number; yMax: number }; flipX?: boolean }[];
    engagementScale: string | null; visualPresetId: string | null;
    visualPresetName: string | null;
    displayMapAssetKey: string | null;
    terrainPresetId: string | null; terrainSeed: string | null;
    rulesTerrainPlanHash: string | null; mapManifestHash: string | null;
    mapCompilationHash: string | null; mapRoomFreezeHash: string | null;
    missionSpatialReachabilityAuditHash: string | null;
    mapMutationAfterRoomCreationAllowed: boolean;
    backgroundVisibleByDefault: boolean; terrainVisibleByDefault: boolean;
    backgroundRulesAuthority: false };
  widthMilliInches: number; heightMilliInches: number;
  models: readonly BattlefieldModelV1[]; unitAnchors: readonly BattlefieldUnitAnchorV1[];
  terrain: readonly BattlefieldAreaV1[]; markers: readonly BattlefieldAreaV1[];
  tokens: readonly BattlefieldAreaV1[]; finiteActions: readonly BattlefieldActionV1[];
  parameterDomains: readonly BattlefieldParameterDomainV1[];
  previewPath: readonly BattlefieldPointV1[];
  previewPlacements: readonly BattlefieldPlacementV1[]; previewId: string | null;
  preview: { previewId: string; path: readonly BattlefieldPointV1[];
    placements: readonly BattlefieldPlacementV1[];
    disengageAssaultRestriction?: { round: number; ownSupply: number; opposingSupply: number;
      rangedAttackProhibited: boolean; chargeProhibited: boolean } } | null;
  actions: { finite: readonly BattlefieldActionV1[];
    parameterDomains: readonly BattlefieldParameterDomainV1[] };
  diagnostics: readonly string[];
  threatReference: { defaultVisible: false;
    authority: "projected_printed_weapon_range_reference_only";
    excludes: readonly string[] };
  trainingTruth: false;
}
export function projectCrossBaseOutlineV1(input: Pick<BattlefieldPlacementV1,
  "baseShape" | "baseWidthMilliInches" | "baseDepthMilliInches" | "baseRotationDegrees" |
  "xMilliInches" | "yMilliInches" | "horizontalArmDepthMilliInches" | "verticalArmWidthMilliInches"
>): readonly BattlefieldPointV1[] | null;
export function usesBattlefieldBaseOutlineV1(shape?: BattlefieldBaseShape | null): boolean;
export function projectModelBaseOutlineV1(input: Pick<BattlefieldPlacementV1,
  "baseShape" | "baseWidthMilliInches" | "baseDepthMilliInches" | "baseRotationDegrees" |
  "xMilliInches" | "yMilliInches" | "horizontalArmDepthMilliInches" | "verticalArmWidthMilliInches" |
  "localVerticesMilliInches"
>): readonly BattlefieldPointV1[] | null;
export function projectRotatedBaseBoundsV1(input: BattlefieldPointV1 & {
  baseShape: BattlefieldBaseShape; baseWidthMilliInches: number;
  baseDepthMilliInches: number; baseRotationDegrees?: number;
  horizontalArmDepthMilliInches?: number | null;
  verticalArmWidthMilliInches?: number | null;
  localVerticesMilliInches?: readonly BattlefieldPointV1[] | null;
}): BattlefieldBaseBoundsV1 | null;
export function isBattlefieldBaseWithinBoardV1(input: BattlefieldPointV1 & {
  baseShape: BattlefieldBaseShape; baseWidthMilliInches: number;
  baseDepthMilliInches: number; baseRotationDegrees?: number;
  horizontalArmDepthMilliInches?: number | null;
  verticalArmWidthMilliInches?: number | null;
  localVerticesMilliInches?: readonly BattlefieldPointV1[] | null;
  boardWidthMilliInches: number; boardHeightMilliInches: number;
}): boolean;
export interface BattlefieldViewportV1 {
  schemaVersion: "starcraft_tmg_battlefield_viewport_v1";
  pixelsPerMilliInch: number; fitPixelsPerMilliInch: number;
  letterboxOffsetXPixels: number; letterboxOffsetYPixels: number;
  boardPixelWidth: number; boardPixelHeight: number; zoom: number;
  worldToViewport(point: BattlefieldPointV1): { xPixels: number; yPixels: number };
  viewportToWorld(point: { xPixels: number; yPixels: number }): BattlefieldPointV1;
}
export function projectStarcraftTmgBattlefieldPresentationV1(input: {
  roomProjection?: unknown; legalSpace?: unknown; pendingPreview?: unknown;
  selectedModelId?: string | null;
}): BattlefieldSceneV1;
export function projectStarcraftTmgBattlefieldViewportV1(input: {
  boardWidthMilliInches: number; boardHeightMilliInches: number;
  viewportWidthPixels: number; viewportHeightPixels: number;
  zoom?: number; panXPixels?: number; panYPixels?: number;
}): BattlefieldViewportV1;
export const createBattlefieldPresentationV1:
  typeof projectStarcraftTmgBattlefieldPresentationV1;
