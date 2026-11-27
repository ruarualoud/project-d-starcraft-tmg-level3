import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { verifyOfficialStandardActionRouteCatalogueV1 } from './official-standard-action-route-catalogue-v1.mjs';
import { evaluateOfficialBaseMeasurementV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { enumerateOfficialAbilityResourcePaymentsV1, resolveOfficialAbilityResourcePaymentFromCardsV1 }
  from '../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { inspectOfficialSingleModelRemovalChoicesV1 } from '../rule-atoms/official-single-model-removal-choice-v1.mjs';

export const OFFICIAL_CONSUME_DEFINITION_ID = 'unit:defiler/consume-any-phase@1';
const recordKey = 'army_units:defiler';
const consumeText = 'When this Unit resolves a Special Ability that costs BM, it can remove one model from a Friendly Unit Within 4" to generate 1 BM to spend towards that ability’s cost.';
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const liveModels = piece => (piece.models || []).filter(model => !model.isDestroyed && model.isOnField !== false);
const active = piece => piece.isOnField === true && !piece.isDestroyed && piece.currentModels > 0;

export function createOfficialConsumePaymentSourceV1({ catalogue }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const consume = catalogue.definitions.find(row => row.definitionId === OFFICIAL_CONSUME_DEFINITION_ID);
  if (!consume || consume.recordKey !== recordKey || consume.definitionName !== 'Consume'
    || consume.activationKind !== 'passive' || consume.activationText !== '<Passive>'
    || consume.phase !== 'any' || consume.sourceText !== consumeText) {
    throw Error('CONSUME_PAYMENT_SOURCE_UNSUPPORTED');
  }
  const abilities = catalogue.definitions.filter(row => row.recordKey === recordKey
    && ['active', 'reaction'].includes(row.activationKind) && /Biomass/u.test(row.activationText)).flatMap(row => {
    const match = row.activationText.match(/\((\d+|X) Biomass\)/u);
    if (!match) throw Error('CONSUME_ABILITY_COST_UNSUPPORTED');
    if (match[1] === '0') return [];
    let costs;
    if (row.definitionName === 'Dark Swarm' && match[1] === '1') costs = [1];
    else if (row.definitionName === 'Plague' && match[1] === 'X'
      && row.sourceText.startsWith('You may spend 1 to 3 BM to activate this ability.')) costs = [1, 2, 3];
    else throw Error('CONSUME_ABILITY_COST_UNSUPPORTED');
    return [{ definitionId: row.definitionId, abilityName: row.definitionName,
      sourceFeatureHash: row.sourceFeatureHash, phase: row.phase, activationKind: row.activationKind, costs }];
  }).sort((left, right) => left.definitionId.localeCompare(right.definitionId));
  if (abilities.length !== 2) throw Error('CONSUME_ABILITY_COST_COVERAGE_INVALID');
  return seal({ schema: 'starcraft_tmg_consume_payment_source_v1', version: '1.0.0',
    definitionId: consume.definitionId, recordKey, sourceFeatureHash: consume.sourceFeatureHash,
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, sourceText: consume.sourceText,
    resourceType: 'BM', resourceGenerated: 1, maximumModelsRemovedPerPayment: 1,
    rangeMilliInches: 4000, abilities, trainingTruth: false }, 'bundleHash');
}

// Quotes share Native geometry, source-bound card payment and Supply. The caller
// still needs the ability's actual trigger/target window before committing it.
export function queryOfficialConsumePaymentOptionsV1({ source, state, request }) {
  if (!request || Object.keys(request).some(key => ![
    'queryKind', 'sourcePieceId', 'abilityDefinitionId', 'biomassToSpend',
  ].includes(key)) || request.queryKind !== 'consume_payment_options') {
    throw Error('CONSUME_PAYMENT_QUERY_SEMANTIC_ONLY');
  }
  if (!isDeepStrictEqual(source, state.officialConsumePaymentSourceBundle)) {
    throw Error('CONSUME_PAYMENT_SOURCE_MISMATCH');
  }
  verifyOfficialStandardActionRouteCatalogueV1(state.officialActionRouteCatalogue);
  const actor = state.pieces.find(piece => piece.id === request.sourcePieceId);
  if (!actor || actor.officialUnitRecordKey !== recordKey || !active(actor)) {
    throw Error('CONSUME_PAYMENT_SOURCE_UNIT_UNAVAILABLE');
  }
  const unit = state.officialActionRouteCatalogue.units.find(row => row.pieceId === actor.id);
  // The legacy route hash uses the filtered feature index. IR identities use
  // the original source index. Match the selected role inside the verified
  // source record without treating these two hashes as interchangeable.
  const selected = ability => unit?.routes.filter(route => route.sourceKind === 'official_card_feature'
    && route.featureName === ability.abilityName && route.phase === ability.phase
    && route.activationKind === ability.activationKind).length === 1;
  if (!selected({ abilityName: 'Consume', phase: 'any', activationKind: 'passive' })
    || unit.sideKey !== actor.sideKey || unit.recordKey !== actor.officialUnitRecordKey
    || unit.sourceRecordHash !== actor.sourceRecordHash
    || unit.payloadHash !== actor.officialPayloadHash) throw Error('CONSUME_PAYMENT_UNIT_SOURCE_MISMATCH');
  const ability = source.abilities.find(row => row.definitionId === request.abilityDefinitionId);
  if (!ability || !selected(ability)) throw Error('CONSUME_PAYMENT_ABILITY_NOT_SELECTED');
  const cost = request.biomassToSpend === undefined && ability.costs.length === 1
    ? ability.costs[0] : request.biomassToSpend;
  if (!Number.isSafeInteger(cost) || !ability.costs.includes(cost)) throw Error('CONSUME_PAYMENT_COST_CHOICE_INVALID');
  const cards = state.cardResources?.[actor.sideKey];
  if (!Array.isArray(cards) || cards.some(card => card.sideKey !== actor.sideKey)) {
    throw Error('CONSUME_PAYMENT_CARD_STATE_INVALID');
  }
  function payments(resourceCost) {
    return enumerateOfficialAbilityResourcePaymentsV1({ cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: source.resourceType, resourceCost, cardInstances: cards }).map(ids => {
      const payment = resolveOfficialAbilityResourcePaymentFromCardsV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle, resourceType: source.resourceType, resourceCost,
        cardInstances: ids.map(id => cards.find(card => card.cardInstanceId === id)),
      });
      return { cardInstanceIds: ids, payment };
    });
  }
  function supply(piece, currentModels) {
    return resolveOfficialCurrentSupplyValueV1({ unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle,
      recordKey: piece.officialUnitRecordKey, sourceRecordHash: piece.sourceRecordHash,
      payloadHash: piece.officialPayloadHash, currentModels, isDestroyed: currentModels === 0,
      rulesOwnedCurrentModelCountRequested: true });
  }
  const actorModels = liveModels(actor);
  if (actorModels.length !== actor.currentModels) throw Error('CONSUME_PAYMENT_MODEL_STATE_INCONSISTENT');
  const sacrifices = state.pieces.filter(piece => piece.sideKey === actor.sideKey && active(piece)).flatMap(piece => {
    const models = liveModels(piece);
    if (models.length !== piece.currentModels) throw Error('CONSUME_PAYMENT_MODEL_STATE_INCONSISTENT');
    const distanceMilliInches = Math.min(...actorModels.flatMap(left => models.map(right =>
      evaluateOfficialBaseMeasurementV1({ state, dataBundle: state.officialModelBaseGeometryDataBundle,
        source: { kind: 'model', unitId: actor.id, modelId: left.id },
        target: { kind: 'model', unitId: piece.id, modelId: right.id } }).distanceMilliInches)));
    if (distanceMilliInches > source.rangeMilliInches) return [];
    const before = supply(piece, piece.currentModels), after = supply(piece, piece.currentModels - 1);
    const modelIds = state.officialConsumePaymentPolicy
      ? inspectOfficialSingleModelRemovalChoicesV1(state, piece).modelIds : models.map(model => model.id).sort();
    return [{ pieceId: piece.id, modelIds, distanceMilliInches,
      currentModels: piece.currentModels, remainingModels: piece.currentModels - 1,
      destroysUnit: piece.currentModels === 1, removesSource: piece.id === actor.id && piece.currentModels === 1,
      currentSupply: before.currentSupplyValue, remainingSupply: after.currentSupplyValue,
      supplyResolution: after, conditionalOnRemovingOneModel: true }];
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  return seal({ schema: 'starcraft_tmg_consume_payment_options_v1', stateHash: hash(state),
    sourceBundleHash: source.bundleHash, sourcePieceId: actor.id, sideKey: actor.sideKey,
    abilityDefinitionId: ability.definitionId, sourceFeatureHash: ability.sourceFeatureHash,
    resourceType: source.resourceType, resourceCost: cost,
    cardOnlyPayments: payments(cost), consumeCardPayments: payments(cost - source.resourceGenerated), sacrifices,
    generatedByRemovingOneModel: source.resourceGenerated, retainedAfterPayment: 0,
    abilityTimingValidated: false, abilityTargetValidated: false, sacrificeCommitted: false,
    conditionalSupplyOnly: true, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
}
