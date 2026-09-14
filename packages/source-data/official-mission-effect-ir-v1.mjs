import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  verifyOfficialMissionDeploymentDraftDataBundleV1,
} from "./official-mission-deployment-draft-data-bundle-v1.mjs";
import {
  verifyOfficialMissionScoringProfileV1,
} from "./official-gameplay-data-bundle-v1.mjs";

export const OFFICIAL_MISSION_EFFECT_IR_VERSION =
  "starcraft_tmg_official_mission_effect_ir_v1";
export const OFFICIAL_MISSION_EFFECT_CATALOGUE_SCHEMA =
  "starcraft_tmg_official_mission_effect_catalogue_v1";
export const OFFICIAL_MISSION_EFFECT_LEGACY_ADAPTER_SCHEMA =
  "starcraft_tmg_official_mission_effect_legacy_hold_position_adapter_v1";

export const OFFICIAL_MISSION_EFFECT_KINDS = Object.freeze([
  "activate_random_eligible_marker",
  "activate_specific_marker",
  "battlefield_quarter_definition",
  "destroyed_enemy_supply_vp",
  "gather_standard_action_replacement",
  "marker_affinity_control_vp",
  "marker_control_vp",
  "marker_control_transfer_bonus_vp",
  "marker_five_control_vp",
  "quarter_supply_dominance_vp",
  "controlled_marker_activation_round_cashout_vp",
]);

const EXPECTATIONS = Object.freeze([
  Object.freeze({ missionId: "mission_divide_and_conquer",
    name: "Divide and Conquer", family: "divide_and_conquer", scale: "Standard",
    rounds: 4, startingSupply: 8, escalation: 2, lead: 10 }),
  Object.freeze({ missionId: "mission_divide_and_conquer__skirmish_",
    name: "Divide and Conquer (Skirmish)", family: "divide_and_conquer",
    scale: "Skirmish", rounds: 4, startingSupply: 4, escalation: 1, lead: 8 }),
  Object.freeze({ missionId: "mission_frontlines", name: "Frontlines",
    family: "frontlines", scale: "Standard", rounds: 5,
    startingSupply: 6, escalation: 2, lead: 10 }),
  Object.freeze({ missionId: "mission_frontlines__skirmish_",
    name: "Frontlines (Skirmish)", family: "frontlines", scale: "Skirmish",
    rounds: 5, startingSupply: 3, escalation: 1, lead: 8 }),
  Object.freeze({ missionId: "mission_gather_the_resources",
    name: "Gather the Resources", family: "gather_the_resources",
    scale: "Standard", rounds: 5, startingSupply: 6, escalation: 2, lead: 10 }),
  Object.freeze({ missionId: "mission_gather_the_resources__skirmish_",
    name: "Gather the Resources (Skirmish)", family: "gather_the_resources",
    scale: "Skirmish", rounds: 5, startingSupply: 3, escalation: 1, lead: 10 }),
  Object.freeze({ missionId: "mission_hold_position", name: "Hold Position",
    family: "hold_position", scale: "Standard", rounds: 5,
    startingSupply: 6, escalation: 2, lead: 10 }),
  Object.freeze({ missionId: "mission_hold_position__skirmish_",
    name: "Hold Position (Skirmish)", family: "hold_position",
    scale: "Skirmish", rounds: 5, startingSupply: 3, escalation: 1, lead: 8 }),
  Object.freeze({ missionId: "mission_supply_drop", name: "Supply Drop",
    family: "supply_drop", scale: "Standard", rounds: 5,
    startingSupply: 6, escalation: 2, lead: 12 }),
  Object.freeze({ missionId: "mission_supply_drop__skirmish_",
    name: "Supply Drop (Skirmish)", family: "supply_drop",
    scale: "Skirmish", rounds: 4, startingSupply: 4, escalation: 1, lead: 8 }),
]);

const EXPECTATION_BY_ID = new Map(EXPECTATIONS.map((entry) => [entry.missionId, entry]));
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function exactProfile(profile, expected) {
  if (!object(profile) || !expected
    || profile.missionId !== expected.missionId
    || profile.name !== expected.name
    || profile.engagementScale !== expected.scale
    || profile.gameLengthRounds !== expected.rounds
    || profile.startingSupply !== expected.startingSupply
    || profile.supplyEscalationPerRound !== expected.escalation
    || !HASH_PATTERN.test(String(profile.profileHash || ""))
    || !HASH_PATTERN.test(String(profile.sourceRecordHash || ""))
    || !HASH_PATTERN.test(String(profile.payloadHash || ""))) {
    fail("OFFICIAL_MISSION_EFFECT_PROFILE_DRIFT", profile?.missionId || "unknown");
  }
}

function setupFor(expected) {
  if (expected.family === "divide_and_conquer") {
    return {
      initialMarkerState: "activated",
      effects: [{
        kind: "battlefield_quarter_definition",
        quarterCount: 4,
        geometryAuthority: "selected_deployment_card",
        boundaryPolicy: "deployment_card_quarter_boundaries",
      }],
    };
  }
  if (expected.family === "supply_drop") {
    return { initialMarkerState: "deactivated", effects: [] };
  }
  return { initialMarkerState: "activated", effects: [] };
}

function roundStartFor(expected) {
  if (expected.family !== "supply_drop") return [];
  if (expected.scale === "Standard") {
    return [{
      kind: "activate_random_eligible_marker",
      rounds: [1, 2, 3, 4],
      eligibleMarkerNumbers: [1, 2, 3, 4],
      eligibility: "currently_deactivated",
      selectionAuthority: "rules_chance_reveal",
      activationRoundRecorded: true,
    }, {
      kind: "activate_specific_marker",
      rounds: [5],
      markerNumber: 5,
      activationRoundRecorded: true,
    }];
  }
  return [{
    kind: "activate_random_eligible_marker",
    rounds: [2, 3, 4],
    eligibleMarkerNumbers: [1, 2, 5],
    eligibility: "currently_deactivated",
    selectionAuthority: "rules_chance_reveal",
    activationRoundRecorded: true,
  }];
}

function actionsFor(expected) {
  if (expected.family !== "gather_the_resources") return [];
  return [{
    kind: "gather_standard_action_replacement",
    actionId: "mission_action:gather",
    phase: "assault",
    replaces: "standard_action",
    actorRequirements: { engaged: false },
    markerRequirements: {
      controlState: "controlled_by_actor",
      affinityRelativeToActor: ["neutral", "opponent"],
      withinInches: 3,
      distanceMode: "model_or_unit_to_marker_as_defined_by_rules",
    },
    effects: [{ kind: "gain_victory_points", amount: 1 }],
  }];
}

function objectiveScoringFor(expected) {
  switch (expected.family) {
    case "divide_and_conquer":
      return [{
        kind: "quarter_supply_dominance_vp",
        startsRound: 1,
        timing: "end_of_round_scoring",
        quarterCount: 4,
        supplyMeasure: "total_current_supply",
        whollyWithinQuarterRequired: true,
        controlledMarkerUnitSupplyBonus: 1,
        tiedQuarterVp: 0,
        vpPerWonQuarter: 1,
      }, {
        kind: "marker_five_control_vp",
        startsRound: 1,
        timing: "end_of_round_scoring",
        markerNumber: 5,
        vpPerControlledMarker: 2,
      }];
    case "frontlines":
      return [{
        kind: "marker_control_vp",
        startsRound: 2,
        timing: "end_of_round_scoring",
        affinityRelativeToActor: ["own", "opponent", "neutral"],
        vpPerControlledMarker: 1,
      }, {
        kind: "marker_control_transfer_bonus_vp",
        startsRound: 2,
        timing: "end_of_round_scoring",
        priorControllerRequired: "opponent",
        currentControllerRequired: "actor",
        gainedThisRoundRequired: true,
        additionalVpPerMarker: 2,
      }];
    case "gather_the_resources":
      return [{
        kind: "marker_affinity_control_vp",
        startsRound: 2,
        timing: "end_of_round_scoring",
        affinityRelativeToActor: ["opponent"],
        vpPerControlledMarker: 2,
      }];
    case "hold_position":
      return [{
        kind: "marker_affinity_control_vp",
        startsRound: 2,
        timing: "end_of_round_scoring",
        affinityRelativeToActor: ["neutral", "own"],
        vpPerControlledMarker: 1,
      }, {
        kind: "marker_affinity_control_vp",
        startsRound: 2,
        timing: "end_of_round_scoring",
        affinityRelativeToActor: ["opponent"],
        vpPerControlledMarker: 2,
      }];
    case "supply_drop":
      return [{
        kind: "controlled_marker_activation_round_cashout_vp",
        startsRound: expected.scale === "Standard" ? 1 : 2,
        timing: "end_of_round_scoring",
        markerStateRequired: "activated",
        controllerRequired: "actor",
        vpAmountSource: "marker_activation_round",
        removeMarkerAfterScoring: true,
      }];
    default:
      fail("OFFICIAL_MISSION_EFFECT_FAMILY_UNSUPPORTED", expected.family);
  }
}

function requiredFactsFor(expected) {
  const facts = new Set([
    "destroyed_enemy_supply_by_round",
    "round_number",
    "victory_points_by_side",
  ]);
  facts.add("mission_marker_control");
  if (["hold_position", "gather_the_resources"].includes(expected.family)) {
    facts.add("marker_affinity_relative_to_side");
  }
  if (expected.family === "divide_and_conquer") {
    facts.add("unit_wholly_within_deployment_quarter");
    facts.add("unit_current_supply");
    facts.add("unit_controls_mission_marker");
  }
  if (expected.family === "frontlines") facts.add("marker_control_history_by_round");
  if (expected.family === "gather_the_resources") {
    facts.add("unit_engagement_state");
    facts.add("unit_marker_distance");
  }
  if (expected.family === "supply_drop") {
    facts.add("marker_activation_state");
    facts.add("marker_activation_round");
    facts.add("rules_chance_reveal");
  }
  return [...facts].sort();
}

function compileMission(profile) {
  const expected = EXPECTATION_BY_ID.get(profile?.missionId);
  exactProfile(profile, expected);
  const sourceText = {
    missionParameters: profile.missionParameters,
    scoringConditions: profile.scoringConditions,
    additionalConditions: profile.additionalConditions,
  };
  const body = {
    schema: OFFICIAL_MISSION_EFFECT_IR_VERSION,
    missionRef: {
      recordKey: profile.recordKey,
      missionId: profile.missionId,
      missionName: profile.name,
      family: expected.family,
      engagementScale: expected.scale,
      sourceRecordHash: profile.sourceRecordHash,
      payloadHash: profile.payloadHash,
      sourceProfileHash: profile.profileHash,
    },
    pacing: {
      startingSupply: expected.startingSupply,
      supplyEscalationPerRound: expected.escalation,
      gameLengthRounds: expected.rounds,
    },
    setup: setupFor(expected),
    roundStartEffects: roundStartFor(expected),
    actionDefinitions: actionsFor(expected),
    scoring: {
      commonRules: [{
        kind: "destroyed_enemy_supply_vp",
        startsRound: 1,
        timing: "end_of_round_scoring",
        vpPerDestroyedEnemySupply: 1,
      }],
      objectiveRules: objectiveScoringFor(expected),
    },
    terminal: {
      immediateLeadThresholdVp: expected.lead,
      scheduledRoundLimit: expected.rounds,
      highestMissionScoreWins: true,
      finalTiebreaker: null,
      noTiebreakerFallback: "draw",
      armyEliminationRuleOwner: "core_rules",
    },
    requiredRuleFacts: requiredFactsFor(expected),
    source: {
      semanticExtraction: "reviewed_record_key_dispatch_v1",
      sourceText,
      sourceTextHash: hashStarcraftTmgContract(sourceText),
    },
    execution: {
      irCompileComplete: true,
      setupRuntimeBound: false,
      actionRuntimeBound: false,
      scoringRuntimeBound: false,
      terminalRuntimeBound: false,
      runtimeBindingOwner: expected.scale === "Standard"
        ? "ticket_23_slice_217" : "ticket_23_slice_218",
    },
    compatibility: {
      semanticVersion: "1.0.0",
      contentHashIsLineageNotCompatibilityGate: true,
      historicalAdaptersRequired: true,
    },
    rulesTruth: "official_current_mission_effect_typed_ir",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, missionEffectIrHash: hashStarcraftTmgContract(body) });
}

function catalogueBody(catalogue) {
  return without(catalogue, ["catalogueHash"]);
}

export function createOfficialMissionEffectCatalogueV1(input = {}) {
  const source = input.missionDeploymentDraftDataBundle;
  verifyOfficialMissionDeploymentDraftDataBundleV1(source);
  const missions = source.missionProfiles.map(compileMission)
    .sort((left, right) => left.missionRef.recordKey.localeCompare(
      right.missionRef.recordKey));
  const body = {
    schema: OFFICIAL_MISSION_EFFECT_CATALOGUE_SCHEMA,
    semanticVersion: "1.0.0",
    sourceLockHash: source.sourceLockHash,
    sourceSnapshotHash: source.sourceSnapshotHash,
    normalizedDatasetHash: source.normalizedDatasetHash,
    missionProfileIndexHash: source.missionProfileIndexHash,
    effectKinds: clone(OFFICIAL_MISSION_EFFECT_KINDS),
    missions,
    counts: {
      missionEffects: missions.length,
      standardMissionEffects: missions.filter((entry) => (
        entry.missionRef.engagementScale === "Standard")).length,
      skirmishMissionEffects: missions.filter((entry) => (
        entry.missionRef.engagementScale === "Skirmish")).length,
      runtimeBoundMissionEffects: missions.filter((entry) => (
        entry.execution.scoringRuntimeBound)).length,
    },
    compilerScope: "ten_current_official_missions_typed_ir_only",
    arbitraryProseCompilationClaimed: false,
    productionRoomBindingEligible: false,
    trainingTruth: false,
  };
  const catalogue = freezeDeep({ ...body,
    catalogueHash: hashStarcraftTmgContract(body) });
  verifyOfficialMissionEffectCatalogueV1(catalogue);
  return catalogue;
}

export function verifyOfficialMissionEffectCatalogueV1(catalogue) {
  if (!object(catalogue)
    || catalogue.schema !== OFFICIAL_MISSION_EFFECT_CATALOGUE_SCHEMA
    || catalogue.semanticVersion !== "1.0.0"
    || catalogue.catalogueHash !== hashStarcraftTmgContract(catalogueBody(catalogue))
    || catalogue.missions?.length !== 10
    || catalogue.counts?.missionEffects !== 10
    || catalogue.counts?.standardMissionEffects !== 5
    || catalogue.counts?.skirmishMissionEffects !== 5
    || catalogue.counts?.runtimeBoundMissionEffects !== 0
    || catalogue.arbitraryProseCompilationClaimed !== false
    || catalogue.productionRoomBindingEligible !== false
    || catalogue.trainingTruth !== false) {
    fail("OFFICIAL_MISSION_EFFECT_CATALOGUE_INVALID");
  }
  const expectedIds = EXPECTATIONS.map((entry) => entry.missionId).sort();
  const observedIds = catalogue.missions.map((entry) => entry.missionRef?.missionId).sort();
  if (hashStarcraftTmgContract(observedIds) !== hashStarcraftTmgContract(expectedIds)
    || catalogue.missions.some((entry) => (
      entry.schema !== OFFICIAL_MISSION_EFFECT_IR_VERSION
      || entry.missionEffectIrHash !== hashStarcraftTmgContract(
        without(entry, ["missionEffectIrHash"]))
      || entry.execution?.irCompileComplete !== true
      || entry.execution?.scoringRuntimeBound !== false
      || entry.compatibility?.contentHashIsLineageNotCompatibilityGate !== true
      || entry.trainingTruth !== false))) {
    fail("OFFICIAL_MISSION_EFFECT_CATALOGUE_INVALID");
  }
  return true;
}

export function getOfficialMissionEffectIrV1(catalogue, missionRecordKey) {
  verifyOfficialMissionEffectCatalogueV1(catalogue);
  const key = String(missionRecordKey || "").trim();
  const mission = catalogue.missions.find((entry) => entry.missionRef.recordKey === key);
  if (!mission) fail("OFFICIAL_MISSION_EFFECT_NOT_FOUND", key);
  return mission;
}

export function adaptLegacyHoldPositionMissionScoringProfileV1(input = {}) {
  const legacy = input.legacyMissionScoringProfile;
  verifyOfficialMissionScoringProfileV1(legacy);
  const mission = getOfficialMissionEffectIrV1(
    input.missionEffectCatalogue,
    legacy.recordKey,
  );
  if (mission.missionRef.missionId !== legacy.missionId
    || mission.missionRef.sourceRecordHash !== legacy.sourceRecordHash
    || mission.missionRef.payloadHash !== legacy.payloadHash
    || mission.pacing.gameLengthRounds !== legacy.gameLengthRounds
    || mission.pacing.startingSupply !== legacy.startingSupply
    || mission.pacing.supplyEscalationPerRound !== legacy.extraSupplyPerRound
    || mission.terminal.immediateLeadThresholdVp !== legacy.specialLeadWinThreshold) {
    fail("OFFICIAL_MISSION_EFFECT_LEGACY_ADAPTER_DRIFT");
  }
  const body = {
    schema: OFFICIAL_MISSION_EFFECT_LEGACY_ADAPTER_SCHEMA,
    semanticVersion: "1.0.0",
    sourceSchema: legacy.schema,
    sourceProfileHash: legacy.missionScoringProfileHash,
    targetSchema: mission.schema,
    targetMissionEffectIrHash: mission.missionEffectIrHash,
    missionRecordKey: legacy.recordKey,
    compatibilityOwnedBy: "semantic_version_and_explicit_adapter",
    sourceContentHashesRemainLineageOnly: true,
    runtimeExecutionClaimed: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, adapterHash: hashStarcraftTmgContract(body) });
}
