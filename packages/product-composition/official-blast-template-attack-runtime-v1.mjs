import { hasOfficialRangedDeclarationPolicyV1, OFFICIAL_RANGED_DECLARATION_POLICY_V1 } from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { recordOfficialArmourRollV1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { hasOfficialIndomitableTemplateBatchPolicyV1, OFFICIAL_INDOMITABLE_RANGED_POLICY_V1 }
  from '../rule-atoms/official-indomitable-ranged-policy-v1.mjs';
import { hasOfficialModeBoundRangedTargetPolicyV1, OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1 }
  from '../rule-atoms/official-mode-bound-ranged-target-policy-v1.mjs';
import { OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13, hasOfficialTemplateBatchOrderPolicyV13,
  resolveOfficialTemplateBatchOrderV13, allowsOfficialTemplateAdaptiveBatchOrderV13,
  selectOfficialTemplateNextBatchV13 } from '../rule-atoms/official-template-batch-order-policy-v13.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { getOfficialAttackProfileV3 } from '../source-data/official-attack-profile-catalogue-v1.mjs';
import { OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS } from '../rule-atoms/official-template-weapon-executor-v1.mjs';
import { OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS } from '../rule-atoms/official-ranged-attack-executor-v6.mjs';
import { recordOfficialSupplyLossesV1 } from '../rule-atoms/official-supply-loss-ledger-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1 }
  from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { createOfficialReactionFamilyAdapterV1, consumeOfficialReactionFamilyResolutionV1,
  OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID, projectOfficialLungeRangedTargetDesignationV1 }
  from './official-reaction-family-adapter-v1.mjs';
import { inspectOfficialSelectedRosterRangedTargetGeometryV1,
  createOfficialSelectedRosterTemplateBatchContextV1, resolveOfficialSelectedRosterBatchChanceV1,
  inspectOfficialSelectedRosterArmourChoiceV1, inspectOfficialSelectedRosterArmourDemandV1, inspectOfficialSelectedRosterEvadeDemandV1,
  projectOfficialSelectedRosterArmourReactionContextV1,
  createOfficialSelectedRosterCasualtyChoiceContextV1, createOfficialSelectedRosterCasualtyChoiceDomainV1,
  resolveOfficialCurrentProductCasualtyDomainV1, applyOfficialSelectedRosterResolvedDamageV1,
  completeOfficialSelectedRosterStandaloneRangedWeaponV1,
  openOfficialSelectedRosterRangedDamageReactionV1, applyOfficialRangedDamageReactionProjectionV1 }
  from './official-selected-roster-ranged-action-runtime-v1.mjs';

import { hasOfficialCoordinatedStrikeSourceV1, hasOfficialCoordinatedStrikeCurrentConsumerV1, listOfficialCoordinatedStrikeOriginsV1,
  OFFICIAL_COORDINATED_STRIKE_POLICY_V1 } from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';

const runtimeId = 'starcraft-tmg-blast-template-attack-v1';
const attackType = 'blast_template_attack';
const batchType = 'resolve_blast_template_batch';
const casualtyType = 'choose_blast_template_casualties';
const parentKey = 'pendingOfficialBlastTemplateAttack';
const baseAtomIds = Object.freeze([...new Set([...OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS,
  ...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS])].sort());
const clone = value => structuredClone(value);
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const fail = code => { throw Error(code); };
function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
const liveModels = piece => piece.models.filter(model => model.isOnField !== false && model.isDestroyed !== true);
const unavailable = new Set(['SELECTED_RANGED_PHASE_UNAVAILABLE', 'SELECTED_RANGED_PHASE_INITIATIVE_UNRESOLVED',
  'SELECTED_RANGED_UNIT_UNAVAILABLE', 'SELECTED_RANGED_STRUCTURE_CANNOT_PERFORM_ACTIONS',
  'SELECTED_RANGED_TARGET_UNAVAILABLE', 'SELECTED_RANGED_TARGET_TAG_PROHIBITED',
  'SELECTED_RANGED_UNIT_ALREADY_ACTIVATED', 'SELECTED_ABILITY_CORE_ACTION_WINDOW_INVALID',
  'SELECTED_RANGED_POST_DISENGAGE_PROHIBITED', 'SELECTED_RANGED_ENGAGEMENT_TARGET_PROHIBITED',
  'SELECTED_RANGED_POINT_BLANK_ENGAGED_TARGET_PROHIBITED',
  'SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE', 'SELECTED_RANGED_MODE_WEAPON_UNAVAILABLE',
  'BLAST_TEMPLATE_PRIMARY_NOT_VISIBLE_IN_RANGE']);

export function createOfficialBlastTemplateAttackRuntimeV1({ state: initialState, coverageRuntime,
  precisionChoiceSupported = false, pointDefenseChoiceSupported = false, armourChoiceSupported = false,
  armourReactionSupported = false }) {
  if (armourReactionSupported && (!precisionChoiceSupported || !armourChoiceSupported)) {
    fail('BLAST_TEMPLATE_ARMOUR_REACTION_CHOICES_REQUIRED');
  }
  const declarationKeywords = hasOfficialRangedDeclarationPolicyV1(initialState);
  const batchOrderChoice = hasOfficialTemplateBatchOrderPolicyV13(initialState);
  const adaptiveBatchOrder = allowsOfficialTemplateAdaptiveBatchOrderV13(initialState);
  const indomitableBatches = hasOfficialIndomitableTemplateBatchPolicyV1(initialState);
  const modeBoundTargeting = hasOfficialModeBoundRangedTargetPolicyV1(initialState);
  const coordinatedStrike = hasOfficialCoordinatedStrikeSourceV1(initialState);
  const currentCoordinatedStrike = hasOfficialCoordinatedStrikeCurrentConsumerV1(initialState);
  const preservesTargetDeclaration = initialState.officialConsumePaymentPolicy?.consumerScope
    === 'numeric_and_template_attack_target_reaction';
  const survivingDeclaredModels = initialState.officialConsumePaymentPolicy?.templateAffectedModelsPolicy
    === 'surviving_declared_models';
  const atomIds = Object.freeze([...new Set([...baseAtomIds,
    ...(batchOrderChoice ? [OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13.ruleAtomId] : []),
    ...(declarationKeywords ? OFFICIAL_RANGED_DECLARATION_POLICY_V1.ruleAtomIds : []),
    ...(coordinatedStrike ? OFFICIAL_COORDINATED_STRIKE_POLICY_V1.ruleAtomIds : []),
    ...(indomitableBatches ? [OFFICIAL_INDOMITABLE_RANGED_POLICY_V1.ruleAtomId] : []),
    ...(modeBoundTargeting ? [OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1.ruleAtomId] : [])])].sort());
  const capturesLungeTarget = initialState.officialReactionFamilySourceBundle?.routes.some(route =>
    route.definitionId === OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID && route.requiresRangedTargetSnapshot) === true;
  const runtimeVersion = capturesLungeTarget ? '2.3.0' : survivingDeclaredModels ? '2.2.0' : preservesTargetDeclaration ? '2.1.0' : declarationKeywords ? '2.0.0' : currentCoordinatedStrike ? '1.9.0' : coordinatedStrike ? '1.8.0' : indomitableBatches || modeBoundTargeting ? '1.7.0' : armourReactionSupported ? '1.6.0' : adaptiveBatchOrder ? '1.5.0' : batchOrderChoice ? '1.4.0' : armourChoiceSupported ? '1.3.0' : pointDefenseChoiceSupported ? '1.2.0' : precisionChoiceSupported ? '1.1.0' : '1.0.0';
  const asset = clone(initialState.officialBlastTemplateGeometryAsset);
  const routes = initialState.pieces.filter(piece => piece.officialUnitRecordKey === asset.scope.recordKey)
    .map(piece => ({ pieceId: piece.id, profileKey: piece.officialUnitRecordKey + '::assault::' + asset.scope.weaponName,
      weaponName: asset.scope.weaponName }));
  const reactionAdapter = initialState.officialReactionFamilySourceBundle
    ? createOfficialReactionFamilyAdapterV1(initialState.officialReactionFamilySourceBundle) : null;
  const actions = [attackType, batchType, casualtyType,
    ...(reactionAdapter ? ['resolve_reaction_family_ability', 'pass_reaction_family_window'] : [])];
  const descriptor = freezeDeep(seal({ runtimeId, runtimeVersion, actions, ruleAtomIds: atomIds,
    routes, coverageRuntimeHash: coverageRuntime.descriptor.runtimeHash,
    reactionSourceBundleHash: initialState.officialReactionFamilySourceBundle?.bundleHash || null,
    ...(indomitableBatches ? { indomitableBatchPolicy: clone(initialState.officialIndomitableRangedPolicy) } : {}),
    ...(modeBoundTargeting ? { modeBoundTargetPolicy: clone(initialState.officialModeBoundRangedTargetPolicy) } : {}),
    ...(coordinatedStrike ? { coordinatedStrikePolicy: clone(OFFICIAL_COORDINATED_STRIKE_POLICY_V1) } : {}),
    ...(currentCoordinatedStrike ? { coordinatedStrikeConsumerPolicy: clone(initialState.officialCoordinatedStrikeConsumerPolicy),
      siegeModeDataBundleHash: initialState.officialSiegeModeDataBundle.bundleHash } : {}),
    ...(declarationKeywords ? { declarationPolicy: clone(OFFICIAL_RANGED_DECLARATION_POLICY_V1) } : {}),
    mainAndSpilloverBatchesSeparate: true, diceReusedAcrossChoices: true,
    ...(capturesLungeTarget ? { lungeTargetDesignation: 'declared_primary_at_weapon_completion' } : {}),
    ...(preservesTargetDeclaration ? { coveragePreservedAcrossTargetReaction: true } : {}),
    ...(survivingDeclaredModels ? { removedCoveredModelsExcludedFromDice: true } : {}),
    ...(batchOrderChoice ? { batchOrderPolicy: clone(initialState.officialTemplateBatchOrderPolicy),
      controllerBatchOrderSupported: true } : {}),
    ...(adaptiveBatchOrder ? { nextBatchChoiceAfterPriorSettlement: true } : {}),
    ...(armourChoiceSupported ? { defenderToughChoiceAfterArmour: true } : {}),
    ...(armourReactionSupported ? { beforeArmourReactionUsesCurrentBatch: true } : {}),
    unresolvedOptionalChoiceConsumers: [...(pointDefenseChoiceSupported ? [] : ['point_defense_dice_removal']),
      ...(precisionChoiceSupported ? [] : ['precision_after_roll'])],
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));

  function pending(state) {
    if (hasOfficialTemplateBatchOrderPolicyV13(state) !== batchOrderChoice) fail('BLAST_TEMPLATE_BATCH_ORDER_POLICY_REQUIRED');
    if (allowsOfficialTemplateAdaptiveBatchOrderV13(state) !== adaptiveBatchOrder) fail('BLAST_TEMPLATE_BATCH_ORDER_POLICY_REQUIRED');
    const parent = state[parentKey];
    if (!parent) return null;
    if (parent.schema !== 'starcraft_tmg_blast_template_attack_checkpoint_v1'
      || parent.parentHash !== hash(without(parent, 'parentHash'))
      || parent.round !== Number(state.round) || parent.phase !== state.phase
      || parent.geometryAssetHash !== asset.assetHash
      || !['next_batch', 'reaction', 'casualty'].includes(parent.stage)
      || !Array.isArray(parent.completed) || !Array.isArray(parent.batches)
      || !Number.isSafeInteger(parent.batchIndex) || parent.batchIndex < 0
      || parent.completed.length !== parent.batchIndex
      || !parent.batches[parent.batchIndex]
      || adaptiveBatchOrder && parent.completed.some((batch, index) => batch.targetId !== parent.batches[index].unitId)) fail('BLAST_TEMPLATE_PARENT_INVALID');
    const profile = getOfficialAttackProfileV3(state.officialAttackProfileCatalogue, parent.profileKey);
    if (profile.profileHash !== parent.sourceProfileHash) fail('BLAST_TEMPLATE_PARENT_SOURCE_STALE');
    return parent;
  }

  function saveParent(state, parent) {
    state[parentKey] = seal(without(parent, 'parentHash'), 'parentHash');
  }

  function declarationParent(state, parent, action) {
    const designation = capturesLungeTarget ? projectOfficialLungeRangedTargetDesignationV1(state, action) : null;
    return { ...parent, ...(designation ? { rangedTargetDesignation: designation } : {}) };
  }

  function selectedBatchParent(state, parent, unitId) {
    return { ...parent, batches: selectOfficialTemplateNextBatchV13({ state, batches: parent.batches,
      completedCount: parent.batchIndex, unitId }) };
  }

  function pendingBatchWork(state, parent, unitId) {
    if (!adaptiveBatchOrder) return { ...workForBatch(state, parent, batchType, { parentHash: parent.parentHash }), parent };
    const selected = selectedBatchParent(state, parent, unitId);
    return { ...workForBatch(state, selected, batchType, { parentHash: parent.parentHash, selectedBatchUnitId: unitId }), parent: selected };
  }

  function geometryForBatch(state, parent) {
    const batch = parent.batches[parent.batchIndex];
    const piece = parent.attackerGeometrySnapshot;
    const target = state.pieces.find(row => row.id === batch.unitId);
    const attacker = piece.models.find(row => row.id === parent.attackerModelId);
    const measuringPiece = parent.spotterGeometrySnapshot || piece;
    const measuringModel = parent.declarationGeometry.coordinatedStrikeOrigin
      ? measuringPiece.models.find(row => row.id === parent.declarationGeometry.coordinatedStrikeOrigin.modelId) : attacker;
    const affected = liveModels(target).filter(model => batch.affectedModelIds.includes(model.id));
    const projected = projectOfficialRangedTerrainForLosV1(state).projected;
    projected.pieces = projected.pieces.map(row => row.id === measuringPiece.id ? measuringPiece : row);
    const pairs = affected.map(model => {
      const los = evaluateOfficialElevatedLineOfSightV1({ state: projected, attacker: measuringPiece,
        attackerModelId: measuringModel.id, target, targetModelId: model.id, dataBundle: state.officialTerrainLosDataBundle });
      const relation = evaluateOfficialPhysicalFootprintRelationV1({
        left: createOfficialModelBaseFootprintV1({ piece: measuringPiece, model: measuringModel, dataBundle: state.officialModelBaseGeometryDataBundle }),
        right: createOfficialModelBaseFootprintV1({ piece: target, model, dataBundle: state.officialModelBaseGeometryDataBundle }) });
      return { attackerModelId: attacker.id, targetModelId: model.id,
        distanceInches: relation.minimumSeparationMilliInches / 1000,
        visible: initialState.officialRangedDeclarationPolicy ? los.visible : true, withinMaximumRange: true, highGroundEvadeEligible: los.highGroundEvadeEligible,
        templateCoverageFixedAtDeclaration: true };
    });
    const batchOrigin = declarationKeywords && !batch.mainTarget ? pairs.slice().sort((a, b) => a.distanceInches - b.distanceInches)[0] : null;
    return { pairs, eligibleAttackerModelIds: [attacker.id], visibleTargetModelIds: affected.map(model => model.id),
      ...(parent.declarationGeometry.coordinatedStrikeOrigin ? { coordinatedStrikeOrigin: clone(parent.declarationGeometry.coordinatedStrikeOrigin) } : {}),
      modelAttackRows: batchOrigin ? [{ attackerModelId: attacker.id, targetModelId: batchOrigin.targetModelId,
        distanceInches: batchOrigin.distanceInches, targetVisible: batchOrigin.visible,
        rangeBand: batchOrigin.distanceInches <= parent.declarationGeometry.normalRangeInches ? 'normal' : 'extended' }]
        : clone(parent.declarationGeometry.modelAttackRows),
      distanceInches: parent.declarationGeometry.distanceInches,
      normalRangeInches: parent.declarationGeometry.normalRangeInches,
      maximumRangeInches: parent.declarationGeometry.maximumRangeInches,
      templateBatch: survivingDeclaredModels && affected.length !== batch.affectedModelIds.length
        ? { ...clone(batch), declaredAffectedModelIds: clone(batch.affectedModelIds),
          affectedModelIds: affected.map(model => model.id) } : clone(batch) };
  }

  function workForBatch(state, parent, actionType, extra = {}) {
    const batch = parent.batches[parent.batchIndex];
    const target = state.pieces.find(row => row.id === batch.unitId);
    if (!liveModels(target).some(model => batch.affectedModelIds.includes(model.id))) {
      return { action: { actionType, sideKey: parent.sideKey, phase: 'assault', pieceId: parent.pieceId,
        targetId: target.id, batchIndex: parent.batchIndex, skipReason: 'no_remaining_declared_affected_model',
        executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds, ...extra }, context: null };
    }
    const context = createOfficialSelectedRosterTemplateBatchContextV1({ state,
      pieceId: parent.pieceId, targetUnitId: batch.unitId, profileKey: parent.profileKey,
      geometry: geometryForBatch(state, parent) });
    if (context.profileForBatch.attackPoolRemoval.pointDefenseAvailableSourcePieceIds.length && !pointDefenseChoiceSupported) {
      fail('BLAST_TEMPLATE_POINT_DEFENSE_CHOICE_CONSUMER_REQUIRED');
    }
    if (context.attackerAbilityModifiers.precision > 0 && !precisionChoiceSupported) {
      fail('BLAST_TEMPLATE_PRECISION_CHOICE_CONSUMER_REQUIRED');
    }
    if (context.abilityModifiers.tough > 0 && !armourChoiceSupported) {
      fail('BLAST_TEMPLATE_TOUGH_CHOICE_CONSUMER_REQUIRED');
    }
    const rangedPlan = { profileKey: parent.profileKey, sourceProfileHash: parent.sourceProfileHash,
      batchProfileHash: context.profileForBatch.profileHash, attackPlanHash: context.mechanicalPlan.planHash,
      canonicalParameters: {}, chance: clone(context.mechanicalPlan.chance),
      reactionPolicy: clone(context.mechanicalPlan.reactionPolicy),
      eligibleAttackerModelIds: clone(context.geometry.eligibleAttackerModelIds),
      visibleTargetModelIds: clone(context.geometry.visibleTargetModelIds), templateBatch: clone(context.geometry.templateBatch) };
    const action = { actionType, sideKey: parent.sideKey, phase: 'assault', pieceId: parent.pieceId,
      targetId: batch.unitId, weaponName: asset.scope.weaponName, batchIndex: parent.batchIndex,
      executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds,
      rangedPlan: seal(rangedPlan, 'rangedPlanHash'), chance: clone(context.mechanicalPlan.chance), ...extra };
    return { action, context };
  }

  function declarationWork(state, pieceId, parameters) {
    if (!parameters || Object.keys(parameters).some(key =>
      !['primaryTargetUnitId', 'primaryTargetModelId', 'templateCenter', ...(batchOrderChoice ? ['batchOrderUnitIds'] : []), ...(coordinatedStrike ? ['spotterModelId'] : [])].includes(key))) {
      fail('BLAST_TEMPLATE_DECLARATION_PARAMETERS_INVALID');
    }
    const declaration = { queryKind: 'blast_template_coverage', pieceId, weaponName: asset.scope.weaponName,
      primaryTargetUnitId: parameters.primaryTargetUnitId, primaryTargetModelId: parameters.primaryTargetModelId,
      ...(parameters.templateCenter === undefined ? {} : { templateCenter: parameters.templateCenter }),
      ...(parameters.spotterModelId === undefined ? {} : { spotterModelId: parameters.spotterModelId }) };
    const coverage = coverageRuntime.query(state, declaration);
    const batches = batchOrderChoice ? resolveOfficialTemplateBatchOrderV13({ state, batches: coverage.result.batches,
      batchOrderUnitIds: parameters.batchOrderUnitIds }) : coverage.result.batches;
    const profileKey = asset.scope.recordKey + '::assault::' + asset.scope.weaponName;
    const source = inspectOfficialSelectedRosterRangedTargetGeometryV1({ state, pieceId,
      targetUnitId: parameters.primaryTargetUnitId, profileKey,
      ...(parameters.spotterModelId === undefined ? {} : { spotterModelId: parameters.spotterModelId }) });
    const parent = { schema: 'starcraft_tmg_blast_template_attack_checkpoint_v1',
      round: Number(state.round), phase: state.phase, sideKey: state.activeSideKey, pieceId, profileKey,
      sourceProfileHash: source.profile.profileHash, geometryAssetHash: asset.assetHash,
      declaration, declarationGeometry: source.geometry, coverage: coverage.result,
      attackerGeometrySnapshot: clone(state.pieces.find(row => row.id === pieceId)),
      ...(source.geometry.coordinatedStrikeOrigin ? { spotterGeometrySnapshot:
        clone(state.pieces.find(row => row.id === source.geometry.coordinatedStrikeOrigin.unitId)) } : {}),
      attackerModelId: source.geometry.eligibleAttackerModelIds[0],
      batches, batchIndex: 0, completed: [], stage: 'next_batch', trainingTruth: false };
    const canonicalParameters = { primaryTargetUnitId: declaration.primaryTargetUnitId,
      primaryTargetModelId: declaration.primaryTargetModelId,
      ...(parameters.spotterModelId === undefined ? {} : { spotterModelId: parameters.spotterModelId }),
      templateCenter: { xInches: coverage.result.templateFootprint.center.xMilliInches / 1000,
        yInches: coverage.result.templateFootprint.center.yMilliInches / 1000 },
      ...(batchOrderChoice ? { batchOrderUnitIds: batches.map(batch => batch.unitId) } : {}) };
    const work = workForBatch(state, parent, attackType, { canonicalParameters,
      templateDeclarationHash: hash({ declaration: canonicalParameters, coverage: coverage.result }) });
    return { ...work, parent, canonicalParameters };
  }

  function casualtyPending(state, parent) {
    const target = state.pieces.find(row => row.id === parent.currentAction.targetId);
    return { ...createOfficialSelectedRosterCasualtyChoiceContextV1(state, target),
      attackerSideKey: parent.sideKey, defenderSideKey: target.sideKey,
      attackerPieceId: parent.pieceId, targetPieceId: target.id, pendingHash: parent.parentHash,
      casualtyDomain: parent.currentChance.casualtyDomain,
      casualtyDomainHash: parent.currentChance.casualtyDomain.domainHash };
  }

  function enumerate(state, options = {}) {
    const sideKey = options.sideKey || state.activeSideKey;
    const result = { schemaVersion: 'starcraft_tmg_official_executable_legal_enumeration_v1',
      candidates: [], parameterDomains: [], trainingTruth: false };
    const parent = pending(state);
    if (parent) {
      if (parent.stage === 'reaction') {
        if (!reactionAdapter) fail('BLAST_TEMPLATE_REACTION_ADAPTER_MISSING');
        return reactionAdapter.legalSpace(state, { sideKey });
      }
      if (parent.stage === 'casualty') {
        const owner = casualtyPending(state, parent);
        if (owner.defenderSideKey === sideKey) result.parameterDomains.push(
          createOfficialSelectedRosterCasualtyChoiceDomainV1(owner, state, { actionType: casualtyType,
            parameterKind: 'official_blast_template_casualty_selection_v1', executorId: runtimeId,
            executorVersion: runtimeVersion, ruleAtomIds: atomIds }));
        return result;
      }
      if (sideKey === parent.sideKey) {
        const unitIds = adaptiveBatchOrder ? parent.batches.slice(parent.batchIndex).map(batch => batch.unitId) : [undefined];
        for (const unitId of unitIds) result.candidates.push({
          ...pendingBatchWork(state, parent, unitId).action, isEnabled: true, disabledReason: null, score: 0 });
      }
      return result;
    }
    if (sideKey !== state.activeSideKey || state.phase !== 'assault') return result;
    for (const route of routes.filter(route => state.pieces.some(piece =>
      piece.id === route.pieceId && piece.sideKey === sideKey && piece.isOnField && !piece.isDestroyed))) {
      const targets = [];
      const origins = coordinatedStrike ? listOfficialCoordinatedStrikeOriginsV1(state, route.pieceId) : [];
      for (const unit of state.pieces.filter(row => row.sideKey !== sideKey && row.isOnField && !row.isDestroyed)) {
        for (const model of liveModels(unit)) {
          for (const spotterModelId of [undefined, ...origins.map(origin => origin.modelId)]) {
            try {
              const work = declarationWork(state, route.pieceId,
                { primaryTargetUnitId: unit.id, primaryTargetModelId: model.id,
                  ...(spotterModelId === undefined ? {} : { spotterModelId }) });
              targets.push({ unitId: unit.id, modelId: model.id, targetPoint: work.parent.coverage.targetPoint,
                ...(spotterModelId === undefined ? {} : { spotterModelId }),
                ...(batchOrderChoice ? { defaultBatchOrderUnitIds: work.parent.batches.map(batch => batch.unitId),
                  affectedBatches: work.parent.batches.map(batch => ({ unitId: batch.unitId,
                    mainTarget: batch.mainTarget, affectedModelIds: clone(batch.affectedModelIds) })) } : {}) });
            } catch (error) {
              if (!unavailable.has(error.message.split(':')[0])) throw error;
            }
          }
        }
      }
      if (!targets.length) continue;
      result.parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_blast_template_declaration_v1', actionType: attackType,
        sideKey, phase: 'assault', pieceId: route.pieceId, weaponName: route.weaponName,
        executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds,
        parameterSchema: { type: 'object', required: ['primaryTargetUnitId', 'primaryTargetModelId'],
          primaryTargetUnitId: { enum: [...new Set(targets.map(row => row.unitId))] },
          primaryTargetModelId: { enum: [...new Set(targets.map(row => row.modelId))] },
          ...(origins.length ? { spotterModelId: { enum: origins.map(origin => origin.modelId),
            description: 'Choose a current Coordinated Strike acting model to use its 8-inch range and visibility. Omit to use the printed weapon range.' } } : {}),
          templateCenter: { type: 'object', required: ['xInches', 'yInches'],
            xInches: { type: 'number' }, yInches: { type: 'number' } },
          ...(batchOrderChoice ? { batchOrderUnitIds: { type: 'array', uniqueItems: true, minItems: 1,
            items: { enum: [...new Set(targets.flatMap(target => target.defaultBatchOrderUnitIds))].sort() },
            description: 'Ordered permutation of affected Unit IDs for the selected target coverage.' } } : {}) },
        constraints: { targets, geometryAssetHash: asset.assetHash, stateFactHash: hash(state),
          maximumPrimaryCoverageRequired: true },
        confirmationClass: 'agent_owned_legal_action_auto_apply_or_human_direct_choice',
        trainingTruth: false }, 'domainId'));
    }
    return result;
  }

  function instantiate(state, domain, parameters) {
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains
      .find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) fail('BLAST_TEMPLATE_DOMAIN_STALE');
    const parent = pending(state);
    if (parent?.stage === 'reaction') {
      const preview = reactionAdapter.preview(state, { domain, parameters });
      return { canonicalParameters: preview.action.reactionPlan.canonicalParameters, action: preview.action };
    }
    if (parent?.stage === 'casualty') {
      const casualty = parent.currentChance.casualtyDomain;
      const explicit = casualty.selectionMode === 'explicit_model_ids';
      const keys = explicit ? ['casualtyModelIds'] : ['casualtySelectionHash'];
      if (!parameters || Object.keys(parameters).some(key => !keys.includes(key))) fail('BLAST_TEMPLATE_CASUALTY_PARAMETERS_INVALID');
      const resolved = resolveOfficialCurrentProductCasualtyDomainV1(casualty,
        explicit ? '' : parameters.casualtySelectionHash, explicit ? parameters.casualtyModelIds : null);
      const canonicalParameters = explicit ? { casualtyModelIds: clone(parameters.casualtyModelIds) }
        : { casualtySelectionHash: resolved.selectionHash };
      return { canonicalParameters, action: { actionType: casualtyType, sideKey: domain.sideKey, phase: 'assault',
        pieceId: domain.pieceId, parentHash: parent.parentHash, canonicalParameters,
        executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds } };
    }
    const work = declarationWork(state, domain.pieceId, parameters);
    return { canonicalParameters: work.canonicalParameters, action: work.action };
  }

  function transition(state, action, events, options) {
    state.log ||= [];
    state.log.push({ id: 'log-' + (state.log.length + 1), round: Number(state.round),
      phase: state.phase, action: clone(action), events: clone(events) });
    return { ok: true, schemaVersion: 'starcraft_tmg_blast_template_transition_v1',
      runtimeId, runtimeVersion, postRevision: Number(options.postRevision || 0), state, action, events, trainingTruth: false };
  }

  function advance(state, parent, completedBatch, events) {
    const completed = [...parent.completed, completedBatch];
    if (completed.length === parent.batches.length) {
      delete state[parentKey];
      const [completion, ...effects] = completeOfficialSelectedRosterStandaloneRangedWeaponV1(state, parent.declarationAction);
      const designation = parent.rangedTargetDesignation;
      const primary = designation && completed.find(batch => batch.targetId === designation.targetPieceId
        && batch.casualtyResolutionHash);
      if (primary) {
        completion.rangedTargetDesignation = designation;
        completion.primaryAttackResolutionHash = primary.resolutionHash;
        completion.primaryCasualtyResolutionHash = primary.casualtyResolutionHash;
      }
      events.push(completion, ...effects);
    } else {
      const { currentAction, currentChance, ...rest } = parent;
      saveParent(state, { ...rest, stage: 'next_batch', batchIndex: parent.batchIndex + 1, completed });
      state.activeSideKey = parent.sideKey;
    }
  }

  function settle(stateInput, action, chance, parent, parameters, options, priorEvents = []) {
    const domain = chance.casualtyDomain;
    const sole = domain.legalSelections.length === 1 ? domain.legalSelections[0].selectionHash : '';
    if (!parameters && !sole) {
      const state = clone(stateInput);
      saveParent(state, { ...parent, stage: 'casualty', currentAction: clone(action), currentChance: clone(chance) });
      state.activeSideKey = state.pieces.find(row => row.id === action.targetId).sideKey;
      return transition(state, action, [...priorEvents, { type: 'blast_template_casualties_pending',
        targetId: action.targetId, ownerSideKey: state.activeSideKey,
        resolutionHash: chance.resolution.resolutionHash, chanceReveals: chance.resolution.reveals }], options);
    }
    const casualty = resolveOfficialCurrentProductCasualtyDomainV1(domain,
      parameters?.casualtySelectionHash || sole, parameters?.casualtyModelIds || null);
    const state = clone(stateInput);
    const target = state.pieces.find(row => row.id === action.targetId);
    const beforeSupply = target.currentSupply;
    applyOfficialSelectedRosterResolvedDamageV1(state, target, chance.context.targetProfile, casualty);
    const event = { type: 'ranged_attack', sideKey: parent.sideKey, pieceId: parent.pieceId,
      targetId: target.id, weaponName: action.weaponName,
      templateBatch: clone(survivingDeclaredModels ? chance.context.geometry.templateBatch : parent.batches[parent.batchIndex]),
      sourceProfileHash: parent.sourceProfileHash, attackResolutionHash: chance.resolution.resolutionHash,
      chanceReveals: chance.resolution.reveals, stages: chance.resolution.stages,
      casualtyModelIds: casualty.casualtyModelIds, postDamageMarker: casualty.postDamageMarker,
      currentSupplyBefore: beforeSupply, currentSupplyAfter: target.currentSupply, trainingTruth: false };
    const supply = recordOfficialSupplyLossesV1({ stateBefore: stateInput, stateAfter: state, action, events: [event],
      rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
    state.supplyLossLedger = clone(supply.ledger);
    state.rangedActionHistory ||= [];
    state.rangedActionHistory.push({ round: Number(state.round), phase: state.phase, pieceId: parent.pieceId,
      targetId: target.id, rangedPlanHash: action.rangedPlan.rangedPlanHash,
      resolutionHash: chance.resolution.resolutionHash, casualtyResolutionHash: casualty.resolutionHash,
      templateBatch: true, trainingTruth: false });
    const events = [...priorEvents, event, ...supply.supplyLossEvents];
    advance(state, parent, { targetId: target.id,
      resolutionHash: chance.resolution.resolutionHash, casualtyResolutionHash: casualty.resolutionHash }, events);
    return transition(state, action, events, options);
  }

  function resolveBatch(stateInput, action, chance, parent, options) {
    const state = clone(stateInput);
    recordOfficialArmourRollV1(state, { action, targetPieceId: action.targetId,
      poolDice: chance.resolution.stages.armour.dice });
    saveParent(state, parent);
    const opened = openOfficialSelectedRosterRangedDamageReactionV1(state, action, chance);
    if (opened) {
      const next = clone(opened.state);
      saveParent(next, { ...parent, stage: 'reaction', currentAction: clone(action) });
      return { ...opened, state: next };
    }
    return settle(state, action, chance, parent, null, options);
  }

  function resumeDamageReaction(reacted, options = {}) {
    const next = clone(reacted.state);
    const parent = pending(next);
    if (parent?.stage !== 'reaction') fail('BLAST_TEMPLATE_DAMAGE_REACTION_PARENT_REQUIRED');
    if (next.pendingOfficialReactionWindow) {
      next.activeSideKey = next.pendingOfficialReactionWindow.prioritySideKeys[next.pendingOfficialReactionWindow.priorityIndex];
      return { ...reacted, state: next };
    }
    const saved = next.pendingCurrentProductRangedDamageReaction;
    if (!saved || saved.checkpointHash !== hash(without(saved, 'checkpointHash'))
      || parent.currentAction?.rangedPlan?.rangedPlanHash !== saved.attackAction?.rangedPlan?.rangedPlanHash) {
      fail('BLAST_TEMPLATE_DAMAGE_REACTION_CHECKPOINT_INVALID');
    }
    const consumed = consumeOfficialReactionFamilyResolutionV1(next, saved.triggerHash);
    const state = clone(consumed.state);
    delete state.pendingCurrentProductRangedDamageReaction;
    state.activeSideKey = parent.sideKey;
    const chance = applyOfficialRangedDamageReactionProjectionV1(state, saved.attackAction,
      saved.resolvedChance, consumed.projection);
    return settle(state, saved.attackAction, chance, parent, null, options,
      [...reacted.events, { type: 'blast_template_damage_reaction_resumed', chanceReusedWithoutReroll: true }]);
  }

  function apply(stateInput, action, options = {}) {
    const parent = pending(stateInput);
    if (parent?.stage === 'reaction') {
      return resumeDamageReaction(reactionAdapter.apply(stateInput, { action }), options);
    }
    if (action.executorId !== runtimeId || action.executorVersion !== runtimeVersion) fail('BLAST_TEMPLATE_ACTION_INVALID');
    if (parent?.stage === 'casualty') {
      const domain = enumerate(stateInput, { sideKey: action.sideKey }).parameterDomains[0];
      const current = domain && instantiate(stateInput, domain, action.canonicalParameters);
      if (!current || !isDeepStrictEqual(current.action, action)) fail('BLAST_TEMPLATE_CASUALTY_ACTION_STALE');
      const restored = clone(stateInput);
      restored.activeSideKey = parent.sideKey;
      const settled = settle(restored, parent.currentAction, parent.currentChance, parent,
        action.canonicalParameters, options, [{ type: 'blast_template_defender_casualties_chosen',
          sideKey: action.sideKey, chanceReusedWithoutReroll: true }]);
      settled.state.log.at(-1).action = clone(action);
      return { ...settled, action };
    }
    const work = parent ? pendingBatchWork(stateInput, parent, action.selectedBatchUnitId)
      : declarationWork(stateInput, action.pieceId, action.canonicalParameters);
    if (!isDeepStrictEqual(work.action, action)) fail('BLAST_TEMPLATE_ACTION_STALE');
    if (!work.context) {
      const state = clone(stateInput);
      const events = [{ type: 'blast_template_batch_skipped', targetId: action.targetId, reason: action.skipReason }];
      advance(state, work.parent, { targetId: action.targetId, skipped: action.skipReason }, events);
      return transition(state, action, events, options);
    }
    const chance = resolveOfficialSelectedRosterBatchChanceV1(stateInput, action, options, work.context);
    const nextParent = parent ? work.parent
      : declarationParent(stateInput, { ...work.parent, declarationAction: clone(action) }, action);
    return resolveBatch(stateInput, action, chance, nextParent, options);
  }

  function query(state, request) {
    if (request?.queryKind === 'blast_template_next_batch_preview') {
      if (!adaptiveBatchOrder || Object.keys(request).some(key => !['queryKind', 'pieceId', 'targetUnitId'].includes(key))) {
        fail('BLAST_TEMPLATE_NEXT_BATCH_REQUEST_INVALID');
      }
      const parent = pending(state);
      const candidate = parent?.stage === 'next_batch' && request.pieceId === parent.pieceId
        && enumerate(state).candidates.find(row => row.targetId === request.targetUnitId);
      if (!candidate) fail('BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE');
      const action = Object.fromEntries(Object.entries(candidate)
        .filter(([key]) => !['isEnabled', 'disabledReason', 'score'].includes(key)));
      return seal({ schemaVersion: 'starcraft_tmg_blast_template_next_batch_preview_v1',
        result: { canonicalParameters: { targetUnitId: request.targetUnitId }, action },
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (!request || request.queryKind !== 'blast_template_attack_preview'
      || Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) {
      fail('BLAST_TEMPLATE_PREVIEW_REQUEST_INVALID');
    }
    const domain = enumerate(state).parameterDomains.find(row => row.actionType === attackType && row.pieceId === request.pieceId);
    if (!domain) fail('BLAST_TEMPLATE_PREVIEW_DOMAIN_UNAVAILABLE');
    const result = instantiate(state, domain, request.parameters);
    return seal({ schemaVersion: 'starcraft_tmg_blast_template_attack_preview_v1',
      result, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }

  function inspectContext(state, action) {
    const parent = pending(state);
    const work = parent ? pendingBatchWork(state, parent, action.selectedBatchUnitId)
      : declarationWork(state, action.pieceId, action.canonicalParameters);
    if (!isDeepStrictEqual(work.action, action)) fail('BLAST_TEMPLATE_ACTION_STALE');
    return work.context;
  }
  function resolveChance(state, action, options) {
    const context = inspectContext(state, action);
    if (!context) return { skipped: action.skipReason };
    return resolveOfficialSelectedRosterBatchChanceV1(state, action, options, context);
  }
  return Object.freeze({ descriptor, enumerate, instantiate, apply, query, resolveChance, inspectContext,
    captureTargetReactionDeclaration(state, action) {
      if (!preservesTargetDeclaration || pending(state)) fail('BLAST_TEMPLATE_TARGET_DECLARATION_OWNER_REQUIRED');
      const work = declarationWork(state, action.pieceId, action.canonicalParameters);
      if (!isDeepStrictEqual(work.action, action)) fail('BLAST_TEMPLATE_ACTION_STALE');
      return seal({ schema: 'starcraft_tmg_template_target_declaration_snapshot_v1',
        sourceStateHash: hash(state), sourceActionHash: hash(action),
        parent: clone(declarationParent(state, work.parent, action)),
        trainingTruth: false }, 'preparedHash');
    },
    beginTargetReactionDeclaration(state, owner) {
      const saved = owner.preparedTemplateDeclaration;
      if (!preservesTargetDeclaration || pending(state)
        || state.pendingOfficialAttackTargetReaction?.parentHash !== owner.parentHash
        || !saved || saved.preparedHash !== hash(without(saved, 'preparedHash'))
        || saved.sourceActionHash !== owner.sourceActionHash
        || saved.parent.declaration.primaryTargetUnitId !== owner.targetId
        || saved.parent.geometryAssetHash !== asset.assetHash
        || saved.parent.round !== Number(state.round) || saved.parent.phase !== state.phase) {
        fail('BLAST_TEMPLATE_SAVED_TARGET_DECLARATION_INVALID');
      }
      saveParent(state, { ...clone(saved.parent), declarationAction: clone(owner.sourceAction) });
      return { type: 'blast_template_declaration_restored_after_target_reaction',
        sourceActionHash: saved.sourceActionHash, preparedHash: saved.preparedHash,
        geometryAssetHash: asset.assetHash, coverageReusedWithoutReposition: true, trainingTruth: false };
    },
    inspectDeclarationTarget(state, action) {
      const work = declarationWork(state, action.pieceId, action.canonicalParameters);
      if (!isDeepStrictEqual(work.action, action)) fail('BLAST_TEMPLATE_ACTION_STALE');
      const primaryTargetId = work.parent.declaration.primaryTargetUnitId;
      const parent = { ...work.parent, batches: [
        ...work.parent.batches.filter(batch => batch.unitId === primaryTargetId),
        ...work.parent.batches.filter(batch => batch.unitId !== primaryTargetId)] };
      const primary = workForBatch(state, parent, attackType);
      return { targetId: primaryTargetId, reactionPolicy: clone(primary.action.rangedPlan.reactionPolicy) };
    },
    inspectEvadeDemand: (state, action, options) => inspectOfficialSelectedRosterEvadeDemandV1(
      state, action, inspectContext(state, action), options),
    inspectArmourDemand: (state, action, options) => inspectOfficialSelectedRosterArmourDemandV1(inspectContext(state, action), options),
    inspectArmour: (state, action, options) => inspectOfficialSelectedRosterArmourChoiceV1(
      armourReactionSupported ? projectOfficialSelectedRosterArmourReactionContextV1(state, action,
        inspectContext(state, action), options) : inspectContext(state, action), options),
    hasPending: state => Boolean(pending(state)),
    pendingAttack: pending, resumeDamageReaction,
    ownsDamageReactionWindow: state => pending(state)?.stage === 'reaction' });
}
