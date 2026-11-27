import {projectOfficialDeploymentSupplyV1} from '../rule-atoms/official-deployment-supply-projection-v1.mjs';
import { bindGrantedWeapon, matchesGrantedWeapon, usesWave3FaqClarifications } from '../rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { listOfficialPhaseActivationUnitIdsV1 } from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { applyOfficialSelectedRosterAbilityActionV1, enumerateOfficialSelectedRosterAbilityActionsV1,
  instantiateOfficialSelectedRosterAbilityActionV1 } from './official-selected-roster-ability-runtime-v1.mjs';
import {
  applyOfficialNonEntryEdgeDeployPlanV1,
  describeOfficialNonEntryEdgeDeployV1,
  planOfficialNonEntryEdgeDeployV1,
} from "./official-relocation-family-adapter-v1.mjs";

export const OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID =
  "official-protoss-unique-family-adapter-v1";
export const OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_PROTOSS_UNIQUE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_protoss_unique_family_source_bundle_v1";
export const OFFICIAL_PROTOSS_UNIQUE_FAMILY_PARAMETER_KIND =
  "official_protoss_unique_family_plan_v1";
export const OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID = 'card:khalai/bound-by-the-khala-any@1';
const khalaiBundleSchema = 'starcraft_tmg_official_khalai_activation_source_bundle_v2';
const khalaiActivationText = 'Bound by the Khala <Active> <Movement Phase>: At the end of the active Unit’s Activation, select one other Friendly Unit eligible to Activate in the current Phase. Immediately Activate that Unit.';

const ACTIVE_PHASES = new Set(["movement", "assault", "combat"]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  commander_supply_bonus: 1,
  first_weapon_instant_active: 1,
  immediate_friendly_activation_chain: 1,
  non_entry_edge_ground_deploy: 1,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function activePiece(piece) {
  return livePiece(piece) && piece?.isOnField === true;
}
function isGround(piece) {
  const tags = new Set([piece?.combatTag, ...(piece?.combatTags || [])]
    .map(normalized).filter(Boolean));
  return tags.has("ground") && !tags.has("flying") && piece?.isStructure !== true;
}
function fieldedFeature(piece, route) {
  const selected = new Set((piece?.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece?.equipment || []).map((entry) => normalized(
    entry.equipmentName || entry.name)).filter(Boolean));
  const cost = piece?.compositionKind === "large"
    ? Number(route.costByComposition?.large || 0)
    : Number(route.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route.abilityName))
    || equipment.has(normalized(route.abilityName));
}
function routeBase(definition, spec) {
  return {
    schema: spec.effectKind === "commander_supply_bonus"
      ? "starcraft_tmg_official_contextual_supply_route_v1"
      : "starcraft_tmg_official_protoss_unique_route_v1",
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    definitionId: definition.definitionId,
    sourceFeatureHash: definition.sourceFeatureHash,
    recordKey: definition.recordKey,
    sourceKind: definition.sourceKind,
    sourceProductKind: definition.sourceProductKind,
    sourceName: definition.sourceName,
    abilityName: definition.definitionName,
    activationKind: definition.activationKind,
    runtimeRole: definition.runtimeRole,
    phase: definition.phase,
    timingHooks: [...definition.timingHooks],
    activationText: definition.activationText,
    costByComposition: definition.costByComposition
      ? { ...definition.costByComposition } : null,
    sourceText: definition.sourceText,
    ...spec,
    exactSourcePatternCompiled: true,
    arbitraryProseExecutionClaimed: false,
    trainingTruth: false,
  };
}
function compileRoute(definition) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  let spec = null;
  if (name === "Ancient Pride" && definition.recordKey === "tactical_cards:nexus"
    && /active Unit.+first Weapon used gains INSTANT/isu.test(text)) {
    spec = { effectKind: "first_weapon_instant_active",
      allowedPhases: [...ACTIVE_PHASES], targetKind: "active_unit",
      weaponScope: "any", keyword: "INSTANT", remainingUses: 1,
      effectExpiresAt: "round_end", sourceCardExhausts: true };
  } else if (name === "Commander" && definition.recordKey === "army_units:artanis"
    && /Supply characteristic as increased by 1.+Controlling and Contesting Mission Markers.+completing objectives.+Disengage/isu.test(text)) {
    spec = { effectKind: "commander_supply_bonus",
      contexts: ["mission_marker_control", "objective_completion", "disengage_check"],
      modifier: 1 };
  } else if (name === "Warp In" && definition.recordKey === "tactical_cards:warp_gate"
    && /active Ground Unit Deploys from any table edge.+not a player.+Entry Edge.+more than 10.+Enemy model.+another Friendly Ground Unit has already Deployed this Round/isu.test(text)) {
    spec = { effectKind: "non_entry_edge_ground_deploy",
      allowedPhases: ["movement"], targetKind: "active_reserve_ground_unit",
      minimumEnemyGapMilliInchesExclusive: 10000,
      onlyFriendlyGroundDeployThisRound: true, sourceCardExhausts: true };
  } else if (name === "Bound by the Khala"
    && definition.recordKey === "tactical_cards:khalai"
    && /end of the active Unit.+Activation.+select one other Friendly Unit eligible to Activate.+Immediately Activate that Unit/isu.test(text)) {
    spec = { effectKind: "immediate_friendly_activation_chain",
      allowedPhases: ["movement"], targetKind: "another_eligible_friendly_unit",
      requiredWindowStage: "after_action", sourceCardExhausts: true };
  }
  if (!spec) fail("PROTOSS_UNIQUE_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialProtossUniqueFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("PROTOSS_UNIQUE_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const definitions = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 242 && pending.has(entry.definitionId)))
    .map((entry) => catalogue.definitions.find((candidate) => (
      candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 4 || definitions.some((entry) => !entry)) {
    fail("PROTOSS_UNIQUE_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_PROTOSS_UNIQUE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length, archetypeCounts, routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true, exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false, sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_protoss_unique_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  return bundle;
}

function isCurrentKhalaiActivationSource(row) {
  return row?.definitionId === OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID
    && row.recordKey === 'tactical_cards:khalai' && row.sourceKind === 'card_feature'
    && row.activationKind === 'active' && row.phase === 'movement' && row.sourceText === khalaiActivationText;
}

export const ARTANIS_COMMANDER_ID = 'unit:artanis/commander-any-phase@1';
function isCurrentArtanisCommander(row) {
  return row?.definitionId === ARTANIS_COMMANDER_ID && row.recordKey === 'army_units:artanis'
    && row.phase === 'any' && row.activationKind === 'passive' && row.sourceKind === 'unit_feature'
    && row.sourceText === "Treat this Unit’s Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks.";
}

const protossSupportCardText = Object.freeze({
  "card:nexus/ancient-pride-any@1": "Ancient Pride <Active> <Any Phase>: The active Unit’s first Weapon used gains INSTANT.",
  "card:warp_gate/warp-in-any@1": "Warp In <Active> <Movement Phase>: The active Ground Unit Deploys from any table edge that is not a player’s Entry Edge. This deployment must end more than 10\" away from any Enemy model. The controlling player cannot use this ability if another Friendly Ground Unit has already Deployed this Round.",
});
function isSelectedProtossSource(row) {
  if (isCurrentArtanisCommander(row) || isCurrentKhalaiActivationSource(row)) return true;
  return Boolean(row && Object.hasOwn(protossSupportCardText,row.definitionId)
    && row.recordKey === 'tactical_cards:'+row.definitionId.slice(5).split('/')[0]
    && row.sourceKind==='card_feature' && row.activationKind==='active'
    && row.phase===(row.recordKey==='tactical_cards:nexus'?'any':'movement') && row.sourceText===protossSupportCardText[row.definitionId]);
}

// Preserve the original single-card bundle on historical openings.
export function createOfficialArtanisCommanderBundleV2(catalogue, withFactionCard) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const ids = withFactionCard ? [ARTANIS_COMMANDER_ID, OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID].sort() : [ARTANIS_COMMANDER_ID];
  return createSelectedProtossBundle(catalogue, ids, '2.1.0');
}
export function createOfficialProtossSupportBundleV2(catalogue, definitionIds) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  if (!definitionIds.some(id=>Object.hasOwn(protossSupportCardText,id))) fail('PROTOSS_SUPPORT_CARD_REQUIRED');
  return createSelectedProtossBundle(catalogue, [...definitionIds].sort(), '2.2.0');
}
function createSelectedProtossBundle(catalogue, ids, semanticVersion) {
  const routes = ids.map(id => {
    const def = catalogue.definitions.find(row => row.definitionId === id);
    if (!isSelectedProtossSource(def)) fail('PROTOSS_COMMANDER_SOURCE_MISMATCH', id);
    return compileRoute(def);
  });
  const bundle = seal({schema:khalaiBundleSchema,semanticVersion,sourceCatalogueHash:catalogue.catalogueHash,
    sourceSnapshotHash:catalogue.sourceSnapshotHash,normalizedDatasetHash:catalogue.normalizedDatasetHash,dataVersions:clone(catalogue.dataVersions),
    routes,routeCount:routes.length,definitionIds:ids,coveredSourceFeatureHashes:routes.map(r=>r.sourceFeatureHash),
    archetypeCounts:Object.fromEntries(routes.map(r=>[r.effectKind,1])),trainingTruth:false},'bundleHash');
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  return bundle;
}

export function createOfficialKhalaiActivationSourceBundleV2(catalogue) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definition = catalogue.definitions.find(isCurrentKhalaiActivationSource);
  if (!definition) fail('PROTOSS_KHALAI_ACTIVATION_SOURCE_UNSUPPORTED');
  const route = compileRoute(definition);
  const bundle = seal({ schema: khalaiBundleSchema, semanticVersion: '2.0.0',
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
    routes: [route], routeCount: 1, definitionIds: [route.definitionId],
    coveredSourceFeatureHashes: [route.sourceFeatureHash],
    archetypeCounts: { immediate_friendly_activation_chain: 1 }, trainingTruth: false }, 'bundleHash');
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialProtossUniqueFamilySourceBundleV1(bundle) {
  if (bundle?.schema === khalaiBundleSchema && ['2.1.0','2.2.0'].includes(bundle.semanticVersion)) {
    const routes=bundle.routes;
    const additionalCards = bundle.semanticVersion === '2.2.0';
    if (!Array.isArray(routes) || !(additionalCards ? routes.some(r=>Object.hasOwn(protossSupportCardText,r.definitionId)) : routes.some(isCurrentArtanisCommander))
      || routes.length>(additionalCards?4:2) || routes.length!==bundle.routeCount
      || routes.some(r=>!(additionalCards ? isSelectedProtossSource(r) : isCurrentArtanisCommander(r)||isCurrentKhalaiActivationSource(r))
        || !isDeepStrictEqual(compileRoute({...r, definitionName:r.abilityName}),r))
      || new Set(routes.map(r=>r.definitionId)).size!==routes.length
      || !isDeepStrictEqual(routes.map(r=>r.definitionId),bundle.definitionIds)
      || !isDeepStrictEqual(routes.map(r=>r.sourceFeatureHash),bundle.coveredSourceFeatureHashes)
      || !isDeepStrictEqual(Object.fromEntries(routes.map(r=>[r.effectKind,1])),bundle.archetypeCounts)
      || bundle.trainingTruth!==false || bundle.bundleHash!==hashStarcraftTmgContract(without(bundle,['bundleHash']))) fail('PROTOSS_COMMANDER_BUNDLE_INVALID');
    return true;
  }
  if (bundle?.schema === khalaiBundleSchema) {
    const route = bundle.routes?.[0];
    if (bundle.semanticVersion !== '2.0.0' || bundle.routeCount !== 1 || bundle.routes?.length !== 1
      || !isCurrentKhalaiActivationSource(route) || !isDeepStrictEqual(compileRoute({ ...route, definitionName: route.abilityName }), route)
      || !isDeepStrictEqual(bundle.definitionIds, [route.definitionId])
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, [route.sourceFeatureHash])
      || !isDeepStrictEqual(bundle.archetypeCounts, { immediate_friendly_activation_chain: 1 })
      || bundle.trainingTruth !== false || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) {
      fail('PROTOSS_KHALAI_ACTIVATION_SOURCE_INVALID');
    }
    return true;
  }
  if (!object(bundle) || bundle.schema !== OFFICIAL_PROTOSS_UNIQUE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 4 || bundle.routes?.length !== 4
    || new Set(bundle.definitionIds || []).size !== 4
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 4
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 4
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("PROTOSS_UNIQUE_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialProtossUniqueFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    capability: route.effectKind === "commander_supply_bonus"
      ? "automatic_consumer" : "authoritative_action",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function routeFor(bundle, effectKind) {
  const route = bundle.routes.find((entry) => entry.effectKind === effectKind);
  if (!route) fail("PROTOSS_UNIQUE_ROUTE_MISSING", effectKind);
  return route;
}
function cardInstances(state, route) {
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey
      && card.readiness === "ready").map((card) => ({ sideKey, card }))));
}
function usedThisRound(state, route, pieceId) {
  return (state.protossUniqueUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.definitionId === route.definitionId
      && entry.pieceId === pieceId));
}
function windowActor(state, sideKey) {
  const window = state.selectedRosterActivationWindow;
  if (!window || window.sideKey !== sideKey || window.phase !== state.phase) return null;
  return state.pieces?.find((entry) => entry.id === window.pieceId) || null;
}
function activeTimingAvailable(state, route, sideKey, actor) {
  if (!ACTIVE_PHASES.has(state.phase) || !route.allowedPhases.includes(state.phase)
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.[state.phase] === true
    || !activePiece(actor) || actor.sideKey !== sideKey) return false;
  const window = state.selectedRosterActivationWindow;
  if (!window || window.sideKey !== sideKey || window.pieceId !== actor.id
    || window.phase !== state.phase) return false;
  return !usedThisRound(state, route, actor.id);
}
function priorFriendlyGroundDeploy(state, sideKey, actorId) {
  const standard = (state.spatialActionHistory || []).some((entry) => {
    if (Number(entry.round) !== Number(state.round) || entry.actionType !== "deploy") return false;
    const piece = state.pieces.find((candidate) => candidate.id === entry.pieceId);
    return piece?.sideKey === sideKey && piece.id !== actorId && isGround(piece);
  });
  const special = (state.relocationAbilityHistory || []).some((entry) => {
    if (Number(entry.round) !== Number(state.round) || entry.sideKey !== sideKey
      || entry.pieceId === actorId || entry.deploymentResolved !== true) return false;
    return isGround(state.pieces.find((candidate) => candidate.id === entry.pieceId));
  });
  const protoss = (state.protossUniqueUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.sideKey === sideKey
      && entry.pieceId !== actorId && entry.deploymentResolved === true));
  return standard || special || protoss;
}
function actionDomain(state, route, sideKey, actor, card, targetIds = []) {
  const required = ["activeUnitId"];
  const schema = { type: "object", activeUnitId: { const: actor.id } };
  let geometryDescription = null;
  if (route.effectKind === "non_entry_edge_ground_deploy") {
    geometryDescription = describeOfficialNonEntryEdgeDeployV1({ state,
      pieceId: actor.id,
      minimumEnemyGapMilliInchesExclusive: route.minimumEnemyGapMilliInchesExclusive });
    required.push("leadingModelId", "placements", "edgeSide");
    schema.leadingModelId = { enum: geometryDescription.modelIds };
    schema.placements = { kind: "complete_model_placement_set",
      modelIds: geometryDescription.modelIds };
    schema.edgeSide = { enum: geometryDescription.edgeSides };
  } else if (route.effectKind === "immediate_friendly_activation_chain") {
    required.push("targetUnitId");
    schema.targetUnitId = { enum: clone(targetIds) };
  }
  schema.required = required;
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    parameterKind: OFFICIAL_PROTOSS_UNIQUE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_protoss_unique_ability", sideKey, phase: state.phase,
    pieceId: actor.id, sourceInstanceId: card.cardInstanceId,
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    abilityName: route.abilityName, effectKind: route.effectKind,
    parameterSchema: schema,
    constraints: { sourceRouteHash: route.routeHash,
      allowedPhases: clone(route.allowedPhases), targetIds: clone(targetIds),
      geometryDescriptionHash: geometryDescription?.descriptionHash || null,
      geometryDescription: geometryDescription ? clone(geometryDescription) : null,
      minimumEnemyGapMilliInchesExclusive:
        route.minimumEnemyGapMilliInchesExclusive || null,
      sourceCardMustExhaust: true },
    executorId: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_protoss_unique_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function khalaiFinishDomain(state, actor) {
  return enumerateOfficialSelectedRosterAbilityActionsV1(state, { sideKey: actor.sideKey }).parameterDomains.find(domain =>
    domain.actionType === 'finish_activation' && domain.pieceId === actor.id);
}

function domainsForRoute(state, route, currentKhalai) {
  if (route.effectKind === "commander_supply_bonus") return [];
  const domains = [];
  for (const { sideKey, card } of cardInstances(state, route)) {
    if (route.effectKind === "non_entry_edge_ground_deploy") {
      if (state.activeSideKey !== sideKey || state.phase !== "movement"
        || state.players?.[sideKey]?.passedPhases?.movement === true) continue;
      for (const actor of state.pieces || []) {
        if (actor.sideKey !== sideKey || !livePiece(actor) || actor.isOnField === true
          || actor.isInReserves !== true || actor.activatedPhases?.movement === true
          || !isGround(actor) || priorFriendlyGroundDeploy(state, sideKey, actor.id)) continue;
        if (!projectOfficialDeploymentSupplyV1(state, sideKey, actor.id).poolRequirementSatisfied) continue;
        domains.push(actionDomain(state, route, sideKey, actor, card));
      }
      continue;
    }
    const actor = windowActor(state, sideKey);
    if (!activeTimingAvailable(state, route, sideKey, actor)) continue;
    if (route.effectKind === "immediate_friendly_activation_chain") {
      const window = state.selectedRosterActivationWindow;
      if (state.phase !== "movement" || (currentKhalai ? !khalaiFinishDomain(state, actor) : window.stage !== route.requiredWindowStage)) continue;
      const targets = currentKhalai
        ? listOfficialPhaseActivationUnitIdsV1(state, sideKey).filter(id =>
          id !== actor.id && state.pieces.find(target => target.id === id).isStructure !== true)
        : state.pieces.filter((target) => target.id !== actor.id
          && target.sideKey === sideKey && activePiece(target)
          && target.isStructure !== true && target.activatedPhases?.movement !== true)
          .map((entry) => entry.id).sort();
      if (targets.length > 0) domains.push(actionDomain(
        state, route, sideKey, actor, card, targets));
    } else {
      domains.push(actionDomain(state, route, sideKey, actor, card));
    }
  }
  return domains;
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  const domains = bundle.routes.flatMap((route) => domainsForRoute(state, route, bundle.schema === khalaiBundleSchema))
    .filter((entry) => !sideKey || entry.sideKey === sideKey)
    .sort((left, right) => left.domainId.localeCompare(right.domainId));
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_protoss_unique_legal_space_v1",
    runtimeId: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: domains, diagnostics: [],
    rulesAuthority: true, trainingTruth: false,
  });
}
function canonicalParameters(domain, parameters) {
  if (!object(parameters)) fail("PROTOSS_UNIQUE_PARAMETERS_INVALID");
  const required = domain.parameterSchema.required;
  if (required.some((key) => parameters[key] === undefined)
    || Object.keys(parameters).some((key) => !required.includes(key))
    || parameters.activeUnitId !== domain.pieceId) {
    fail("PROTOSS_UNIQUE_PARAMETERS_INVALID");
  }
  if (domain.effectKind === "immediate_friendly_activation_chain") {
    if (!domain.parameterSchema.targetUnitId.enum.includes(parameters.targetUnitId)) {
      fail("PROTOSS_UNIQUE_TARGET_INVALID", String(parameters.targetUnitId || ""));
    }
    return { activeUnitId: domain.pieceId, targetUnitId: parameters.targetUnitId };
  }
  if (domain.effectKind === "non_entry_edge_ground_deploy") {
    return { activeUnitId: domain.pieceId,
      leadingModelId: parameters.leadingModelId,
      placements: clone(parameters.placements), edgeSide: parameters.edgeSide };
  }
  return { activeUnitId: domain.pieceId };
}
function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) fail("PROTOSS_UNIQUE_DOMAIN_STALE");
  const canonical = canonicalParameters(domain, parameters);
  let geometryPlan = null;
  if (domain.effectKind === "non_entry_edge_ground_deploy") {
    geometryPlan = planOfficialNonEntryEdgeDeployV1({ state, pieceId: domain.pieceId,
      sourceDefinitionId: domain.definitionId,
      minimumEnemyGapMilliInchesExclusive:
        domain.constraints.minimumEnemyGapMilliInchesExclusive,
      parameters: { leadingModelId: canonical.leadingModelId,
        placements: canonical.placements, edgeSide: canonical.edgeSide } }).geometryPlan;
  }
  const plan = seal({ schema: "starcraft_tmg_official_protoss_unique_plan_v1",
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    domainId: domain.domainId, definitionId: domain.definitionId,
    sourceFeatureHash: domain.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId, sideKey: domain.sideKey,
    pieceId: domain.pieceId, effectKind: domain.effectKind,
    canonicalParameters: canonical, geometryPlan,
    sourceRouteHash: domain.constraints.sourceRouteHash,
    rulesTruth: "official_current_product_protoss_unique_plan",
    trainingTruth: false }, "planHash");
  const action = freezeDeep({ actionType: domain.actionType, sideKey: domain.sideKey,
    phase: state.phase, pieceId: domain.pieceId,
    targetUnitId: canonical.targetUnitId || null,
    definitionId: domain.definitionId, abilityName: domain.abilityName,
    effectKind: domain.effectKind, protossUniquePlan: plan,
    executorId: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: canonical, action,
    rulesTruth: "official_current_product_protoss_unique_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const result = instantiate(bundle, state, request.domain, request.parameters || {});
  return seal({ schema: "starcraft_tmg_official_protoss_unique_preview_v1",
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    action: result.action, actionHash: hashStarcraftTmgContract(result.action),
    mutationApplied: false, rulesAuthority: true, trainingTruth: false }, "previewHash");
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === action?.protossUniquePlan?.domainId);
  if (!domain) fail("PROTOSS_UNIQUE_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.protossUniquePlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("PROTOSS_UNIQUE_ACTION_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  let state = clone(stateInput);
  let finishedEvents = [];
  if (bundle.schema === khalaiBundleSchema) {
    const source = state.pieces.find(piece => piece.id === action.pieceId);
    const finishDomain = khalaiFinishDomain(state, source);
    if (!finishDomain) fail('PROTOSS_KHALAI_ACTIVATION_END_UNAVAILABLE');
    const finish = instantiateOfficialSelectedRosterAbilityActionV1(state, finishDomain, {});
    const completed = applyOfficialSelectedRosterAbilityActionV1(state, finish.action, request.options);
    state = clone(completed.state);
    finishedEvents = completed.events;
  }
  if (route.effectKind === "non_entry_edge_ground_deploy") {
    state = clone(applyOfficialNonEntryEdgeDeployPlanV1({ state,
      geometryPlan: action.protossUniquePlan.geometryPlan }));
  }
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const card = (state.cardResources?.[action.sideKey] || []).find((entry) => (
    entry.cardInstanceId === action.protossUniquePlan.sourceInstanceId));
  if (!card || card.readiness !== "ready") fail("PROTOSS_UNIQUE_SOURCE_CARD_NOT_READY");
  card.readiness = "exhausted";
  const events = [...finishedEvents, { type: "tactical_card_exhausted",
    cardInstanceId: card.cardInstanceId, trainingTruth: false }];
  let effectHash = null;
  if (route.effectKind === "first_weapon_instant_active") {
    const effect = seal({ schema: "starcraft_tmg_official_first_weapon_instant_effect_v1",
      effectKind: "first_weapon_instant", sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash,
      sourceCardInstanceId: card.cardInstanceId, targetPieceId: actor.id,
      weaponScope: route.weaponScope, remainingUses: route.remainingUses,
      roundApplied: Number(state.round), expiresAt: route.effectExpiresAt,
      trainingTruth: false }, "effectHash");
    actor.officialAbilityEffects = actor.officialAbilityEffects || [];
    actor.officialAbilityEffects.push(effect);
    effectHash = effect.effectHash;
    events.push({ type: "first_weapon_instant_granted", pieceId: actor.id,
      effectHash, remainingUses: 1, expiresAt: "round_end", trainingTruth: false });
  } else if (route.effectKind === "non_entry_edge_ground_deploy") {
    actor.activatedPhases = { movement: false, assault: false, combat: false,
      ...(actor.activatedPhases || {}), movement: true };
    state.selectedRosterActivationWindow = {
      schema: "starcraft_tmg_selected_roster_activation_window_v1",
      round: Number(state.round), phase: "movement", sideKey: actor.sideKey,
      pieceId: actor.id, stage: "after_action", trainingTruth: false,
    };
    events.push({ type: "non_entry_edge_ground_deployed", pieceId: actor.id,
      geometryPlanHash: action.protossUniquePlan.geometryPlan.geometryPlanHash,
      minimumEnemyGapMilliInchesExclusive: 10000, trainingTruth: false });
  } else if (route.effectKind === "immediate_friendly_activation_chain") {
    const target = state.pieces.find((entry) => entry.id === action.targetUnitId);
    state.selectedRosterActivationWindow = {
      schema: "starcraft_tmg_selected_roster_activation_window_v1",
      round: Number(state.round), phase: "movement", sideKey: target.sideKey,
      pieceId: target.id, stage: "before_action", trainingTruth: false,
    };
    state.activeSideKey = target.sideKey;
    events.push({ type: "friendly_unit_immediately_activated",
      sourcePieceId: actor.id, targetPieceId: target.id, trainingTruth: false });
  }
  state.protossUniqueUseHistory = state.protossUniqueUseHistory || [];
  state.protossUniqueUseHistory.push({ round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey, pieceId: actor.id, targetPieceId: action.targetUnitId,
    definitionId: route.definitionId,
    sourceInstanceId: action.protossUniquePlan.sourceInstanceId,
    deploymentResolved: route.effectKind === "non_entry_edge_ground_deploy",
    effectHash, planHash: action.protossUniquePlan.planHash, trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_protoss_unique_transition_v1",
    runtimeId: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0), state,
    action: clone(action), events,
    rulesTruth: "official_current_product_protoss_unique_transition",
    trainingTruth: false });
}

export function projectOfficialProtossUniqueFamilyModifiersV1(bundle, state, request = {}) {
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  const piece = state.pieces?.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("PROTOSS_UNIQUE_PROJECTION_PIECE_UNKNOWN", String(request.pieceId || ""));
  const effects = (piece.officialAbilityEffects || []).filter((entry) => (
    entry.effectKind === "first_weapon_instant"));
  const route = effects.length ? routeFor(bundle, "first_weapon_instant_active") : null;
  if (effects.some((effect) => effect.schema
      !== "starcraft_tmg_official_first_weapon_instant_effect_v1"
    || effect.sourceDefinitionId !== route.definitionId
    || effect.sourceFeatureHash !== route.sourceFeatureHash
    || effect.targetPieceId !== piece.id || effect.weaponScope !== "any"
    || effect.expiresAt !== "round_end" || Number(effect.remainingUses) < 1
    || effect.trainingTruth !== false
    || effect.effectHash !== hashStarcraftTmgContract(without(effect, ["effectHash"])))) {
    fail("PROTOSS_UNIQUE_PROJECTION_EFFECT_INVALID", piece.id);
  }
  const active = effects.filter(effect => Number(effect.roundApplied) === Number(state.round)
    && matchesGrantedWeapon(effect, request.weaponName, state.round));
  const weaponContext = request.attackKind === "ranged"
    || request.attackKind === "close_combat";
  const body = { schema: "starcraft_tmg_official_protoss_unique_projection_v1",
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    pieceId: piece.id, attackKind: request.attackKind || null,
    weaponName: request.weaponName || null,
    firstWeaponInstant: activePiece(piece) && weaponContext && active.length > 0,
    sourceDefinitionIds: active.map((entry) => entry.sourceDefinitionId).sort(),
    effectHashes: active.map((entry) => entry.effectHash).sort(),
    rulesTruth: "official_current_product_protoss_unique_projection",
    trainingTruth: false };
  return freezeDeep({ ...body, projectionHash: hashStarcraftTmgContract(body) });
}

export function consumeOfficialProtossUniqueFirstWeaponEffectV1(state, pieceId, weaponName) {
  const piece = state?.pieces?.find((entry) => entry.id === pieceId);
  if (!piece) fail("PROTOSS_UNIQUE_CONSUMER_PIECE_UNKNOWN", String(pieceId || ""));
  const bundle = state.officialProtossUniqueFamilySourceBundle;
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  if (!bundle.routes.some(entry => entry.effectKind === "first_weapon_instant_active")
    && !(piece.officialAbilityEffects || []).some(entry => entry.effectKind === "first_weapon_instant")) return freezeDeep([]);
  const route = routeFor(bundle, "first_weapon_instant_active");
  const consumed = [];
  piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((entry) => {
    if (entry.effectKind !== "first_weapon_instant"
      || entry.sourceDefinitionId !== route.definitionId
      || entry.sourceFeatureHash !== route.sourceFeatureHash
      || Number(entry.roundApplied) !== Number(state.round)
      || entry.boundWeaponName || Number(entry.remainingUses) < 1) {
      return true;
    }
    consumed.push({ effectHash: entry.effectHash,
      sourceDefinitionId: entry.sourceDefinitionId });
    if (usesWave3FaqClarifications(state)) {
      Object.assign(entry, bindGrantedWeapon(entry, weaponName, state.round));
      return true;
    }
    return false;
  });
  return freezeDeep(consumed.sort((left, right) => left.effectHash.localeCompare(
    right.effectHash)));
}

function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  let result;
  if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "protoss_unique_projection") {
    result = projectOfficialProtossUniqueFamilyModifiersV1(bundle, state, request);
  } else if (queryKind === "contextual_supply_projection") {
    result = projectOfficialContextualSupplyValueV1({ state,
      pieceId: request.pieceId, context: request.context });
  } else if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey }).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("PROTOSS_UNIQUE_QUERY_DOMAIN_STALE");
    const value = preview(bundle, state, { domain, parameters: request.parameters || {} });
    result = { preview: value, action: value.action };
  } else fail("PROTOSS_UNIQUE_QUERY_KIND_UNSUPPORTED", queryKind);
  return seal({ schema: "starcraft_tmg_official_protoss_unique_query_v1",
    semanticVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact", result,
    source: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialProtossUniqueFamilyAdapterV1(bundle) {
  verifyOfficialProtossUniqueFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_PROTOSS_UNIQUE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime", coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "replay"],
    archetypeCounts: { ...bundle.archetypeCounts }, sourceBundleHash: bundle.bundleHash,
    nonEntryEdgeGeometrySeamReused: true,
    contextualSupplyConsumerProjectionBound: true,
    firstWeaponInstantConsumerProjectionBound: true,
    activationChainWindowBound: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true, trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
  });
}
