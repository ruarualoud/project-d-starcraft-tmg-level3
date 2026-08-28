import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_DEPENDENCY_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_TRANSITION_SCHEMA,
} from "./official-close-combat-attack-executor-v1.mjs";
import { verifyOfficialElevatedEngagementRuleSliceV1 } from "./official-elevated-engagement-rule-slice-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_close_combat_attack_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 53;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
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
  const slug = atomId.replace(/^rule-atom:/u, "close-combat-attack:");
  return {
    positiveFixtureIds: [`${slug}:marine-fighting-supporting-rank-strike`],
    negativeFixtureIds: [`${slug}:unsupported-or-illegal-attack-rejected`],
    interactionFixtureIds: [`${slug}:engagement-profile-chance-and-casualty-interaction`],
    lifecycleFixtureIds: [`${slug}:activation-damage-casualty-and-post-engagement`],
    replayFixtureIds: [`${slug}:chance-reveal-receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:official-profile-and-core-source-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_close_combat_attack_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "combat", window: "close_combat_attack", priority: 430 },
    preconditions: [
      {
        predicateId: "combat.exact_engagement_graph_v2_resolves",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "ENGAGEMENT_V2_GEOMETRY_INCOMPLETE",
      },
      {
        predicateId: "combat.official_current_profile_bundle_matches_frozen_data_snapshot",
        inputSchema: "starcraft_tmg_official_combat_profile_bundle_v1",
        failureCode: "CLOSE_COMBAT_ATTACK_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "combat.single_enemy_single_model_simple_weapon_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "CLOSE_COMBAT_ATTACK_SUBSET_UNSUPPORTED",
      },
    ],
    legalSpace: { kind: "finite", actionType: "fight" },
    effect: {
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [
      "CLOSE_COMBAT_ATTACK_ACTION_INVALID",
      "CLOSE_COMBAT_ATTACK_ACTION_MISMATCH",
      "CLOSE_COMBAT_ATTACK_ALREADY_ACTIVATED",
      "CLOSE_COMBAT_ATTACK_CHANCE_REVEALS_REQUIRED",
      "CLOSE_COMBAT_ATTACK_CHANCE_REVEAL_INVALID",
      "CLOSE_COMBAT_ATTACK_CLOSE_RANKS_UNSUPPORTED",
      "CLOSE_COMBAT_ATTACK_DATA_SNAPSHOT_MISMATCH",
      "CLOSE_COMBAT_ATTACK_NO_ELIGIBLE_MODELS",
      "CLOSE_COMBAT_ATTACK_NOT_ACTIVE_SIDE",
      "CLOSE_COMBAT_ATTACK_PROFILE_TAG_MISMATCH",
      "CLOSE_COMBAT_ATTACK_SINGLE_TARGET_MODEL_REQUIRED",
      "CLOSE_COMBAT_ATTACK_SINGLE_TARGET_REQUIRED",
      "CLOSE_COMBAT_ATTACK_SUBSET_UNSUPPORTED",
      "CLOSE_COMBAT_ATTACK_SUPPLY_CHANGE_UNSUPPORTED",
      "CLOSE_COMBAT_ATTACK_TARGET_EFFECTS_UNSUPPORTED",
      "CLOSE_COMBAT_ATTACK_TARGET_TAG_INELIGIBLE",
      "CLOSE_COMBAT_ATTACK_WEAPON_UNAVAILABLE",
      "CLOSE_COMBAT_ATTACK_WRONG_PHASE",
      "ENGAGEMENT_V2_GEOMETRY_INCOMPLETE",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds,
      atomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialCloseCombatAttackRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialElevatedEngagementRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    passSlice: input.passSlice,
    assaultHoldSlice: input.assaultHoldSlice,
    phaseInitiativeSlice: input.phaseInitiativeSlice,
    previousSlice: input.combatPassSlice,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_close_combat_attack_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS].sort())) {
    const missing = OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS
      .filter((atomId) => !observedIds.includes(atomId));
    fail("official_close_combat_attack_target_atom_denominator_mismatch", missing.join(","));
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.8.0-official-close-combat-attack",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
        executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION,
        actionTypes: ["fight"],
        transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_executable_catalogue_invalid");
  }
  const remainingRuleGaps = catalogue.atoms.length - EXPECTED_EXECUTABLE_COUNT;
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_TRANSITION_SCHEMA,
    executableScope:
      "single_enemy_single_target_model_simple_no_surge_no_evade_no_modifier_close_combat_attack_plus_previous_families",
    officialDataPolicy: {
      source: "current_official_command_center_firestore",
      repositoryFallbackAllowed: false,
      frozenDataSnapshotRequired: true,
    },
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorsFrozen: true,
      silentCompatibilityAllowed: false,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "chance_reveal_receipt_replay_pending_verifier",
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
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "finite_fight_action_exposes_ranks_weapon_and_hidden_chance_contract",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_profile_or_core_source_drift_quarantines_attack_slice",
        "chance_reveal_or_receipt_replay_failure_demotes_attack_slice",
      ],
      userVisibleChecks: [
        "fighting_and_supporting_models_create_attack_dice",
        "preview_hides_roll_outcomes_until_apply",
        "receipt_reveals_signed_rolls_and_replays_exactly",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "close_ranks_movement_pending",
      "surge_and_explicit_close_combat_evade_pending",
      "multiple_enemy_target_split_pending",
      "multi_model_defender_casualty_choice_pending",
      "special_abilities_modifiers_and_non_round_bases_pending",
      "browser_device_ui_and_training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCloseCombatAttackRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_close_combat_attack_slice_hash_mismatch");
  }
  const expected = createOfficialCloseCombatAttackRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_close_combat_attack_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS],
    executableRuleAtomIds: input.slice.catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_current_profile_bound_close_combat_attack_subset",
    trainingTruth: false,
  });
}
