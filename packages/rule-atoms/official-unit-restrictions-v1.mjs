import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_ROACHLING_BURROW_RESTRICTION_DEFINITION_ID = 'unit:roachling/underdeveloped-claws-any-phase@1';

export const OFFICIAL_UNIT_RESTRICTION_ATOM_IDS = Object.freeze([
  'rule-atom:source-unit-cannot-gain-burrowed-v1',
  'rule-atom:source-unit-cannot-return-to-reserves-v1',
  'rule-atom:source-unit-impact-immunity-v1',
]);

function without(value, field) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

export function projectOfficialUnitRestrictionsV1(state, pieceId) {
  const piece = (state?.pieces || []).find(row => row.id === pieceId);
  if (!piece) throw Error('UNIT_RESTRICTION_PIECE_UNKNOWN');
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  const routes = (bundle?.routes || []).filter(route => route.sourceKind === 'unit_feature'
    && route.recordKey === piece.officialUnitRecordKey && (route.effectKind === 'unit_restrictions'
      || bundle.schema === 'starcraft_tmg_official_characteristic_status_family_source_bundle_v2'
        && route.definitionId === OFFICIAL_ROACHLING_BURROW_RESTRICTION_DEFINITION_ID && route.effectKind === 'cannot_gain_burrowed'));
  if (routes.length && (bundle.bundleHash !== hash(without(bundle, 'bundleHash'))
    || routes.some(route => route.routeHash !== hash(without(route, 'routeHash'))
      || route.phase !== 'any' || route.activationKind !== 'passive'
      || (route.effectKind === 'unit_restrictions'
        ? route.cannotGainBurrowed !== true || route.cannotReturnToReserves !== true || route.impactImmune !== true
        : route.recordKey !== 'army_units:roachling' || route.sourceText !== 'This Unit cannot gain Burrowed Status.')))) throw Error('UNIT_RESTRICTION_SOURCE_BINDING_INVALID');
  const available = piece.isOnField === true && piece.isDestroyed !== true && Number(piece.currentModels) > 0
    && Number(piece.structureRules?.specialAbilitiesDisabledThroughRound ?? Number.NEGATIVE_INFINITY) < Number(state.round);
  const applied = available ? routes : [];
  return Object.freeze({
    pieceId, cannotGainBurrowed: applied.some(route => route.cannotGainBurrowed || route.effectKind === 'cannot_gain_burrowed'),
    cannotReturnToReserves: applied.some(route => route.cannotReturnToReserves),
    impactImmune: applied.some(route => route.impactImmune),
    sourceDefinitionIds: Object.freeze(applied.map(route => route.definitionId).sort()),
    sourceFeatureHashes: Object.freeze(applied.map(route => route.sourceFeatureHash).sort()),
    trainingTruth: false,
  });
}
