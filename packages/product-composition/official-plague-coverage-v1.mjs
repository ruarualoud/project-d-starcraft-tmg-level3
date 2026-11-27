import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { verifyOfficialBlastTemplateGeometryAssetV1 } from './official-blast-template-coverage-runtime-v1.mjs';
import { createOfficialModelBaseFootprintV1, createOfficialPhysicalFootprintV1,
  createOfficialTargetPointFootprintV1,
  isOfficialPhysicalFootprintWhollyWithinRangeV1, isOfficialPhysicalFootprintInsideBoardV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialTargetPointSurfacePlacementV2 }
  from '../rule-atoms/official-engagement-graph-v2.mjs';
import { evaluateOfficialElevatedTargetPointLineOfSightV1 }
  from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { projectOfficialGroundedTemplateCoverageV1 } from './official-grounded-template-coverage-v1.mjs';
import { queryOfficialConsumePaymentOptionsV1 } from './official-consume-payment-facts-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';

export const OFFICIAL_PLAGUE_DEFINITION_ID = 'unit:defiler/plague-assault-phase@1';
const sourceText = 'You may spend 1 to 3 BM to activate this ability. Set a Plague Blast Template Wholly Within 10" and Line of Sight of this Unit. For each Unit that has at least one model whose base is partially covered by the template, roll 2 dice, plus 1 additional die for each model in that Unit whose base is partially covered. That Unit loses its HIDDEN Status, and, depending on the BM spent, it suffers NON-LETHAL DAMAGE (1) for:\n1 BM: each result of 5+.\n2 BM: each result of 4+.\n3 BM: each result of 3+.';
const templateFaq = 'You resolve them using the template rules with the following key adaptations: • The Unit executing the ability is treated as the Attacking Model. • The point directly beneath the centre of the template is treated as the Target Point and the Primary Target. • BecausethisTargetPointhasnoCombatTags,spillovertargetsdonot need to match any targeting tags to be affected. • Affected models must still occupy the same Elevation Level as the Target Point. For these attacks, Flying Units are treated as occupying the same Elevation Level as their physical bases on the battlefield.';
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const liveModels = piece => piece.models.filter(row => !row.isDestroyed && row.isOnField !== false);
const active = piece => piece.isOnField === true && !piece.isDestroyed && piece.currentModels > 0;

// This is a conditional, read-only fact boundary. It deliberately does not
// register an executable ability before its payment/evade/continuation exists.
export function createOfficialPlagueCoverageSourceV1({ context, catalogue }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const row = catalogue.definitions.find(value => value.definitionId === OFFICIAL_PLAGUE_DEFINITION_ID);
  const faq = context.manifest.source.references.faq;
  if (!row || row.recordKey !== 'army_units:defiler' || row.definitionName !== 'Plague'
    || row.sourceText !== sourceText || row.phase !== 'assault' || row.activationKind !== 'active'
    || row.activationText !== '<Active>\n(X Biomass)' || faq.version !== '1.3'
    || faq.byteHash !== OFFICIAL_FAQ_REACTION_POLICY_V13.sourceByteHash) throw Error('PLAGUE_COVERAGE_SOURCE_UNSUPPORTED');
  return seal({ schema: 'starcraft_tmg_plague_coverage_source_v1', version: '1.0.0',
    definitionId: row.definitionId, recordKey: row.recordKey, sourceFeatureHash: row.sourceFeatureHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash, normalizedDatasetHash: catalogue.normalizedDatasetHash,
    sourceText, phase: row.phase, resourceType: 'BM', biomassChoices: [1, 2, 3],
    thresholdByBiomass: { 1: 5, 2: 4, 3: 3 }, templateRangeMilliInches: 10000,
    faqSource: { ref: faq.ref, byteHash: faq.byteHash, version: faq.version,
      templateClauseOrdinal: 94, templateClauseTextHash: hash(templateFaq),
      combatShieldClauseOrdinal: 60 }, damageKind: 'non_lethal',
    friendlyUnitsAffected: true, flyingUsesPhysicalBaseElevation: true,
    actualPaymentConsumerReady: false, damageConsumerReady: false, trainingTruth: false }, 'bundleHash');
}

export function createOfficialPlagueCoverageRuntimeV1({ context, catalogue, state }) {
  const source = createOfficialPlagueCoverageSourceV1({ context, catalogue });
  if (!isDeepStrictEqual(source, state.officialPlagueCoverageSourceBundle)) throw Error('PLAGUE_COVERAGE_SOURCE_MISMATCH');
  const asset = verifyOfficialBlastTemplateGeometryAssetV1(state.officialBlastTemplateGeometryAsset, source);
  const descriptor = { runtimeId: 'official-plague-coverage-v1', runtimeVersion: '1.0.0',
    queryKind: 'plague_template_coverage', sourceBundleHash: source.bundleHash, geometryAssetHash: asset.assetHash,
    conditionalCoverageOnly: true, executableAbilityRegistered: false, mutationAuthority: false,
    actualPaymentConsumerReady: false, damageConsumerReady: false, trainingTruth: false };
  function query(current, request) {
    if (!request || request.queryKind !== descriptor.queryKind || Object.keys(request).some(key =>
      !['queryKind', 'sourcePieceId', 'coordinate', 'biomassToSpend'].includes(key))) throw Error('PLAGUE_QUERY_SEMANTIC_ONLY');
    if (!isDeepStrictEqual(current.officialPlagueCoverageSourceBundle, source)
      || !isDeepStrictEqual(current.officialBlastTemplateGeometryAsset, asset)) throw Error('PLAGUE_QUERY_BINDING_STALE');
    const actor = current.pieces.find(piece => piece.id === request.sourcePieceId);
    const unit = current.officialActionRouteCatalogue.units.find(row => row.pieceId === actor?.id);
    if (!actor || !active(actor) || actor.officialUnitRecordKey !== source.recordKey
      || unit?.sourceRecordHash !== actor.sourceRecordHash || unit?.payloadHash !== actor.officialPayloadHash
      || unit.routes.filter(row => row.sourceKind === 'official_card_feature' && row.featureName === 'Plague'
        && row.phase === source.phase && row.activationKind === 'active').length !== 1) throw Error('PLAGUE_QUERY_ABILITY_NOT_SELECTED');
    if (!source.biomassChoices.includes(request.biomassToSpend)) throw Error('PLAGUE_QUERY_BIOMASS_CHOICE_INVALID');
    const coordinate = request.coordinate;
    if (!coordinate || Object.keys(coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
      || !Number.isSafeInteger(coordinate.xMilliInches) || !Number.isSafeInteger(coordinate.yMilliInches)) {
      throw Error('PLAGUE_QUERY_COORDINATE_REQUIRED');
    }
    const template = createOfficialPhysicalFootprintV1({ objectId: 'plague-template', kind: 'ability_template',
      shape: 'round', center: coordinate, widthMilliInches: asset.geometry.diameterMilliInches,
      depthMilliInches: asset.geometry.diameterMilliInches });
    if (!isOfficialPhysicalFootprintInsideBoardV1({ footprint: template,
      widthMilliInches: Math.round(current.board.widthInches * 1000),
      heightMilliInches: Math.round(current.board.heightInches * 1000) })) throw Error('PLAGUE_TEMPLATE_OUTSIDE_BOARD');
    const point = createOfficialTargetPointFootprintV1({ objectId: 'plague-target-point', center: coordinate });
    const pointSurface = deriveOfficialTargetPointSurfacePlacementV2(current, point);
    const projected = projectOfficialRangedTerrainForLosV1(current).projected;
    Object.assign(projected, { board: { ...projected.board, widthInches: current.board.widthInches,
      heightInches: current.board.heightInches } });
    const actorModels = liveModels(actor);
    if (actorModels.length !== actor.currentModels) throw Error('PLAGUE_QUERY_MODEL_DENOMINATOR_INVALID');
    const rangeAndSight = actorModels.map(model => ({ modelId: model.id,
      whollyWithin: isOfficialPhysicalFootprintWhollyWithinRangeV1({
        source: createOfficialModelBaseFootprintV1({ piece: actor, model,
          dataBundle: current.officialModelBaseGeometryDataBundle }), target: template,
        rangeMilliInches: source.templateRangeMilliInches }),
      sight: evaluateOfficialElevatedTargetPointLineOfSightV1({ state: projected, attacker: actor,
        attackerModelId: model.id, targetPointFootprint: point, dataBundle: current.officialTerrainLosDataBundle }) }));
    if (!rangeAndSight.some(row => row.whollyWithin)) throw Error('PLAGUE_TEMPLATE_NOT_WHOLLY_WITHIN_RANGE');
    if (!rangeAndSight.some(row => row.sight.visible)) throw Error('PLAGUE_TEMPLATE_LINE_OF_SIGHT_REQUIRED');
    const { assessments, batches } = projectOfficialPlagueAffectedBatchesV1({ current, source, asset, template, point, pointSurface, projected, biomassToSpend: request.biomassToSpend });
    const payment = queryOfficialConsumePaymentOptionsV1({ source: current.officialConsumePaymentSourceBundle,
      state: current, request: { queryKind: 'consume_payment_options', sourcePieceId: actor.id,
        abilityDefinitionId: source.definitionId, biomassToSpend: request.biomassToSpend } });
    return seal({ schema: 'starcraft_tmg_plague_coverage_query_v1', queryKind: descriptor.queryKind,
      sourcePieceId: actor.id, sourceBundleHash: source.bundleHash, geometryAssetHash: asset.assetHash,
      stateHash: hash(current), templateFootprint: template, targetPointFootprint: point, pointSurface,
      rangeAndSight, assessments, batches, payment,
      abilityTimingValidated: false, paymentCommitted: false, coverageBeforeAnySacrifice: true,
      finalDamageAfterEvadeEvaluated: false, damageCommitted: false,
      mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  return Object.freeze({ descriptor, query });
}

// The cast consumer calls this same coverage calculation AFTER its validated
// payment; the original caster may have been sacrificed by then.
export function projectOfficialPlagueAffectedBatchesV1({ current, source, asset, template, point, pointSurface, projected, biomassToSpend }) {
    const assessments = projectOfficialGroundedTemplateCoverageV1({ current, template, point, pointSurface, projected,
      modelDenominatorError: 'PLAGUE_QUERY_MODEL_DENOMINATOR_INVALID' });
    const hitThreshold = source.thresholdByBiomass[biomassToSpend];
    const batches = current.pieces.filter(piece => assessments.some(row => row.pieceId === piece.id && row.affected))
      .map(piece => {
        const coveredModelIds = assessments.filter(row => row.pieceId === piece.id && row.affected).map(row => row.modelId).sort();
        return { targetPieceId: piece.id, sideKey: piece.sideKey, coveredModelIds,
          dice: 2 + coveredModelIds.length, hitThreshold, rawSuccessProbability: (7 - hitThreshold) / 6,
          losesHiddenOnResolution: true, damageKind: source.damageKind, damagePerSuccess: 1,
          priorDamageMarker: Number(piece.damageMarker || 0), armourRollRequired: false,
          casualtiesFromThisAbility: 0, supplyChangeFromThisDamage: 0, nonLethalDamagePersists: true,
          finalDamageAfterEvadeEvaluated: false };
      }).sort((left, right) => left.targetPieceId.localeCompare(right.targetPieceId));
    return { assessments, batches };
}
