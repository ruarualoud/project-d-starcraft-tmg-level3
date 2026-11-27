import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialRangedFamilySourceBundleV1 } from './official-ranged-family-adapter-v1.mjs';
import { verifyOfficialMeleeFamilySourceBundleV1 } from './official-melee-family-adapter-v1.mjs';
import { readOfficialRangedCasualtyContextV1 } from './official-ranged-casualty-context-v1.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND, OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE }
  from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { currentOfficialSelectedRosterRangedSequenceV1 } from './official-ranged-sequence-state-v1.mjs';

import { OFFICIAL_SELECTED_ROSTER_MELEE_CASUALTY_PARAMETER_KIND, OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA }
  from './official-selected-roster-melee-action-runtime-v1.mjs';

const adapterId = 'official-roster-weapon-component-adapter-v1';
const fail = code => { throw Error(code); };

// Register real selected weapon definitions with the same IR router used by
// abilities. Weapon mechanics remain owned by their existing
// runtimes, including their exact action reconstruction and pending windows.
export function createOfficialRosterWeaponComponentAdapterV1({
  bundle, meleeBundle, delegates, includeRangedContinuations = false, includeMeleeContinuations = false,
  includeTemplateContinuations = false,
}) {
  if (!bundle && !meleeBundle) fail('WEAPON_COMPONENT_SOURCE_REQUIRED');
  if (bundle) verifyOfficialRangedFamilySourceBundleV1(bundle);
  if (meleeBundle) {
    verifyOfficialMeleeFamilySourceBundleV1(meleeBundle);
    if (meleeBundle.routes.some(route => route.effectKind !== 'weapon' || route.phase !== 'combat')) {
      fail('WEAPON_COMPONENT_MELEE_WEAPON_DEFINITIONS_REQUIRED');
    }
  }
  const routes = [...(bundle?.routes || []), ...(meleeBundle?.routes || [])];
  if (routes.some(route => !['weapon', 'template_weapon'].includes(route.effectKind))) {
    fail('WEAPON_COMPONENT_WEAPON_DEFINITIONS_REQUIRED');
  }
  if (new Set(routes.map(route => route.profileKey)).size !== routes.length
    || new Set(routes.map(route => route.sourceFeatureHash)).size !== routes.length) fail('WEAPON_COMPONENT_DUPLICATE_SOURCE');
  if (includeTemplateContinuations && !delegates.template?.pendingAttack) fail('WEAPON_COMPONENT_TEMPLATE_OWNER_REQUIRED');
  const adapterVersion = includeTemplateContinuations ? '1.5.0' : includeMeleeContinuations ? '1.4.0'
    : includeRangedContinuations ? '1.3.0' : meleeBundle ? '1.1.0' : '1.0.0';
  const sourceBundleHash = bundle && meleeBundle
    ? hash({ rangedBundleHash: bundle.bundleHash, meleeBundleHash: meleeBundle.bundleHash })
    : (bundle || meleeBundle).bundleHash;
  function kindFor(route) {
    return route.phase === 'combat' ? 'melee' : route.effectKind === 'template_weapon' ? 'template' : 'ranged';
  }
  for (const route of routes) {
    const delegate = delegates[kindFor(route)];
    const registered = delegate?.supportsProfile ? delegate.supportsProfile(route.profileKey)
      : delegate?.descriptor.routes.some(row => row.profileKey === route.profileKey);
    if (!registered) fail('WEAPON_COMPONENT_EXECUTABLE_ROUTE_REQUIRED');
  }
  function templateParent(state) {
    return includeTemplateContinuations && state ? delegates.template.pendingAttack(state) : null;
  }
  function boundTemplateRoute(state, parentHash) {
    const parent = templateParent(state);
    if (!parent || parent.parentHash !== parentHash) return null;
    return routes.find(route => route.profileKey === parent.profileKey
      && route.sourceProfileHash === parent.sourceProfileHash && kindFor(route) === 'template') || null;
  }
  function routeFor(action, state) {
    if (includeTemplateContinuations && action?.executorId === delegates.template.descriptor.runtimeId
      && ['resolve_blast_template_batch', 'choose_blast_template_casualties'].includes(action.actionType)) {
      return boundTemplateRoute(state, action.parentHash);
    }
    if (includeRangedContinuations && action?.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE) {
      return routeForRangedFinish(state, action);
    }
    if (action?.resolutionStage === 'defender_casualty_selection') {
      if (includeMeleeContinuations && action.executorId === delegates.melee?.descriptor.runtimeId) {
        return routeForMeleeCasualty(state, action.pendingHash);
      }
      if (includeRangedContinuations) return routeForRangedCasualty(state, action.pendingHash);
    }
    let source = action;
    while (source && !source.rangedPlan && !source.meleePlan) source = source.attackAction || source.sourceAction;
    const plan = source?.rangedPlan || source?.meleePlan;
    if (!plan) return null;
    const route = routes.find(row => row.profileKey === plan.profileKey);
    if (route && plan.sourceProfileHash !== route.sourceProfileHash) {
      fail('WEAPON_COMPONENT_SOURCE_PROFILE_DRIFT');
    }
    return route || null;
  }
  function routeForRangedFinish(state, action) {
    if (!state) return null;
    const sequence = currentOfficialSelectedRosterRangedSequenceV1(state);
    if (!sequence || sequence.sequenceHash !== action.sequenceHash
      || sequence.sideKey !== action.sideKey || sequence.pieceId !== action.pieceId) return null;
    const lastProfileKey = sequence.completedBatches.at(-1)?.profileKey;
    return routes.find(route => route.profileKey === lastProfileKey && kindFor(route) === 'ranged') || null;
  }
  function routeForRangedCasualty(state, pendingHash) {
    if (!state) return null;
    const pending = readOfficialRangedCasualtyContextV1(state);
    if (!pending || pending.pendingHash !== pendingHash) return null;
    const route = routeFor(pending.attackAction);
    return route && kindFor(route) === 'ranged' ? route : null;
  }
  function routeForMeleeCasualty(state, pendingHash) {
    const pending = state?.pendingAction;
    if (pending?.schema !== OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA
      || pending.stage !== 'defender_casualty_selection' || pending.pendingHash !== pendingHash) return null;
    const route = routeFor(pending.attackAction);
    return route && kindFor(route) === 'melee' ? route : null;
  }
  function bindingFor(action, state) {
    const route = routeFor(action, state);
    return route ? bindingForProfile(route.profileKey) : null;
  }
  function bindingForProfile(profileKey) {
    const route = routes.find(row => row.profileKey === profileKey);
    return route ? { sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
      weaponSourceRouteHash: route.routeHash } : null;
  }
  function routeForDomain(domain, state) {
    if (includeTemplateContinuations && domain.actionType === 'choose_blast_template_casualties') {
      return boundTemplateRoute(state, domain.constraints?.pendingHash);
    }
    if (includeRangedContinuations && domain.parameterKind === OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND) {
      return routeForRangedCasualty(state, domain.constraints?.pendingHash);
    }
    if (includeMeleeContinuations && domain.parameterKind === OFFICIAL_SELECTED_ROSTER_MELEE_CASUALTY_PARAMETER_KIND) {
      return routeForMeleeCasualty(state, domain.constraints?.pendingHash);
    }
    if (domain.profileKey) return routes.find(route => route.profileKey === domain.profileKey) || null;
    // Existing template domains identify the actor and weapon. The template
    // executor owns the profile mapping, so callers need not supply another id.
    const registered = delegates.template?.descriptor.routes.find(row => row.pieceId === domain.pieceId
      && row.weaponName === domain.weaponName);
    return registered ? routes.find(route => route.profileKey === registered.profileKey) || null : null;
  }
  function bindingForDomain(domain, state) {
    const route = routeForDomain(domain, state);
    return route ? bindingForProfile(route.profileKey) : null;
  }
  const definitionBindings = routes.map(route => ({ sourceFeatureHash: route.sourceFeatureHash,
    adapterId, adapterVersion, capability: 'authoritative_action' }));
  const descriptor = Object.freeze({ adapterId, adapterVersion, adapterKind: 'exact_runtime',
    coveredDefinitionCount: routes.length, coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash).sort(),
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'],
    sourceBundleHash, rulesAuthority: true, trainingTruth: false });
  function legalSpace(state, options = {}) {
    const candidates = [];
    const parameterDomains = [];
    const kinds = templateParent(state) ? ['template'] : ['ranged', 'template', 'melee'];
    for (const kind of kinds) {
      const owned = routes.filter(route => kindFor(route) === kind);
      if (!owned.length) continue;
      const result = delegates[kind].enumerate(state, options);
      parameterDomains.push(...result.parameterDomains.filter(domain => owned.includes(routeForDomain(domain, state))));
      if (includeTemplateContinuations && kind === 'template') {
        candidates.push(...result.candidates.filter(candidate => candidate.isEnabled
          && owned.includes(routeFor(candidate, state))));
      }
      if (includeRangedContinuations && kind === 'ranged') {
        candidates.push(...result.candidates.filter(candidate => candidate.isEnabled
          && candidate.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE
          && routeForRangedFinish(state, candidate)));
      }
    }
    return { candidates, parameterDomains, trainingTruth: false };
  }
  function preview(state, request) {
    if (includeTemplateContinuations && request.action?.actionType === 'resolve_blast_template_batch') {
      const legal = legalSpace(state, { sideKey: request.action.sideKey }).candidates.map(candidate => (
        Object.fromEntries(Object.entries(candidate).filter(([key]) => !['isEnabled', 'disabledReason', 'score'].includes(key)))
      ));
      const action = legal.find(candidate => isDeepStrictEqual(candidate, request.action));
      if (!action) fail('WEAPON_COMPONENT_TEMPLATE_BATCH_STALE');
      return { action, trainingTruth: false };
    }
    if (includeRangedContinuations && request.action?.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE) {
      if (!routeForRangedFinish(state, request.action)) fail('WEAPON_COMPONENT_ACTION_UNBOUND');
      return delegates.ranged.previewFinish(state, request.action);
    }
    const domain = legalSpace(state, { sideKey: request.domain.sideKey }).parameterDomains
      .find(row => row.domainId === request.domain.domainId);
    if (!domain || !isDeepStrictEqual(domain, request.domain)) fail('WEAPON_COMPONENT_DOMAIN_STALE');
    const route = routeForDomain(domain, state);
    const result = delegates[kindFor(route)].instantiate(state, domain, request.parameters);
    if (!bindingFor(result.action, state)) fail('WEAPON_COMPONENT_INSTANTIATION_UNBOUND');
    return result;
  }
  function apply(state, request) {
    const route = routeFor(request.action, state);
    if (!route || (templateParent(state) && kindFor(route) !== 'template')) fail('WEAPON_COMPONENT_ACTION_UNBOUND');
    return delegates[kindFor(route)].apply(state, request.action, request.options || {});
  }
  function query(state, request) {
    if (!request || Object.keys(request).some(key => !['pieceId', 'weaponName', 'parameters'].includes(key))) {
      fail('WEAPON_COMPONENT_QUERY_INVALID');
    }
    const domain = legalSpace(state).parameterDomains.find(row => row.pieceId === request.pieceId
      && row.weaponName === request.weaponName);
    if (!domain) fail('WEAPON_COMPONENT_QUERY_UNAVAILABLE');
    const body = { schemaVersion: 'starcraft_tmg_weapon_component_preview_v1',
      result: preview(state, { domain, parameters: request.parameters }),
      stateHash: hash(state), mutationAuthority: false, trainingTruth: false };
    return { ...body, queryReceiptHash: hash(body) };
  }
  return Object.freeze({ descriptor, definitionBindings, bindingFor, bindingForDomain, legalSpace, preview, apply, query });
}
