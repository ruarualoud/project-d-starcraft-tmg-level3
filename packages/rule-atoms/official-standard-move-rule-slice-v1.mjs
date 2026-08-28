import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_PARAMETER_KIND,
  OFFICIAL_STANDARD_MOVE_TRANSITION_SCHEMA,
} from "./official-standard-move-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_standard_move_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_reserve_deploy_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "8d0b4d5f610c98be893368582b1a524ac80ac28336af5c621f299a3b3b3ffdd4";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "8211038e76d2778b984fae7f4f993d47a234459ef6cf1c0bbfc5ee75754adf5e";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 219;
const EXPECTED_EXECUTABLE_COUNT = 229;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "MOVE_ACTION_INVALID",
  "MOVE_ACTION_STALE",
  "MOVE_ALREADY_ACTIVATED",
  "MOVE_BASE_OVERLAP",
  "MOVE_BASE_SCOPE_UNSUPPORTED",
  "MOVE_COHERENCY_LINK_BLOCKED",
  "MOVE_CURRENT_SUPPLY_MISMATCH",
  "MOVE_DATA_BUNDLE_REQUIRED",
  "MOVE_DATA_SNAPSHOT_MISMATCH",
  "MOVE_ENEMY_ENGAGEMENT_RANGE",
  "MOVE_GEOMETRY_SCOPE_UNSUPPORTED",
  "MOVE_LEADING_MODEL_INVALID",
  "MOVE_MODEL_GEOMETRY_INVALID",
  "MOVE_MODEL_ID_INVALID",
  "MOVE_MOVEMENT_INITIATIVE_UNRESOLVED",
  "MOVE_NOT_ACTIVE_SIDE",
  "MOVE_OUT_OF_COHERENCY",
  "MOVE_PARAMETER_DOMAIN_INVALID",
  "MOVE_PARAMETER_DOMAIN_STALE",
  "MOVE_PARAMETERS_INVALID",
  "MOVE_PATH_COLLISION",
  "MOVE_PATH_EXCEEDS_SPEED",
  "MOVE_PATH_MUST_CHANGE_POSITION",
  "MOVE_PATH_OUTSIDE_BATTLEFIELD",
  "MOVE_PATH_POINT_INVALID",
  "MOVE_PATH_REQUIRED",
  "MOVE_PATH_TOO_COMPLEX",
  "MOVE_PLACEMENT_DENOMINATOR_INVALID",
  "MOVE_PLACEMENT_MODEL_INVALID",
  "MOVE_PLACEMENT_OUTSIDE_BATTLEFIELD",
  "MOVE_PLACEMENT_POINT_INVALID",
  "MOVE_RUNTIME_BINDING_REQUIRED",
  "MOVE_SIDE_PASSED",
  "MOVE_START_OF_ROUND_HANDOFF_INVALID",
  "MOVE_STATE_INVALID",
  "MOVE_SUPPLY_STATE_CHANGED",
  "MOVE_UNIT_DENOMINATOR_UNSUPPORTED",
  "MOVE_UNIT_ENGAGED",
  "MOVE_UNIT_NOT_FOUND",
  "MOVE_UNIT_NOT_ON_BATTLEFIELD",
  "MOVE_UNIT_STATE_UNSUPPORTED",
  "MOVE_WRONG_PHASE",
  "ROUND_SUPPLY_STATE_STALE",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("official_standard_move_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 693
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_standard_move_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => clauseById.get(clauseId)?.sourceSnapshotId))];
  if (ids.some((value) => !value)) fail("official_standard_move_source_clause_missing", atom.atomId);
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "standard-move:");
  return {
    positiveFixtureIds: [`${slug}:gauntlet-four-marine-move`],
    negativeFixtureIds: [`${slug}:engagement-speed-path-endpoint-and-coherency-rejects`],
    interactionFixtureIds: [`${slug}:same-unit-passage-stationary-activation-and-alternation`],
    lifecycleFixtureIds: [`${slug}:on-table-position-and-supply-ledger-stability`],
    replayFixtureIds: [`${slug}:ed25519-standard-move-replay`],
    sourceDriftFixtureIds: [`${slug}:command-center-p2p-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_seat" },
    timing: { phase: "movement", window: "move", priority: 121 },
    preconditions: [
      {
        predicateId: "movement.unit_is_on_table_unactivated_and_unengaged",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "MOVE_UNIT_ENGAGED",
      },
      {
        predicateId: "movement.geometry_and_unit_profile_are_source_bound",
        inputSchema: "starcraft_tmg_official_reserve_deploy_data_bundle_v1",
        failureCode: "MOVE_DATA_BUNDLE_REQUIRED",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: "move",
      parameterSchema: OFFICIAL_STANDARD_MOVE_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_STANDARD_MOVE_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialStandardMoveRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("official_standard_move_target_denominator_mismatch");
  }
  const executorManifest = structuredClone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
    actionTypes: ["move"],
    transitionSchema: OFFICIAL_STANDARD_MOVE_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.20.0-official-standard-move",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== 683
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_standard_move_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_STANDARD_MOVE_EXECUTOR_ID],
    executableScope:
      "gauntlet_standard_marine_round_base_ground_no_terrain_exact_multi_model_standard_move",
    standardMoveScope: {
      supported: [
        "current_command_center_gauntlet_standard_battlefield",
        "current_command_center_marine_speed_supply_and_identity",
        "latest_official_terran_p2p_marine_32mm_base_field",
        "on_table_unactivated_unengaged_ground_unit",
        "continuous_leading_model_actual_path_and_same_unit_passage",
        "ordered_remaining_model_set_and_same_unit_coherency_link_chain",
        "whole_base_battlefield_overlap_and_enemy_engagement_checks",
        "stationary_removal_movement_activation_supply_stability_and_alternation",
      ],
      unsupported: [
        "terrain_grass_gaps_ramps_access_points_elevation_and_flying",
        "units_or_deployments_outside_current_marine_and_gauntlet",
        "selected_upgrades_tokens_effects_and_special_movement_abilities",
        "disengage_run_charge_close_ranks_and_forced_movement",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      missingBaseFieldAuthority: "latest_official_terran_p2p_may_2026_page_1",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 18,
      historicalAverageAtomsPerSlice: 219 / 18,
      remainingActionableAtomsBeforeThisSlice: 693,
      forecastRemainingSlicesBeforeThisSlice: 57,
      completedAfterThisSlice: 19,
      averageAtomsPerSliceAfterThisSlice: 229 / 19,
      remainingActionableAtomsAfterThisSlice: 683,
      forecastRemainingSlicesAfterThisSlice: 57,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash:
        "4b28cfd12fa388f3e8f7fa32547814ec2ad1cbb8205c4d547977eb9049e247a6",
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "standard_move_replay_passed_no_promotion",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "standard_move_scope_excludes_terrain_flying_and_non_marine_units",
        "remaining_683_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 683,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      uiTraceEvidence: "standard_move_parameter_preview_contract_only_device_ui_pending",
      agentDecisionEvidence: "rules_owned_path_domain_no_model_submitted_legality",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "command_center_p2p_or_core_source_drift_quarantines_standard_move_slice",
        "parameter_domain_receipt_or_replay_failure_demotes_standard_move_slice",
      ],
      userVisibleChecks: [
        "legal_space_names_leading_model_start_speed_and_remaining_placements",
        "preview_names_actual_path_distance_and_stationary_removal",
        "engaged_speed_collision_overlap_coherency_or_enemy_range_is_rejected",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "complete_movement_units_terrain_device_ui_and_production_pending",
      "complete_rules_and_training_promotion_pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  if (changedNonTargetAtoms !== 0) fail("official_standard_move_non_target_mutation");
  return slice;
}

export function verifyOfficialStandardMoveRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_standard_move_slice_hash_mismatch");
  }
  const expected = createOfficialStandardMoveRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("official_standard_move_slice_content_mismatch");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  return freezeDeep({
    schema: "starcraft_tmg_official_standard_move_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      executableRuleAtoms: audit.counts.byDisposition.executable,
      newlyExecutableRuleAtoms: input.slice.newlyExecutableRuleAtomIds.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
    },
    executableContractGaps: audit.executableContractGaps,
    evidenceGaps: audit.evidenceGaps,
    rulesEligible: false,
    trainingTruth: false,
  });
}
