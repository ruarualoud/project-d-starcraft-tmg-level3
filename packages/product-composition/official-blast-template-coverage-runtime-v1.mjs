import { hasOfficialRangedDeclarationPolicyV1, OFFICIAL_RANGED_DECLARATION_POLICY_V1 } from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialModelBaseFootprintV1, createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { normalizeOfficialElevationV1 } from '../rule-atoms/official-elevation-contract-v1.mjs';
import { inspectOfficialSelectedRosterRangedTargetGeometryV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';

import { hasOfficialCoordinatedStrikeSourceV1, hasOfficialCoordinatedStrikeCurrentConsumerV1, OFFICIAL_COORDINATED_STRIKE_POLICY_V1 }
  from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';

const queryKind = 'blast_template_coverage';
const runtimeId = 'starcraft-tmg-blast-template-coverage-v1';
const tolerance = 1;
const fail = code => { throw Error(code); };
const liveModels = piece => (piece.models || []).filter(model =>
  model.isDestroyed !== true && model.isOnField !== false);
const livePiece = piece => piece.isOnField === true && piece.isDestroyed !== true
  && Number(piece.currentModels) > 0;
const seal = (body, field) => ({ ...body, [field]: hash(body) });

export function verifyOfficialBlastTemplateGeometryAssetV1(asset, source) {
  const { assetHash, ...body } = asset || {};
  const geometry = asset?.geometry;
  if (asset?.schema !== 'starcraft_tmg_template_geometry_asset_v2'
    || asset.templateType !== 'blast' || assetHash !== hash(body)
    || asset.sourceSnapshotHash !== source.sourceSnapshotHash
    || asset.normalizedDatasetHash !== source.normalizedDatasetHash
    || geometry?.shape !== 'circle'
    || !Number.isSafeInteger(geometry.diameterMilliInches) || geometry.diameterMilliInches <= 0
    || geometry.radiusMilliInches * 2 !== geometry.diameterMilliInches
    || geometry.diameterMm !== geometry.diameterMilliInches * 25.4 / 1000
    || geometry.radiusMm * 2 !== geometry.diameterMm
    || asset.dimensionEvidence?.diameterInches * 1000 !== geometry.diameterMilliInches
    || asset.placementRule?.alignment !== 'maximum_primary_base_coverage'
    || !asset.scope?.recordKey || !asset.scope.weaponName || asset.trainingTruth !== false) {
    fail('BLAST_TEMPLATE_GEOMETRY_ASSET_INVALID');
  }
  return asset;
}

function templateCenter(position, primaryFootprint) {
  if (position === undefined) return primaryFootprint.center;
  if (!position || Object.keys(position).sort().join(',') !== 'xInches,yInches'
    || typeof position.xInches !== 'number' || typeof position.yInches !== 'number'
    || !Number.isFinite(position.xInches) || !Number.isFinite(position.yInches)) {
    fail('BLAST_TEMPLATE_POSITION_INVALID');
  }
  return { xMilliInches: Math.round(position.xInches * 1000),
    yMilliInches: Math.round(position.yInches * 1000) };
}

function maximumCoverageAligned(base, center, radius) {
  const dx = center.xMilliInches - base.center.xMilliInches;
  const dy = center.yMilliInches - base.center.yMilliInches;
  if (base.shape === 'round') {
    return Math.hypot(dx, dy) <= Math.abs(radius - base.radiusMilliInches) + tolerance;
  }
  // A circle may contain the complete rectangle, or fit wholly inside it.
  // For a narrow rectangle, centering on the narrow axis maximizes overlap.
  if (base.vertices.every(vertex => Math.hypot(vertex.xMilliInches - center.xMilliInches,
    vertex.yMilliInches - center.yMilliInches) <= radius + tolerance)) return true;
  const angle = base.rotationDegrees * Math.PI / 180;
  const x = Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle));
  const y = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
  const halfWidth = base.widthMilliInches / 2;
  const halfDepth = base.depthMilliInches / 2;
  if (halfWidth >= radius && halfDepth >= radius) {
    return x <= halfWidth - radius + tolerance && y <= halfDepth - radius + tolerance;
  }
  if (halfWidth >= radius) return y <= tolerance && x <= halfWidth - radius + tolerance;
  if (halfDepth >= radius) return x <= tolerance && y <= halfDepth - radius + tolerance;
  return x <= tolerance && y <= tolerance;
}

function elevation(piece, model) {
  if (piece.combatTag === 'flying') return 'flying';
  const band = normalizeOfficialElevationV1(model.elevation);
  if (!['ground', 'mid', 'high'].includes(band)) fail('BLAST_TEMPLATE_ELEVATION_INVALID');
  return band;
}

export function createOfficialBlastTemplateCoverageRuntimeV1({ state, unitTargetEligibility = false }) {
  const asset = structuredClone(verifyOfficialBlastTemplateGeometryAssetV1(state.officialBlastTemplateGeometryAsset,
    state.officialAttackProfileCatalogue));
  const declarationKeywords = hasOfficialRangedDeclarationPolicyV1(state);
  const coordinatedStrike = hasOfficialCoordinatedStrikeSourceV1(state);
  const currentCoordinatedStrike = hasOfficialCoordinatedStrikeCurrentConsumerV1(state);
  const descriptor = Object.freeze(seal({ runtimeId, semanticVersion: declarationKeywords ? '1.4.0' : currentCoordinatedStrike ? '1.3.0' : coordinatedStrike ? '1.2.0' : unitTargetEligibility ? '1.1.0' : '1.0.0', queryKind,
    ...(currentCoordinatedStrike ? { coordinatedStrikeConsumerPolicy: structuredClone(state.officialCoordinatedStrikeConsumerPolicy),
      siegeModeDataBundleHash: state.officialSiegeModeDataBundle.bundleHash } : {}),
    ...(coordinatedStrike ? { coordinatedStrikePolicy: structuredClone(OFFICIAL_COORDINATED_STRIKE_POLICY_V1) } : {}),
    ...(declarationKeywords ? { declarationPolicy: structuredClone(OFFICIAL_RANGED_DECLARATION_POLICY_V1) } : {}),
    ...(unitTargetEligibility ? { targetEligibilityPolicy: 'standard_target_unit_v1' } : {}),
    geometryAssetHash: asset.assetHash,
    sourceSnapshotHash: asset.sourceSnapshotHash, normalizedDatasetHash: asset.normalizedDatasetHash,
    exactCircleGeometry: true, maximumPrimaryBaseCoverageRequired: true,
    mutationAuthority: false, completeAttackResolution: false, trainingTruth: false }, 'runtimeHash'));

  function query(state, request) {
    if (!request || request.queryKind !== queryKind || Object.keys(request).some(key =>
      !['queryKind', 'pieceId', 'weaponName', 'primaryTargetUnitId', 'primaryTargetModelId', 'templateCenter', ...(coordinatedStrike ? ['spotterModelId'] : [])].includes(key))) {
      fail('BLAST_TEMPLATE_SEMANTIC_REQUEST_REQUIRED');
    }
    const currentAsset = verifyOfficialBlastTemplateGeometryAssetV1(state.officialBlastTemplateGeometryAsset,
      state.officialAttackProfileCatalogue);
    if (currentAsset.assetHash !== asset.assetHash) fail('BLAST_TEMPLATE_GEOMETRY_BINDING_STALE');
    const piece = state.pieces.find(row => row.id === request.pieceId);
    const primary = state.pieces.find(row => row.id === request.primaryTargetUnitId);
    if (!piece || !primary || piece.officialUnitRecordKey !== asset.scope.recordKey
      || request.weaponName !== asset.scope.weaponName || !livePiece(primary)
      || liveModels(piece).length !== 1) fail('BLAST_TEMPLATE_CARRIER_OR_PRIMARY_INVALID');
    const primaryModel = liveModels(primary).find(row => row.id === request.primaryTargetModelId);
    if (!primaryModel) fail('BLAST_TEMPLATE_PRIMARY_MODEL_INVALID');
    const source = inspectOfficialSelectedRosterRangedTargetGeometryV1({ state, pieceId: piece.id,
      targetUnitId: primary.id, profileKey: piece.officialUnitRecordKey + '::assault::' + request.weaponName,
      ...(request.spotterModelId === undefined ? {} : { spotterModelId: request.spotterModelId }) });
    const profile = source.profile;
    if (profile.templateWeapon?.templateType !== 'blast' || profile.surge?.diceExpression !== 'BT') {
      fail('BLAST_TEMPLATE_PROFILE_UNSUPPORTED');
    }
    const primaryPairs = source.geometry.pairs.filter(pair => pair.targetModelId === primaryModel.id);
    if (!unitTargetEligibility && !primaryPairs.some(pair => pair.visible && pair.withinMaximumRange)) {
      fail('BLAST_TEMPLATE_PRIMARY_NOT_VISIBLE_IN_RANGE');
    }
    const footprintFor = (unit, model) => createOfficialModelBaseFootprintV1({
      piece: unit, model, dataBundle: state.officialModelBaseGeometryDataBundle });
    const primaryFootprint = footprintFor(primary, primaryModel);
    const center = templateCenter(request.templateCenter, primaryFootprint);
    if (!maximumCoverageAligned(primaryFootprint, center, asset.geometry.radiusMilliInches)) {
      fail('BLAST_TEMPLATE_MAXIMUM_PRIMARY_COVERAGE_REQUIRED');
    }
    const footprint = createOfficialPhysicalFootprintV1({ objectId: 'blast-template', kind: 'weapon_template',
      shape: 'round', center, widthMilliInches: asset.geometry.diameterMilliInches,
      depthMilliInches: asset.geometry.diameterMilliInches });
    const targetElevation = elevation(primary, primaryModel);
    const projected = projectOfficialRangedTerrainForLosV1(state).projected;
    const assessments = [];
    for (const unit of state.pieces.filter(livePiece)) {
      if (liveModels(unit).length !== Number(unit.currentModels)) fail('BLAST_TEMPLATE_MODEL_DENOMINATOR_INVALID');
      for (const model of liveModels(unit)) {
        const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
          right: footprintFor(unit, model) });
        const reasons = [];
        if (relation.minimumSeparationMilliInches > 0) reasons.push('outside_template');
        if (elevation(unit, model) !== targetElevation) reasons.push('different_elevation');
        if (unit.combatTag !== primary.combatTag) reasons.push('different_primary_combat_tag');
        if (!profile.targetTags.includes('all') && !profile.targetTags.includes(unit.combatTag)) {
          reasons.push('weapon_target_tag');
        }
        let blockingTerrainIds = [];
        let traceResultHash = null;
        if (!reasons.length && model.id !== primaryModel.id) {
          const trace = evaluateOfficialElevatedLineOfSightV1({ state: projected, attacker: primary,
            attackerModelId: primaryModel.id, target: unit, targetModelId: model.id,
            dataBundle: state.officialTerrainLosDataBundle });
          blockingTerrainIds = trace.assessments.filter(row =>
            row.terrainEffectiveSize >= 2 && row.blockingTerrainTrace === true).map(row => row.terrainId).sort();
          traceResultHash = trace.resultHash;
          if (blockingTerrainIds.length) reasons.push('size_two_plus_terrain');
        }
        assessments.push({ unitId: unit.id, modelId: model.id, sideKey: unit.sideKey,
          affected: !reasons.length, reasons, baseRelationHash: relation.relationHash,
          blockingTerrainIds, traceResultHash });
      }
    }
    const batches = state.pieces.filter(unit => assessments.some(row => row.unitId === unit.id && row.affected))
      .map(unit => {
        const affectedModelIds = assessments.filter(row => row.unitId === unit.id && row.affected)
          .map(row => row.modelId).sort();
        const mainTarget = unit.id === primary.id;
        return { unitId: unit.id, sideKey: unit.sideKey, mainTarget, affectedModelIds,
          sourceRateOfAttackModifier: mainTarget ? profile.templateWeapon.mainTargetRateModifier : 0,
          baseAttackDice: affectedModelIds.length + (mainTarget ? profile.templateWeapon.mainTargetRateModifier : 0),
          surgeDice: 0, surgeResult: mainTarget ? affectedModelIds.length : 0,
          surgeMatched: mainTarget && profile.surge.targetTags.some(tag => (unit.combatTags || []).includes(tag)) };
      }).sort((left, right) => Number(right.mainTarget) - Number(left.mainTarget)
        || left.unitId.localeCompare(right.unitId));
    return seal({ schemaVersion: 'starcraft_tmg_blast_template_coverage_query_v1', ok: true, queryKind,
      result: { targetPoint: primaryFootprint.center, targetElevation, templateFootprint: footprint,
        maximumPrimaryCoverage: true, primaryModelId: primaryModel.id, primaryPairs,
        ...(source.geometry.coordinatedStrikeOrigin ? { coordinatedStrikeOrigin: source.geometry.coordinatedStrikeOrigin } : {}),
        batches, assessments, sourceProfileHash: profile.profileHash, geometryAssetHash: asset.assetHash,
        activeModifiersAndDamageResolved: false, completeAttackResolution: false },
      stateHash: hash(state), source: runtimeId, rulesAuthority: true, mutationAuthority: false,
      trainingTruth: false }, 'queryReceiptHash');
  }
  return Object.freeze({ descriptor, query });
}
