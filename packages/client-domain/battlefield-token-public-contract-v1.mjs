// Browser-safe contract shared by the Native producer and viewer projection.
export const OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA =
  'starcraft_tmg_official_battlefield_token_v1';

export const OFFICIAL_BATTLEFIELD_TOKEN_PUBLIC_FIELDS_V1 = Object.freeze([
  'schema', 'tokenId', 'tokenKind', 'coordinate', 'baseShape',
  'baseDiameterMm', 'baseDiameterInches', 'baseWidthMm', 'baseDepthMm',
  'baseWidthInches', 'baseDepthInches', 'baseRotationDegrees', 'rulesFootprint',
  'terrainSize', 'tangibleBattlefieldAsset', 'ownBase', 'modelsMayMoveThrough',
  'modelsMayEndOverlappingByDefault', 'measurement', 'stayInPlay',
  'cleanupDisposition', 'createdByPieceId', 'createdRound', 'trainingTruth', 'tokenHash',
]);
