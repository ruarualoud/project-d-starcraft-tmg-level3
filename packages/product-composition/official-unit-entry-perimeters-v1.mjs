import {usesWave3FaqClarifications} from '../rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import {normalizeOfficialElevationV1} from '../rule-atoms/official-elevation-contract-v1.mjs';
import {createOfficialModelBaseFootprintV1} from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {resolveOfficialCurrentOmegaEntrySourcesV2} from './official-unit-lifecycle-family-adapter-v1.mjs';
import {resolveOfficialCurrentPylonEntrySourcesV1} from './official-battlefield-asset-family-adapter-v1.mjs';
import {resolveOfficialInfestedDropSourcesV1} from './official-characteristic-status-family-adapter-v1.mjs';
export function unitEntryPerimeters(state, sideKey, piece, supply) {
  const alternate = [];
  const ground = [piece.combatTag, ...(piece.combatTags || [])].some(tag => String(tag).trim().toLowerCase() === 'ground');
  const wormEntries = ground
    ? resolveOfficialCurrentOmegaEntrySourcesV2(state, sideKey).map(source => ({
      ...source, segmentPrefix: 'omega-worm', supplyLimit: source.route.roundSupplyCap,
    })) : [];
  const pylonEntries = ground ? resolveOfficialCurrentPylonEntrySourcesV1(state, sideKey).map(source => ({
    ...source, segmentPrefix: 'pylon', supplyLimit: null, endsActivation: true,
  })) : [];
  const alternateSources = resolveOfficialInfestedDropSourcesV1(state, sideKey).map(source => ({
    ...source, segmentPrefix: 'infested-drop', supplyLimit: source.route.supplyLimitPerRound,
  })).concat(wormEntries, pylonEntries);
  const round = Number(state.round);
  const chargedSources = (state.spatialActionHistory || [])
    .filter(event => event.round === round && event.actionType === 'deploy').map(event => event.event?.entrySource);
  if (usesWave3FaqClarifications(state)) {
    for (const event of state.relocationAbilityHistory || []) {
      if (event.round === round && event.deploymentResolved && event.entrySource) chargedSources.push(event.entrySource);
    }
  }
  for (const { piece, route, segmentPrefix, supplyLimit, endsActivation } of alternateSources) {
    const usedSupply = chargedSources.reduce((sum, source) => source?.sourcePieceId === piece.id
      && source.definitionId === route.definitionId ? sum + source.committedSupply : sum, 0);
    const remainingSupply = supplyLimit === null ? null : Math.max(0, supplyLimit - usedSupply);
    if (remainingSupply !== null && supply.requestedSupply > remainingSupply) continue;
    for (const model of piece.models.filter(m=>m.isOnField!==false && m.isDestroyed!==true)) {
      const footprint = createOfficialModelBaseFootprintV1({piece,model,dataBundle:state.officialModelBaseGeometryDataBundle});
      if (footprint.shape !== 'round') throw Error('SELECTED_SPATIAL_ENTRY_SOURCE_BASE_UNSUPPORTED:'+model.id);
      alternate.push({
        kind: 'unit_base_perimeter', segmentId: segmentPrefix + ':' + model.id,
        sourcePieceId: piece.id, sourceModelId: model.id, definitionId: route.definitionId,
        sourceRouteHash: route.routeHash, sourceFootprintHash: footprint.footprintHash,
        center: structuredClone(footprint.center), radiusMilliInches: footprint.radiusMilliInches,
        maximumAlongEdgeMilliInches: Math.floor(2 * Math.PI * footprint.radiusMilliInches),
        sourceElevation: normalizeOfficialElevationV1(model.elevation || 'ground'), supportTerrainIds: structuredClone(model.supportTerrainIds || []),
        round: Number(state.round), supplyLimit, usedSupply, remainingSupply,
        ...(endsActivation ? { oneDeploymentPerRound: true, endsActivation: true } : {}),
        generatesZoneOfInfluence: false,
      });
    }
  }
  return alternate;
}
export function unitEntryReceipt(segment,requestedSupply) {
  return {definitionId:segment.definitionId,sourcePieceId:segment.sourcePieceId,sourceModelId:segment.sourceModelId,
    sourceRouteHash:segment.sourceRouteHash,sourceFootprintHash:segment.sourceFootprintHash,
    committedSupply:requestedSupply,remainingSupplyBefore:segment.remainingSupply,...(segment.endsActivation?{endsActivation:true}:{})};
}
export function assertUnitEntryElevation(state,segment,placements){
  if(usesWave3FaqClarifications(state) && placements.some(row=>row.elevation!==segment.sourceElevation)){
    throw Error('UNIT_ENTRY_SOURCE_ELEVATION_REQUIRED:'+segment.sourceModelId);
  }
}
