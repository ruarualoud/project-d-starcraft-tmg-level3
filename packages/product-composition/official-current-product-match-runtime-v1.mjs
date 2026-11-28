import {inspectOfficialCreatedTokensV1} from '../rule-atoms/official-created-token-disposition-v1.mjs';
import {settleOfficialCreatedTokensV1} from './official-created-token-settlement-v1.mjs';
import {inspectOfficialAttachedEffectLossV1,settleOfficialAttachedEffectLossV1} from './official-attached-effect-loss-v1.mjs';
import {cleanupOfficialPsionicStormTokensV1} from './official-psionic-storm-cast-runtime-v1.mjs';
import { OFFICIAL_VENTRAL_SACS_DEFINITION_ID, OFFICIAL_WARP_PRISM_WARP_CONDUIT_DEFINITION_ID,
  OFFICIAL_DROPSHIP_DUST_OFF_DEFINITION_ID,
  consumeOfficialBattlefieldAssetMovementLifecycleV1 }
  from './official-battlefield-asset-family-adapter-v1.mjs';
import { OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID, OFFICIAL_DEFILER_TUNNEL_NETWORK_ID } from './official-unit-lifecycle-family-adapter-v1.mjs';
import { OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID } from './official-protoss-unique-family-adapter-v1.mjs';
import { prepareOfficialReleaseRoomNativeActionsV2,
  officialReleaseRosterIncrementOptionsV2 } from './official-release-room-native-actions-v2.mjs';
import { verifyOfficialReleaseManifestV2 } from '../source-data/official-release-context-v2.mjs';
import { createOfficialDeploymentGeometryDataBundleV1 } from '../source-data/official-deployment-geometry-data-bundle-v1.mjs';
import { createOfficialDeploymentGeometryBindingV1 } from '../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs';
import { completeOfficialCurrentProductCleanupStateV1, resolveOfficialCurrentProductInitiativeV1 } from './official-match-cleanup-successor-v1.mjs';
import { officialAbilityReferenceConstraintsV13 } from '../rule-atoms/official-ability-reference-policy-v13.mjs';
import { isDeepStrictEqual } from 'node:util';
import { getOfficialEngagementScaleV1 } from
  '../source-data/official-faction-army-eligibility-data-bundle-v1.mjs';
import { pendingOfficialSeekerControllersV1 } from "../rule-atoms/official-seeker-assault-timing-v1.mjs";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialActivationPassV1, completeOfficialDeferredActivationPhaseV1,
  enumerateOfficialActivationPassActionsV1,
  OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
} from "../rule-atoms/official-activation-pass-executor-v1.mjs";
import {
  applyOfficialCombatPassV3,
  enumerateOfficialCombatPassV3Actions,
  OFFICIAL_COMBAT_PASS_V3_ATOM_IDS,
} from "../rule-atoms/official-combat-pass-executor-v3.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
  isOfficialPhaseInitiativePendingV1,
  OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
} from "../rule-atoms/official-phase-initiative-executor-v1.mjs";
import { createOfficialMissionRuntimeV2,
  OFFICIAL_MISSION_ACTION_TYPES, OFFICIAL_MISSION_SABOTAGE_ACTION_V1 } from
  "../rule-atoms/official-mission-runtime-v2.mjs";
import { openOfficialSelectedRosterAfterActionWindowV1 } from "./official-selected-roster-ability-runtime-v1.mjs";
import { createOfficialArtefactHuntDropContinuationV1, OFFICIAL_ARTEFACT_DROP_ACTION_TYPE,
  OFFICIAL_ARTEFACT_CLAIM_ACTION_TYPE, OFFICIAL_ARTEFACT_FINISH_CLAIMS_ACTION_TYPE }
  from "./official-artefact-hunt-drop-continuation-v1.mjs";
import { createOfficialRoundSupplyStateV1, refreshOfficialRoundSupplyOccupancyV1 } from
  "../rule-atoms/official-round-supply-state-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS } from
  "../rule-atoms/official-mission-marker-control-executor-v1.mjs";
import { resolveOfficialMissionMarkerControlV2 } from
  "../rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import {
  composeOfficialCurrentProductActionRuntimeV1,
  verifyOfficialCurrentProductActionRuntimeCompositionV1,
} from "./official-current-product-action-runtime-composition-v1.mjs";
import { auditOfficialCurrentProductDataWiringV1 } from
  "./official-current-product-data-wiring-audit-v1.mjs";
import {resumeOfficialSelectedRosterRangedDamageReactionV1,
  currentOfficialSelectedRosterRangedSequenceV1} from './official-selected-roster-ranged-action-runtime-v1.mjs';
import {OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA} from './official-selected-roster-melee-action-runtime-v1.mjs';
import {describeInitiativeRollOffChanceV1} from '../rule-atoms/initiative-roll-off-kernel-v1.mjs';
import { hasOfficialFaqReactionPolicyV13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { hasOfficialMissionRoundStartPolicyV13, missionActivationPrecedesPriorityV13,
  OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1, describeOfficialMissionMarkerChanceV1,
  resolveOfficialMissionMarkerChanceV1 } from '../rule-atoms/official-mission-round-start-policy-v13.mjs';

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID =
  "starcraft-tmg-official-current-product-match-runtime-v1";
export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION = "1.2.0";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ACTIVATION_PHASES = new Set(["movement", "assault", "combat"]);
const DISPATCH_ATOM_ID =
  "rule-atom:current-product-match-runtime-dispatch-v1";
const MISSION_ATOM_ID =
  "rule-atom:current-product-match-mission-lifecycle-v1";
const MISSION_CONTROL_ATOM_ID =
  "rule-atom:current-product-match-terrain-aware-mission-control-v1";
const END_OF_ROUND_ATOM_ID =
  "rule-atom:current-product-match-end-of-round-effects-v1";
const CLEANUP_ATOM_ID =
  "rule-atom:current-product-match-cleanup-refresh-v1";
const INITIATIVE_ATOM_ID =
  "rule-atom:current-product-match-next-round-initiative-v1";
const ABILITY_ADAPTERS_DISPATCHED_BY_DEDICATED_RUNTIMES = Object.freeze([
  "official-melee-family-adapter-v1",
  "official-ranged-family-adapter-v1",
]);
const LIFECYCLE_ACTION_TYPES = Object.freeze({
  END_OF_ROUND: "resolve_current_product_end_of_round_effects",
  DECLINE_ROUND_END: "decline_current_product_round_end_opportunity",
  CLEANUP: "resolve_current_product_cleanup_refresh",
  INITIATIVE: "resolve_current_product_next_round_initiative",
});
const ACTION_TYPES = Object.freeze([
  "choose_first_actor", "pass", "deploy", "move", "run", "disengage",
  "ranged_attack", "finish_ranged_attack_sequence", "charge", "resolve_charge",
  "resolve_impact", "fight", "use_active_ability", "finish_activation",
  "resolve_characteristic_status_ability", "resolve_relocation_ability",
  "resolve_battlefield_asset_ability", "resolve_unit_lifecycle_ability",
  "resolve_unit_lifecycle_consumer", "resolve_terran_unique_ability",
  "resolve_zerg_unique_ability", "resolve_protoss_unique_ability",
  "resolve_reaction_family_ability", "pass_reaction_family_window",
  "open_reaction_window", OFFICIAL_MISSION_ACTION_TYPES.START_ROUND,
  OFFICIAL_MISSION_ACTION_TYPES.GATHER, OFFICIAL_MISSION_ACTION_TYPES.SCORE,
  OFFICIAL_MISSION_ACTION_TYPES.END_GAME,
  "determine_current_product_mission_marker_control",
  ...Object.values(LIFECYCLE_ACTION_TYPES),
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function assertRangedSequenceDispatch(state, kind, executorId) {
  if (currentOfficialSelectedRosterRangedSequenceV1(state) && kind !== "ranged"
    && !(kind === "ability" && executorId === "official-reaction-family-adapter-v1")) {
    fail("CURRENT_PRODUCT_MATCH_RANGED_SEQUENCE_PENDING");
  }
}
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
function sourceAction(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}
function candidateAtoms(value) {
  return [...new Set([DISPATCH_ATOM_ID, ...(value?.ruleAtomIds || [])])].sort();
}
function wrapAction(value, sourceRuntimeKind, wrapperRuleAtomIds = []) {
  const original = clone(value);
  const chance = original.chance || original.rangedPlan?.chance || null;
  const body = {
    actionType: original.actionType,
    sideKey: original.sideKey,
    phase: original.phase,
    ...(original.pieceId ? { pieceId: original.pieceId } : {}),
    ...(original.abilityName ? { abilityName: original.abilityName } : {}),
    ...(original.chosenFirstActorSideKey
      ? { chosenFirstActorSideKey: original.chosenFirstActorSideKey } : {}),
    ...(chance ? { chance: clone(chance) } : {}),
    sourceRuntimeKind,
    sourceAction: original,
    sourceActionHash: hashStarcraftTmgContract(original),
    ruleAtomIds: [...new Set([
      ...candidateAtoms(original),
      ...wrapperRuleAtomIds,
    ])].sort(),
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
  };
  return freezeDeep(body);
}
function wrapCandidate(candidate, sourceRuntimeKind, wrapperRuleAtomIds = []) {
  const action = wrapAction(
    sourceAction(candidate), sourceRuntimeKind, wrapperRuleAtomIds,
  );
  return freezeDeep({
    ...action,
    isEnabled: candidate.isEnabled !== false,
    disabledReason: String(candidate.disabledReason || ""),
    score: Number(candidate.score || 0),
    details: {
      ...clone(candidate.details || {}),
      sourceExecutorId: candidate.executorId || null,
      currentProductDispatcher: true,
      rulesTruth: "official_current_product_match_runtime_dispatch",
      trainingTruth: false,
    },
  });
}
function wrapDomain(domain, sourceRuntimeKind, state) {
  const original = clone(domain);
  const referenceFacts = state?.officialAbilityReferencePolicy && !original.constraints?.abilityReferences
    ? officialAbilityReferenceConstraintsV13(state, state.officialAbilityEffectIrCatalogue.definitions
      .find(definition => definition.sourceFeatureHash === original.sourceFeatureHash) || original) : {};
  const publicConfirmationClass = new Set(["direct_gesture", "explicit_human"])
    .has(original.confirmationClass)
    ? original.confirmationClass
    : original.actionType === "finish_activation"
      ? "direct_gesture"
      : "explicit_human";
  const domainCore = {
    ...without(original, ["domainId", "executorId", "executorVersion", "ruleAtomIds"]),
    confirmationClass: publicConfirmationClass,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
    ruleAtomIds: candidateAtoms(original),
    ...(Object.keys(referenceFacts).length ? { constraints: {
      ...(original.constraints || {}), ...referenceFacts,
    } } : {}),

    sourceRuntimeKind,
    sourceDomain: original,
    sourceDomainHash: hashStarcraftTmgContract(original),
  };
  // The room/client contract verifies every non-legacy parameter domain as
  // sc-domain-sha256(domain without domainId). Keep wrapper provenance inside
  // that core so the identifier proves exactly what the client can submit.
  return freezeDeep({ ...domainCore,
    domainId: `sc-domain-${hashStarcraftTmgContract(domainCore)}` });
}
function uniqueByHash(values) {
  const byHash = new Map();
  for (const value of values) byHash.set(hashStarcraftTmgContract(value), value);
  return [...byHash.values()];
}
function phaseSummary(state) {
  return {
    round: Number(state.round),
    phase: String(state.phase || ""),
    activeSideKey: state.activeSideKey ?? null,
    firstPlayerSideKey: state.firstPlayerSideKey ?? null,
  };
}
function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: String(state.phase || ""),
    action: clone(action),
    events: clone(events),
  });
}
function activeSide(state, sideKey) {
  return state.activeSideKey === sideKey
    && state.players?.[sideKey]?.passedPhases?.[state.phase] !== true;
}
function lifecycleState(state) {
  return object(state.currentProductMatchLifecycle)
    ? state.currentProductMatchLifecycle : null;
}
function pendingRoundEndChoices(state) {
  return (state.pendingBattlefieldAssetOpportunities || []).filter(entry =>
    entry.optional === true && entry.expiresAt === "cleanup_and_refresh");
}
function advanceRoundEndChoices(state, timedLife, tokenRoundEnd) {
  const pending = [...pendingRoundEndChoices(state), ...(timedLife?.scheduledEffects(state) || []),
    ...(tokenRoundEnd?.scheduledEffects(state) || [])];
  // The initiative player resolves their simultaneous choices first. The
  // owner chooses the order of their own assets, then priority passes once.
  const sideKey = [state.firstPlayerSideKey,
    ...SIDE_KEYS.filter(side => side !== state.firstPlayerSideKey)]
    .find(side => pending.some(entry => entry.sideKey === side));
  state.currentProductMatchLifecycle = {
    schema: "starcraft_tmg_current_product_match_lifecycle_v1",
    round: Number(state.round),
    step: sideKey ? "round_end_choices" : "cleanup_and_refresh",
    trainingTruth: false,
  };
  state.activeSideKey = sideKey || state.firstPlayerSideKey;
}
function timedLifeSourceAction(state, effect) {
  const source = systemSourceAction(state, "resolve_unit_timed_life", END_OF_ROUND_ATOM_ID);
  return seal({ ...without(source, ["actionHash"]), sideKey: effect.sideKey, pieceId: effect.pieceId,
    definitionId: effect.definitionId, effectId: effect.effectId }, "actionHash");
}
function declineRoundEndSourceAction(state, opportunity) {
  const { actionHash: ignored, ...source } = systemSourceAction(state,
    LIFECYCLE_ACTION_TYPES.DECLINE_ROUND_END, END_OF_ROUND_ATOM_ID);
  return seal({ ...source, sideKey: opportunity.sideKey,
    opportunityId: opportunity.opportunityId, assetId: opportunity.assetId,
    opportunityKind: opportunity.opportunityKind }, "actionHash");
}
function missionProgress(state) {
  return state.officialMissionRuntimeState?.roundProgressByRound?.[state.round]
    || state.officialMissionRuntimeState?.roundProgressByRound?.[String(state.round)]
    || null;
}
function systemSourceAction(state, actionType, atomId, chance = null) {
  const body = {
    actionType,
    sideKey: state.firstPlayerSideKey,
    phase: state.phase,
    preStateHash: hashStarcraftTmgContract(state),
    ruleAtomIds: [atomId],
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
    ...(chance ? { chance } : {}),
    rulesTruth: "official_current_product_match_lifecycle",
    trainingTruth: false,
  };
  return seal(body, "actionHash");
}
function missionControlSourceAction(state, resolution) {
  const body = {
    actionType: "determine_current_product_mission_marker_control",
    sideKey: state.firstPlayerSideKey,
    phase: "cleanup",
    preStateHash: hashStarcraftTmgContract(state),
    controlResolutionHash: resolution.controlResolutionHash,
    missionMarkerControlResolution: clone(resolution),
    ruleAtomIds: [...new Set([
      MISSION_CONTROL_ATOM_ID,
      ...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS,
    ])].sort(),
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
    rulesTruth: "official_current_product_terrain_aware_mission_control",
    trainingTruth: false,
  };
  return seal(body, "actionHash");
}
// Shared exact control/commit seam for current rooms and release components.
export function prepareOfficialCurrentProductMissionControlV1(state, options = {}) {
  const resolution = resolveOfficialMissionMarkerControlV2({
    state, terrainLosDataBundle: state.officialTerrainLosDataBundle, matchBinding: options.matchBinding,
  });
  return missionControlSourceAction(state, resolution);
}

export function applyOfficialCurrentProductMissionControlV1(currentState, source, options = {}) {
  if (source.preStateHash !== hashStarcraftTmgContract(currentState)) {
    fail("CURRENT_PRODUCT_MATCH_MISSION_CONTROL_STALE");
  }
  const expected = resolveOfficialMissionMarkerControlV2({
    state: currentState,
    terrainLosDataBundle: currentState.officialTerrainLosDataBundle,
    matchBinding: options.matchBinding,
  });
  if (source.controlResolutionHash !== expected.controlResolutionHash
    || source.missionMarkerControlResolution?.controlResolutionHash
      !== expected.controlResolutionHash) {
    fail("CURRENT_PRODUCT_MATCH_MISSION_CONTROL_MISMATCH");
  }
  const state = clone(currentState);
  const byMarkerId = new Map(expected.markerResults.map((entry) => (
    [entry.markerId, entry]
  )));
  for (const marker of state.board.missionMarkers) {
    const result = byMarkerId.get(marker.id);
    if (!result) {
      fail("CURRENT_PRODUCT_MATCH_MISSION_CONTROL_MARKER_MISSING", marker.id);
    }
    marker.controlSideKey = result.nextControlSideKey;
    marker.factionIndicatorSideKey = result.factionIndicatorSideKey;
    marker.controlDeterminedAt = {
      round: Number(state.round),
      step: source.actionType,
      postRevision: Number(options.postRevision || 0),
      controlResolutionHash: expected.controlResolutionHash,
    };
  }
  const events = [{
    type: "mission_marker_control_determined",
    round: Number(state.round),
    initiatingSideKey: source.sideKey,
    controlResolutionHash: expected.controlResolutionHash,
    markerResults: clone(expected.markerResults),
    terrainLosDataBundleHash: expected.terrainLosDataBundleHash,
    rulesTruth: expected.rulesTruth,
    trainingTruth: false,
  }];
  appendLog(state, source, events);
  return { state, events };
}

function initiativeChance() {
  return freezeDeep(describeInitiativeRollOffChanceV1());
}
function abilityEnumerations(runtime, state, sideKey, includeDisabled, opportunitySources = null) {
  const excludeAdapterIds = ABILITY_ADAPTERS_DISPATCHED_BY_DEDICATED_RUNTIMES
    .filter(id => runtime.descriptor.adapterIds.includes(id));
  const result = runtime.dispatch({
    operation: "legal_space",
    state,
    options: { sideKey, phase: state.phase, includeDisabled, excludeAdapterIds },
  });
  const candidates = [];
  const parameterDomains = [];
  for (const output of result.executableEnumerations || []) {
    for (const candidate of output.result?.candidates || []) {
      candidates.push(wrapCandidate(candidate, "ability"));
    }
    for (const domain of output.result?.parameterDomains || []) {
      parameterDomains.push(wrapDomain(domain, "ability", state));
    }
  }
  if ((result.pendingDiagnostics || []).some(row => !opportunitySources || opportunitySources.has(row.definitionId))) {
    fail("CURRENT_PRODUCT_MATCH_PENDING_ABILITY_DIAGNOSTIC");
  }
  return { candidates, parameterDomains };
}
function runtimeEnumeration(runtime, kind, state, sideKey, includeDisabled,
  result = runtime.enumerate(state, { sideKey, includeDisabled })) {
  return {
    candidates: (result.candidates || []).map((candidate) => (
      wrapCandidate(candidate, kind)
    )),
    parameterDomains: (result.parameterDomains || []).map((domain) => (
      wrapDomain(domain, kind, state)
    )),
  };
}
function addEnumeration(target, value) {
  target.candidates.push(...value.candidates);
  target.parameterDomains.push(...value.parameterDomains);
}
export function initializeOfficialMatchRoundSupplyV1(state, releaseBound) {
  const missionRuntimeHash = String(
    state.officialMissionRuntimeDescriptor?.runtimeHash || "",
  ).trim();
  if (!missionRuntimeHash) {
    fail("CURRENT_PRODUCT_MATCH_MISSION_RUNTIME_HASH_MISSING");
  }
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    ...(releaseBound ? { missionSupplyProfile: state.officialMissionSupplyProfile } : {}),
    rulesRuntimeHash: missionRuntimeHash,
  });
  state.supplyLossLedger = createOfficialSupplyLossLedgerV1({
    round: Number(state.round),
    rulesRuntimeHash: missionRuntimeHash,
  });
  for (const sideKey of SIDE_KEYS) {
    state.players[sideKey].supply =
      state.officialRoundSupplyState.supplyPoolBySide[sideKey];
  }
}
function openRoundActivation(state, releaseBound = false) {
  initializeOfficialMatchRoundSupplyV1(state, releaseBound);
  state.phase = 'movement';
  state.stage = 'activation_phases';
  state.activeSideKey = state.firstPlayerSideKey;
  delete state.phaseFirstActorByRound?.[`${state.round}:movement`];
  return { type: 'current_product_round_activation_opened', round: Number(state.round), phase: 'movement',
    activeSideKey: state.activeSideKey,
    supplyPoolBySide: clone(state.officialRoundSupplyState.supplyPoolBySide), trainingTruth: false };
}
function applyAbilityLifecycle(runtime, state, eventKind, request = {}) {
  return runtime.dispatch({
    operation: "lifecycle",
    state,
    request: { eventKind, ...request },
  });
}
function findCanonicalParameters(action, fallback) {
  for (const value of Object.values(action || {})) {
    if (object(value) && object(value.canonicalParameters)) {
      return clone(value.canonicalParameters);
    }
  }
  return clone(fallback || {});
}

export function createOfficialCurrentProductMatchRuntimeV1(input = {}) {
  return createCurrentProductMatchRuntime(input, {
    scaleId: 'Standard', widthInches: 54, heightInches: 36,
  });
}

// An explicit component test entry uses the same phase/mission/cleanup owner.
// It is never a release factory and never claims the omitted ability catalogue.
export function createOfficialEngineeringScopedRoundRuntimeV1({ context, state, nativeActions, definitionIds }) {
  const sourceDefinitionCount = nativeActions?.catalogue?.definitionSelection?.sourceDefinitionCount;
  if (context?.allowEngineeringEstimatedGeometry !== true || !nativeActions?.descriptor
    || typeof nativeActions.lifecycle !== 'function' || !nativeActions.spatial || !nativeActions.ranged || !nativeActions.melee
    || !Array.isArray(definitionIds) || !definitionIds.length || new Set(definitionIds).size !== definitionIds.length
    || !Number.isSafeInteger(sourceDefinitionCount) || sourceDefinitionCount < definitionIds.length
    || definitionIds.some(id => !nativeActions.catalogue.definitions.some(definition => definition.definitionId === id))) {
    fail('ENGINEERING_SCOPED_ROUND_AUTHORITY_REQUIRED');
  }
  const coverage = { schema: 'starcraft_tmg_engineering_round_ability_scope_v1',
    definitions: definitionIds.map(definitionId => ({ definitionId })),
    sourceManifestHash: context.manifest.manifestHash, nativeRuntimeHash: nativeActions.descriptor.runtimeHash,
    fullMatchAdmission: false, trainingTruth: false };
  if(state.officialSeekerAssaultTiming){
    const policy=state.officialSeekerAssaultTiming,source=state.officialCharacteristicStatusFamilySourceBundle;
    if(policy.sourceBundleHash!==source?.bundleHash||!source.definitionIds.includes(policy.definitionId)
      ||nativeActions.descriptor.ravenSeekerMissileRules?.definitionId!==policy.definitionId
      ||!nativeActions.descriptor.ravenSeekerMissileRules?.paidImpactQueryKind)fail('ENGINEERING_ROUND_SEEKER_CONSUMER_REQUIRED');
    Object.assign(coverage,{contractVersion:'1.1.0',seekerAssaultTimingPolicy:clone(policy)});
  }
  if(state.officialReleaseBileAssaultTiming){
    if(state.officialReleaseBileAssaultTiming!==state.officialCorrosiveBileDamagePolicy?.policyHash
      ||!nativeActions.releaseAssaultOrder||!nativeActions.descriptor.corrosiveBileResolutionRuntime)
      fail('ENGINEERING_ROUND_BILE_CONSUMER_REQUIRED');
    Object.assign(coverage,{contractVersion:'1.2.0',bileAssaultTimingPolicyHash:state.officialReleaseBileAssaultTiming});
  }
  if(state.officialReleaseDroneAssaultTiming){
    if(state.officialReleaseDroneAssaultTiming!==state.officialSabotageDronePhaseEndPolicy?.policyHash
      ||!nativeActions.descriptor.sabotageDronePhaseEndRuntime)fail('ENGINEERING_ROUND_DRONE_CONSUMER_REQUIRED');
    Object.assign(coverage,{contractVersion:'1.2.0',droneAssaultTimingPolicyHash:state.officialReleaseDroneAssaultTiming});
  }
  const beaconRoundEnd=state.officialEngineeringBeaconRoundEnd;
  if(beaconRoundEnd){
    if(beaconRoundEnd!==state.officialBattlefieldAssetFamilySourceBundle?.bundleHash
      ||nativeActions.descriptor.externalBeaconEntryObservation!=='source_bound_native_beacon_transition_v1'
      ||!nativeActions.router?.descriptor?.adapterIds.includes('official-battlefield-asset-family-adapter-v1'))
      fail('ENGINEERING_ROUND_BEACON_CONSUMER_REQUIRED');
    Object.assign(coverage,{contractVersion:'1.3.0',beaconRoundEndSourceBundleHash:beaconRoundEnd});
  }
  return createCurrentProductMatchRuntime({ state, dataset: context.dataset, wave3MissionSourceContext: context,
    releaseMatchVersion: '2.2.0', engineeringRoundScope: coverage, engineeringSourceDefinitionCount: sourceDefinitionCount },
  { scaleId: 'Standard', widthInches: 54, heightInches: 36 },
  { nativeActions, openingRosterCoverage: coverage, pendingNativeDefinitionIds: [], abilityRuntime: {
    ...(beaconRoundEnd?{descriptor:nativeActions.router.descriptor}:{}),
    dispatch(args) {
      const {operation,state,request}=args;
      if (operation !== 'lifecycle') {
        if(!beaconRoundEnd)fail('ENGINEERING_ROUND_LIFECYCLE_DISPATCH_ONLY');
        return nativeActions.router.dispatch(args);
      }
      // Notify families of the activation that opened this reaction. Advancing
      // the reaction remains owned by the native continuation and its choices.
      const watched = nativeActions.overwatch?.pending(state);
      if (request.eventKind === 'activation_end' && watched?.targetPieceId === request.pieceId) {
        return nativeActions.router.dispatch({ operation, state, request });
      }
      return nativeActions.lifecycle(state, request);
    },
  } });
}

// Explicit admission for the real scale-specific factories. The original
// Standard constructor keeps its binding; callers choose this new entry.
export function createOfficialCurrentProductScaledMatchRuntimeV1(input = {}) {
  const state = input.state;
  if (!object(state)) fail('CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID');
  const profile = getOfficialEngagementScaleV1(
    state.officialFactionArmyEligibilityDataBundle, state.engagementScale);
  if (profile.scaleId === 'Standard') return createOfficialCurrentProductMatchRuntimeV1(input);
  if (profile.scaleId !== 'Skirmish') fail('CURRENT_PRODUCT_MATCH_SCALE_NOT_ADMITTED', profile.scaleId);
  const agreement = state.armyBuildingEngagementScale;
  if (agreement?.rulesOwnedScaleProfile !== true
    || !isDeepStrictEqual(agreement.scale, profile)) {
    fail('CURRENT_PRODUCT_MATCH_SCALE_AGREEMENT_REQUIRED');
  }
  return createCurrentProductMatchRuntime(input, {
    scaleId: profile.scaleId,
    widthInches: profile.battlefield.lengthMilliInches / 1000,
    heightInches: profile.battlefield.widthMilliInches / 1000,
    binding: { profile: clone(profile),
      eligibilityDataBundleHash: state.officialFactionArmyEligibilityDataBundle.bundleHash },
  });
}

function verifyReleaseMatchDeploymentGeometry(context, state) {
  const expected = context.manifest.components.deploymentCardGeometry;
  const stored = state.officialDeploymentGeometryDataBundle;
  const storedSourceHash = stored?.releaseBinding?.deploymentCardGeometryHash;
  if (!expected && !storedSourceHash) return;
  if (!expected || expected.integrity?.field !== 'bundleHash'
    || !storedSourceHash || storedSourceHash !== expected.integrity.value) {
    fail('OFFICIAL_RELEASE_MATCH_DEPLOYMENT_GEOMETRY_SOURCE_MISMATCH');
  }

  const draftBundle = state.officialMissionDeploymentDraftDataBundle;
  const geometryBundle = createOfficialDeploymentGeometryDataBundleV1({
    dataset: context.dataset, snapshot: context.snapshot, releaseContext: context,
    missionDeploymentDraftDataBundle: draftBundle,
  });
  const selected = createOfficialDeploymentGeometryBindingV1({
    deploymentGeometryDataBundle: geometryBundle,
    missionDeploymentDraftDataBundle: draftBundle,
    missionDeploymentDraftState: state.officialMissionDeploymentDraft,
  });
  if (!isDeepStrictEqual(stored, geometryBundle)
    || !isDeepStrictEqual(state.officialDeploymentGeometryBinding, selected)) {
    fail('OFFICIAL_RELEASE_MATCH_DEPLOYMENT_GEOMETRY_STATE_MISMATCH');
  }
}

export function createOfficialReleaseMatchRuntimeV2({ context, state, boundRuntimeManifest, candidateVersion = '2.18.0' }) {
  const binding = boundRuntimeManifest ? verifyOfficialReleaseManifestV2(boundRuntimeManifest) : null;
  if (binding && (binding.releaseId !== context.manifest.releaseId
    || !isDeepStrictEqual(binding.source, context.manifest.source)
    || !isDeepStrictEqual(without(binding.components, ['rulesRuntime']), without(context.manifest.components, ['rulesRuntime'])))) {
    fail('OFFICIAL_RELEASE_MATCH_RECOVERY_SOURCE_MISMATCH');
  }
  verifyReleaseMatchDeploymentGeometry(context, state);
  const expectedRuntime = binding?.components.rulesRuntime;
  const releaseMatchVersion = expectedRuntime?.version ?? candidateVersion;
  const rosterIncrement = officialReleaseRosterIncrementOptionsV2(releaseMatchVersion);
  const releaseCocoonMorph = rosterIncrement.includeCocoonMorph;
  const releaseCreepDisplacementQuery = releaseMatchVersion === '2.22.0' || releaseCocoonMorph;
  const releaseVileling = releaseMatchVersion === '2.21.0' || releaseCreepDisplacementQuery;
  const releaseJointLunge = ['2.19.0', '2.20.0'].includes(releaseMatchVersion) || releaseVileling;
  const releaseLunge = releaseMatchVersion === '2.18.0' || releaseJointLunge;
  const inheritedVersion = releaseLunge ? '2.17.0' : releaseMatchVersion;
  if (!['2.0.0', '2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion)) fail('OFFICIAL_RELEASE_MATCH_RUNTIME_VERSION_UNSUPPORTED');
  const opening = prepareOfficialReleaseRoomNativeActionsV2({
    context, state, includeReleasePhaseControl: ['2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    useEquippedWeapons: ['2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeInheritedMovementCards: ['2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeInheritedCharacteristics: ['2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeInheritedMissionSupply: ['2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeInheritedRangedHitDebuff: ['2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeInheritedRespawn: ['2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeInheritedVentralSacs: ['2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeWarpPrism: ['2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeZealotCharge: ['2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeReleaseMissionOpening: ['2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
    includeDropship: ['2.16.0', '2.17.0'].includes(inheritedVersion),
    includeKhalai: inheritedVersion === '2.17.0',
    includeInheritedLunge: releaseLunge,
    includeLungeJointObstacleProof: releaseJointLunge,
    includeQueenDomineering: releaseLunge,
    includeWave3Vileling: releaseVileling,
    ...rosterIncrement,
    includeReleaseQueenPsionicLink: ['2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion),
  });
  if (opening.pendingNativeDefinitionIds.length) {
    fail('OFFICIAL_RELEASE_MATCH_NATIVE_BINDINGS_PENDING', opening.pendingNativeDefinitionIds.join(','));
  }
  const profile = getOfficialEngagementScaleV1(
    state.officialFactionArmyEligibilityDataBundle, state.engagementScale);
  if (!['Standard', 'Skirmish'].includes(profile.scaleId)
    || state.armyBuildingEngagementScale?.rulesOwnedScaleProfile !== true
    || !isDeepStrictEqual(state.armyBuildingEngagementScale.scale, profile)) {
    fail('CURRENT_PRODUCT_MATCH_SCALE_AGREEMENT_REQUIRED');
  }
  const runtime = createCurrentProductMatchRuntime({
    state: opening.state, dataset: context.dataset, wave3MissionSourceContext: context, releaseMatchVersion,
  }, { scaleId: profile.scaleId, widthInches: profile.battlefield.lengthMilliInches / 1000,
    heightInches: profile.battlefield.widthMilliInches / 1000,
    binding: { profile: clone(profile), eligibilityDataBundleHash: state.officialFactionArmyEligibilityDataBundle.bundleHash },
  }, opening);
  if (binding && (expectedRuntime?.integrity?.field !== 'runtimeHash'
    || expectedRuntime.integrity.value !== runtime.descriptor.runtimeHash)) fail('OFFICIAL_RELEASE_MATCH_RECOVERY_RUNTIME_MISMATCH');
  return runtime;
}

function createCurrentProductMatchRuntime(input, scale, releaseOpening) {
  const state = input.state;
  const dataset = input.dataset;
  const auditedUnitIds = ["player1", "player2"].flatMap((sideKey) =>
    state?.armyCompositionUpgradeAuditsBySide?.[sideKey]?.units?.map(
      (unit) => unit.unitInstanceId) || []);
  const pieceIds = Array.isArray(state?.pieces)
    ? state.pieces.map((piece) => piece?.id) : [];
  if (!object(state) || !object(dataset)
    || state.engagementScale !== scale.scaleId
    || state.board?.widthInches !== scale.widthInches || state.board?.heightInches !== scale.heightInches
    || !auditedUnitIds.length
    || auditedUnitIds.some((id) => typeof id !== "string" || !id)
    || pieceIds.length !== auditedUnitIds.length
    || new Set(pieceIds).size !== pieceIds.length
    || pieceIds.some((id) => !auditedUnitIds.includes(id))) {
    fail("CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID");
  }
  const native = releaseOpening?.nativeActions;
  const rosterIncrement = officialReleaseRosterIncrementOptionsV2(input.releaseMatchVersion);
  const timedLife = rosterIncrement.includeRaven ? (native?.unitRoundEnd ?? (rosterIncrement.includeNovaHolo ? native?.holoRoundEnd : null)) : null;
  const tokenRoundEnd = rosterIncrement.includeRavagerTunnel ? native?.tokenRoundEnd : null;
  const sharedHoloEnd = rosterIncrement.includeNovaHolo && Boolean(state.officialDecoySourceBundle) && timedLife;
  const releaseCocoonMorph = rosterIncrement.includeCocoonMorph;
  const releaseCreepDisplacementQuery = (input.releaseMatchVersion === '2.22.0' || releaseCocoonMorph)
    && state.officialBattlefieldDisplacementSourceBundle?.version === '1.1.0';
  const releaseJointLunge = ['2.19.0', '2.20.0', '2.21.0', '2.22.0'].includes(input.releaseMatchVersion) || releaseCocoonMorph;
  const releaseArtefactDropScoring = ['2.20.0', '2.21.0', '2.22.0'].includes(input.releaseMatchVersion) || releaseCocoonMorph;
  const releaseLunge = input.releaseMatchVersion === '2.18.0' || releaseJointLunge;
  const inheritedVersion = releaseLunge ? '2.17.0' : input.releaseMatchVersion;
  const releasePhaseControl = ['2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion);
  const releaseNativeArtefactPlace = ['2.3.0', '2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion);
  const openMatchRoundActivation = native ? state => openRoundActivation(state, true) : openRoundActivation;
  const composition = native ? {
    state, evidence: { compositionHash: native.descriptor.runtimeHash },
    runtimes: { spatial: native.spatial, ranged: native.ranged, melee: native.melee, ability: releaseOpening.abilityRuntime },
  } : composeOfficialCurrentProductActionRuntimeV1({ dataset, state });
  const missionRoundPolicy = hasOfficialMissionRoundStartPolicyV13(state) ? state.officialMissionRoundStartPolicy : null;
  const artefactDrop = state.officialArtefactHuntCustody
    ? createOfficialArtefactHuntDropContinuationV1({ context: input.wave3MissionSourceContext,
      state, ruleAtomId: MISSION_ATOM_ID, recordControlInvalidation: releaseArtefactDropScoring,
      qualifyMorphRemoval: releaseCocoonMorph, tokenLeadingPlace: Boolean(tokenRoundEnd) })
    : null;
  const coreActionTypes = [...ACTION_TYPES,
    ...(rosterIncrement.includeScheduledRemovalAction && timedLife ? ['resolve_unit_timed_life'] : []),
    ...(artefactDrop ? [OFFICIAL_ARTEFACT_DROP_ACTION_TYPE,
      OFFICIAL_ARTEFACT_CLAIM_ACTION_TYPE, OFFICIAL_ARTEFACT_FINISH_CLAIMS_ACTION_TYPE] : []),
    ...(missionRoundPolicy ? [OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1] : []),
    ...(state.officialMissionRuntimeState?.missionFamily === "fire_in_the_sky"
      ? [OFFICIAL_MISSION_SABOTAGE_ACTION_V1] : []),
  ];
  const actionTypes = native ? [...new Set([...coreActionTypes, ...native.descriptor.executorManifest[0].actionTypes])] : coreActionTypes;
  if (!native) verifyOfficialCurrentProductActionRuntimeCompositionV1(composition.state, composition.evidence);
  const dataWiringAudit = native ? releaseOpening.openingRosterCoverage : auditOfficialCurrentProductDataWiringV1(state);
  if (!native && dataWiringAudit.blockingFindings.length > 0) {
    fail("CURRENT_PRODUCT_MATCH_DATA_WIRING_AUDIT_FAILED",
      dataWiringAudit.blockingFindings.map((entry) => entry.code).join(","));
  }
  const dataWiringAuditHash = hashStarcraftTmgContract(dataWiringAudit);
  const runtimes = composition.runtimes;
  const mission = createOfficialMissionRuntimeV2({
    missionEffectCatalogue: state.officialMissionEffectCatalogue,
    wave3MissionSourceContext: input.wave3MissionSourceContext,
    artefactHuntMissionRecordKey: state.officialArtefactHuntCustody?.binding.missionRecordKey,
    acceptArtefactPlacementProof: releaseArtefactDropScoring,
  });
  const routedAtomIds = [
    DISPATCH_ATOM_ID, MISSION_ATOM_ID, MISSION_CONTROL_ATOM_ID,
    END_OF_ROUND_ATOM_ID,
    CLEANUP_ATOM_ID, INITIATIVE_ATOM_ID,
    ...(missionRoundPolicy ? [missionRoundPolicy.ruleAtomId] : []),
    ...OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
    ...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS,
    ...OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
    ...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS,
    ...runtimes.spatial.descriptor.routes.flatMap((route) => route.ruleAtomIds || []),
    ...runtimes.ranged.descriptor.routes.flatMap((route) => route.ruleAtomIds || []),
    ...runtimes.melee.descriptor.routes.flatMap((route) => route.ruleAtomIds || []),
    ...(native?.descriptor.executableRuleAtomIds || []),
  ];
  const executableRuleAtomIds = [...new Set(routedAtomIds)].sort();
  const catalogueHash = hashStarcraftTmgContract({
    abilityCoverageReleaseHash: native ? hashStarcraftTmgContract(releaseOpening.openingRosterCoverage)
      : state.officialCurrentProductAbilityCoverageRelease.releaseHash,
    missionRuntimeHash: mission.descriptor.runtimeHash,
    actionCompositionHash: composition.evidence.compositionHash,
    dataWiringAuditHash,
    ...(artefactDrop ? { artefactHuntDropBinding: artefactDrop.binding } : {}),
    actionTypes,
    executableRuleAtomIds,
  });
  const descriptorBody = {
    schema: "starcraft_tmg_official_executable_rule_runtime_v1",
    mode: "official_executable_catalogue",
    runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
    runtimeVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
    gameId: "starcraft-tmg",
    rulesVersion: "official-current-product-standard-2000-match-v1",
    catalogueHash,
    dataWiringAuditSchema: dataWiringAudit.schema,
    dataWiringAuditHash,
    dataWiringAuditBlockingFindingCount: native ? releaseOpening.pendingNativeDefinitionIds.length : dataWiringAudit.blockingFindings.length,
    executorManifest: [{
      executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
      executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
      actionTypes: [...actionTypes],
    }],
    executableRuleAtomIds,
    executableRuleAtomCount: executableRuleAtomIds.length,
    nonExecutableRuleAtomCount: 0,
    legalSpaceComplete: true,
    legacyCompatibilityUsed: false,
    productionRoomEligible: !missionRoundPolicy && !artefactDrop && !state.officialMissionEffectCatalogue.wave3FireInSky,
    ctx2skillPromotionEligible: false,
    currentProductAbilityExactCount: 252,
    currentProductAbilityPendingCount: 0,
    currentProductAbilityUnsupportedCount: 0,
    missionRuntimeHash: mission.descriptor.runtimeHash,
    actionCompositionHash: composition.evidence.compositionHash,
    ...(missionRoundPolicy ? { missionRoundStartPolicy: clone(missionRoundPolicy) } : {}),
    rulesOwnDicePoolsChanceResultsScoringAndTerminal: true,
    agentOnlySelectsLegalActionsTargetsAndAllocations: true,
    shadeConsumerPolicy: "source_unit_and_token_leading_coherency_v2",
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_standard_2000_complete_match_runtime",
    ...(scale.binding ? {
      rulesVersion: 'official-current-product-scaled-match-v1',
      engagementScaleBinding: scale.binding,
      productionRoomEligible: false,
      rulesTruth: 'official_current_product_explicit_scale_match_runtime',
    } : {}),
    ...(native ? { runtimeVersion: input.releaseMatchVersion, rulesVersion: 'official-release-match-v2', productionRoomEligible: false,
      releaseOpeningBoundary: true, nativeActionRuntimeHash: native.descriptor.runtimeHash,
      currentProductAbilityExactCount: releaseOpening.openingRosterCoverage.definitions.length,
      ...(input.releaseMatchVersion !== '2.0.0' ? { refreshSupplyOccupancyAfterTransition: true } : {}),
      ...(releasePhaseControl ? { releasePhaseControlOwnedByNativeMenu: true } : {}),
      ...(releaseNativeArtefactPlace ? { releaseNativeArtefactPlaceContinuation: true } : {}),
      ...(['2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseWeaponCoverage: 'effective_starting_model_equipment' } : {}),
      ...(['2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseInheritedMovementCards: true } : {}),
      ...(['2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseInheritedCharacteristics: true } : {}),
      ...(['2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseInheritedMissionSupply: true } : {}),
      ...(['2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseInheritedRangedHitDebuff: true } : {}),
      ...(['2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseInheritedRespawn: true } : {}),
      ...(['2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseInheritedVentralSacs: true } : {}),
      ...(['2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseQueenPsionicLink: true } : {}),
      ...(input.releaseMatchVersion === '2.12.0' ? { releaseVentralSacsCreepLifecycle: true } : {}),
      ...(['2.13.0', '2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseSpecialDeploymentLifecycle: true } : {}),
      ...(['2.14.0', '2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseZealotCharge: true } : {}),
      ...(['2.15.0', '2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseNativeMissionOpening: true } : {}),
      ...(['2.16.0', '2.17.0'].includes(inheritedVersion) ? { releaseDropship: true } : {}),
      ...(inheritedVersion === '2.17.0' ? { releaseKhalai: true } : {}),
      ...(releaseLunge ? { releaseInheritedLunge: true } : {}),
      ...(releaseJointLunge ? { releaseLungeJointObstacleProof: true } : {}),
      ...(releaseCreepDisplacementQuery ? { releaseCreepDisplacementQuery: true } : {}),
      ...(rosterIncrement.includeExplicitPhasePassHandoff ? { phasePassHandoff: state.officialPhasePassHandoff } : {}),
      ...(rosterIncrement.includeCreepMovementQueries && state.officialBattlefieldDisplacementPolicy?.movementQueriesReady
        ? { releaseCreepMovementQueries: true } : {}),
      ...(releaseCocoonMorph ? { releaseCocoonMorph: true } : {}),
      ...(rosterIncrement.includeZergSwarmBurrow ? { releaseZergSwarmBurrow: true } : {}),
      ...(rosterIncrement.includeZergSwarmBroodInstinct ? { releaseZergSwarmBroodInstinct: true } : {}),
      ...(rosterIncrement.includeSiegeTankCoverage ? { releaseSiegeTankCoverage: true } : {}),
      ...(rosterIncrement.includeRaynorFactionCards ? { releaseRaynorFactionCards: true } : {}),
      ...(rosterIncrement.includeRaven ? { releaseRaven: true } : {}),
      ...(rosterIncrement.includeRavenSeeker ? { releaseSeekerAssaultTiming: true } : {}),
      ...(rosterIncrement.includeNovaShared ? { releaseNovaShared: true } : {}),
      ...(rosterIncrement.includeNovaModes ? { releaseNovaModes: true } : {}),
      ...(sharedHoloEnd ? { releaseHoloRoundEnd: true } : {}),
      ...(tokenRoundEnd ? { releaseTokenRoundEnd: true } : {}),
      ...(rosterIncrement.exclusiveRangedContinuation ? { releaseExclusiveRangedContinuation: true } : {}),
      ...(releaseArtefactDropScoring && artefactDrop ? { releaseArtefactDropScoring: true } : {}) } : {}),
    ...(input.engineeringRoundScope ? { engineeringRoundScope: input.engineeringRoundScope,
      ...(input.engineeringRoundScope.seekerAssaultTimingPolicy?{releaseSeekerAssaultTiming:true}:{}),
      fullMatchAdmission: false, productionRoomEligible: false,
      currentProductAbilityPendingCount: input.engineeringSourceDefinitionCount - input.engineeringRoundScope.definitions.length,
      rulesTruth: 'source_bound_scoped_engineering_round_existing_match_owner' } : {}),
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    runtimeHash: hashStarcraftTmgContract(descriptorBody) });

  function enumerate(currentState, options = {}) {
    const sideKey = String(options.sideKey || currentState.activeSideKey
      || currentState.firstPlayerSideKey || "");
    if (!SIDE_KEYS.includes(sideKey)) fail("CURRENT_PRODUCT_MATCH_SIDE_INVALID", sideKey);
    const includeDisabled = options.includeDisabled === true;
    const output = { candidates: [], parameterDomains: [] };
    const addCoreActions = () => {
      for (const [kind, phases] of [["spatial", ["movement", "assault"]],
        ["ranged", ["assault"]], ["melee", ["assault", "combat"]]]) {
        if (phases.includes(currentState.phase)) addEnumeration(output,
          runtimeEnumeration(runtimes[kind], kind, currentState, sideKey, includeDisabled));
      }
    };
    const addMissionActions = onlySabotage => {
      const candidates = mission.enumerateLifecycle({ state: currentState, sideKey }).candidates;
      output.candidates.push(...candidates
        .filter(candidate => !onlySabotage || candidate.actionType === OFFICIAL_MISSION_SABOTAGE_ACTION_V1)
        .map(candidate => wrapCandidate({ ...candidate, isEnabled: true, disabledReason: "", score: 100 },
          "mission", [MISSION_ATOM_ID])));
    };
    if (currentState.terminal === true || currentState.gameOver === true) {
      return freezeDeep({
        schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
        rulesRuntimeHash: descriptor.runtimeHash,
        stateSummary: phaseSummary(currentState),
        terminal: { gameOver: true, winner: currentState.winner || "",
          reason: currentState.terminalReason || "" },
        candidates: [], parameterDomains: [], unsupportedDiagnostics: [],
        legalSpaceComplete: true, developmentSubset: false, trainingTruth: false,
      });
    }
    const objectiveContinuation = artefactDrop?.enumerate(currentState, sideKey);
    if (objectiveContinuation?.blockedByPendingDrop) {
      output.parameterDomains.push(...objectiveContinuation.parameterDomains.map(domain => wrapDomain(domain, "artefact_drop", currentState)));
    } else if (artefactDrop?.claimWindow(currentState)) {
      output.candidates.push(...artefactDrop.enumerateClaims(currentState, sideKey)
        .map(candidate => wrapCandidate(candidate, "artefact_claim")));
    } else if (tokenRoundEnd?.pending(currentState) || (rosterIncrement.includeBombard && (currentState.phase === 'cleanup'
      || rosterIncrement.includeBombardCreatorLoss && currentState.pendingOfficialBombardReplacement?.removalCause === 'source_destroyed')
      && currentState.pendingOfficialBombardReplacement?.stage === 'ready')) {
      addEnumeration(output, runtimeEnumeration(native, 'release_native', currentState, sideKey, includeDisabled));
    } else if (native?.hasExternalBeaconEntryContinuation?.(currentState)) {
      addEnumeration(output,runtimeEnumeration(native,'release_native',currentState,sideKey,includeDisabled));
    } else if (hasOfficialFaqReactionPolicyV13(currentState) && currentState.pendingOfficialReactionWindow
      && !(releasePhaseControl && ACTIVATION_PHASES.has(currentState.phase))) {
      const reactions = abilityEnumerations(runtimes.ability, currentState, sideKey, includeDisabled);
      addEnumeration(output, {
        candidates: reactions.candidates.filter(candidate =>
          candidate.sourceAction?.executorId === 'official-reaction-family-adapter-v1'),
        parameterDomains: reactions.parameterDomains.filter(domain =>
          domain.sourceDomain?.executorId === 'official-reaction-family-adapter-v1'),
      });
    } else if (currentState.phase === "start_of_round") {
      if (missionActivationPrecedesPriorityV13(currentState)
        && lifecycleState(currentState)?.step === 'determine_initiative') {
        if (sideKey === currentState.firstPlayerSideKey) {
          const tied = Number(currentState.scores.player1) === Number(currentState.scores.player2);
          output.candidates.push(wrapCandidate({ ...systemSourceAction(currentState,
            LIFECYCLE_ACTION_TYPES.INITIATIVE, INITIATIVE_ATOM_ID, tied ? initiativeChance() : null),
            isEnabled: true, disabledReason: '', score: 100 }, 'product_lifecycle'));
        }
      } else {
        const lifecycle = mission.enumerateLifecycle({ state: currentState, sideKey });
        output.candidates.push(...lifecycle.candidates.map((candidate) => (
          wrapCandidate({ ...candidate,
            isEnabled: true, disabledReason: "", score: 100 },
          "mission", [MISSION_ATOM_ID])
        )));
        if (missionActivationPrecedesPriorityV13(currentState)) {
          for (const request of lifecycle.chanceRequests) {
            output.candidates.push(wrapCandidate({ ...systemSourceAction(currentState,
              OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1, missionRoundPolicy.ruleAtomId,
              describeOfficialMissionMarkerChanceV1(request.rangeSize)),
              isEnabled: true, disabledReason: '', score: 100 }, 'product_lifecycle'));
          }
        }
      }
    } else if (native && ACTIVATION_PHASES.has(currentState.phase)) {
      if (isOfficialPhaseInitiativePendingV1(currentState) && !currentState.pendingOfficialReactionWindow) {
        output.candidates.push(...enumerateOfficialPhaseInitiativeActionsV1(
          currentState, { sideKey, includeDisabled },
        ).map(candidate => wrapCandidate(candidate, 'phase_initiative')));
      } else {
        const nativeMenu = native.enumerate(currentState, { sideKey, includeDisabled,
          seatOwnedWebMenu: rosterIncrement.seatOwnedWebMenu === true });
        addEnumeration(output, runtimeEnumeration(native, 'release_native', currentState, sideKey, includeDisabled, nativeMenu));
        if (releasePhaseControl && activeSide(currentState, sideKey)) {
          if (nativeMenu.releasePhaseControl === 'open') {
            addMissionActions(false);
            const combat = currentState.phase === 'combat';
            const passes = (combat ? enumerateOfficialCombatPassV3Actions : enumerateOfficialActivationPassActionsV1)(
              currentState, { sideKey, includeDisabled },
            );
            if (!nativeMenu.releaseNativePassOwned) {
              output.candidates.push(...passes.map(candidate => wrapCandidate(candidate, combat ? 'combat_pass' : 'activation_pass')));
            }
          } else if (nativeMenu.releasePhaseControl === 'mission_only' && currentState.phase === 'assault') {
            addMissionActions(true);
          }
        }
      }
    } else if (ACTIVATION_PHASES.has(currentState.phase)) {
      if (currentState.pendingOfficialReactionWindow) {
        const reactions=abilityEnumerations(runtimes.ability,currentState,sideKey,includeDisabled);
        addEnumeration(output,{
          candidates:reactions.candidates.filter(c=>c.sourceAction?.executorId==='official-reaction-family-adapter-v1'),
          parameterDomains:reactions.parameterDomains.filter(d=>d.sourceDomain?.executorId==='official-reaction-family-adapter-v1'),
        });
      } else if (currentState.pendingCurrentProductRangedCasualtyChoice) {
        addEnumeration(output, runtimeEnumeration(
          runtimes.ranged, "ranged", currentState, sideKey, includeDisabled,
        ));
      } else if (currentState.pendingAction?.schema === OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA
        && currentState.pendingAction.stage === "defender_casualty_selection") {
        // Passing ends voluntary activations, not the obligation to resolve an
        // opponent's attack. Native melee still enforces defender ownership.
        addEnumeration(output, runtimeEnumeration(
          runtimes.melee, "melee", currentState, sideKey, includeDisabled,
        ));
      } else if (currentOfficialSelectedRosterRangedSequenceV1(currentState)) {
        // Frozen §10.2: active abilities cannot interrupt an action. Weapon
        // batches belong to one ranged action; finish it before another choice.
        addEnumeration(output, runtimeEnumeration(
          runtimes.ranged, "ranged", currentState, sideKey, includeDisabled,
        ));
      } else if (isOfficialPhaseInitiativePendingV1(currentState)) {
        output.candidates.push(...enumerateOfficialPhaseInitiativeActionsV1(
          currentState, { sideKey, includeDisabled },
        ).map((candidate) => wrapCandidate(candidate, "phase_initiative")));
      } else if (activeSide(currentState, sideKey)) {
        const ability = abilityEnumerations(
          runtimes.ability, currentState, sideKey, includeDisabled,
        );
        if (currentState.selectedRosterActivationWindow) {
          if (currentState.selectedRosterActivationWindow.stage === "before_action") {
            // Native runtimes enforce the window's unit/side and one main
            // action. An active buff must not hide the action it prepares.
            addCoreActions();
            if (currentState.phase === "assault" && currentState.officialMissionRuntimeState?.missionFamily === "fire_in_the_sky") {
              addMissionActions(true);
            }
          }
          addEnumeration(output, ability);
        } else if (currentState.pendingAction) {
          addEnumeration(output, runtimeEnumeration(
            runtimes.melee, "melee", currentState, sideKey, includeDisabled,
          ));
        } else {
          addCoreActions();
          addEnumeration(output, ability);
          addMissionActions(false);
          const passes = currentState.phase === "combat"
            ? enumerateOfficialCombatPassV3Actions(currentState, {
              sideKey, includeDisabled,
            })
            : enumerateOfficialActivationPassActionsV1(currentState, {
              sideKey, includeDisabled,
            });
          output.candidates.push(...passes.map((candidate) => (
            wrapCandidate(candidate, currentState.phase === "combat"
              ? "combat_pass" : "activation_pass")
          )));
        }
      }
    } else if (currentState.phase === "cleanup"
      && lifecycleState(currentState)?.step === "round_end_choices") {
      if (sideKey === currentState.activeSideKey) {
        const opportunities = pendingRoundEndChoices(currentState)
          .filter(entry => entry.sideKey === sideKey);
        if (tokenRoundEnd?.canStart(currentState)) {
          addEnumeration(output, runtimeEnumeration(native, 'release_native', currentState, sideKey, includeDisabled));
        }
        if (sharedHoloEnd) {
          for (const domain of sharedHoloEnd.scheduledSurpriseDomains(currentState)) {
            output.parameterDomains.push(wrapDomain(domain, 'holo_round_end', currentState));
          }
        }
        for (const effect of (timedLife?.scheduledEffects(currentState) || []).filter(row => row.effectKind === 'remove_source')) {
          if (effect.sideKey === sideKey) output.candidates.push(wrapCandidate({
            ...timedLifeSourceAction(currentState, effect), isEnabled: true, disabledReason: "", score: 0,
          }, "product_lifecycle"));
        }
        const ids = new Set(opportunities.map(entry => entry.opportunityId));
        const sources = native ? new Set(opportunities.map(entry => entry.sourceDefinitionId)) : null;
        const ability = abilityEnumerations(runtimes.ability,
          currentState, sideKey, includeDisabled, sources);
        output.parameterDomains.push(...ability.parameterDomains.filter(domain =>
          ids.has(domain.sourceDomain?.constraints?.opportunityId)));
        output.candidates.push(...opportunities.map(opportunity => wrapCandidate({
          ...declineRoundEndSourceAction(currentState, opportunity),
          isEnabled: true, disabledReason: "", score: 0,
        }, "product_lifecycle")));
      }
    } else if (currentState.phase === "cleanup"
      && sideKey === currentState.firstPlayerSideKey) {
      const controlEvents = (currentState.log || []).flatMap((entry) => (
        entry?.events || []
      )).filter((event) => (
        event?.type === "mission_marker_control_determined"
          && Number(event.round) === Number(currentState.round)
      ));
      if (controlEvents.length > 1) {
        fail("CURRENT_PRODUCT_MATCH_MISSION_CONTROL_DUPLICATE");
      }
      if (controlEvents.length === 0) {
        output.candidates.push(wrapCandidate({
          ...prepareOfficialCurrentProductMissionControlV1(currentState, options),
          isEnabled: true,
          disabledReason: "",
          score: 110,
        }, "mission_control"));
      } else {
        const lifecycle = mission.enumerateLifecycle({ state: currentState, sideKey });
        if (lifecycle.candidates.length > 0) {
          output.candidates.push(...lifecycle.candidates.map((candidate) => (
            wrapCandidate({ ...candidate,
              isEnabled: true, disabledReason: "", score: 100 },
            "mission", [MISSION_ATOM_ID])
          )));
        } else {
          const progress = missionProgress(currentState);
          const step = lifecycleState(currentState)?.step || null;
          if (progress?.endGameChecked === true && !step) {
            output.candidates.push(wrapCandidate({
              ...systemSourceAction(currentState, LIFECYCLE_ACTION_TYPES.END_OF_ROUND,
                END_OF_ROUND_ATOM_ID),
              isEnabled: true, disabledReason: "", score: 100,
            }, "product_lifecycle"));
          } else if (step === "cleanup_and_refresh") {
            output.candidates.push(wrapCandidate({
              ...systemSourceAction(currentState, LIFECYCLE_ACTION_TYPES.CLEANUP,
                CLEANUP_ATOM_ID),
              isEnabled: true, disabledReason: "", score: 100,
            }, "product_lifecycle"));
          } else if (step === "determine_initiative") {
            const tied = Number(currentState.scores.player1)
              === Number(currentState.scores.player2);
            output.candidates.push(wrapCandidate({
              ...systemSourceAction(currentState, LIFECYCLE_ACTION_TYPES.INITIATIVE,
                INITIATIVE_ATOM_ID, tied ? initiativeChance() : null),
              isEnabled: true, disabledReason: "", score: 100,
            }, "product_lifecycle"));
          }
        }
      }
    }
    return freezeDeep({
      schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
      rulesRuntimeHash: descriptor.runtimeHash,
      stateSummary: phaseSummary(currentState),
      terminal: null,
      candidates: uniqueByHash(output.candidates).sort((left, right) => (
        String(left.actionType).localeCompare(String(right.actionType))
          || String(left.pieceId || "").localeCompare(String(right.pieceId || ""))
      )),
      parameterDomains: uniqueByHash(rosterIncrement.seatOwnedWebMenu ? output.parameterDomains.map(domain => {
        if (Object.hasOwn(domain, 'constraints')) return domain;
        // Public domains always carry a constraints object. Keep the native domain
        // and its hash intact: native preview still evaluates all placement rules.
        const core = { ...without(domain, ['domainId']), constraints: {} };
        return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
      }) : output.parameterDomains).sort((left, right) => (
        left.domainId.localeCompare(right.domainId)
      )),
      unsupportedDiagnostics: [],
      legalSpaceComplete: true,
      developmentSubset: Boolean(input.engineeringRoundScope),
      currentProductAbilityExactCount: descriptor.refreshSupplyOccupancyAfterTransition
        ? descriptor.currentProductAbilityExactCount : 252,
      currentProductAbilityPendingCount: descriptor.currentProductAbilityPendingCount,
      currentProductAbilityUnsupportedCount: 0,
      trainingTruth: false,
    });
  }

  function instantiate(currentState, domain, parameters, options = {}) {
    if (!object(domain) || !String(domain.domainId || "").startsWith("sc-domain-")
      || domain.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID
      || domain.sourceDomainHash
        !== hashStarcraftTmgContract(domain.sourceDomain)) {
      fail("CURRENT_PRODUCT_MATCH_PARAMETER_DOMAIN_INVALID");
    }
    const dropping = domain.sourceRuntimeKind === "artefact_drop";
    if (Boolean(artefactDrop?.enumerate(currentState, domain.sideKey).blockedByPendingDrop) !== dropping) {
      fail("CURRENT_PRODUCT_ARTEFACT_DROP_REQUIRED");
    }
    if (!dropping && artefactDrop?.claimWindow(currentState)) fail("CURRENT_PRODUCT_ARTEFACT_CLAIMS_PENDING");
    if (!dropping && domain.sourceRuntimeKind !== 'release_native') {
      assertRangedSequenceDispatch(currentState, domain.sourceRuntimeKind, domain.sourceDomain.executorId);
    }
    if (currentState.phase === "cleanup"
      && !enumerate(currentState, { ...options, sideKey: domain.sideKey })
        .parameterDomains.some(entry => entry.domainId === domain.domainId)) {
      fail("CURRENT_PRODUCT_MATCH_ROUND_END_CHOICE_UNAVAILABLE");
    }
    let instantiated;
    if (dropping) {
      instantiated = artefactDrop.instantiate(currentState, domain.sourceDomain, parameters);
    } else if (domain.sourceRuntimeKind === 'holo_round_end' && sharedHoloEnd) {
      instantiated = sharedHoloEnd.instantiateScheduledSurprise(currentState, domain.sourceDomain, parameters);
    } else if (domain.sourceRuntimeKind === 'release_native' && native) {
      instantiated = native.instantiate(currentState, domain.sourceDomain, parameters, options);
    } else if (domain.sourceRuntimeKind === "spatial") {
      instantiated = runtimes.spatial.instantiate(
        currentState, domain.sourceDomain, parameters, options,
      );
    } else if (domain.sourceRuntimeKind === "ranged") {
      instantiated = runtimes.ranged.instantiate(
        currentState, domain.sourceDomain, parameters, options,
      );
    } else if (domain.sourceRuntimeKind === "melee") {
      instantiated = runtimes.melee.instantiate(
        currentState, domain.sourceDomain, parameters, options,
      );
    } else if (domain.sourceRuntimeKind === "ability") {
      const preview = runtimes.ability.dispatch({
        operation: "preview",
        adapterId: domain.sourceDomain.executorId,
        state: currentState,
        request: { domain: domain.sourceDomain, parameters },
      });
      instantiated = {
        action: preview.action,
        canonicalParameters: findCanonicalParameters(preview.action, parameters),
      };
    } else {
      fail("CURRENT_PRODUCT_MATCH_PARAMETER_RUNTIME_INVALID",
        String(domain.sourceRuntimeKind || ""));
    }
    return freezeDeep({
      schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
      canonicalParameters: clone(instantiated.canonicalParameters),
      action: wrapAction(instantiated.action, domain.sourceRuntimeKind),
      rulesTruth: "official_current_product_match_parameter_dispatch",
      trainingTruth: false,
    });
  }

  function applyProductLifecycle(currentState, action, options) {
    const state = clone(currentState);
    const source = action.sourceAction;
    if (source.preStateHash !== hashStarcraftTmgContract(currentState)) {
      fail("CURRENT_PRODUCT_MATCH_LIFECYCLE_ACTION_STALE");
    }
    if (source.actionType === OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1) {
      if (!missionActivationPrecedesPriorityV13(state) || state.phase !== 'start_of_round'
        || lifecycleState(state)?.step === 'determine_initiative') fail('MISSION_MARKER_ROLL_WINDOW_INVALID');
      const request = mission.enumerateLifecycle({ state, sideKey: source.sideKey }).chanceRequests[0];
      if (!request || hashStarcraftTmgContract(source.chance)
        !== hashStarcraftTmgContract(describeOfficialMissionMarkerChanceV1(request.rangeSize))) {
        fail('MISSION_MARKER_ROLL_REQUEST_STALE');
      }
      const selected = resolveOfficialMissionMarkerChanceV1(request.rangeSize, options.chanceReveals);
      if (!selected.accepted) {
        const events = [{ type: 'current_product_mission_marker_roll_rejected', round: Number(state.round),
          chanceReveals: clone(options.chanceReveals), eligibleMarkerNumbers: clone(request.eligibleMarkerNumbers),
          reason: 'unbiased_selection_requires_another_native_roll', trainingTruth: false }];
        appendLog(state, source, events);
        return { state, events };
      }
      const randomReceiptHash = hashStarcraftTmgContract({ chanceRequestHash: request.chanceRequestHash,
        sourceActionHash: action.sourceActionHash, chanceReveals: options.chanceReveals });
      const child = mission.prepareStartOfRound({ state, chanceReveal: {
        schema: 'starcraft_tmg_rules_chance_reveal_v1', rangeSize: selected.rangeSize,
        outcomeIndex: selected.outcomeIndex, randomReceiptHash,
      } });
      const transition = mission.apply({ state, action: child });
      return { state: clone(transition.state), events: clone(transition.events) };
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.END_OF_ROUND) {
      const transitioned = applyAbilityLifecycle(runtimes.ability, state, "round_end");
      const next = clone(transitioned.state);
      advanceRoundEndChoices(next, timedLife, tokenRoundEnd);
      return { state: next, events: clone(transitioned.events) };
    }
    if (source.actionType === "resolve_unit_timed_life" && timedLife) {
      const effect = timedLife.scheduledEffects(state).find(row => row.effectKind === 'remove_source' && row.effectId === source.effectId);
      if (!effect || hashStarcraftTmgContract(source) !== hashStarcraftTmgContract(timedLifeSourceAction(state, effect))
        || options.chanceReveals?.length) fail("CURRENT_PRODUCT_MATCH_TIMED_LIFE_STALE");
      const resolved = sharedHoloEnd ? sharedHoloEnd.removeScheduledSource(state, effect.effectId) : timedLife.resolveScheduledRemoval(state, effect.effectId);
      const next = clone(resolved.state);
      advanceRoundEndChoices(next, timedLife, tokenRoundEnd);
      appendLog(next, source, resolved.events);
      return {state: next, events: resolved.events};
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.DECLINE_ROUND_END) {
      const opportunity = pendingRoundEndChoices(state).find(entry =>
        entry.opportunityId === source.opportunityId);
      if (lifecycleState(state)?.step !== "round_end_choices"
        || !opportunity || opportunity.sideKey !== source.sideKey
        || source.sideKey !== state.activeSideKey) {
        fail("CURRENT_PRODUCT_MATCH_ROUND_END_CHOICE_UNAVAILABLE");
      }
      state.pendingBattlefieldAssetOpportunities =
        state.pendingBattlefieldAssetOpportunities.filter(entry =>
          entry.opportunityId !== source.opportunityId);
      const events = [{type: "battlefield_asset_round_end_opportunity_declined",
        opportunityId: opportunity.opportunityId, assetId: opportunity.assetId,
        sideKey: source.sideKey, round: Number(state.round), trainingTruth: false}];
      advanceRoundEndChoices(state, timedLife, tokenRoundEnd);
      appendLog(state, source, events);
      return {state, events};
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.CLEANUP) {
      if (pendingRoundEndChoices(state).length || timedLife?.scheduledEffects(state).length
        || tokenRoundEnd?.pending(state) || tokenRoundEnd?.hasOutstanding(state)) {
        fail("CURRENT_PRODUCT_MATCH_ROUND_END_CHOICES_PENDING");
      }
      if ((rosterIncrement.includeZergTargetReactions && state.officialDarkSwarmTokenLifecyclePolicy)
        || (rosterIncrement.includeBombard && state.officialBombardRemovalLifecyclePolicy)) {
        const settled = native.lifecycle(state, { eventKind: 'cleanup_and_refresh' });
        return { state: clone(settled.state), events: clone(settled.events) };
      }
      const prepared = tokenRoundEnd ? tokenRoundEnd.cleanup(state) : state;
      const transitioned = applyAbilityLifecycle(
        runtimes.ability, rosterIncrement.includeStormTokenMatchCleanup ? cleanupOfficialPsionicStormTokensV1(prepared) : prepared, "cleanup_and_refresh",
      );
      return { state: completeOfficialCurrentProductCleanupStateV1(transitioned.state), events: clone(transitioned.events) };
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.INITIATIVE) {
      return resolveOfficialCurrentProductInitiativeV1(state, source, options, { openRoundActivation: openMatchRoundActivation, missionProgress });
    }

    fail("CURRENT_PRODUCT_MATCH_LIFECYCLE_ACTION_INVALID", source.actionType);
  }

  function artefactPlaceDomain(entry) {
    if (entry.sourceRuntimeKind === 'ability') return entry.sourceDomain;
    if (releaseNativeArtefactPlace && entry.sourceRuntimeKind === 'release_native'
      && (entry.sourceDomain.sourceRuntimeKind === 'relocation'
        || tokenRoundEnd && entry.sourceDomain.sourceRuntimeKind === 'psionic_round_end')) return entry.sourceDomain.sourceDomain;
    return null;
  }

  function suspendArtefactPlace(currentState, action, place, options) {
    const plan = place.relocationPlan ?? place;
    const domain = enumerate(currentState, { ...options, sideKey: place.sideKey })
      .parameterDomains.find(entry => entry.sourceRuntimeKind === action.sourceRuntimeKind
        && artefactPlaceDomain(entry)?.domainId === plan.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(currentState, domain,
      plan.canonicalParameters, options).action.sourceAction, action.sourceAction)) {
      fail('CURRENT_PRODUCT_ARTEFACT_PLACE_ACTION_STALE');
    }
    return artefactDrop.suspendPlace(currentState, place);
  }

  function apply(currentState, action, options = {}) {
    if (!object(action)
      || action.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID
      || action.executorVersion !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION
      || action.sourceActionHash !== hashStarcraftTmgContract(action.sourceAction)) {
      fail("CURRENT_PRODUCT_MATCH_ACTION_INVALID");
    }
    const source = action.sourceAction;
    if (releasePhaseControl && ['activation_pass', 'combat_pass'].includes(action.sourceRuntimeKind)) {
      const menu = native.enumerate(currentState, { sideKey: action.sideKey });
      if (menu.releasePhaseControl !== 'open' || menu.releaseNativePassOwned) fail('OFFICIAL_RELEASE_MATCH_PHASE_CONTROL_UNAVAILABLE');
    }
    const dropping = action.sourceRuntimeKind === "artefact_drop";
    const claiming = action.sourceRuntimeKind === "artefact_claim";
    if (Boolean(artefactDrop?.enumerate(currentState, action.sideKey).blockedByPendingDrop) !== dropping) {
      fail("CURRENT_PRODUCT_ARTEFACT_DROP_REQUIRED");
    }
    if (!dropping && Boolean(artefactDrop?.claimWindow(currentState)) !== claiming) {
      fail("CURRENT_PRODUCT_ARTEFACT_CLAIMS_PENDING");
    }
    if (!dropping && !claiming && currentState.pendingPsionicTransferRoundEnd && tokenRoundEnd
      && action.sourceRuntimeKind !== 'release_native') fail('PSIONIC_TRANSFER_ROUND_END_CHOICES_REQUIRED');
    if (!dropping && !claiming && action.sourceRuntimeKind !== 'release_native') {
      assertRangedSequenceDispatch(currentState, action.sourceRuntimeKind, source.executorId);
    }
    let transition;
    if (dropping) {
      transition = artefactDrop.apply(currentState, source);
      const resumed = artefactDrop.takeSuspendedPlace(transition.state);
      if (resumed) {
        const { state, suspension } = resumed;
        const domains = enumerate(state, { ...options, sideKey: suspension.sideKey })
          .parameterDomains.filter(entry => {
            const domain = artefactPlaceDomain(entry);
            if (suspension.kind === 'token_leading_place') return tokenRoundEnd && domain?.executorId === suspension.adapterId
              && domain.actionType === 'choose_psionic_transfer_round_end' && domain.pieceId === suspension.pieceId
              && domain.constraints.effectHash === suspension.effectHash;
            return domain?.executorId === suspension.adapterId
              && domain.actionType === 'resolve_relocation_ability' && domain.effectKind === 'direct_place'
              && domain.pieceId === suspension.pieceId && domain.definitionId === suspension.definitionId
              && domain.sourceInstanceId === suspension.sourceInstanceId
              && domain.constraints.sourceRouteHash === suspension.sourceRouteHash;
          });
        if (domains.length !== 1) fail("CURRENT_PRODUCT_ARTEFACT_PLACE_RESUME_DOMAIN_INVALID");
        const next = instantiate(state, domains[0], suspension.canonicalParameters, options);
        const completed = apply(state, next.action, options);
        transition = { state: completed.state, events: [...transition.events, ...completed.events] };
      }
    } else if (claiming) {
      transition = artefactDrop.applyClaimChoice(currentState, source);
    } else if (action.sourceRuntimeKind === 'holo_round_end' && sharedHoloEnd) {
      transition = sharedHoloEnd.applyScheduledSurprise(currentState, source, options);
    } else if (action.sourceRuntimeKind === "phase_initiative") {
      transition = applyOfficialPhaseInitiativeV1(currentState, source, options);
    } else if (action.sourceRuntimeKind === "activation_pass") {
      transition = applyOfficialActivationPassV1(currentState, source, options);
    } else if (action.sourceRuntimeKind === "combat_pass") {
      transition = applyOfficialCombatPassV3(currentState, source, options);
    } else if (action.sourceRuntimeKind === 'release_native' && native) {
      const place = releaseNativeArtefactPlace && (source.sourceRuntimeKind === 'relocation'
        || tokenRoundEnd && source.sourceRuntimeKind === 'psionic_round_end') ? source.sourceAction : null;
      transition = place && artefactDrop?.requiresPrePlaceDrop(currentState, place)
        ? suspendArtefactPlace(currentState, action, place, options) : native.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "spatial") {
      transition = runtimes.spatial.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "ranged") {
      transition = runtimes.ranged.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "melee") {
      transition = runtimes.melee.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "ability") {
      const usesBeaconPlan = (descriptor.engineeringRoundScope?.beaconRoundEndSourceBundleHash
        && source.executorId==='official-battlefield-asset-family-adapter-v1' && source.battlefieldAssetPlan)
        || (descriptor.releaseInheritedVentralSacs
        && source.definitionId === OFFICIAL_VENTRAL_SACS_DEFINITION_ID)
        || (descriptor.releaseSpecialDeploymentLifecycle
          && source.definitionId === OFFICIAL_WARP_PRISM_WARP_CONDUIT_DEFINITION_ID)
        || (descriptor.releaseDropship && source.definitionId === OFFICIAL_DROPSHIP_DUST_OFF_DEFINITION_ID);
      const roundEndDomainId = usesBeaconPlan ? source.battlefieldAssetPlan?.domainId : source.unitLifecyclePlan?.domainId;
      if (currentState.phase === "cleanup"
        && !(hasOfficialFaqReactionPolicyV13(currentState)
          && source.executorId === 'official-reaction-family-adapter-v1')
        && !enumerate(currentState, { ...options, sideKey: action.sideKey })
          .parameterDomains.some(domain => domain.sourceDomain?.domainId === roundEndDomainId)) {
        fail("CURRENT_PRODUCT_MATCH_ROUND_END_CHOICE_UNAVAILABLE");
      }
      if (artefactDrop?.requiresPrePlaceDrop(currentState, source)) {
        transition = suspendArtefactPlace(currentState, action, source, options);
      } else {
        transition = runtimes.ability.dispatch({
          operation: "apply",
          adapterId: source.executorId,
          state: currentState,
          request: { action: source, options },
        });
      }
    } else if (action.sourceRuntimeKind === "mission") {
      transition = mission.apply({ state: currentState, action: source });
    } else if (action.sourceRuntimeKind === "mission_control") {
      transition = applyOfficialCurrentProductMissionControlV1(currentState, action.sourceAction, options);
    } else if (action.sourceRuntimeKind === "product_lifecycle") {
      transition = applyProductLifecycle(currentState, action, options);
    } else {
      fail("CURRENT_PRODUCT_MATCH_ACTION_RUNTIME_INVALID",
        String(action.sourceRuntimeKind || ""));
    }
    if(action.sourceRuntimeKind==='ability'&&native?.afterExternalBeaconEntry){
      transition=native.afterExternalBeaconEntry(currentState,transition,source);
    }
    let stateAfter = clone(transition.state);
    let events = clone(transition.events || []);
    const order = native?.releaseAssaultOrder;
    if (order?.pending(stateAfter) && !order.resolvingChild(stateAfter)) {
      const { controllerSideKey } = order.group(stateAfter);
      if (controllerSideKey) {
        stateAfter.activeSideKey = controllerSideKey;
        const deferred = events.find(event => ['corrosive_bile_assault_end', 'poisonous_essence_assault_end'].includes(event.reason));
        if (deferred) {
          deferred.activeSideKey = controllerSideKey;
          const logged = stateAfter.log.at(-1)?.events?.find(event => event.reason === deferred.reason);
          if (logged) logged.activeSideKey = controllerSideKey;
        }
      } else {
        const moundWindow = stateAfter.officialDeferredMoundAssaultRound === Number(stateAfter.round);
        if (moundWindow) delete stateAfter.officialDeferredMoundAssaultRound;
        else {
          delete stateAfter.officialDeferredBileAssaultRound;
          stateAfter.corrosiveBilePhaseEndCompletedRound = Number(stateAfter.round);
        }
        if (stateAfter.officialSabotageDroneOrderedEffectHistory?.some(row => row.round === Number(stateAfter.round))) {
          stateAfter.sabotageDronePhaseEndCompletedRound = Number(stateAfter.round);
        }
        const completed = completeOfficialDeferredActivationPhaseV1(stateAfter, 'assault');
        stateAfter = completed.state;
        events.push(...completed.events);
        appendLog(stateAfter, { actionType: moundWindow ? 'complete_deferred_mound_assault' : 'complete_deferred_bile_assault' }, completed.events);
      }
    }
    if (descriptor.releaseSeekerAssaultTiming && currentState.officialDeferredSeekerAssaultRound === Number(currentState.round)
      && action.sourceRuntimeKind === 'release_native' && !stateAfter.pendingOfficialRavenSeekerPhaseEnd
      && !stateAfter.officialBeforeCasualtyContinuations?.length) {
      const group = pendingOfficialSeekerControllersV1(stateAfter);
      if (group?.controllerSideKey) stateAfter.activeSideKey = group.controllerSideKey;
      else {
        delete stateAfter.officialDeferredSeekerAssaultRound;
        const completed = completeOfficialDeferredActivationPhaseV1(stateAfter, 'assault');
        stateAfter = completed.state;
        events.push(...completed.events);
        appendLog(stateAfter, {actionType:'complete_deferred_seeker_assault'}, completed.events);
      }
    }
    if ((descriptor.releaseNovaShared || descriptor.engineeringRoundScope?.droneAssaultTimingPolicyHash)
      && currentState.officialDeferredDroneAssaultRound === Number(currentState.round)
      && stateAfter.sabotageDronePhaseEndCompletedRound === Number(currentState.round)
      && events.some(event => event.type === 'sabotage_drone_phase_end_completed')) {
      delete stateAfter.officialDeferredDroneAssaultRound;
      const completed = completeOfficialDeferredActivationPhaseV1(stateAfter, 'assault');
      stateAfter = completed.state;
      events.push(...completed.events);
      appendLog(stateAfter, {actionType:'complete_deferred_drone_assault'}, completed.events);
    }
    const hasSpecialDeploymentLifecycle = descriptor.engineeringRoundScope?.beaconRoundEndSourceBundleHash
      || descriptor.releaseSpecialDeploymentLifecycle
      || (descriptor.releaseVentralSacsCreepLifecycle && source.definitionId === OFFICIAL_VENTRAL_SACS_DEFINITION_ID);
    if (hasSpecialDeploymentLifecycle && action.sourceRuntimeKind === "ability"
      && events.some(event => event.type === "reserve_deployed_via_special_entry" && event.pieceId === source.pieceId)) {
      const lifecycle = consumeOfficialBattlefieldAssetMovementLifecycleV1(stateAfter,
        { actionType: "deploy", pieceId: source.pieceId });
      stateAfter = lifecycle.state;
      events.push(...lifecycle.events);
    }
    if (artefactDrop && action.sourceRuntimeKind === "mission_control") {
      stateAfter = artefactDrop.beginClaims(stateAfter, source.controlResolutionHash);
    }
    if (action.sourceRuntimeKind === "mission" && source.actionType === OFFICIAL_MISSION_SABOTAGE_ACTION_V1) {
      openOfficialSelectedRosterAfterActionWindowV1(stateAfter, source.sideKey, source.payload.pieceId, "assault");
    }
    if ((action.sourceRuntimeKind === 'ability' || action.sourceRuntimeKind === 'holo_round_end'
      || native?.hasExternalBeaconEntryContinuation?.(currentState)
      || (tokenRoundEnd && action.sourceRuntimeKind === 'release_native' && source.actionType === 'complete_psionic_transfer_round_end'))
      && lifecycleState(currentState)?.step === 'round_end_choices' && !stateAfter.pendingPsionicTransferRoundEnd
      && !native?.hasExternalBeaconEntryContinuation?.(stateAfter)) {
      if (action.sourceRuntimeKind === 'holo_round_end') appendLog(stateAfter, source, events);
      advanceRoundEndChoices(stateAfter, timedLife, tokenRoundEnd);
    }
    if (action.sourceRuntimeKind==='ability'
      && source.executorId==='official-reaction-family-adapter-v1') {
      const resumed=resumeOfficialSelectedRosterRangedDamageReactionV1(stateAfter,options);
      if (resumed) { stateAfter=clone(resumed.state); events.push(...clone(resumed.events||[])); }
      else if (stateAfter.pendingOfficialReactionWindow) {
        const window=stateAfter.pendingOfficialReactionWindow;
        stateAfter.activeSideKey=window.prioritySideKeys[window.priorityIndex];
      }
    }
    if ((action.sourceRuntimeKind === "mission" && source.actionType === OFFICIAL_MISSION_ACTION_TYPES.START_ROUND)
      || (source.actionType === OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1
        && missionProgress(stateAfter)?.startRoundApplied === true)) {
      let event;
      if (missionActivationPrecedesPriorityV13(stateAfter)) {
        stateAfter.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
          round: Number(stateAfter.round), step: 'determine_initiative', trainingTruth: false };
        stateAfter.stage = 'round_priority';
        stateAfter.activeSideKey = stateAfter.firstPlayerSideKey;
        event = { type: 'current_product_mission_activation_completed_before_priority', round: Number(stateAfter.round),
          missionRecordKey: stateAfter.officialMissionRuntimeState.missionRecordKey, trainingTruth: false };
      } else event = openMatchRoundActivation(stateAfter);
      events.push(event);
      const lastLog = stateAfter.log?.at(-1);
      if (lastLog) lastLog.events = [...(lastLog.events || []), clone(event)];
    }
    if ((["activation_pass", "combat_pass"].includes(action.sourceRuntimeKind)
      || releasePhaseControl && action.sourceRuntimeKind === 'release_native')
      && currentState.phase !== stateAfter.phase) {
      const lifecycle = applyAbilityLifecycle(
        runtimes.ability, stateAfter, "phase_end",
        { phase: currentState.phase },
      );
      stateAfter = clone(lifecycle.state);
      events.push(...clone(lifecycle.events || []));
    }
    const dropshipEndedActivation = descriptor.releaseDropship && action.sourceRuntimeKind === 'release_native'
      && source.sourceAction?.definitionId === OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID
      && events.some(event => event.type === 'unit_activation_finished' && event.pieceId === source.pieceId);
    const pylonEndedActivation = action.sourceRuntimeKind === 'release_native'
      && events.some(event => event.type === 'unit_activation_finished' && event.reason === 'pylon_warp_conduit'
        && event.pieceId === source.pieceId);
    const khalaiEndedActivation = descriptor.releaseKhalai && action.sourceRuntimeKind === 'release_native'
      && source.sourceAction?.definitionId === OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID
      && events.some(event => event.type === 'unit_activation_finished' && event.pieceId === source.pieceId);
    if (dropshipEndedActivation || pylonEndedActivation || khalaiEndedActivation || ((action.sourceRuntimeKind === "ability"
      || releasePhaseControl && action.sourceRuntimeKind === 'release_native')
      && source.actionType === "finish_activation")) {
      const lifecycle = applyAbilityLifecycle(
        runtimes.ability, stateAfter, "activation_end",
        { pieceId: source.pieceId },
      );
      stateAfter = clone(lifecycle.state);
      events.push(...clone(lifecycle.events || []));
    }
    if (artefactDrop && !dropping && stateAfter.gameOver !== true && stateAfter.terminal !== true) {
      const observation = artefactDrop.observeNativeTransition(currentState, stateAfter, events);
      stateAfter = observation.state;
      events.push(...observation.events);
    }
    if (rosterIncrement.includeBombardCreatorLoss && native?.observeBombardCreatorLoss) {
      const observed = native.observeBombardCreatorLoss(currentState, {state:stateAfter, events});
      stateAfter = observed.state;
      events = observed.events;
    }
    if (rosterIncrement.creatorTokenLifecycle) {
      const removals = settleOfficialCreatedTokensV1(stateAfter);
      if (rosterIncrement.includeAttachedEffectLoss) removals.push(...settleOfficialAttachedEffectLossV1(currentState,stateAfter));
      events.push(...removals);
      if (removals.length && stateAfter.log?.length > (currentState.log?.length ?? 0)) {
        const last = stateAfter.log.at(-1);
        last.events = [...(last.events ?? []), ...clone(removals)];
      }
    }
    if (descriptor.refreshSupplyOccupancyAfterTransition
      && stateAfter.officialRoundSupplyState?.round === Number(stateAfter.round)) {
      stateAfter.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: stateAfter });
    }
    return freezeDeep({
      ok: true,
      schemaVersion: "starcraft_tmg_current_product_match_transition_v1",
      runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
      runtimeVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
      postRevision: Number(options.postRevision || 0),
      state: stateAfter,
      action: clone(action),
      events,
      rulesTruth: "official_current_product_standard_2000_complete_match_runtime",
      trainingTruth: false,
    });
  }

  function queryTokenMovement(currentState, suppliedDomain, request, options = {}, extended = false) {
    const domain = enumerate(currentState, { ...options, sideKey: suppliedDomain?.sideKey })
      .parameterDomains.find(row => row.domainId === suppliedDomain?.domainId);
    if (!domain || !isDeepStrictEqual(domain, suppliedDomain) || domain.sourceRuntimeKind !== 'release_native') {
      fail('BATTLEFIELD_DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE');
    }
    const movementKind = domain.sourceDomain?.sourceRuntimeKind;
    const ordinary = movementKind === 'spatial' && ['move', 'run', 'deploy', 'disengage'].includes(domain.actionType);
    if (!ordinary && !(extended && ['melee', 'relocation'].includes(movementKind))) {
      fail('BATTLEFIELD_DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE');
    }
    const { parameters, tokenId, coordinate, precedingDisplacements } = request;
    return native.query(currentState, { queryKind: 'battlefield_token_displacement',
      pieceId: domain.pieceId, actionType: domain.actionType, parameters, tokenId,
      ...(extended && domain.definitionId ? { definitionId: domain.definitionId } : {}),
      ...(extended && domain.weaponName ? { weaponName: domain.weaponName } : {}),
      ...(extended && precedingDisplacements !== undefined ? { precedingDisplacements } : {}),
      ...(coordinate !== undefined ? { coordinate } : {}) });
  }

  return freezeDeep({
    descriptor,
    compositionEvidence: composition.evidence,
    ...(native ? { initialActionState: state,
      ...(rosterIncrement.creatorTokenLifecycle ? {queryCreatedTokens:inspectOfficialCreatedTokensV1} : {}),
      ...(rosterIncrement.includeAttachedEffectLoss ? {queryAttachedEffectLoss:inspectOfficialAttachedEffectLossV1} : {}),
      queryAbilityTiming(recordKey) {
        if (typeof recordKey !== 'string' || !/^(army_units|tactical_cards):/.test(recordKey)
          || !Object.hasOwn(dataset.recordsByKey,recordKey)) throw Error('ABILITY_TIMING_RECORD_UNKNOWN');
        const catalogue=native.catalogue;
        const definitions=catalogue.definitions.filter(row=>row.recordKey===recordKey)
          .map(row=>({definitionId:row.definitionId,sourceIndex:row.sourceIndex,sourceFeatureHash:row.sourceFeatureHash,
            name:row.definitionName,phase:row.phase,phaseOrigin:row.phaseOrigin ?? 'legacy_compiler',
            timingHooks:[...row.timingHooks]})).sort((a,b)=>a.sourceIndex-b.sourceIndex);
        return {schema:'native_record_ability_timing_v1',recordKey,definitions,
          sourceSnapshotHash:catalogue.sourceSnapshotHash,normalizedDatasetHash:catalogue.normalizedDatasetHash,
          sourcePolicyVersion:catalogue.sourcePhasePolicy?.version ?? null,executionEligibilityProven:false};
      },
    } : {}),
    missionRuntimeDescriptor: mission.descriptor,
    ...(native?.completeLungeMove ? { completeLungeMove(currentState, suppliedDomain, parameters, options = {}) {
      const domain = enumerate(currentState, { ...options, sideKey: suppliedDomain?.sideKey })
        .parameterDomains.find(row => row.domainId === suppliedDomain?.domainId);
      if (!isDeepStrictEqual(domain, suppliedDomain) || domain?.sourceRuntimeKind !== 'release_native') {
        fail('LUNGE_REACTION_DOMAIN_STALE');
      }
      return native.completeLungeMove(currentState, domain.sourceDomain, parameters);
    } } : {}),
    ...(rosterIncrement.includeNovaShared && state.officialReleaseDroneAssaultTiming ? {
      queryGriffinPlacement(currentState, pieceId, parameters) {
        return native.query(currentState, {queryKind:'unit_lifecycle_placement_preview', pieceId,
          definitionId:'card:nova_covert_ops/griffin-support-any@1', parameters});
      },
      querySabotageDrone(currentState, sourcePieceId) {
        return native.query(currentState, {queryKind:'sabotage_drone_phase_end', sourcePieceId});
      },
    } : {}),
    ...(native && rosterIncrement.includeOmegaWormStructure && state.officialStructureSourceBundle ? {
      queryStructureConstraints(currentState, pieceId) {
        return native.query(currentState, { queryKind: 'structure_constraints', pieceId });
      },
    } : {}),
    ...(native && (rosterIncrement.includeNovaShared && state.officialReleaseDroneAssaultTiming
      || rosterIncrement.includeZagaraArmyAbilities && state.officialZagaraPsionicLinkSource
      || rosterIncrement.includeOmegaWormDetection && state.officialDetectionHiddenLossPolicy
      || rosterIncrement.includeImmortal && state.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:immortal')) ? {
      queryWeaponCharacteristics(currentState, pieceId, attackContext) {
        return native.query(currentState, {queryKind:'characteristic_status_projection', pieceId, context:attackContext});
      },
    } : {}),
    ...(native?.personalTransport && rosterIncrement.includeVoidSeeker ? {
      queryPersonalTransport(currentState, pieceId, parameters) {
        return parameters === undefined
          ? native.query(currentState, { queryKind: 'personal_transport_options', pieceId })
          : native.query(currentState, { queryKind: 'personal_transport_preview', pieceId, parameters });
      },
    } : {}),
    ...(rosterIncrement.includeAdept && native?.battlefieldModifierBundle?.routes.some(route => route.requiresOwnAdeptShade) ? {
      queryAdeptShadePrecision(currentState, pieceId, targetPieceId) {
        if (typeof targetPieceId !== 'string') fail('ADEPT_SHADE_QUERY_TARGET_REQUIRED');
        return native.query(currentState, { queryKind: 'battlefield_modifiers', pieceId, targetPieceId });
      },
    } : {}),
    ...(tokenRoundEnd ? {
      queryDeepTunnelPlacement(currentState, pieceId, parameters) {
        return native.query(currentState, { queryKind: 'psionic_transfer_placement_preview', pieceId, parameters });
      },
      queryDeepTunnelRoundEnd(currentState) {
        return native.query(currentState, { queryKind: 'psionic_transfer_round_end' });
      },
      queryDeepTunnelRoundEndPlacement(currentState, pieceId, parameters) {
        return native.query(currentState, { queryKind: 'psionic_transfer_round_end_preview', pieceId, parameters });
      },
    } : {}),
    ...(rosterIncrement.includeDefilerBite && state.officialMeleeSidearmPolicy ? {
      queryFight(currentState, pieceId, weaponName, parameters) {
        const choices = enumerate(currentState, { sideKey: currentState.activeSideKey }).parameterDomains
          .filter(domain => domain.sourceRuntimeKind === 'release_native' && domain.actionType === 'fight'
            && domain.pieceId === pieceId && (weaponName === undefined || domain.weaponName === weaponName));
        if (!choices.length) fail('CHARACTERISTIC_MELEE_QUERY_DOMAIN_UNAVAILABLE');
        if (choices.length > 1) fail('CHARACTERISTIC_MELEE_QUERY_WEAPON_REQUIRED');
        return native.query(currentState, { queryKind: 'melee_action_preview', actionType: 'fight',
          pieceId, weaponName: choices[0].weaponName, parameters });
      },
    } : {}),
    ...(rosterIncrement.includeBombard && state.officialBombardSourceBundle ? {
      queryBombardPlacement(currentState, pieceId, parameters) {
        return native.query(currentState, { queryKind: 'bombard_placement_preview', pieceId, parameters });
      },
      queryBombardReplacement(currentState, parameters) {
        return native.query(currentState, { queryKind: 'bombard_creep_placement_preview', parameters });
      },
      queryBombardStatus(currentState) {
        return native.query(currentState, { queryKind: 'bombard_status' });
      },
    } : {}),
    ...(rosterIncrement.includePlague && state.officialPlagueResolutionPolicy ? {
      queryPlagueCoverage(currentState, pieceId, coordinate, biomassToSpend) {
        return native.query(currentState, { queryKind: 'plague_template_coverage', sourcePieceId: pieceId, coordinate, biomassToSpend });
      },
      queryPlagueCast(currentState, pieceId, parameters) {
        return native.query(currentState, { queryKind: 'plague_cast_preview', pieceId, parameters });
      },
    } : {}),
    ...(native?.battlefieldModifierBundle?.routes.some(route => (rosterIncrement.includeReactiveCreep && route.effectKind === 'on_creep_dodge')
      || (rosterIncrement.includeMalignantCreep && route.effectKind === 'on_creep_impact')
      || (rosterIncrement.includeCreepFootprintGeometry && ['source_of_creep', 'creep_token_place'].includes(route.effectKind))) ? {
      queryBattlefieldModifiers(currentState, pieceId, actionType) {
        return native.query(currentState, { queryKind: 'battlefield_modifiers', pieceId, ...(actionType === undefined ? {} : { actionType }) });
      },
    } : {}),
    ...(rosterIncrement.includeDefilerMound && state.officialReleaseMoundAssaultTiming ? {
      queryTunnelNetwork(currentState, pieceId) {
        const available = enumerate(currentState).parameterDomains.some(domain => domain.sourceRuntimeKind === 'release_native'
          && domain.definitionId === OFFICIAL_DEFILER_TUNNEL_NETWORK_ID && domain.pieceId === pieceId);
        if (!available) fail('TUNNEL_NETWORK_DOMAIN_UNAVAILABLE');
        return native.query(currentState, { queryKind: 'unit_lifecycle_placement_preview', pieceId,
          definitionId: OFFICIAL_DEFILER_TUNNEL_NETWORK_ID, parameters: { activeUnitId: pieceId, paymentCardInstanceIds: [] } });
      },
      queryPoisonousEssencePhaseEnd(currentState) {
        return native.query(currentState, { queryKind: 'poisonous_essence_phase_end' });
      },
    } : {}),
    ...(rosterIncrement.includeRavagerBile && state.officialReleaseBileAssaultTiming ? {
      queryCorrosiveBilePlacement(currentState, pieceId, parameters) {
        return native.query(currentState, { queryKind: 'corrosive_bile_placement_preview', pieceId, parameters });
      },
      queryCorrosiveBileProjection(currentState) {
        return native.query(currentState, { queryKind: 'corrosive_bile_projection' });
      },
    } : {}),
    ...(native?.registeredStorm ? {
      queryPsionicStormRules(current, sideKey, pieceId, definitionId, resolutionPhase) {
        return native.query(current, {queryKind: 'psionic_storm_source_rules', sideKey, pieceId, definitionId, resolutionPhase});
      },
      queryPsionicStormCast(current, pieceId, parameters) {
        return native.query(current, {queryKind: 'psionic_storm_cast_preview', pieceId, parameters});
      },
      queryPsionicStormPhaseEnd(current, anchorId) {
        return native.query(current, {queryKind: 'psionic_storm_phase_end_plan', anchorId});
      },
    } : {}),
    ...(rosterIncrement.includeRavenSeeker && state.officialSeekerAssaultTiming ? {
      querySeekerImpact(currentState, planHash) {
        return native.query(currentState, {queryKind: 'raven_seeker_missile_paid_impact', planHash});
      },
    } : {}),
    ...(rosterIncrement.includeZergTargetReactions && state.officialDarkSwarmPlacementSourceBundle ? {
      queryDarkSwarmPlacement(currentState, pieceId, parameters) {
        return native.query(currentState, { queryKind: 'dark_swarm_placement_preview', pieceId, parameters });
      },
    } : {}),
    ...(releaseCreepDisplacementQuery ? { queryCreepDisplacement: (current, domain, request, options) =>
      queryTokenMovement(current, domain, request, options) } : {}),
    ...((rosterIncrement.includeZergTargetReactions || input.engineeringRoundScope
      && native?.battlefieldModifierBundle?.routes.some(route=>route.effectKind==='stukov_creep'))
      && state.officialBattlefieldDisplacementPolicy?.movementQueriesReady ? {
      queryBattlefieldTokenDisplacement: (current, domain, request, options) =>
        queryTokenMovement(current, domain, request, options, true),
    } : {}),
    enumerate,
    instantiate,
    apply,
  });
}
