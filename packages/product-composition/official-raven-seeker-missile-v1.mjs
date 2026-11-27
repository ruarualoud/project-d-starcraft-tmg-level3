import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import {
  evaluateOfficialBaseMeasurementV1, OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1,
} from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { createOfficialTargetedActiveAbilityPolicyV1, OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID as definitionId }
  from './official-targeted-active-ability-policy-v1.mjs';

const ravenRecord = 'army_units:raven';
const queryKind = 'raven_seeker_missile_rules';
const paidImpactQueryKind = 'raven_seeker_missile_paid_impact';
const hashPattern = /^[a-f0-9]{64}$/u;
export const OFFICIAL_RAVEN_SEEKER_MISSILE_SOURCE_TEXT = 'Select one Enemy Unit Within 12". At the End of the Assault Phase, if that Enemy Unit '
  + "has the Stationary Status or it is Within 8'' of this Unit, it suffers HITS 4 (2). If that Unit is Engaged, "
  + 'it is eligible to make an Evade Roll against these hits.';
const sides = ['player1', 'player2'];

function liveFieldedModels(piece) {
  return piece.isOnField === true && piece.isDestroyed !== true && piece.currentModels > 0
    ? piece.models.filter(model => model.isOnField !== false && model.isDestroyed !== true) : [];
}

function hasStationaryStatus(piece) {
  return (piece.statuses || []).some(status =>
    String(typeof status === 'string' ? status : status?.statusName || status?.name || '').trim().toLowerCase() === 'stationary');
}

function closestBaseDistance(state, source, target, sourceModels, targetModels) {
  if (!sourceModels.length || !targetModels.length) return null;
  return Math.min(...sourceModels.flatMap(model => targetModels.map(other => (
    evaluateOfficialBaseMeasurementV1({
      state, dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: 'model', unitId: source.id, modelId: model.id },
      target: { kind: 'model', unitId: target.id, modelId: other.id },
    }).distanceMilliInches
  ))));
}

function glossaryText(glossary, title) {
  return glossary.payload.items[0].subItems.find(row => row.title === title)?.content
    .filter(row => row.type === 'text').map(row => row.value.replace(/<[^>]*>/gu, '')).join('\n');
}

export function createOfficialRavenSeekerMissileRulesV1({ context, catalogue, includePaidImpact = false }) {
  assertOfficialReleaseSourceV2(context, context);
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definition = catalogue.definitions.find(row => row.definitionId === definitionId);
  if (catalogue.normalizedDatasetHash !== context.dataset.datasetHash
    || catalogue.sourceSnapshotHash !== context.snapshot.snapshotHash
    || definition?.recordKey !== ravenRecord || definition.sourceKind !== 'unit_feature'
    || definition.phase !== 'movement' || definition.activationKind !== 'active'
    || definition.activationText !== '<Active>\n(1 Command Point)' || definition.sourceText !== OFFICIAL_RAVEN_SEEKER_MISSILE_SOURCE_TEXT) {
    throw Error('RAVEN_SEEKER_MISSILE_FROZEN_SOURCE_REQUIRED');
  }
  const glossary = context.dataset.recordsByKey['rules_sections:FuahgilWtc8nccVSp2Vv'];
  if (!glossary || !glossaryText(glossary, 'HITS X (Y)')?.includes('These hits do not generate Surge.')
    || !glossaryText(glossary, 'STATIONARY')?.includes('moves, is moved, or is PLACED for any reason.')) {
    throw Error('RAVEN_SEEKER_MISSILE_GLOSSARY_SOURCE_REQUIRED');
  }
  const targetedPolicy = createOfficialTargetedActiveAbilityPolicyV1({ context, definitionIds: [definitionId] });
  const body = {
    schema: 'starcraft_tmg_raven_seeker_missile_rules_v1', version: includePaidImpact ? '1.1.0' : '1.0.0', queryKind, definitionId,
    sourceFeatureHash: definition.sourceFeatureHash, targetedPolicyHash: targetedPolicy.policyHash,
    glossaryPayloadHash: glossary.payloadHash, selection: Object.freeze({ phase: 'movement',
      resourceType: 'CP', resourceCost: 1, targetSide: 'enemy', targetCount: 1, rangeMilliInches: 12000,
      lineOfSightRequired: true }),
    impact: Object.freeze({ phase: 'assault', timing: 'phase_end', reevaluationRangeMilliInches: 8000,
      targetCondition: 'stationary_or_within_range', hits: 4, damagePerHit: 2, surgeAllowed: false,
      engagedTargetEvadeEligibility: true }),
    ...(includePaidImpact ? { paidImpactQueryKind, paidImpactTargetBinding: 'same_round_authority_log_and_payment' } : {}),
    declarationAuthority: false, mutationAuthority: false, trainingTruth: false,
  };
  const descriptor = Object.freeze({ ...body, profileHash: hash(body) });

  function projectImpact(state, request) {
    if (state.phase !== 'assault' || !sides.every(side => state.players[side]?.passedPhases?.assault === true)) {
      throw Error('RAVEN_SEEKER_MISSILE_PHASE_END_REQUIRED');
    }
    const source = state.pieces.find(piece => piece.id === request.sourcePieceId);
    const target = state.pieces.find(piece => piece.id === request.targetUnitId);
    if (source?.officialUnitRecordKey !== ravenRecord || !target
      || !sides.includes(source.sideKey) || !sides.includes(target.sideKey) || source.sideKey === target.sideKey) {
      throw Error('RAVEN_SEEKER_MISSILE_QUERY_ACTORS_INVALID');
    }
    const targetModels = liveFieldedModels(target);
    const targetOnField = targetModels.length > 0;
    const stationary = targetOnField && hasStationaryStatus(target);
    const distanceMilliInches = closestBaseDistance(state, source, target, liveFieldedModels(source), targetModels);
    const withinRange = distanceMilliInches !== null && distanceMilliInches
      <= descriptor.impact.reevaluationRangeMilliInches + OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1;
    const qualifies = targetOnField && (stationary || withinRange);
    const engaged = qualifies && deriveOfficialEngagementGraphV2(state).engagedUnitIds.includes(target.id);
    return { kind: 'conditional_impact_projection', sourcePieceId: source.id, targetUnitId: target.id,
      targetOnField, stationary, withinRange, distanceMilliInches, qualifies, engaged,
      automaticHits: qualifies ? { hits: descriptor.impact.hits, damagePerHit: descriptor.impact.damagePerHit,
        evadeEligibilityGrantedBySeeker: engaged, surgeAllowed: false } : null,
      declarationOrPaymentVerified: false, mutationAuthority: false, trainingTruth: false };
  }

  function readPaidDeclaration(state, planHash) {
    const entries = (state.log || []).filter(row => row.action?.characteristicStatusPlan?.planHash === planHash);
    const [entry] = entries;
    if (entries.length !== 1 || entry.action.definitionId !== definitionId) {
      throw Error('RAVEN_SEEKER_MISSILE_PAID_DECLARATION_NOT_FOUND');
    }
    const action = entry.action;
    const plan = action.characteristicStatusPlan;
    const { planHash: storedHash, ...planBody } = plan;
    const route = state.officialCharacteristicStatusFamilySourceBundle?.routes.find(row => row.definitionId === definitionId);
    const { routeHash, ...routeBody } = route ?? {};
    const params = plan.canonicalParameters;
    const caster = state.pieces.find(piece => piece.id === plan.pieceId);
    if (storedHash !== hash(planBody) || route?.effectKind !== 'raven_seeker_missile'
      || routeHash !== hash(routeBody) || plan.sourceRouteHash !== routeHash
      || route.sourceFeatureHash !== definition.sourceFeatureHash || plan.sourceFeatureHash !== definition.sourceFeatureHash
      || action.actionType !== 'resolve_characteristic_status_ability' || plan.definitionId !== definitionId
      || plan.sourceKind !== 'unit_feature' || action.pieceId !== plan.pieceId
      || action.sideKey !== plan.sideKey || !sides.includes(plan.sideKey)
      || caster?.sideKey !== plan.sideKey || caster.officialUnitRecordKey !== ravenRecord
      || action.phase !== 'movement' || plan.phase !== 'movement' || entry.phase !== 'movement'
      || entry.round !== Number(state.round) || params?.activeUnitId !== plan.pieceId
      || typeof params?.targetUnitId !== 'string' || !params.targetUnitId) {
      throw Error('RAVEN_SEEKER_MISSILE_PAID_DECLARATION_INVALID');
    }
    const history = (state.characteristicStatusAbilityHistory || []).filter(row => row.planHash === planHash);
    const [record] = history;
    const payments = (entry.events || []).filter(event => event.type === 'ability_resource_paid');
    const [payment] = payments;
    if (history.length !== 1 || record.definitionId !== definitionId || record.pieceId !== plan.pieceId
      || record.sideKey !== plan.sideKey || record.phase !== 'movement' || record.round !== entry.round
      || !isDeepStrictEqual(record.events?.filter(event => event.type === 'ability_resource_paid'), payments)
      || payments.length !== 1
      || payment.resourceType !== 'CP' || payment.printedResourceCost !== descriptor.selection.resourceCost
      || ![0, descriptor.selection.resourceCost].includes(payment.resourceCost)
      || payment.resourceCostReduction !== payment.printedResourceCost - payment.resourceCost
      || (payment.resourceCost === 0) !== (plan.useCorvidReactor === true)
      || !hashPattern.test(payment.paymentResultHash)
      || !Array.isArray(params.paymentCardInstanceIds) || !Array.isArray(payment.exhaustedCardInstanceIds)
      || !isDeepStrictEqual([...params.paymentCardInstanceIds].sort(), [...payment.exhaustedCardInstanceIds].sort())) {
      throw Error('RAVEN_SEEKER_MISSILE_PAYMENT_RECEIPT_INVALID');
    }
    return { sourcePieceId: plan.pieceId, targetUnitId: params.targetUnitId, sideKey: plan.sideKey, planHash,
      paidCommandPoints: payment.resourceCost, paymentResultHash: payment.paymentResultHash };
  }

  function query(state, request) {
    if (includePaidImpact && request.queryKind === paidImpactQueryKind) {
      if (typeof request.planHash !== 'string' || !hashPattern.test(request.planHash)
        || Object.keys(request).some(key => !['queryKind', 'planHash'].includes(key))) {
        throw Error('RAVEN_SEEKER_MISSILE_PAID_IMPACT_QUERY_INVALID');
      }
      const declaration = readPaidDeclaration(state, request.planHash);
      const impact = { ...projectImpact(state, declaration), declarationOrPaymentVerified: true };
      const body = { result: { profile: descriptor, declaration, impact }, stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false };
      return { ...body, queryReceiptHash: hash(body) };
    }
    if (Object.keys(request).some(key => !['queryKind', 'sourcePieceId', 'targetUnitId'].includes(key))
      || ['sourcePieceId', 'targetUnitId'].some(key => request[key] !== undefined
        && (typeof request[key] !== 'string' || !request[key]))
      || (request.sourcePieceId === undefined) !== (request.targetUnitId === undefined)) {
      throw Error('RAVEN_SEEKER_MISSILE_QUERY_INVALID');
    }
    const body = { result: { profile: descriptor,
      ...(request.sourcePieceId ? { impact: projectImpact(state, request) } : {}) },
      stateHash: hash(state), mutationAuthority: false, trainingTruth: false };
    return { ...body, queryReceiptHash: hash(body) };
  }
  return Object.freeze({ descriptor, query, ...(includePaidImpact ? { readPaidDeclaration } : {}) });
}
