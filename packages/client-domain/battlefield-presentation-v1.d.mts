export type BattlefieldBaseShape = "round" | "oval" | "rectangle";

export interface BattlefieldPointV1 { xMilliInches: number; yMilliInches: number; }
export interface BattlefieldModelV1 extends BattlefieldPointV1 {
  kind: "model"; id: string; pieceId: string; unitId: string | null;
  label: string; sideKey: string;
  baseShape: BattlefieldBaseShape | null; baseWidthMilliInches: number | null;
  baseDepthMilliInches: number | null; baseRotationDegrees: number;
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
  id: string; kind: "terrain" | "marker" | "token"; label: string;
  shape: BattlefieldBaseShape | null; widthMilliInches: number | null;
  depthMilliInches: number | null; rotationDegrees: number; geometryRenderable: boolean;
}
export interface BattlefieldPlacementV1 extends BattlefieldPointV1 {
  modelId: string; baseShape: BattlefieldBaseShape | null;
  baseWidthMilliInches: number | null; baseDepthMilliInches: number | null;
  baseRotationDegrees: number; geometryRenderable: boolean;
}
export interface BattlefieldActionV1 {
  actionKey: string; actionType: string; pieceId: string | null; label: string;
  confirmationClass: string | null;
}
export type BattlefieldParameterSupport =
  | "legacy_path_only" | "official_standard_move" | "unsupported";
export interface BattlefieldParameterDomainV1 {
  domainId: string; parameterKind: string | null; actionType: string;
  pieceId: string | null; label: string; support: BattlefieldParameterSupport;
  modelIds: readonly string[];
  modelStartPoints: Readonly<Record<string, BattlefieldPointV1>>;
  start: BattlefieldPointV1 | null; maxPathPoints: number | null;
  exactRemainingPlacementCount: number | null; raw: Record<string, unknown>;
}
export interface BattlefieldSceneV1 {
  schemaVersion: "starcraft_tmg_battlefield_presentation_v1";
  roomId: string | null; stateRevision: number | null; stateHash: string | null;
  board: { widthMilliInches: number; heightMilliInches: number;
    scenarioMapId: string | null; scenarioMapName: string | null;
    displayMapAssetKey: "alien_temple_local_v1" | null };
  widthMilliInches: number; heightMilliInches: number;
  models: readonly BattlefieldModelV1[]; unitAnchors: readonly BattlefieldUnitAnchorV1[];
  terrain: readonly BattlefieldAreaV1[]; markers: readonly BattlefieldAreaV1[];
  tokens: readonly BattlefieldAreaV1[]; finiteActions: readonly BattlefieldActionV1[];
  parameterDomains: readonly BattlefieldParameterDomainV1[];
  previewPath: readonly BattlefieldPointV1[];
  previewPlacements: readonly BattlefieldPlacementV1[]; previewId: string | null;
  preview: { previewId: string; path: readonly BattlefieldPointV1[];
    placements: readonly BattlefieldPlacementV1[] } | null;
  actions: { finite: readonly BattlefieldActionV1[];
    parameterDomains: readonly BattlefieldParameterDomainV1[] };
  diagnostics: readonly string[];
  threatReference: { defaultVisible: false;
    authority: "projected_printed_weapon_range_reference_only";
    excludes: readonly string[] };
  trainingTruth: false;
}
export function projectRotatedBaseBoundsV1(input: BattlefieldPointV1 & {
  baseShape: BattlefieldBaseShape; baseWidthMilliInches: number;
  baseDepthMilliInches: number; baseRotationDegrees?: number;
}): BattlefieldBaseBoundsV1 | null;
export function isBattlefieldBaseWithinBoardV1(input: BattlefieldPointV1 & {
  baseShape: BattlefieldBaseShape; baseWidthMilliInches: number;
  baseDepthMilliInches: number; baseRotationDegrees?: number;
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
