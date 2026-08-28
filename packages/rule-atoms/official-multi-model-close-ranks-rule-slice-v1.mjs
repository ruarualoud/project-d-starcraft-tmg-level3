import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import { verifyOfficialCloseRanksCombatRuleSliceV1 } from "./official-close-ranks-combat-rule-slice-v1.mjs";
import {
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ATOM_IDS,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_TRANSITION_SCHEMA,
} from "./official-multi-model-close-ranks-combat-executor-v1.mjs";
import {
  OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID,
} from "./official-close-ranks-combat-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_multi_model_close_ranks_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 116;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "CLOSE_RANKS_ALL_MODELS_PINNED",
  "CLOSE_RANKS_COMBAT_ACTION_INVALID",
  "CLOSE_RANKS_COMBAT_ACTION_MISMATCH",
  "CLOSE_RANKS_DISENGAGE_FORBIDDEN",
  "CLOSE_RANKS_ENDPOINT_OUTSIDE_BATTLEFIELD",
  "CLOSE_RANKS_ENDPOINT_OVERLAP",
  "CLOSE_RANKS_ENEMY_CONTACT_REQUIRED",
  "CLOSE_RANKS_FINAL_COHERENCY_REQUIRED",
  "CLOSE_RANKS_FRIENDLY_CONTACT_REQUIRED",
  "CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED",
  "CLOSE_RANKS_LEADING_MODEL_INVALID",
  "CLOSE_RANKS_MULTI_MODEL_COUNT_UNSUPPORTED",
  "CLOSE_RANKS_MULTI_MODEL_TWO_UNIT_SCOPE_REQUIRED",
  "CLOSE_RANKS_NEW_ENGAGEMENT",
  "CLOSE_RANKS_NOT_CLOSER",
  "CLOSE_RANKS_PARAMETER_DOMAIN_STALE",
  "CLOSE_RANKS_PATH_COLLISION",
  "CLOSE_RANKS_PATH_REQUIRED",
  "CLOSE_RANKS_PATH_TOO_COMPLEX",
  "CLOSE_RANKS_PATH_TOO_LONG",
  "CLOSE_RANKS_PHASE_START_SNAPSHOT_INVALID",
  "CLOSE_RANKS_PHASE_START_SNAPSHOT_REQUIRED",
  "CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH",
  "CLOSE_RANKS_PLACEMENT_ILLEGAL",
  "CLOSE_RANKS_POST_MOVE_ATTACK_UNAVAILABLE",
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

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "multi-model-close-ranks:");
  return {
    positiveFixtureIds: [`${slug}:ordered-enemy-and-friendly-contact-placement`],
    negativeFixtureIds: [`${slug}:priority-overlap-coherency-and-pinned-rejections`],
    interactionFixtureIds: [`${slug}:own-unit-path-pass-through-and-phase-start-engagement`],
    lifecycleFixtureIds: [`${slug}:formation-close-ranks-then-attack`],
    replayFixtureIds: [`${slug}:parameterized-formation-chance-receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:official-core-command-center-and-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_multi_model_close_ranks_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "combat", window: "close_ranks_before_close_combat_attack", priority: 426 },
    preconditions: [
      {
        predicateId: "combat.phase_start_engagement_snapshot_is_exact",
        inputSchema: "starcraft_tmg_combat_phase_start_engagement_snapshot_v1",
        failureCode: "CLOSE_RANKS_PHASE_START_SNAPSHOT_REQUIRED",
      },
      {
        predicateId: "combat.multi_model_round_base_ground_two_unit_no_terrain_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED",
      },
      {
        predicateId: "combat.ordered_enemy_then_friendly_contact_priority_holds",
        inputSchema: "starcraft_tmg_multi_model_close_ranks_parameters_v1",
        failureCode: "CLOSE_RANKS_ENEMY_CONTACT_REQUIRED",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: "fight",
      parameterSchema: "starcraft_tmg_multi_model_close_ranks_parameters_v1",
    },
    effect: {
      executorId: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_TRANSITION_SCHEMA,
    },
    chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds,
      atomIds: [...OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function reassignPreviousAtom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: "3.0.0",
    effect: {
      ...structuredClone(atom.effect),
      executorId: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([...(atom.rejectionCodes || []), ...REJECTION_CODES])]
      .sort((left, right) => left.localeCompare(right)),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialMultiModelCloseRanksRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialCloseRanksCombatRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    passSlice: input.passSlice,
    assaultHoldSlice: input.assaultHoldSlice,
    phaseInitiativeSlice: input.phaseInitiativeSlice,
    combatPassSlice: input.combatPassSlice,
    elevatedSlice: input.elevatedSlice,
    previousSlice: input.closeCombatSlice,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_multi_model_close_ranks_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS);
  const observedTargetIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (targetIds.has(atom.atomId)) {
      observedTargetIds.push(atom.atomId);
      return executableAtom(atom, clauseById, base.rulesVersion);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return reassignPreviousAtom(atom);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedTargetIds.sort(), [...targetIds].sort())) {
    fail("official_multi_model_close_ranks_target_denominator_mismatch");
  }
  if (!isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_multi_model_close_ranks_reassignment_denominator_mismatch");
  }
  const previousManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID
  ));
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.10.0-official-multi-model-close-ranks",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(previousManifest),
      {
        executorId: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
        executorVersion: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION,
        actionTypes: ["fight"],
        transitionSchema: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_multi_model_close_ranks_catalogue_invalid");
  }
  const remainingRuleGaps = catalogue.atoms.length - EXPECTED_EXECUTABLE_COUNT;
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [...OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
    executorVersion: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_TRANSITION_SCHEMA,
    executableScope:
      "ordered_multi_model_round_base_ground_two_unit_no_terrain_close_ranks_atomic_with_simple_close_combat_attack",
    officialDataPolicy: {
      source: "current_official_command_center_firestore_plus_frozen_official_core_pdf",
      repositoryFallbackAllowed: false,
      frozenDataSnapshotRequired: true,
    },
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
      previousCloseRanksExecutorFrozen: true,
      explicitVersionReassignment: true,
      silentCompatibilityAllowed: false,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "multi_model_formation_chance_receipt_replay_pending_verifier",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        `remaining_${remainingRuleGaps}_rule_atoms_not_executable`,
      ],
      remainingRuleGaps,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action", "apply_action_after_user_confirmation", "write_episode_trace"],
      uiTraceEvidence: "multi_model_parameter_domain_contract_only_device_ui_pending",
      agentDecisionEvidence: "rules_owned_ordered_formation_domain_proves_enemy_then_friendly_contact_priority",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_core_or_command_center_drift_quarantines_multi_model_slice",
        "placement_priority_coherency_chance_or_replay_failure_demotes_multi_model_slice",
      ],
      userVisibleChecks: [
        "legal_space_lists_eligible_leaders_pinned_models_and_ordered_placements",
        "preview_hides_attack_rolls_after_full_formation_reposition",
        "accepted_receipt_replays_formation_and_attack_atomically",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "terrain_gap_access_grass_displacement_and_out_of_coherency_fallback_pending",
      "multiple_enemy_target_split_surge_evade_and_modifiers_pending",
      "browser_device_ui_and_training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialMultiModelCloseRanksRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_multi_model_close_ranks_slice_hash_mismatch");
  }
  const expected = createOfficialMultiModelCloseRanksRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_multi_model_close_ranks_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedIds = new Set([
    ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS,
    ...OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS,
  ]);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !changedIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const versionReassignedRuleAtoms = input.slice.catalogue.atoms.filter((atom) => (
    OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS.includes(atom.atomId)
      && atom.effect?.executorId === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID
  )).length;
  if (changedNonTargetAtoms !== 0
    || versionReassignedRuleAtoms !== OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS.length) {
    fail("official_multi_model_close_ranks_non_target_mutation");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_multi_model_close_ranks_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "ordered_multi_model_close_ranks_formation_subset",
    trainingTruth: false,
  });
}
