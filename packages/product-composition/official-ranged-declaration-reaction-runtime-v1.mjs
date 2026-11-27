import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { getOfficialAttackProfileV3 } from '../source-data/official-attack-profile-catalogue-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { hasOfficialRangedDeclarationPolicyV1, readOfficialRangedDeclarationV1,
  OFFICIAL_RANGED_DECLARATION_PARENT_KEY }
  from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { assertOfficialSelectedRosterCoreActionWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';

const runtimeId = 'starcraft-tmg-ranged-declaration-reaction-v1';
const actionType = 'declare_ranged_attack';
const parentKey = OFFICIAL_RANGED_DECLARATION_PARENT_KEY;
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const clone = value => structuredClone(value);

export function createOfficialRangedDeclarationReactionRuntimeV1({ state: initial, reactionAdapter, templateRuntime, rangedRuntime }) {
  const numeric = initial.officialRangedDeclarationPolicy?.numericWeaponsSupported === true;
  const version = numeric ? '1.1.0' : '1.0.0';
  if (!hasOfficialRangedDeclarationPolicyV1(initial) || !reactionAdapter || !numeric && !templateRuntime
    || numeric && !rangedRuntime) {
    throw Error('RANGED_DECLARATION_CONSUMERS_REQUIRED');
  }
  const routes = initial.officialReactionFamilySourceBundle.routes.filter(route =>
    route.effectKind === 'ranged_declaration_keywords');
  if (initial.officialReactionFamilySourceBundle.routes.some(route =>
    route.triggerKind === 'ranged_attack_declared' && route.effectKind !== 'ranged_declaration_keywords'
      && !route.persistentRangedHitDebuff)) {
    throw Error('RANGED_DECLARATION_OTHER_TRIGGER_OWNER_REQUIRED');
  }
  if (routes.some(route => route.requiresSiegeMode) && !templateRuntime) throw Error('RANGED_DECLARATION_TEMPLATE_CONSUMER_REQUIRED');
  const descriptor = seal({ runtimeId, runtimeVersion: version, actions: [actionType],
    ruleAtomIds: [...initial.officialRangedDeclarationPolicy.ruleAtomIds],
    sourceBundleHash: initial.officialReactionFamilySourceBundle.bundleHash,
    controllerSelectsDeclarationReaction: true, targetSelectedInSuccessor: true,
    ...(numeric ? { numericWeaponsSupported: true, explicitPaymentSelection: true } : {}),
    mutationAuthority: true, fullMatchCoverage: false, trainingTruth: false }, 'runtimeHash');

  function ownsUnit(state, piece) {
    if (numeric && routes.some(route => route.recordKey === piece?.officialUnitRecordKey && !route.requiresSiegeMode)) return true;
    return piece?.officialUnitRecordKey === 'army_units:siege_tank' && (piece.statuses || [])
      .some(status => (typeof status === 'string' ? status : status.statusName) === 'siege_mode')
      && routes.some(route => (piece.selectedUpgradeNames || []).includes(route.abilityName));
  }
  function attackKind(state, pieceId) {
    return routes.some(route => route.recordKey === state.pieces.find(piece => piece.id === pieceId)?.officialUnitRecordKey
      && !route.requiresSiegeMode) ? 'ranged' : 'template';
  }
  function openDeclaration(state, piece) {
    const route = routes.find(row => row.recordKey === piece.officialUnitRecordKey);
    if (!route) throw Error('RANGED_DECLARATION_UNIT_SOURCE_REQUIRED');
    const weaponName = route.requiresSiegeMode ? 'Shock Cannon' : route.weaponName;
    const profile = getOfficialAttackProfileV3(state.officialAttackProfileCatalogue,
      piece.officialUnitRecordKey + '::assault::' + weaponName);
    let next = clone(state);
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, piece.sideKey, piece.id, 'assault');
    const intent = { actionType, sideKey: piece.sideKey, pieceId: piece.id, phase: state.phase,
      round: Number(state.round), profileKey: profile.profileKey };
    return { state: next, profile, intent };
  }
  function openReaction(state, piece, choice) {
    const declaration = openDeclaration(state, piece);
    let next = declaration.state;
    const intent = { ...declaration.intent, reactionAbilityName: choice };
    const events = [{ type: 'ranged_attack_declared', ...intent, targetNotYetSelected: true, trainingTruth: false }];
    next.log ||= [];
    next.log.push({ round: Number(state.round), phase: state.phase, action: intent, events: clone(events) });
    const opened = reactionAdapter.openReactionWindow(next, { triggerKind: 'ranged_attack_declared',
      activeSideKey: piece.sideKey, phase: state.phase,
      activationId: resolveOfficialArmourRollActivationIdV1(next, piece.id), sourceActionHash: hash(intent),
      context: { attackerPieceId: piece.id, targetPieceId: piece.id, weaponProfileKey: declaration.profile.profileKey } });
    return { state: clone(opened.state), events: [...events, ...opened.events], opened, profile: declaration.profile };
  }
  function prepare(state, piece, choice, paymentCardInstanceIds = []) {
    const reaction = openReaction(state, piece, choice);
    let next = reaction.state;
    const { events, opened, profile } = reaction;
    const menu = reactionAdapter.legalSpace(next, { sideKey: piece.sideKey });
    const domain = menu.parameterDomains.find(row => choice === 'pass'
      ? row.actionType === 'pass_reaction_family_window'
      : row.abilityName === choice && row.sourceInstanceId === piece.id
        && isDeepStrictEqual(row.parameterSchema.paymentCardInstanceIds.const, paymentCardInstanceIds));
    if (!domain) throw Error('RANGED_DECLARATION_REACTION_UNAVAILABLE');
    const selected = reactionAdapter.preview(next, { domain,
      parameters: choice === 'pass' ? {} : { paymentCardInstanceIds } });
    const applied = reactionAdapter.apply(next, { action: selected.action });
    next = clone(applied.state); events.push(...applied.events);
    const opponent = reactionAdapter.legalSpace(next);
    if (opponent.parameterDomains.some(row => row.actionType !== 'pass_reaction_family_window')) {
      throw Error('RANGED_DECLARATION_EXTERNAL_CHOICE_REQUIRED');
    }
    const pass = opponent.parameterDomains.find(row => row.actionType === 'pass_reaction_family_window');
    if (!pass) throw Error('RANGED_DECLARATION_PRIORITY_CONTINUATION_REQUIRED');
    const closed = reactionAdapter.apply(next, { action: reactionAdapter.preview(next, { domain: pass, parameters: {} }).action });
    next = clone(closed.state); events.push(...closed.events);
    const consumed = reactionAdapter.consumeReactionWindow(next, { triggerHash: opened.events[0].triggerHash });
    next = clone(consumed.state);
    const resolution = next.officialReactionResolutionHistory.find(row => row.triggerHash === opened.events[0].triggerHash);
    next[parentKey] = seal({ schema: 'starcraft_tmg_ranged_declaration_checkpoint_v1',
      sideKey: piece.sideKey, pieceId: piece.id, round: Number(state.round), phase: state.phase,
      profileKey: profile.profileKey, sourceProfileHash: profile.profileHash,
      reactionAbilityName: choice, resolutionHash: resolution.resolutionHash,
      keywordEffects: clone(resolution.effects), trainingTruth: false }, 'parentHash');
    next.activeSideKey = piece.sideKey;
    return { state: next, events, parent: next[parentKey] };
  }
  function enumerate(state, options = {}) {
    readOfficialRangedDeclarationV1(state);
    const result = { candidates: [], parameterDomains: [] };
    if (state[parentKey] || state.phase !== 'assault') return result;
    const sideKey = options.sideKey || state.activeSideKey;
    if (sideKey !== state.activeSideKey) return result;
    for (const piece of state.pieces.filter(row => row.sideKey === sideKey && row.isOnField
      && !row.isDestroyed && !row.activatedPhases?.assault && ownsUnit(state, row))) {
      try { assertOfficialSelectedRosterCoreActionWindowV1(state, sideKey, piece.id, state.phase); }
      catch (error) { if (error.message.startsWith('SELECTED_ABILITY_CORE_ACTION_WINDOW_INVALID')) continue; throw error; }
      const choices = [];
      const available = numeric ? reactionAdapter.legalSpace(openReaction(state, piece, 'pass').state).parameterDomains
        .filter(row => row.actionType === 'pass_reaction_family_window' || row.sourceInstanceId === piece.id)
        .map(row => ({ reactionAbilityName: row.actionType === 'pass_reaction_family_window' ? 'pass' : row.abilityName,
          paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds?.const || [] }))
        : ['pass', ...routes.map(route => route.abilityName)].map(reactionAbilityName => ({ reactionAbilityName, paymentCardInstanceIds: [] }));
      for (const selection of available) {
        const choice = selection.reactionAbilityName;
        let projected;
        try { projected = prepare(state, piece, choice, selection.paymentCardInstanceIds); }
        catch (error) { if (error.message === 'RANGED_DECLARATION_REACTION_UNAVAILABLE') continue; throw error; }
        const kind = attackKind(state, piece.id);
        const delegate = kind === 'ranged' ? rangedRuntime : templateRuntime;
        const targets = delegate.enumerate(projected.state).parameterDomains.find(row => row.pieceId === piece.id);
        if (targets) {
          const evidence = kind === 'ranged' ? targets.constraints.targetPlans : targets.constraints.targets;
          if (evidence === undefined) throw Error('RANGED_DECLARATION_TARGET_CONTRACT_REQUIRED');
          choices.push({ reactionAbilityName: choice,
            ...(numeric ? { paymentCardInstanceIds: selection.paymentCardInstanceIds } : {}), targets: clone(evidence) });
        }
      }
      if (!choices.length) continue;
      result.parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_ranged_attack_declaration_v1', actionType, sideKey, phase: state.phase, pieceId: piece.id,
        executorId: runtimeId, executorVersion: version, ruleAtomIds: descriptor.ruleAtomIds,
        parameterSchema: { type: 'object', required: ['reactionAbilityName', ...(numeric ? ['paymentCardInstanceIds'] : [])],
          reactionAbilityName: { enum: [...new Set(choices.map(choice => choice.reactionAbilityName))] },
          ...(numeric ? { paymentCardInstanceIds: { enum: [...new Map(choices.map(choice =>
            [JSON.stringify(choice.paymentCardInstanceIds), choice.paymentCardInstanceIds])).values()] } } : {}) },
        constraints: { choices, targetSelectedInSuccessor: true, attackDiceRolledAtDeclaration: false,
          sourceOncePerGame: true, stateHash: hash(state) }, trainingTruth: false }, 'domainId'));
    }
    return result;
  }
  function instantiate(state, domain, parameters) {
    if (!parameters || Object.keys(parameters).some(name => !['reactionAbilityName', ...(numeric ? ['paymentCardInstanceIds'] : [])].includes(name))) {
      throw Error('RANGED_DECLARATION_SEMANTIC_CHOICE_REQUIRED');
    }
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)
      || !current.parameterSchema.reactionAbilityName.enum.includes(parameters.reactionAbilityName)
      || numeric && !current.constraints.choices.some(choice => choice.reactionAbilityName === parameters.reactionAbilityName
        && isDeepStrictEqual(choice.paymentCardInstanceIds, parameters.paymentCardInstanceIds))) {
      throw Error('RANGED_DECLARATION_DOMAIN_STALE_OR_CHOICE_INVALID');
    }
    return { canonicalParameters: clone(parameters), action: { actionType, sideKey: domain.sideKey,
      phase: state.phase, pieceId: domain.pieceId, executorId: runtimeId, executorVersion: version,
      ruleAtomIds: descriptor.ruleAtomIds, declarationPlan: { domainId: domain.domainId,
        stateHash: hash(state), canonicalParameters: clone(parameters) } } };
  }
  function apply(state, action) {
    const domain = enumerate(state, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.declarationPlan?.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(state, domain, action.declarationPlan.canonicalParameters).action, action)) {
      throw Error('RANGED_DECLARATION_ACTION_STALE');
    }
    const prepared = prepare(state, state.pieces.find(row => row.id === action.pieceId),
      action.declarationPlan.canonicalParameters.reactionAbilityName, action.declarationPlan.canonicalParameters.paymentCardInstanceIds);
    return { ok: true, state: prepared.state, action, events: prepared.events, trainingTruth: false };
  }
  function afterTransition(result) {
    const parent = readOfficialRangedDeclarationV1(result.state);
    if (!parent || !(result.events || []).some(event => event.pieceId === parent.pieceId
      && (event.type === 'ranged_weapon_completed' || numeric && event.type === 'ranged_attack'
        && event.stages?.declaration?.profileKey === parent.profileKey))) return result;
    const state = clone(result.state); delete state[parentKey];
    return { ...result, state, events: [...result.events, { type: 'ranged_declaration_completed',
      pieceId: parent.pieceId, declarationHash: parent.parentHash, trainingTruth: false }] };
  }
  return Object.freeze({ descriptor, enumerate, instantiate, apply, afterTransition,
    ownsUnit, attackKind, pending: readOfficialRangedDeclarationV1 });
}
