import {hasOfficialConsumeBeforeCasualtyPolicyV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import {stageOfficialConsumePaymentV1} from './official-consume-continuation-v1.mjs';
import {queryOfficialConsumePaymentOptionsV1} from './official-consume-payment-facts-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { projectOfficialPlagueAffectedBatchesV1 } from './official-plague-coverage-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { prepareOfficialConsumePaymentV1, applyOfficialConsumePaymentPlanV1 } from './official-consume-payment-runtime-v1.mjs';
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1 } from './official-selected-roster-ability-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1, projectOfficialCharacteristicStatusFamilyModifiersV1 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { alternateOfficialPhaseActivationV1 } from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { resolveOfficialNonLethalDamageV1 } from '../rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1, hasOfficialNonLethalDamagePolicyV1 } from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { hasOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';

const runtimeId = 'official-plague-runtime-v1', version = '1.0.0';
export const OFFICIAL_PLAGUE_ATOM_ID = 'rule-atom:source-bound-plague-template-non-lethal-v1';
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const liveModels = piece => piece.models.filter(row => !row.isDestroyed && row.isOnField !== false);
const statusName = value => String(typeof value === 'string' ? value : value?.statusName || value?.name || value?.status || '').trim().toLowerCase();
const hasStatus = (piece, value) => piece.statuses.some(row => statusName(row) === value);
const active = piece => piece.isOnField === true && !piece.isDestroyed && piece.currentModels > 0;
const succeeds = (die, threshold) => die === 6 || die !== 1 && die >= threshold;

export function createOfficialPlagueResolutionPolicyV1({ context, source, paymentInterruption = false }) {
  if (context.manifest.source.references.core.byteHash !== OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1.sourceCoreByteHash) {
    throw Error('PLAGUE_NON_LETHAL_CORE_SOURCE_REQUIRED');
  }
  return seal({ schema: 'starcraft_tmg_plague_resolution_policy_v1', version:paymentInterruption?'1.1.0':version,
    ...(paymentInterruption?{beforeCasualtyPayment:true,futureDiceAfterPayment:true}:{}),
    sourceBundleHash: source.bundleHash, faqByteHash: source.faqSource.byteHash,
    nonLethalPolicy: structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1),
    paymentBeforeCoverage: true, sourceSacrificeDoesNotCancelPaidEffect: true,
    combatShieldEvade: true, hiddenRemovedBeforeDamage: true, trainingTruth: false }, 'policyHash');
}

function loseHidden(state, piece) {
  const statuses = piece.statuses.filter(row => statusName(row) === 'hidden');
  const hashes = statuses.map(row => row.statusEffectHash).filter(Boolean);
  piece.statuses = piece.statuses.filter(row => statusName(row) !== 'hidden');
  state.board.effectMarkers = (state.board.effectMarkers || []).filter(row => !hashes.includes(row.statusEffectHash)
    && !(row.targetPieceId === piece.id && String(row.label || '').toLowerCase() === 'hidden'));
  return statuses.length > 0;
}

export function createOfficialPlagueRuntimeV1({ context, coverage, state }) {
  const source = state.officialPlagueCoverageSourceBundle;
  const interrupted=hasOfficialConsumeBeforeCasualtyPolicyV1(state), runtimeVersion=interrupted?'1.1.0':version;
  const policy = createOfficialPlagueResolutionPolicyV1({ context, source, paymentInterruption:interrupted });
  if (!coverage || !isDeepStrictEqual(policy, state.officialPlagueResolutionPolicy)
    || state.officialConsumePaymentPolicy?.activeAbilityPayment !== true
    || !hasOfficialNonLethalDamagePolicyV1(state) || !hasOfficialShieldedLifecyclePolicyV1(state)) {
    throw Error('PLAGUE_EXECUTION_CONSUMERS_REQUIRED');
  }
  const descriptor = { adapterId: runtimeId, adapterVersion: runtimeVersion, adapterKind: 'exact_runtime',
    coveredDefinitionCount: 1, coveredSourceFeatureHashes: [source.sourceFeatureHash],
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], ruleAtomIds: [OFFICIAL_PLAGUE_ATOM_ID,
      ...OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1.ruleAtomIds], sourceBundleHash: source.bundleHash,
    policyHash: policy.policyHash, actualPaymentConsumerReady: true, nonLethalDamageConsumerReady: true,
    fullMatchCoverage: false, trainingTruth: false };
  function eligible(current, actor) {
    if (!active(actor) || actor.officialUnitRecordKey !== source.recordKey
      || current.pendingOfficialPaidPlague || current.pendingAction || current.pendingCurrentProductRangedSequence || current.pendingOfficialReactionWindow
      || Number(actor.structureRules?.specialAbilitiesDisabledThroughRound ?? -Infinity) >= Number(current.round)
      || (current.officialPlagueUseHistory || []).some(row => row.pieceId === actor.id && row.round === Number(current.round))) return false;
    const selected = current.officialActionRouteCatalogue.units.find(row => row.pieceId === actor.id);
    if (!selected?.routes.some(row => row.sourceKind === 'official_card_feature' && row.featureName === 'Plague'
      && row.phase === 'assault' && row.activationKind === 'active')) return false;
    try { assertOfficialSelectedRosterSpecialAbilityWindowV1(current, actor.sideKey, actor.id, 'assault'); }
    catch (error) {
      if (/SELECTED_ABILITY_(TIMING_UNAVAILABLE|ACTIVATION_WINDOW_LOCKED)/u.test(error.message)) return false;
      throw error;
    }
    return true;
  }
  function enumerate(current, options = {}) {
    const sideKey = options.sideKey || current.activeSideKey;
    if(current.pendingOfficialPaidPlague)return paidMenu(current,sideKey);
    if(interrupted){
      const parameterDomains=current.pieces.filter(actor=>actor.sideKey===sideKey&&eligible(current,actor)).flatMap(actor=>
        source.biomassChoices.flatMap(cost=>{
          const quote=queryOfficialConsumePaymentOptionsV1({source:current.officialConsumePaymentSourceBundle,state:current,
            request:{queryKind:'consume_payment_options',sourcePieceId:actor.id,abilityDefinitionId:source.definitionId,biomassToSpend:cost}});
          const choices=[...quote.cardOnlyPayments.map(p=>({kind:'cards',cards:p.cardInstanceIds})),
            ...quote.sacrifices.flatMap(v=>quote.consumeCardPayments.map(p=>({kind:'consume',cards:p.cardInstanceIds,pieceId:v.pieceId,modelIds:v.modelIds})))];
          return choices.map(choice=>seal({schemaVersion:'starcraft_tmg_official_parameter_domain_v1',parameterKind:'official_plague_cast_v1',
            actionType:'cast_plague',executorId:runtimeId,executorVersion:runtimeVersion,pieceId:actor.id,sideKey,phase:current.phase,
            definitionId:source.definitionId,sourceFeatureHash:source.sourceFeatureHash,stateHash:hash(current),sourceBundleHash:source.bundleHash,
            abilityName:'Plague',costPaymentKind:choice.kind,
            parameterSchema:{type:'object',required:['coordinate','biomassToSpend','paymentCardInstanceIds',
              ...(choice.kind==='consume'?['sacrificePieceId','sacrificeModelId']:[])],
              coordinate:{type:'world_point_milli_inches',coordinateUnit:'milli-inch'},biomassToSpend:{const:cost},paymentCardInstanceIds:{const:choice.cards},
              ...(choice.kind==='consume'?{sacrificePieceId:{const:choice.pieceId},sacrificeModelId:{type:'string',enum:choice.modelIds}}:{})},
            trainingTruth:false},'domainId'));
        }));
      return{candidates:[],parameterDomains};
    }
    return { candidates: [], parameterDomains: current.pieces.filter(actor => actor.sideKey === sideKey && eligible(current, actor))
      .map(actor => seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1', parameterKind: 'official_plague_cast_v1',
        actionType: 'cast_plague', executorId: runtimeId, executorVersion: runtimeVersion, pieceId: actor.id,
        sideKey, phase: current.phase, definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
        stateHash: hash(current), sourceBundleHash: source.bundleHash,
        parameterSchema: { type: 'object', required: ['coordinate', 'biomassToSpend', 'paymentCardInstanceIds'],
          coordinate: { coordinateUnit: 'milli-inch' }, biomassToSpend: { enum: source.biomassChoices },
          paymentCardInstanceIds: { type: 'array', items: { type: 'string' } },
          sacrificePieceId: { type: 'string', optional: true }, sacrificeModelId: { type: 'string', optional: true } },
        trainingTruth: false }, 'domainId')) };
  }
  function projectBatches(next,pieceId,original,biomassToSpend,current=next){
    const projected = projectOfficialRangedTerrainForLosV1(next).projected;
    Object.assign(projected.board, { widthInches: next.board.widthInches, heightInches: next.board.heightInches });
    const affected = projectOfficialPlagueAffectedBatchesV1({ current: next, source, asset: next.officialBlastTemplateGeometryAsset,
      template: original.templateFootprint, point: original.targetPointFootprint, pointSurface: original.pointSurface,
      projected, biomassToSpend: biomassToSpend });
    const sourceActor = current.pieces.find(row => row.id === pieceId);
    const batches = affected.batches.map(batch => {
      const target = next.pieces.find(row => row.id === batch.targetPieceId);
      const hiddenLost = loseHidden(next, target);
      const profile = resolveOfficialEffectiveCombatProfileV1(next, target);
      const damageKind = target.sideKey !== sourceActor.sideKey ? 'enemy_special_ability' : 'friendly_special_ability';
      const targetContext = { attackerPieceId: sourceActor.id, targetPieceId: target.id, damageKind, attackKind: 'special_ability', abilityName: 'Plague' };
      const selected = resolveOfficialSelectedRosterAbilityModifiersV1(next, target, targetContext);
      const characteristic = next.officialCharacteristicStatusFamilySourceBundle
        ? projectOfficialCharacteristicStatusFamilyModifiersV1(next.officialCharacteristicStatusFamilySourceBundle, next,
          { pieceId: target.id, context: targetContext }) : null;
      const eligibleEvade = profile.evadeThreshold !== null && (selected.evadeEligible
        || characteristic?.eligibleEvadeAgainstAllAttacks || hasStatus(target, 'burrowed'));
      return { ...batch, hiddenLost, evadeEligible: Boolean(eligibleEvade),
        evadeThreshold: eligibleEvade ? profile.evadeThreshold - Number(selected.evadeModifier || 0) : null,
        targetProfileHash: hash(profile) };
    });
    const hit = batches.reduce((sum, batch) => sum + batch.dice, 0);
    const evade = batches.reduce((sum, batch) => sum + (batch.evadeEligible ? batch.dice : 0), 0);
    const chance = hit ? { kind: 'fixed_roll_sequence', faces: 6, count: hit + evade,
      layout: { hit, armour: 0, evade, surge: 0 } } : null;
    return{batches,chance,affected};
  }
  function prepare(current, domain, parameters) {
    if (!domain || !isDeepStrictEqual(enumerate(current, { sideKey: domain.sideKey }).parameterDomains
      .find(row => row.domainId === domain.domainId), domain)) throw Error('PLAGUE_DOMAIN_STALE');
    const allowed = ['coordinate', 'biomassToSpend', 'paymentCardInstanceIds', 'sacrificePieceId', 'sacrificeModelId'];
    if (!parameters || Object.keys(parameters).some(key => !allowed.includes(key))
      || !Array.isArray(parameters.paymentCardInstanceIds) || parameters.paymentCardInstanceIds.some(id => typeof id !== 'string')
      || new Set(parameters.paymentCardInstanceIds).size !== parameters.paymentCardInstanceIds.length
      || (parameters.sacrificePieceId === undefined) !== (parameters.sacrificeModelId === undefined)) throw Error('PLAGUE_SEMANTIC_PARAMETERS_REQUIRED');
    const canonicalParameters = structuredClone({ ...parameters, paymentCardInstanceIds: [...parameters.paymentCardInstanceIds].sort() });
    if(interrupted){
      const schema=domain.parameterSchema;
      if(canonicalParameters.biomassToSpend!==schema.biomassToSpend.const
        ||!isDeepStrictEqual(canonicalParameters.paymentCardInstanceIds,schema.paymentCardInstanceIds.const)
        ||(domain.costPaymentKind==='consume'
          ?canonicalParameters.sacrificePieceId!==schema.sacrificePieceId.const||!schema.sacrificeModelId.enum.includes(canonicalParameters.sacrificeModelId)
          :canonicalParameters.sacrificePieceId!==undefined))throw Error('PLAGUE_PAYMENT_DOMAIN_SELECTION_INVALID');
    }
    const original = coverage.query(current, { queryKind: 'plague_template_coverage', sourcePieceId: domain.pieceId,
      coordinate: canonicalParameters.coordinate, biomassToSpend: canonicalParameters.biomassToSpend });
    const route = { definitionId: source.definitionId, resourceType: 'BM', resourceCost: canonicalParameters.biomassToSpend };
    const next = structuredClone(current), events = [];
    const paymentAction = { actionType: 'cast_plague', pieceId: domain.pieceId, sideKey: domain.sideKey, phase: current.phase };
    let consumePlan = null, consumeReceipt = null, cardPayment = null;
    if (canonicalParameters.sacrificePieceId !== undefined) {
      const choice = Object.fromEntries(['paymentCardInstanceIds', 'sacrificePieceId', 'sacrificeModelId'].map(key => [key, canonicalParameters[key]]));
      consumePlan = prepareOfficialConsumePaymentV1(current, route, domain.pieceId, choice);
      if(interrupted){
        const plan=seal({schema:'starcraft_tmg_plague_declaration_v1',stateHash:hash(current),sourceBundleHash:source.bundleHash,
          policyHash:policy.policyHash,canonicalParameters,consumePlan,
          geometry:{templateFootprint:original.templateFootprint,targetPointFootprint:original.targetPointFootprint,pointSurface:original.pointSurface},
          beforePaymentCoverageHash:original.queryReceiptHash,chance:null,trainingTruth:false},'planHash');
        return{plan,next,events};
      }
      consumeReceipt = applyOfficialConsumePaymentPlanV1(next, route, paymentAction, events, consumePlan, domain.pieceId, choice);
    } else {
      const selected = original.payment.cardOnlyPayments.find(row => isDeepStrictEqual(row.cardInstanceIds, canonicalParameters.paymentCardInstanceIds));
      if (!selected) throw Error('PLAGUE_CARD_PAYMENT_INVALID');
      cardPayment = selected.payment;
      for (const id of cardPayment.selectedCardsExhaustOnCommit) next.cardResources[domain.sideKey].find(row => row.cardInstanceId === id).readiness = 'exhausted';
    }
    const {batches,chance,affected}=projectBatches(next,domain.pieceId,original,canonicalParameters.biomassToSpend,current);
    const plan = seal({ schema: 'starcraft_tmg_plague_cast_plan_v1', stateHash: hash(current),
      sourceBundleHash: source.bundleHash, policyHash: policy.policyHash, canonicalParameters,
      beforePaymentCoverageHash: original.queryReceiptHash, afterPaymentCoverageHash: hash(affected),
      batches, cardPayment, consumePlan, consumePaymentReceiptHash: consumeReceipt?.paymentReceiptHash || null,
      sourceDestroyedByPayment: !active(next.pieces.find(row => row.id === domain.pieceId)), chance,
      trainingTruth: false }, 'planHash');
    return { plan, next, events };
  }
  function instantiate(current, domain, parameters) {
    const { plan } = prepare(current, domain, parameters);
    return { canonicalParameters: plan.canonicalParameters, action: { actionType: 'cast_plague', executorId: runtimeId,
      executorVersion: runtimeVersion, pieceId: domain.pieceId, sideKey: domain.sideKey, phase: current.phase,
      definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash, domainId: domain.domainId,
      canonicalParameters: plan.canonicalParameters, plaguePlan: plan, chance: plan.chance,
      ruleAtomIds: descriptor.ruleAtomIds } };
  }
  function apply(current, request) {
    const action = request.action, options = request.options || {};
    if(current.pendingOfficialPaidPlague)return applyPaid(current,action,options);
    const domain = enumerate(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain) throw Error('PLAGUE_ACTION_STALE:domain');
    const expected = instantiate(current, domain, action.canonicalParameters).action;
    if (!isDeepStrictEqual(expected, action)) {
      const changed = [...new Set([...Object.keys(expected), ...Object.keys(action)])]
        .filter(key => !isDeepStrictEqual(expected[key], action[key]));
      throw Error('PLAGUE_ACTION_STALE:fields=' + changed.join(','));
    }
    const { plan, next, events } = prepare(current, domain, action.canonicalParameters);
    if(plan.schema==='starcraft_tmg_plague_declaration_v1'){
      if(options.chanceReveals?.length)throw Error('PLAGUE_PAYMENT_MUST_NOT_ROLL');
      const staged=stageOfficialConsumePaymentV1({state:current,action,plan:plan.consumePlan,
        owner:{kind:'plague',declaration:plan,pieceId:action.pieceId,sideKey:action.sideKey}});
      return staged.consumeReceipt?resumeConsume(staged):staged;
    }
    return resolvePrepared(plan,next,events,action,options);
  }
  function resolvePrepared(plan,next,events,action,options){
    const reveals = options.chanceReveals || [], rolls = reveals.map(row => Number(typeof row === 'number' ? row : row.outcome));
    if (rolls.length !== (plan.chance?.count || 0) || rolls.some(roll => !Number.isInteger(roll) || roll < 1 || roll > 6)) throw Error('PLAGUE_CHANCE_REVEALS_INVALID');
    let hitOffset = 0, evadeOffset = plan.chance?.layout.hit || 0;
    const resolutions = [];
    for (const batch of plan.batches) {
      const target = next.pieces.find(row => row.id === batch.targetPieceId), profile = resolveOfficialEffectiveCombatProfileV1(next, target);
      const hitRolls = rolls.slice(hitOffset, hitOffset + batch.dice); hitOffset += batch.dice;
      const hits = hitRolls.filter(die => succeeds(die, batch.hitThreshold)).length;
      const evadeRolls = batch.evadeEligible ? rolls.slice(evadeOffset, evadeOffset + hits) : [];
      if (batch.evadeEligible) evadeOffset += batch.dice;
      const evaded = evadeRolls.filter(die => succeeds(die, batch.evadeThreshold)).length;
      const resolution = resolveOfficialNonLethalDamageV1({ targetPieceId: target.id,
        targetModelId: liveModels(target)[0].id, abilityResolutionHash: plan.planHash,
        priorDamageMarker: Number(target.damageMarker || 0), amount: hits - evaded, targetHitPoints: profile.hitPoints });
      const shieldedBefore = hasStatus(target, 'shielded');
      applyOfficialSelectedRosterResolvedDamageV1(next, target, profile, { casualtyModelIds: [],
        remainingModelIds: liveModels(target).map(row => row.id), targetDestroyed: false,
        postDamageMarker: resolution.postDamageMarker, shieldedBefore,
        shieldedAfter: shieldedBefore && resolution.postDamageMarker <= Number(profile.shield || 0) });
      const result = { ...batch, hitRolls, hits, evadeRolls, evaded, nonLethal: resolution };
      resolutions.push(result);
      events.push({ type: 'plague_non_lethal_damage', pieceId: action.pieceId, targetPieceId: target.id,
        definitionId: source.definitionId, planHash: plan.planHash, result, trainingTruth: false });
    }
    next.officialPlagueUseHistory = [...(next.officialPlagueUseHistory || []), {
      round: Number(next.round), phase: next.phase, sideKey: action.sideKey, pieceId: action.pieceId,
      sourceDefinitionId: source.definitionId, sourcePlanHash: plan.planHash,
      biomassToSpend: plan.canonicalParameters.biomassToSpend, consumePaymentReceiptHash: plan.consumePaymentReceiptHash,
      resolutions, sourceDestroyedByPayment: plan.sourceDestroyedByPayment, trainingTruth: false }];
    if (plan.sourceDestroyedByPayment) {
      delete next.selectedRosterActivationWindow;
      const actor = next.pieces.find(row => row.id === action.pieceId);
      actor.activatedPhases[next.phase] = true;
      alternateOfficialPhaseActivationV1(next, action.sideKey, next.phase);
    } else openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, next.phase);
    events.push({ type: 'plague_complete', pieceId: action.pieceId, sourcePlanHash: plan.planHash,
      sourceDestroyedByPayment: plan.sourceDestroyedByPayment, nonLethalOnly: true, trainingTruth: false });
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round),
      phase: next.phase, action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion, trainingTruth: false };
  }
  function readPaid(current){
    const p=current.pendingOfficialPaidPlague;
    if(!interrupted||!p||p.checkpointHash!==hash(Object.fromEntries(Object.entries(p).filter(([k])=>k!=='checkpointHash')))
      ||p.round!==Number(current.round)||p.phase!==current.phase||p.policyHash!==policy.policyHash
      ||!current.officialConsumePaymentHistory?.some(r=>r.paymentReceiptHash===p.consumePaymentReceiptHash&&r.paymentPlanHash===p.declaration.consumePlan.paymentPlanHash))
      throw Error('PLAGUE_PAID_PARENT_INVALID');
    return p;
  }
  function resumeConsume(result){
    const {consumeCheckpoint:cp,consumeReceipt:receipt}=result;
    if(cp?.owner.kind!=='plague'||!receipt||result.state.pendingOfficialPaidPlague)throw Error('PLAGUE_CONSUME_PARENT_REQUIRED');
    const next=structuredClone(result.state),declaration=cp.owner.declaration;
    if(declaration.policyHash!==policy.policyHash||declaration.sourceBundleHash!==source.bundleHash
      ||declaration.planHash!==hash(Object.fromEntries(Object.entries(declaration).filter(([k])=>k!=='planHash'))))throw Error('PLAGUE_DECLARATION_INVALID');
    next.pendingOfficialPaidPlague=seal({schema:'starcraft_tmg_paid_plague_checkpoint_v1',round:Number(next.round),phase:next.phase,
      policyHash:policy.policyHash,declaration,pieceId:cp.owner.pieceId,sideKey:cp.owner.sideKey,
      consumePaymentReceiptHash:receipt.paymentReceiptHash,trainingTruth:false},'checkpointHash');
    next.activeSideKey=cp.owner.sideKey;
    return{...result,state:next,events:[...result.events,{type:'plague_payment_complete',sourcePlanHash:declaration.planHash,
      paymentReceiptHash:receipt.paymentReceiptHash,futureDiceNotRolled:true,trainingTruth:false}]};
  }
  function preparePaid(current){
    const parent=readPaid(current),next=structuredClone(current),d=parent.declaration;
    const {batches,chance,affected}=projectBatches(next,parent.pieceId,d.geometry,d.canonicalParameters.biomassToSpend);
    const plan=seal({schema:'starcraft_tmg_paid_plague_resolution_plan_v1',stateHash:hash(current),parentHash:parent.checkpointHash,
      originalDeclarationHash:d.planHash,sourceBundleHash:source.bundleHash,policyHash:policy.policyHash,canonicalParameters:d.canonicalParameters,
      consumePaymentReceiptHash:parent.consumePaymentReceiptHash,afterPaymentCoverageHash:hash(affected),batches,chance,
      sourceDestroyedByPayment:!active(next.pieces.find(p=>p.id===parent.pieceId)),trainingTruth:false},'planHash');
    return{parent,next,plan};
  }
  function paidMenu(current,sideKey){
    const {parent,plan}=preparePaid(current);
    if(sideKey!==parent.sideKey)return{candidates:[],parameterDomains:[]};
    return{parameterDomains:[],candidates:[{actionType:'resolve_paid_plague',executorId:runtimeId,executorVersion:runtimeVersion,
      pieceId:parent.pieceId,sideKey:parent.sideKey,phase:current.phase,definitionId:source.definitionId,
      sourceFeatureHash:source.sourceFeatureHash,plaguePlan:plan,chance:plan.chance,ruleAtomIds:descriptor.ruleAtomIds,isEnabled:true}]};
  }
  function applyPaid(current,action,options){
    const expected={...paidMenu(current,current.activeSideKey).candidates[0]};delete expected.isEnabled;
    if(!isDeepStrictEqual(action,expected))throw Error('PLAGUE_PAID_ACTION_STALE');
    const {next,plan}=preparePaid(current);delete next.pendingOfficialPaidPlague;
    return resolvePrepared(plan,next,[],action,options);
  }
  return Object.freeze({ descriptor, definitionBindings: [{ sourceFeatureHash: source.sourceFeatureHash,
    adapterId: runtimeId, adapterVersion: runtimeVersion, capability: 'authoritative_action' }],
    legalSpace: enumerate, instantiate, resumeConsume, preview: (current, request) => instantiate(current, request.domain, request.parameters), apply,
    query: (current, request) => {
      if (request.queryKind !== 'plague_cast_preview' || Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) throw Error('PLAGUE_QUERY_SEMANTIC_ONLY');
      const domain = enumerate(current).parameterDomains.find(row => row.pieceId === request.pieceId);
      return seal({ result: instantiate(current, domain, request.parameters), stateHash: hash(current),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    } });
}
