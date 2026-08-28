import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND,
  OFFICIAL_RESERVE_DEPLOY_TRANSITION_SCHEMA,
} from "./official-reserve-deploy-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_reserve_deploy_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_start_of_round_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "8ba3a8dc661c240b1ce1a65392f5b3d809e3067a5b7dee1ca39be82f076f9b5d";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "2fbc564066e63be0130cd95452fe9f0fddd0950f0aba1cce082478ebbb3d8fd4";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 189;
const EXPECTED_EXECUTABLE_COUNT = 219;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "DEPLOY_ACTION_INVALID",
  "DEPLOY_ACTION_STALE",
  "DEPLOY_ALREADY_ACTIVATED",
  "DEPLOY_BASE_OVERLAP",
  "DEPLOY_BASE_SCOPE_UNSUPPORTED",
  "DEPLOY_COHERENCY_LINK_BLOCKED",
  "DEPLOY_CURRENT_SUPPLY_MISMATCH",
  "DEPLOY_DATA_BUNDLE_REQUIRED",
  "DEPLOY_DATA_SNAPSHOT_MISMATCH",
  "DEPLOY_ENEMY_ENGAGEMENT_RANGE",
  "DEPLOY_ENEMY_ZONE_OF_INFLUENCE",
  "DEPLOY_ENTRY_COLOR_UNSUPPORTED",
  "DEPLOY_ENTRY_EDGE_SCOPE_UNSUPPORTED",
  "DEPLOY_ENTRY_EDGE_UNRESOLVED",
  "DEPLOY_ENTRY_POINT_INVALID",
  "DEPLOY_GEOMETRY_SCOPE_UNSUPPORTED",
  "DEPLOY_INSUFFICIENT_AVAILABLE_SUPPLY",
  "DEPLOY_LEADING_MODEL_INVALID",
  "DEPLOY_MODEL_GEOMETRY_INVALID",
  "DEPLOY_MODEL_ID_INVALID",
  "DEPLOY_MOVEMENT_INITIATIVE_UNRESOLVED",
  "DEPLOY_NOT_ACTIVE_SIDE",
  "DEPLOY_OUT_OF_COHERENCY",
  "DEPLOY_PARAMETER_DOMAIN_INVALID",
  "DEPLOY_PARAMETER_DOMAIN_STALE",
  "DEPLOY_PARAMETERS_INVALID",
  "DEPLOY_PATH_COLLISION",
  "DEPLOY_PATH_EXCEEDS_SPEED",
  "DEPLOY_PATH_MUST_MOVE",
  "DEPLOY_PATH_OUTSIDE_BATTLEFIELD",
  "DEPLOY_PATH_POINT_INVALID",
  "DEPLOY_PATH_REQUIRED",
  "DEPLOY_PATH_TOO_COMPLEX",
  "DEPLOY_PLACEMENT_DENOMINATOR_INVALID",
  "DEPLOY_PLACEMENT_MODEL_INVALID",
  "DEPLOY_PLACEMENT_OUTSIDE_BATTLEFIELD",
  "DEPLOY_PLACEMENT_POINT_INVALID",
  "DEPLOY_RUNTIME_BINDING_REQUIRED",
  "DEPLOY_SIDE_PASSED",
  "DEPLOY_START_OF_ROUND_HANDOFF_INVALID",
  "DEPLOY_STATE_INVALID",
  "DEPLOY_STATUS_SCOPE_UNSUPPORTED",
  "DEPLOY_UNIT_DENOMINATOR_UNSUPPORTED",
  "DEPLOY_UNIT_NOT_FOUND",
  "DEPLOY_UNIT_NOT_IN_RESERVES",
  "DEPLOY_UNIT_STATE_UNSUPPORTED",
  "DEPLOY_WRONG_PHASE",
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
    fail("official_reserve_deploy_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 723
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_reserve_deploy_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => clauseById.get(clauseId)?.sourceSnapshotId))];
  if (ids.some((value) => !value)) fail("official_reserve_deploy_source_clause_missing", atom.atomId);
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "reserve-deploy:");
  return {
    positiveFixtureIds: [`${slug}:gauntlet-four-marine-deploy`],
    negativeFixtureIds: [`${slug}:supply-speed-zone-overlap-and-coherency-rejects`],
    interactionFixtureIds: [`${slug}:start-supply-phase-initiative-pass-and-stationary`],
    lifecycleFixtureIds: [`${slug}:reserve-to-field-supply-ledger-activation`],
    replayFixtureIds: [`${slug}:ed25519-deploy-replay`],
    sourceDriftFixtureIds: [`${slug}:command-center-image-p2p-runtime-drift`],
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
    timing: { phase: "movement", window: "deploy", priority: 120 },
    preconditions: [
      {
        predicateId: "reserve.unit_and_round_supply_are_current",
        inputSchema: "starcraft_tmg_official_round_supply_state_v1",
        failureCode: "ROUND_SUPPLY_STATE_STALE",
      },
      {
        predicateId: "deployment.geometry_and_unit_profile_are_source_bound",
        inputSchema: "starcraft_tmg_official_reserve_deploy_data_bundle_v1",
        failureCode: "DEPLOY_DATA_BUNDLE_REQUIRED",
      },
    ],
      legalSpace: {
        kind: "parameter_domain",
        actionType: "deploy",
        parameterSchema: OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND,
      },
    effect: {
      executorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RESERVE_DEPLOY_TRANSITION_SCHEMA,
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

export function createOfficialReserveDeployRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("official_reserve_deploy_target_denominator_mismatch");
  }
  const executorManifest = structuredClone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
    actionTypes: ["deploy"],
    transitionSchema: OFFICIAL_RESERVE_DEPLOY_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.19.0-official-reserve-deploy",
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
    || catalogueAudit.counts.byDisposition.review_required !== 693
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_reserve_deploy_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID],
    executableScope:
      "gauntlet_standard_marine_round_base_ground_no_terrain_exact_multi_model_reserve_deploy",
    reserveDeployScope: {
      supported: [
        "current_command_center_gauntlet_standard_deployment",
        "current_command_center_marine_speed_supply_and_identity",
        "latest_official_terran_p2p_marine_32mm_base_field",
        "round_two_to_five_bound_supply_state",
        "continuous_entry_edge_and_leading_model_path_parameter_domain",
        "multi_model_ordered_placement_and_direct_unblocked_coherency_links",
        "whole_base_battlefield_overlap_engagement_and_enemy_influence_checks",
        "stationary_removal_movement_activation_supply_ledger_and_alternation",
      ],
      unsupported: [
        "terrain_access_points_tokens_and_non_round_bases",
        "units_or_deployments_outside_current_marine_and_gauntlet",
        "selected_upgrades_closed_list_disclosure_and_special_deploy_abilities",
        "coherency_links_that_require_a_same_unit_chain_around_an_obstacle",
        "round_one_setup_and_initial_first_player_roll_off",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      missingBaseFieldAuthority: "latest_official_terran_p2p_may_2026_page_1",
      currentDeploymentImageHash:
        "1ac74d299c875267d62da7f42bae736a24767425f2ca71726be23d83b3d20fcb",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 17,
      historicalAverageAtomsPerSlice: 189 / 17,
      remainingActionableAtomsBeforeThisSlice: 723,
      forecastRemainingSlicesBeforeThisSlice: 65,
      completedAfterThisSlice: 18,
      averageAtomsPerSliceAfterThisSlice: 219 / 18,
      remainingActionableAtomsAfterThisSlice: 693,
      forecastRemainingSlicesAfterThisSlice: 57,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "reserve_deploy_replay_passed_no_promotion",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "deploy_scope_is_not_complete_for_all_units_deployments_or_terrain",
        "remaining_693_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 693,
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
      uiTraceEvidence: "deploy_parameter_preview_contract_only_device_ui_pending",
      agentDecisionEvidence: "rules_owned_domain_no_model_submitted_legality_or_supply",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "command_center_p2p_image_or_core_source_drift_quarantines_deploy_slice",
        "parameter_domain_receipt_or_replay_failure_demotes_deploy_slice",
      ],
      userVisibleChecks: [
        "legal_space_names_entry_edge_speed_supply_and_required_model_placements",
        "preview_names_path_distance_supply_delta_and_stationary_removal",
        "invalid_supply_speed_overlap_coherency_engagement_or_zone_is_rejected",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "complete_move_deployments_units_terrain_rules_device_ui_and_production_pending",
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
  if (changedNonTargetAtoms !== 0) fail("official_reserve_deploy_non_target_mutation");
  return slice;
}

export function verifyOfficialReserveDeployRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_reserve_deploy_slice_hash_mismatch");
  }
  const expected = createOfficialReserveDeployRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("official_reserve_deploy_slice_content_mismatch");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  return freezeDeep({
    schema: "starcraft_tmg_official_reserve_deploy_rule_slice_audit_v1",
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
