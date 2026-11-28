import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { queryOfficialConsumePaymentOptionsV1 } from './official-consume-payment-facts-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { projectOfficialDestroyedUnitConsequencesV1 } from '../rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import { applyOfficialUnitDestructionMutationV1 } from '../rule-atoms/official-unit-destruction-lifecycle-rules-executor-v1.mjs';
import { recordOfficialSupplyLossesV1 } from '../rule-atoms/official-supply-loss-ledger-v1.mjs';
import { projectOfficialDarkSwarmReactionFactsV1 } from './official-dark-swarm-reaction-facts-v1.mjs';

const adapterId = 'official-consume-payment-runtime-v1';
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const without = (body, field) => Object.fromEntries(Object.entries(body).filter(([key]) => key !== field));
const semanticFields = ['paymentCardInstanceIds', 'sacrificePieceId', 'sacrificeModelId'];

export function createOfficialConsumePaymentPolicyV1({ context, source, consumerScope = 'numeric_attack_target_reaction',
  templateSurvivorsOnly = false, combatLifecycleCoexistence = false, activeAbilityPayment = false }) {
  if (!['numeric_attack_target_reaction', 'numeric_and_template_attack_target_reaction'].includes(consumerScope)) {
    throw Error('CONSUME_PAYMENT_SCOPE_UNSUPPORTED');
  }
  const clauses = [
    ['rules_sections:cB7X7UfOMHh3Wxn79ASF', '7.4 Destroyed Units', 'Effects that the Destroyed Unit applied to other Units remain'],
    ['rules_sections:iuUyObNTQ2M8xK4IUqzC', '8.7.5 Removing Models from Engaged Units', 'casualties from any source'],
  ].map(([recordKey, title, expected]) => {
    const record = context.dataset.recordsByKey[recordKey];
    const items = record?.payload.items.flatMap(item => [item, ...(item.subItems || []),
      ...(item.subItems || []).flatMap(child => child.subSubItems || [])]);
    const rule = items?.find(item => item.title === title);
    const raw = rule?.content?.[0]?.value, text = String(raw || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ');
    if (!text.includes(expected)) throw Error('CONSUME_CORE_RULE_SOURCE_REQUIRED:' + title);
    return { recordKey, title, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash, textHash: hash(raw) };
  });
  return seal({ schema: 'starcraft_tmg_consume_payment_policy_v1',
    version: activeAbilityPayment ? '1.4.0' : combatLifecycleCoexistence ? '1.3.0'
      : consumerScope === 'numeric_attack_target_reaction' ? '1.0.0' : templateSurvivorsOnly ? '1.2.0' : '1.1.0',
    sourceBundleHash: source.bundleHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, ruleSources: clauses,
    consumerScope, ...(consumerScope === 'numeric_and_template_attack_target_reaction' && templateSurvivorsOnly
      ? { templateAffectedModelsPolicy: 'surviving_declared_models' } : {}),
    ...(combatLifecycleCoexistence ? { combatLifecycleCoexistence: true } : {}),
    ...(activeAbilityPayment ? { activeAbilityPayment: true } : {}), trainingTruth: false }, 'policyHash');
}

function sourceFor(state) {
  const source = state.officialConsumePaymentSourceBundle, policy = state.officialConsumePaymentPolicy;
  if (!source || !policy || policy.policyHash !== hash(without(policy, 'policyHash'))
    || policy.sourceBundleHash !== source.bundleHash || source.bundleHash !== hash(without(source, 'bundleHash'))) {
    throw Error('CONSUME_PAYMENT_POLICY_INVALID');
  }
  return source;
}
export function enumerateOfficialConsumePaymentChoicesV1(state, route, sourceId, cost) {
  if (!state.officialConsumePaymentPolicy || route.resourceType !== 'BM' || cost < 1
    || !state.officialConsumePaymentSourceBundle.abilities.some(row => row.definitionId === route.definitionId)) return [];
  const source = sourceFor(state);
  const quote = queryOfficialConsumePaymentOptionsV1({ source, state, request: { queryKind: 'consume_payment_options',
    sourcePieceId: sourceId, abilityDefinitionId: route.definitionId, biomassToSpend: cost } });
  return quote.sacrifices.flatMap(victim => quote.consumeCardPayments.map(row => ({
    sacrificePieceId: victim.pieceId, sacrificeModelIds: victim.modelIds, paymentCardInstanceIds: row.cardInstanceIds })));
}

export function prepareOfficialConsumePaymentV1(state, route, sourceId, parameters) {
  const source = sourceFor(state);
  if (!parameters || Object.keys(parameters).some(key => !semanticFields.includes(key))
    || !Array.isArray(parameters.paymentCardInstanceIds)) throw Error('CONSUME_PAYMENT_SEMANTIC_ONLY');
  const ids = [...parameters.paymentCardInstanceIds].sort();
  if (new Set(ids).size !== ids.length) throw Error('CONSUME_PAYMENT_CARD_DUPLICATE');
  const quote = queryOfficialConsumePaymentOptionsV1({ source, state, request: { queryKind: 'consume_payment_options',
    sourcePieceId: sourceId, abilityDefinitionId: route.definitionId, biomassToSpend: route.resourceCost } });
  const victim = quote.sacrifices.find(row => row.pieceId === parameters.sacrificePieceId
    && row.modelIds.includes(parameters.sacrificeModelId));
  const payment = quote.consumeCardPayments.find(row => isDeepStrictEqual(row.cardInstanceIds, ids));
  if (!victim || !payment) throw Error('CONSUME_PAYMENT_SELECTION_INVALID');
  const actor = state.pieces.find(row => row.id === sourceId);
  const target = state.pieces.find(row => row.id === state.pendingOfficialReactionWindow?.context.targetPieceId);
  const darkSwarmFacts = route.requiresSharedFriendlyDarkSwarmToken
    ? projectOfficialDarkSwarmReactionFactsV1(state, actor, target)[0] : null;
  if (route.requiresSharedFriendlyDarkSwarmToken && !darkSwarmFacts) throw Error('CONSUME_PAYMENT_EFFECT_FACTS_REQUIRED');
  return seal({ schema: 'starcraft_tmg_consume_payment_plan_v1', stateHash: hash(state),
    sourceBundleHash: source.bundleHash, policyHash: state.officialConsumePaymentPolicy.policyHash,
    definitionId: route.definitionId, sourcePieceId: sourceId, sideKey: actor.sideKey,
    resourceCost: quote.resourceCost, generatedFromModel: 1, retainedAfterPayment: 0,
    sacrifice: victim, sacrificeModelId: parameters.sacrificeModelId, cardPayment: payment.payment,
    canonicalParameters: { paymentCardInstanceIds: ids, sacrificePieceId: victim.pieceId,
      sacrificeModelId: parameters.sacrificeModelId }, darkSwarmFacts, trainingTruth: false }, 'paymentPlanHash');
}

// Called only inside the reaction Apply transaction, after the parent has been
// validated. The shared casualty writer receives a forced removal, without dice.
export function applyOfficialConsumePaymentV1(state, route, action, events) {
  const plan = action.reactionPlan.consumePaymentPlan;
  return applyOfficialConsumePaymentPlanV1(state, route, action, events, plan,
    action.reactionPlan.sourceInstanceId, action.reactionPlan.canonicalParameters);
}

// Both active abilities and reactions commit through this one casualty/Supply
// writer. The outer consumer has already validated its timing and full effect.
export function applyOfficialConsumePaymentPlanV1(state, route, action, events, plan, sourceId, parameters) {
  if (route.definitionId !== 'unit:defiler/dark-swarm-assault-phase@1'
    && state.officialConsumePaymentPolicy?.activeAbilityPayment !== true) throw Error('CONSUME_ACTIVE_PAYMENT_CONSUMER_REQUIRED');
  const expected = prepareOfficialConsumePaymentV1(state, route, sourceId, parameters);
  if (!isDeepStrictEqual(plan, expected)) throw Error('CONSUME_PAYMENT_PLAN_STALE');
  return commitPayment(state, action, events, plan);
}

// Only the source-bound, sealed continuation may bypass a fresh quote. Its
// original victim is reserved from child damage, while the other survivors and
// Supply may have changed. A quote is never recomputed after the interruption.
export function applyOfficialSealedConsumePaymentV1(state, action, events, checkpoint, casualty) {
  sourceFor(state);
  if (!isDeepStrictEqual(state.pendingOfficialConsumePayment, checkpoint)
    || checkpoint.checkpointHash !== hash(without(checkpoint, 'checkpointHash'))
    || checkpoint.round !== Number(state.round) || checkpoint.phase !== state.phase
    || checkpoint.policyHash !== hash(state.officialBeforeCasualtyBatchPolicy)
    || checkpoint.plan.paymentPlanHash !== hash(without(checkpoint.plan, 'paymentPlanHash'))
    || checkpoint.plan.sourceBundleHash !== state.officialConsumePaymentSourceBundle.bundleHash
    || checkpoint.plan.policyHash !== state.officialConsumePaymentPolicy.policyHash
    || hash(action) !== checkpoint.sourceActionHash
    || (state.officialConsumePaymentHistory || []).some(r=>r.paymentPlanHash===checkpoint.plan.paymentPlanHash)
    || checkpoint.plan.cardPayment.selectedCardsExhaustOnCommit.some(id=>
      state.cardResources[checkpoint.plan.sideKey].find(c=>c.cardInstanceId===id)?.readiness!=='exhausted')) {
    throw Error('CONSUME_SEALED_PAYMENT_INVALID');
  }
  return commitPayment(state, action, events, checkpoint.plan, casualty);
}

function commitPayment(state, action, events, plan, rebasedCasualty = null) {
  const before = structuredClone(state), target = state.pieces.find(row => row.id === plan.sacrifice.pieceId);
  const remainingModelIds = target.models.filter(model => !model.isDestroyed && model.isOnField !== false
    && model.id !== plan.sacrificeModelId).map(model => model.id);
  const shielded = target.statuses.some(entry => String(typeof entry === 'string' ? entry
    : entry.statusName || entry.name).toLowerCase() === 'shielded');
  applyOfficialSelectedRosterResolvedDamageV1(state, target, resolveOfficialEffectiveCombatProfileV1(state, target), rebasedCasualty || {
    casualtyModelIds: [plan.sacrificeModelId], remainingModelIds, targetDestroyed: remainingModelIds.length === 0,
    postDamageMarker: remainingModelIds.length ? target.damageMarker : 0, shieldedBefore: shielded, shieldedAfter: false,
  });
  if (!rebasedCasualty && target.currentSupply !== plan.sacrifice.remainingSupply) throw Error('CONSUME_SUPPLY_WRITER_MISMATCH');
  let destruction = null;
  if (target.isDestroyed && !before.pieces.find(p=>p.id===target.id).isDestroyed) {
    destruction = projectOfficialDestroyedUnitConsequencesV1({ state, pieceId: target.id,
      tokenIdentityField: 'tokenId', includeCurrentProductEffects: true,
      dispatchCreatedTokensAfterTransition: state.officialCreatorTokenLifecycle === true });
    applyOfficialUnitDestructionMutationV1(state, destruction.mutation, { tokenIdentityField: 'tokenId' });
    state.unitDestructionLifecycleHistory = [...(state.unitDestructionLifecycleHistory || []), {
      schema: 'starcraft_tmg_consume_destruction_resolution_v1', procedureKind: 'settle_unit_destruction',
      pieceId: target.id, sourcePaymentPlanHash: plan.paymentPlanHash, result: destruction, trainingTruth: false }];
  }
  for (const id of plan.cardPayment.selectedCardsExhaustOnCommit) {
    state.cardResources[action.sideKey].find(card => card.cardInstanceId === id).readiness = 'exhausted';
  }
  const receipt = seal({ schema: 'starcraft_tmg_consume_payment_receipt_v1', round: Number(state.round), phase: state.phase,
    paymentPlanHash: plan.paymentPlanHash, sourcePieceId: plan.sourcePieceId, sideKey: plan.sideKey,
    definitionId: plan.definitionId, sacrificePieceId: target.id, sacrificeModelId: plan.sacrificeModelId,
    modelsBefore: rebasedCasualty ? before.pieces.find(p=>p.id===target.id).currentModels : plan.sacrifice.currentModels, modelsAfter: target.currentModels,
    supplyBefore: rebasedCasualty ? before.pieces.find(p=>p.id===target.id).currentSupply : plan.sacrifice.currentSupply, supplyAfter: target.currentSupply,
    ...(rebasedCasualty ? { quotedModelsBefore:plan.sacrifice.currentModels, quotedSupplyBefore:plan.sacrifice.currentSupply,
      quotedSupplyAfter:plan.sacrifice.remainingSupply, casualtyResolutionHash:rebasedCasualty.resolutionHash } : {}),
    resourceCost: plan.resourceCost, generatedFromModel: 1, retainedAfterPayment: 0,
    exhaustedCardInstanceIds: plan.cardPayment.selectedCardsExhaustOnCommit, darkSwarmFacts: plan.darkSwarmFacts,
    unitDestroyed: target.isDestroyed, destruction, trainingTruth: false }, 'paymentReceiptHash');
  state.officialConsumePaymentHistory = [...(state.officialConsumePaymentHistory || []), receipt];
  events.push({ type: 'consume_model_removed', pieceId: target.id, sideKey: action.sideKey,
    sourcePieceId: plan.sourcePieceId, casualtyModelIds: [plan.sacrificeModelId],
    sourceDefinitionId: 'unit:defiler/consume-any-phase@1', paymentReceiptHash: receipt.paymentReceiptHash,
    currentSupplyBefore: receipt.supplyBefore, currentSupplyAfter: receipt.supplyAfter, trainingTruth: false });
  const supply = recordOfficialSupplyLossesV1({ stateBefore: before, stateAfter: state, action, events,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
  state.supplyLossLedger = structuredClone(supply.ledger);
  events.push(...supply.supplyLossEvents);
  return receipt;
}

export function readOfficialConsumeReactionEffectFactsV1(state, effect) {
  const receipt = (state.officialConsumePaymentHistory || []).find(row => row.paymentReceiptHash === effect.consumePaymentReceiptHash);
  if (!receipt || receipt.paymentReceiptHash !== hash(without(receipt, 'paymentReceiptHash'))
    || receipt.sourcePieceId !== effect.sourceInstanceId || receipt.definitionId !== effect.definitionId
    || receipt.sideKey !== effect.sideKey || !isDeepStrictEqual(receipt.darkSwarmFacts, effect.darkSwarmFacts)) {
    throw Error('CONSUME_REACTION_EFFECT_PAYMENT_INVALID');
  }
  return receipt.darkSwarmFacts;
}

export function createOfficialConsumePaymentAdapterV1(source) {
  return { descriptor: { adapterId, adapterVersion: '1.0.0', adapterKind: 'exact_runtime',
    coveredDefinitionCount: 1, coveredSourceFeatureHashes: [source.sourceFeatureHash],
    supportedOperations: ['legal_space', 'query'], sourceBundleHash: source.bundleHash,
    automaticConsumer: 'official-reaction-family-adapter-v1', rulesAuthority: true, trainingTruth: false },
    definitionBindings: [{ sourceFeatureHash: source.sourceFeatureHash, adapterId, adapterVersion: '1.0.0', capability: 'automatic_consumer' }],
    legalSpace: () => ({ candidates: [], parameterDomains: [], automaticConsumer: true, trainingTruth: false }),
    query: (state, request) => queryOfficialConsumePaymentOptionsV1({ source, state, request }) };
}
