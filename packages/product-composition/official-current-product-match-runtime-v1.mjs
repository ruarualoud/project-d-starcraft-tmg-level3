import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialActivationPassV1,
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
  OFFICIAL_MISSION_ACTION_TYPES } from
  "../rule-atoms/official-mission-runtime-v2.mjs";
import { createOfficialRoundSupplyStateV1 } from
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

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID =
  "starcraft-tmg-official-current-product-match-runtime-v1";
export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION = "1.0.0";

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
  const body = {
    actionType: original.actionType,
    sideKey: original.sideKey,
    phase: original.phase,
    ...(original.pieceId ? { pieceId: original.pieceId } : {}),
    ...(original.abilityName ? { abilityName: original.abilityName } : {}),
    ...(original.chosenFirstActorSideKey
      ? { chosenFirstActorSideKey: original.chosenFirstActorSideKey } : {}),
    ...(original.chance ? { chance: clone(original.chance) } : {}),
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
function wrapDomain(domain, sourceRuntimeKind) {
  const original = clone(domain);
  const domainIdentity = {
    sourceRuntimeKind,
    sourceDomainId: original.domainId,
    sourceExecutorId: original.executorId,
    sourceExecutorVersion: original.executorVersion,
  };
  return freezeDeep({
    ...without(original, ["domainId", "executorId", "executorVersion", "ruleAtomIds"]),
    domainId: `sc-domain-${hashStarcraftTmgContract(domainIdentity)}`,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
    ruleAtomIds: candidateAtoms(original),
    sourceRuntimeKind,
    sourceDomain: original,
    sourceDomainHash: hashStarcraftTmgContract(original),
  });
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
function initiativeChance() {
  return freezeDeep({
    kind: "fixed_roll_sequence",
    faces: 6,
    count: 4,
    layout: { initiativePlayer1: 2, initiativePlayer2: 2 },
  });
}
function abilityEnumerations(runtime, state, sideKey, includeDisabled) {
  const result = runtime.dispatch({
    operation: "legal_space",
    state,
    options: { sideKey, phase: state.phase, includeDisabled,
      excludeAdapterIds: ABILITY_ADAPTERS_DISPATCHED_BY_DEDICATED_RUNTIMES },
  });
  const candidates = [];
  const parameterDomains = [];
  for (const output of result.executableEnumerations || []) {
    for (const candidate of output.result?.candidates || []) {
      candidates.push(wrapCandidate(candidate, "ability"));
    }
    for (const domain of output.result?.parameterDomains || []) {
      parameterDomains.push(wrapDomain(domain, "ability"));
    }
  }
  if ((result.pendingDiagnostics || []).length > 0) {
    fail("CURRENT_PRODUCT_MATCH_PENDING_ABILITY_DIAGNOSTIC");
  }
  return { candidates, parameterDomains };
}
function runtimeEnumeration(runtime, kind, state, sideKey, includeDisabled) {
  const result = runtime.enumerate(state, { sideKey, includeDisabled });
  return {
    candidates: (result.candidates || []).map((candidate) => (
      wrapCandidate(candidate, kind)
    )),
    parameterDomains: (result.parameterDomains || []).map((domain) => (
      wrapDomain(domain, kind)
    )),
  };
}
function addEnumeration(target, value) {
  target.candidates.push(...value.candidates);
  target.parameterDomains.push(...value.parameterDomains);
}
function nextRoundSupply(state) {
  const missionRuntimeHash = String(
    state.officialMissionRuntimeDescriptor?.runtimeHash || "",
  ).trim();
  if (!missionRuntimeHash) {
    fail("CURRENT_PRODUCT_MATCH_MISSION_RUNTIME_HASH_MISSING");
  }
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
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
  const state = input.state;
  const dataset = input.dataset;
  if (!object(state) || !object(dataset)
    || state.engagementScale !== "Standard"
    || state.board?.widthInches !== 54 || state.board?.heightInches !== 36
    || state.pieces?.length !== 15) {
    fail("CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID");
  }
  const composition = composeOfficialCurrentProductActionRuntimeV1({ dataset, state });
  verifyOfficialCurrentProductActionRuntimeCompositionV1(
    composition.state,
    composition.evidence,
  );
  const runtimes = composition.runtimes;
  const mission = createOfficialMissionRuntimeV2({
    missionEffectCatalogue: state.officialMissionEffectCatalogue,
  });
  const routedAtomIds = [
    DISPATCH_ATOM_ID, MISSION_ATOM_ID, MISSION_CONTROL_ATOM_ID,
    END_OF_ROUND_ATOM_ID,
    CLEANUP_ATOM_ID, INITIATIVE_ATOM_ID,
    ...OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
    ...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS,
    ...OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
    ...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS,
    ...runtimes.spatial.descriptor.routes.flatMap((route) => route.ruleAtomIds || []),
    ...runtimes.ranged.descriptor.routes.flatMap((route) => route.ruleAtomIds || []),
    ...runtimes.melee.descriptor.routes.flatMap((route) => route.ruleAtomIds || []),
  ];
  const executableRuleAtomIds = [...new Set(routedAtomIds)].sort();
  const catalogueHash = hashStarcraftTmgContract({
    abilityCoverageReleaseHash: state.officialCurrentProductAbilityCoverageRelease.releaseHash,
    missionRuntimeHash: mission.descriptor.runtimeHash,
    actionCompositionHash: composition.evidence.compositionHash,
    actionTypes: ACTION_TYPES,
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
    executorManifest: [{
      executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
      executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
      actionTypes: [...ACTION_TYPES],
    }],
    executableRuleAtomIds,
    executableRuleAtomCount: executableRuleAtomIds.length,
    nonExecutableRuleAtomCount: 0,
    legalSpaceComplete: true,
    legacyCompatibilityUsed: false,
    productionRoomEligible: true,
    ctx2skillPromotionEligible: false,
    currentProductAbilityExactCount: 252,
    currentProductAbilityPendingCount: 0,
    currentProductAbilityUnsupportedCount: 0,
    missionRuntimeHash: mission.descriptor.runtimeHash,
    actionCompositionHash: composition.evidence.compositionHash,
    rulesOwnDicePoolsChanceResultsScoringAndTerminal: true,
    agentOnlySelectsLegalActionsTargetsAndAllocations: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_standard_2000_complete_match_runtime",
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
    if (currentState.phase === "start_of_round") {
      const lifecycle = mission.enumerateLifecycle({ state: currentState, sideKey });
      output.candidates.push(...lifecycle.candidates.map((candidate) => (
        wrapCandidate({ ...candidate,
          isEnabled: true, disabledReason: "", score: 100 },
        "mission", [MISSION_ATOM_ID])
      )));
    } else if (ACTIVATION_PHASES.has(currentState.phase)) {
      if (isOfficialPhaseInitiativePendingV1(currentState)) {
        output.candidates.push(...enumerateOfficialPhaseInitiativeActionsV1(
          currentState, { sideKey, includeDisabled },
        ).map((candidate) => wrapCandidate(candidate, "phase_initiative")));
      } else if (activeSide(currentState, sideKey)) {
        const ability = abilityEnumerations(
          runtimes.ability, currentState, sideKey, includeDisabled,
        );
        if (currentState.selectedRosterActivationWindow) {
          addEnumeration(output, ability);
        } else if (currentState.pendingAction) {
          addEnumeration(output, runtimeEnumeration(
            runtimes.melee, "melee", currentState, sideKey, includeDisabled,
          ));
        } else {
          if (currentState.phase === "movement" || currentState.phase === "assault") {
            addEnumeration(output, runtimeEnumeration(
              runtimes.spatial, "spatial", currentState, sideKey, includeDisabled,
            ));
          }
          if (currentState.phase === "assault") {
            addEnumeration(output, runtimeEnumeration(
              runtimes.ranged, "ranged", currentState, sideKey, includeDisabled,
            ));
          }
          if (currentState.phase === "assault" || currentState.phase === "combat") {
            addEnumeration(output, runtimeEnumeration(
              runtimes.melee, "melee", currentState, sideKey, includeDisabled,
            ));
          }
          addEnumeration(output, ability);
          const missionActions = mission.enumerateLifecycle({
            state: currentState, sideKey,
          }).candidates;
          output.candidates.push(...missionActions.map((candidate) => (
            wrapCandidate({ ...candidate,
              isEnabled: true, disabledReason: "", score: 100 },
            "mission", [MISSION_ATOM_ID])
          )));
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
        const resolution = resolveOfficialMissionMarkerControlV2({
          state: currentState,
          terrainLosDataBundle: currentState.officialTerrainLosDataBundle,
          matchBinding: options.matchBinding,
        });
        output.candidates.push(wrapCandidate({
          ...missionControlSourceAction(currentState, resolution),
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
      parameterDomains: uniqueByHash(output.parameterDomains).sort((left, right) => (
        left.domainId.localeCompare(right.domainId)
      )),
      unsupportedDiagnostics: [],
      legalSpaceComplete: true,
      developmentSubset: false,
      currentProductAbilityExactCount: 252,
      currentProductAbilityPendingCount: 0,
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
    let instantiated;
    if (domain.sourceRuntimeKind === "spatial") {
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

  function applyMissionControl(currentState, action, options) {
    const source = action.sourceAction;
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

  function applyProductLifecycle(currentState, action, options) {
    const state = clone(currentState);
    const source = action.sourceAction;
    if (source.preStateHash !== hashStarcraftTmgContract(currentState)) {
      fail("CURRENT_PRODUCT_MATCH_LIFECYCLE_ACTION_STALE");
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.END_OF_ROUND) {
      const transitioned = applyAbilityLifecycle(runtimes.ability, state, "round_end");
      const next = clone(transitioned.state);
      next.currentProductMatchLifecycle = {
        schema: "starcraft_tmg_current_product_match_lifecycle_v1",
        round: Number(next.round), step: "cleanup_and_refresh",
        trainingTruth: false,
      };
      return { state: next, events: clone(transitioned.events) };
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.CLEANUP) {
      const transitioned = applyAbilityLifecycle(
        runtimes.ability, state, "cleanup_and_refresh",
      );
      const next = clone(transitioned.state);
      for (const piece of next.pieces) {
        piece.activatedPhases = { movement: false, assault: false, combat: false };
      }
      for (const sideKey of SIDE_KEYS) next.players[sideKey].passedPhases = {};
      next.firstPassSideByPhase = {};
      next.activeSideKey = null;
      delete next.selectedRosterActivationWindow;
      next.currentProductMatchLifecycle = {
        schema: "starcraft_tmg_current_product_match_lifecycle_v1",
        round: Number(next.round), step: "determine_initiative",
        trainingTruth: false,
      };
      return { state: next, events: clone(transitioned.events) };
    }
    if (source.actionType === LIFECYCLE_ACTION_TYPES.INITIATIVE) {
      const scores = SIDE_KEYS.map((sideKey) => Number(state.scores[sideKey]));
      let nextFirstPlayer = scores[0] < scores[1] ? "player1"
        : scores[1] < scores[0] ? "player2" : null;
      const events = [];
      if (!nextFirstPlayer) {
        const outcomes = (options.chanceReveals || []).map((entry) => Number(entry.outcome));
        if (outcomes.length !== 4 || outcomes.some((value) => (
          !Number.isSafeInteger(value) || value < 1 || value > 6
        ))) fail("CURRENT_PRODUCT_MATCH_INITIATIVE_CHANCE_INVALID");
        const player1Total = outcomes[0] + outcomes[1];
        const player2Total = outcomes[2] + outcomes[3];
        if (player1Total === player2Total) {
          events.push({ type: "current_product_initiative_roll_tied",
            round: Number(state.round), outcomes, player1Total, player2Total,
            trainingTruth: false });
          appendLog(state, source, events);
          return { state, events };
        }
        nextFirstPlayer = player1Total > player2Total ? "player1" : "player2";
        events.push({ type: "current_product_initiative_roll_resolved",
          round: Number(state.round), outcomes, player1Total, player2Total,
          nextFirstPlayer, trainingTruth: false });
      } else {
        events.push({ type: "current_product_lower_score_receives_initiative",
          round: Number(state.round), scores: clone(state.scores), nextFirstPlayer,
          trainingTruth: false });
      }
      state.firstPlayerSideKey = nextFirstPlayer;
      state.round = Number(state.round) + 1;
      state.phase = "start_of_round";
      state.stage = "mission_start_of_round";
      state.activeSideKey = nextFirstPlayer;
      delete state.currentProductMatchLifecycle;
      appendLog(state, source, events);
      return { state, events };
    }
    fail("CURRENT_PRODUCT_MATCH_LIFECYCLE_ACTION_INVALID", source.actionType);
  }

  function apply(currentState, action, options = {}) {
    if (!object(action)
      || action.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID
      || action.executorVersion !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION
      || action.sourceActionHash !== hashStarcraftTmgContract(action.sourceAction)) {
      fail("CURRENT_PRODUCT_MATCH_ACTION_INVALID");
    }
    const source = action.sourceAction;
    let transition;
    if (action.sourceRuntimeKind === "phase_initiative") {
      transition = applyOfficialPhaseInitiativeV1(currentState, source, options);
    } else if (action.sourceRuntimeKind === "activation_pass") {
      transition = applyOfficialActivationPassV1(currentState, source, options);
    } else if (action.sourceRuntimeKind === "combat_pass") {
      transition = applyOfficialCombatPassV3(currentState, source, options);
    } else if (action.sourceRuntimeKind === "spatial") {
      transition = runtimes.spatial.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "ranged") {
      transition = runtimes.ranged.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "melee") {
      transition = runtimes.melee.apply(currentState, source, options);
    } else if (action.sourceRuntimeKind === "ability") {
      transition = runtimes.ability.dispatch({
        operation: "apply",
        adapterId: source.executorId,
        state: currentState,
        request: { action: source, options },
      });
    } else if (action.sourceRuntimeKind === "mission") {
      transition = mission.apply({ state: currentState, action: source });
    } else if (action.sourceRuntimeKind === "mission_control") {
      transition = applyMissionControl(currentState, action, options);
    } else if (action.sourceRuntimeKind === "product_lifecycle") {
      transition = applyProductLifecycle(currentState, action, options);
    } else {
      fail("CURRENT_PRODUCT_MATCH_ACTION_RUNTIME_INVALID",
        String(action.sourceRuntimeKind || ""));
    }
    let stateAfter = clone(transition.state);
    let events = clone(transition.events || []);
    if (action.sourceRuntimeKind === "mission"
      && source.actionType === OFFICIAL_MISSION_ACTION_TYPES.START_ROUND) {
      nextRoundSupply(stateAfter);
      stateAfter.phase = "movement";
      stateAfter.stage = "activation_phases";
      stateAfter.activeSideKey = stateAfter.firstPlayerSideKey;
      delete stateAfter.phaseFirstActorByRound?.[
        `${stateAfter.round}:movement`
      ];
      const event = { type: "current_product_round_activation_opened",
        round: Number(stateAfter.round), phase: "movement",
        activeSideKey: stateAfter.activeSideKey,
        supplyPoolBySide: clone(stateAfter.officialRoundSupplyState.supplyPoolBySide),
        trainingTruth: false };
      events.push(event);
      const lastLog = stateAfter.log?.at(-1);
      if (lastLog) lastLog.events = [...(lastLog.events || []), clone(event)];
    }
    if (["activation_pass", "combat_pass"].includes(action.sourceRuntimeKind)
      && currentState.phase !== stateAfter.phase) {
      const lifecycle = applyAbilityLifecycle(
        runtimes.ability, stateAfter, "phase_end",
        { phase: currentState.phase },
      );
      stateAfter = clone(lifecycle.state);
      events.push(...clone(lifecycle.events || []));
    }
    if (action.sourceRuntimeKind === "ability"
      && source.actionType === "finish_activation") {
      const lifecycle = applyAbilityLifecycle(
        runtimes.ability, stateAfter, "activation_end",
        { pieceId: source.pieceId },
      );
      stateAfter = clone(lifecycle.state);
      events.push(...clone(lifecycle.events || []));
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

  return freezeDeep({
    descriptor,
    compositionEvidence: composition.evidence,
    missionRuntimeDescriptor: mission.descriptor,
    enumerate,
    instantiate,
    apply,
  });
}
