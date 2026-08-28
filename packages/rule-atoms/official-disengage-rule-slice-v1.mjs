import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DISENGAGE_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_NEW_ATOM_IDS,
  OFFICIAL_DISENGAGE_PARAMETER_KIND,
  OFFICIAL_DISENGAGE_TRANSITION_SCHEMA,
} from "./official-disengage-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_disengage_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_standard_move_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "bf5bfc6b33fb1904e62de4f82b35af8499af10413e02b7b0191b175d96d5b123";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "66580f1a4b5667f04cb0ead346e5bb7c01c11376b7ccfb7bc7af8edd1f6aa4d5";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 229;
const EXPECTED_EXECUTABLE_COUNT = 237;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "DISENGAGE_ACTION_INVALID",
  "DISENGAGE_ACTION_STALE",
  "DISENGAGE_ALREADY_ACTIVATED",
  "DISENGAGE_BASE_OVERLAP",
  "DISENGAGE_BASE_SCOPE_UNSUPPORTED",
  "DISENGAGE_CASUALTY_BRANCH_PENDING",
  "DISENGAGE_COHERENCY_LINK_BLOCKED",
  "DISENGAGE_CURRENT_SUPPLY_MISMATCH",
  "DISENGAGE_DATA_BUNDLE_REQUIRED",
  "DISENGAGE_DATA_SNAPSHOT_MISMATCH",
  "DISENGAGE_ENEMY_ENGAGEMENT_RANGE",
  "DISENGAGE_GEOMETRY_SCOPE_UNSUPPORTED",
  "DISENGAGE_LEADING_MODEL_INVALID",
  "DISENGAGE_MODEL_GEOMETRY_INVALID",
  "DISENGAGE_MODEL_ID_INVALID",
  "DISENGAGE_MOVEMENT_INITIATIVE_UNRESOLVED",
  "DISENGAGE_NOT_ACTIVE_SIDE",
  "DISENGAGE_OUT_OF_COHERENCY",
  "DISENGAGE_PARAMETER_DOMAIN_INVALID",
  "DISENGAGE_PARAMETER_DOMAIN_STALE",
  "DISENGAGE_PARAMETERS_INVALID",
  "DISENGAGE_PATH_COLLISION",
  "DISENGAGE_PATH_EXCEEDS_SPEED",
  "DISENGAGE_PATH_MUST_CHANGE_POSITION",
  "DISENGAGE_PATH_OUTSIDE_BATTLEFIELD",
  "DISENGAGE_PATH_POINT_INVALID",
  "DISENGAGE_PATH_REQUIRED",
  "DISENGAGE_PATH_TOO_COMPLEX",
  "DISENGAGE_PLACEMENT_DENOMINATOR_INVALID",
  "DISENGAGE_PLACEMENT_MODEL_INVALID",
  "DISENGAGE_PLACEMENT_OUTSIDE_BATTLEFIELD",
  "DISENGAGE_PLACEMENT_POINT_INVALID",
  "DISENGAGE_RUNTIME_BINDING_REQUIRED",
  "DISENGAGE_SIDE_PASSED",
  "DISENGAGE_START_OF_ROUND_HANDOFF_INVALID",
  "DISENGAGE_STATE_INVALID",
  "DISENGAGE_SUPPLY_STATE_CHANGED",
  "DISENGAGE_UNIT_DENOMINATOR_UNSUPPORTED",
  "DISENGAGE_UNIT_NOT_ENGAGED",
  "DISENGAGE_UNIT_NOT_FOUND",
  "DISENGAGE_UNIT_NOT_ON_BATTLEFIELD",
  "DISENGAGE_UNIT_STATE_UNSUPPORTED",
  "DISENGAGE_WRONG_PHASE",
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
    fail("official_disengage_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 683
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_disengage_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => clauseById.get(clauseId)?.sourceSnapshotId))];
  if (ids.some((value) => !value)) fail("official_disengage_source_clause_missing", atom.atomId);
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "disengage:");
  return {
    positiveFixtureIds: [`${slug}:successful-with-and-without-tactical-mass`],
    negativeFixtureIds: [`${slug}:unengaged-path-endpoint-coherency-and-casualty-branch-rejects`],
    interactionFixtureIds: [`${slug}:multi-enemy-supply-stationary-activation-and-alternation`],
    lifecycleFixtureIds: [`${slug}:following-assault-restriction-state-and-supply-stability`],
    replayFixtureIds: [`${slug}:ed25519-disengage-replay`],
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
    timing: { phase: "movement", window: "disengage", priority: 122 },
    preconditions: [
      {
        predicateId: "movement.unit_is_on_table_unactivated_and_engaged",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "DISENGAGE_UNIT_NOT_ENGAGED",
      },
      {
        predicateId: "movement.disengage_geometry_supply_and_unit_profile_are_source_bound",
        inputSchema: "starcraft_tmg_official_reserve_deploy_data_bundle_v1",
        failureCode: "DISENGAGE_DATA_BUNDLE_REQUIRED",
      },
      {
        predicateId: "movement.tactical_mass_is_evaluated_at_declaration",
        inputSchema: "starcraft_tmg_official_disengage_path_v1",
        failureCode: "DISENGAGE_PARAMETER_DOMAIN_STALE",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: "disengage",
      parameterSchema: OFFICIAL_DISENGAGE_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_DISENGAGE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_DISENGAGE_TRANSITION_SCHEMA,
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

export function createOfficialDisengageRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_DISENGAGE_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("official_disengage_target_denominator_mismatch");
  }
  const executorManifest = structuredClone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_DISENGAGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_EXECUTOR_VERSION,
    actionTypes: ["disengage"],
    transitionSchema: OFFICIAL_DISENGAGE_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.21.0-official-disengage",
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
    || catalogueAudit.counts.byDisposition.review_required !== 675
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_disengage_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_DISENGAGE_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_DISENGAGE_EXECUTOR_ID],
    executableScope:
      "gauntlet_standard_marine_round_base_ground_no_terrain_exact_successful_disengage_and_tactical_mass",
    disengageScope: {
      supported: [
        "current_command_center_gauntlet_standard_battlefield",
        "current_command_center_marine_speed_supply_and_identity",
        "latest_official_terran_p2p_marine_32mm_base_field",
        "on_table_unactivated_engaged_ground_unit",
        "continuous_leading_model_actual_path_and_same_unit_passage",
        "ordered_all-model-success_placement_and_same-unit-coherency-link-chain",
        "strictly-outside-all-enemy-engagement-ranges-after-disengage",
        "multi-enemy-current-supply-tactical-mass-at-declaration",
        "following-assault-ranged-attack-and-charge-restriction-state",
        "stationary-removal-movement-activation-supply-stability-and-alternation",
      ],
      unsupported: [
        "ordinary-model-disengage-casualty-resolution",
        "leading-model-disengage-failure-and-casualty-resolution",
        "terrain-grass-gaps-ramps-access-points-elevation-and-flying",
        "units-or-deployments-outside-current-marine-and-gauntlet",
        "burrowed-selected-upgrades-tokens-effects-and-special-movement-abilities",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      missingBaseFieldAuthority: "latest_official_terran_p2p_may_2026_page_1",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 19,
      historicalAverageAtomsPerSlice: 229 / 19,
      remainingActionableAtomsBeforeThisSlice: 683,
      forecastRemainingSlicesBeforeThisSlice: 57,
      completedAfterThisSlice: 20,
      averageAtomsPerSliceAfterThisSlice: 237 / 20,
      remainingActionableAtomsAfterThisSlice: 675,
      forecastRemainingSlicesAfterThisSlice: 57,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash:
        "a8f0facd1234cd20ba863c47fb7885eb2c816c1cb33b4142d41484e28b19eb80",
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
      crossTimeReplayResult: "disengage_replay_passed_no_promotion",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "disengage-casualty-terrain-flying-and-non-marine-branches-remain-fail-closed",
        "remaining-675-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 675,
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
      uiTraceEvidence: "disengage-parameter-preview-contract-only-device-ui-pending",
      agentDecisionEvidence: "rules-owned-path-and-tactical-mass-domain-no-model-legality",
      memoryTraceEvidence: "no-memory-or-skill-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "command-center-p2p-or-core-source-drift-quarantines-disengage-slice",
        "parameter-domain-restriction-receipt-or-replay-failure-demotes-disengage-slice",
      ],
      userVisibleChecks: [
        "legal-space-names-engaged-enemy-units-current-supply-and-tactical-mass",
        "preview-names-path-distance-and-following-assault-restrictions",
        "unengaged-collision-overlap-coherency-enemy-range-or-casualty-branch-is-rejected",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "disengage-casualty-branches-complete-movement-device-ui-and-production-pending",
      "complete-rules-and-training-promotion-pending",
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
  if (changedNonTargetAtoms !== 0) fail("official_disengage_non_target_mutation");
  return slice;
}

export function verifyOfficialDisengageRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_disengage_slice_hash_mismatch");
  }
  const expected = createOfficialDisengageRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("official_disengage_slice_content_mismatch");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_DISENGAGE_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  return freezeDeep({
    schema: "starcraft_tmg_official_disengage_rule_slice_audit_v1",
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
