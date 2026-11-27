import { describeOfficialWave3StormGeometryV1 } from '../source-data/official-wave3-community-geometry-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID, inspectOfficialOurMindsAsOneV1 } from './official-our-minds-as-one-v1.mjs';

import { quoteOfficialUnitAbilityModifiersV1 } from './official-unit-ability-payment-modifiers-v1.mjs';

const queryKind = 'psionic_storm_source_rules';
const rulesByDefinition = {
  'unit:high_templar/psionic-storm-movement-phase@1': {
    recordKey: 'army_units:high_templar', baseSuccessThreshold: 5, allowsOurMindsAsOne: true,
  },
  'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1': {
    recordKey: 'army_units:twilight_templar__high_templar_', baseSuccessThreshold: 4, allowsOurMindsAsOne: false,
  },
};
export const OFFICIAL_PSIONIC_STORM_DEFINITION_IDS = Object.freeze(Object.keys(rulesByDefinition));
const phaseEffects = Object.freeze({
  movement: Object.freeze({ kind: 'non_lethal_damage', damagePerSuccess: 1 }),
  assault: Object.freeze({ kind: 'standard_damage', damagePerSuccess: 1 }),
});

function frozenText(threshold) {
  return 'Set a Psionic Storm token Within 10" and Line of Sight of this Unit. This token is not removed if this Unit is Destroyed. '
    + 'At the End of each Phase, set a Psionic Storm Blast Template on the centre of this token. '
    + 'For each Unit that has at least one model whose base is partially covered by the template, roll 3 dice, '
    + 'plus 1 additional die for each model in that Unit whose base is partially covered. '
    + 'For each result of ' + threshold + '+, that Unit suffers an effect depending on the current Phase:\n'
    + 'Movement Phase: NON-LETHAL DAMAGE (1).\nAssault Phase: 1 Damage. \n'
    + 'If multiple effects trigger at the End of the Assault Phase, resolve them in the order specified in Part 8.9.4.';
}

function describeGeometry(profile, communityProfile) {
  const components = ['psionic_storm', 'psionic_storm_blast_template'].map(componentKind => {
    const evidence = profile.componentEvidence[componentKind];
    if (evidence) return Object.freeze({ componentKind, status: 'resolved', evidenceHash: evidence.evidenceHash });
    const missing = profile.unresolvedComponentEvidence.find(row => row.componentKind === componentKind);
    if (!missing) throw Error('PSIONIC_STORM_GEOMETRY_EVIDENCE_REQUIRED:' + componentKind);
    if (!communityProfile) return Object.freeze({ ...missing, status: 'unresolved' });
    const community = describeOfficialWave3StormGeometryV1(communityProfile, componentKind);
    return Object.freeze({ ...missing, status: community.diameterMm === null ? 'unresolved' : 'community_candidate',
      communityProfileHash: communityProfile.profileHash, ...community });
  });
  return Object.freeze({ profileHash: profile.profileHash, components: Object.freeze(components) });
}

export function createOfficialPsionicStormSourceRulesV1({ catalogue, battlefieldAssetProfile, communityGeometry, selectedDefinitionIds }) {
  const definitions = Object.entries(rulesByDefinition).map(([definitionId, rule]) => {
    const source = catalogue.definitions.find(row => row.definitionId === definitionId);
    if (!source || source.recordKey !== rule.recordKey || source.sourceKind !== 'unit_feature'
      || source.activationKind !== 'active' || source.phase !== 'movement'
      || source.activationText !== '<Active>\n(2 Psionic Energy)' || source.sourceText !== frozenText(rule.baseSuccessThreshold)) {
      throw Error('PSIONIC_STORM_FROZEN_SOURCE_REQUIRED:' + definitionId);
    }
    return Object.freeze({ definitionId, sourceFeatureHash: source.sourceFeatureHash, ...rule });
  });
  const body = { schema: 'starcraft_tmg_official_psionic_storm_source_rules_v1',
    version: '1.0.0', queryKind, definitions: Object.freeze(definitions),
    cast: Object.freeze({ phase: 'movement', resourceType: 'PE', resourceCost: 2,
      maximumDistanceMilliInches: 10000, requiresLineOfSight: true, tokenSurvivesSourceDestruction: true }),
    dice: Object.freeze({ baseDicePerAffectedUnit: 3, extraDicePerCoveredModel: 1,
      requiresAtLeastOneCoveredModelPerUnit: true, modifierAppliesToRolledValues: true }),
    phaseEffects, geometryAuthority: false, mutationAuthority: false, trainingTruth: false,
    ...(battlefieldAssetProfile ? { geometryEvidence: describeGeometry(battlefieldAssetProfile, communityGeometry) } : {}) };
  if (selectedDefinitionIds) {
    if (!selectedDefinitionIds.length || new Set(selectedDefinitionIds).size !== selectedDefinitionIds.length
      || selectedDefinitionIds.some(id => !Object.hasOwn(rulesByDefinition, id))) throw Error('PSIONIC_STORM_SELECTION_INVALID');
    body.definitions = Object.freeze(definitions.filter(row => selectedDefinitionIds.includes(row.definitionId)));
    body.paymentPolicy = 'unit_ability_modifiers_v1';
  }
  const descriptor = Object.freeze({ ...body, profileHash: hash(body) });

  function quoteCast(state, pieceId, definitionId) {
    const cost = descriptor.cast.resourceCost;
    return quoteOfficialUnitAbilityModifiersV1(state, pieceId, 'unit_feature', {
      sourceDefinitionId: definitionId, resourceType: descriptor.cast.resourceType, printedResourceCost: cost,
      effectiveResourceCost: cost, resourceCostReduction: 0, discountSourcePieceId: null });
  }

  function query(state, request) {
    if (Object.keys(request).some(key => !['queryKind', 'sideKey', 'pieceId', 'definitionId', 'resolutionPhase'].includes(key))
      || !['player1', 'player2'].includes(request.sideKey) || !Object.hasOwn(phaseEffects, request.resolutionPhase)) {
      throw Error('PSIONIC_STORM_RULES_QUERY_INVALID');
    }
    const source = descriptor.definitions.find(row => row.definitionId === request.definitionId);
    const piece = state.pieces.find(row => row.id === request.pieceId && row.sideKey === request.sideKey);
    const routes = selectedDefinitionIds && state.officialActionRouteCatalogue?.units.find(unit => unit.pieceId === piece?.id)?.routes;
    if (!source || !piece || piece.officialUnitRecordKey !== source.recordKey
      || selectedDefinitionIds && !routes?.some(row => row.sourceFeatureHash === source.sourceFeatureHash && row.activationKind === 'active')) {
      throw Error('PSIONIC_STORM_RULES_CASTER_MISMATCH');
    }
    if (source.allowsOurMindsAsOne && !state.officialCharacteristicStatusFamilySourceBundle?.routes.some(
      route => route.definitionId === OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID)) {
      throw Error('PSIONIC_STORM_SUPPLY_MODIFIER_SOURCE_REQUIRED');
    }
    const minds = source.allowsOurMindsAsOne ? inspectOfficialOurMindsAsOneV1(state, piece.id) : null;
    const rollModifier = minds?.psionicStormRollModifier ?? 0;
    const result = { definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
      pieceId: piece.id, currentSupply: piece.currentSupply, resolutionPhase: request.resolutionPhase,
      cast: descriptor.cast, ...(selectedDefinitionIds ? { resourceCost: quoteCast(state, piece.id, source.definitionId) } : {}), dice: descriptor.dice, damage: phaseEffects[request.resolutionPhase],
      baseSuccessThreshold: source.baseSuccessThreshold, rollModifier, rawDieSuccessThreshold: source.baseSuccessThreshold - rollModifier,
      modifierSource: rollModifier ? minds.sourceDefinitionId : null, profileHash: descriptor.profileHash,
      coverageResolved: false, damageApplied: false, mutationAuthority: false, trainingTruth: false,
      ...(descriptor.geometryEvidence ? { geometryEvidence: descriptor.geometryEvidence } : {}) };
    const receipt = { result, stateHash: hash(state), mutationAuthority: false, trainingTruth: false };
    return { ...receipt, queryReceiptHash: hash(receipt) };
  }
  return Object.freeze({ descriptor, query, ...(selectedDefinitionIds ? { quoteCast } : {}) });
}
