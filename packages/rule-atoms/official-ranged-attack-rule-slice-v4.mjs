import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV3 } from
  "./official-attack-resolution-kernel-v3.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
} from "./official-ranged-attack-executor-v3.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V4_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V4_TRANSITION_SCHEMA,
} from "./official-ranged-attack-executor-v4.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v4";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v3";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "0d68450f701457621daeaa58443befc917887e5ed71678f76193f3275c394a29";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "72fc2527650f54b66e8c5faf4991a23eab97acbd5d9aea8bc0283ef7e867a669";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 283;
const EXPECTED_EXECUTABLE_COUNT = 299;
const RANGED_V4_REJECTION_CODES = Object.freeze([
  "ATTACK_ANTI_EVADE_PARAMETERS_INVALID",
  "ATTACK_CHANCE_REVEALS_REQUIRED",
  "ATTACK_CHANCE_REVEAL_INVALID",
  "ATTACK_EFFECT_HANDLER_UNAVAILABLE",
  "ATTACK_EVADE_ELIGIBILITY_REQUIRED",
  "ATTACK_EVADE_ELIGIBILITY_UNSUPPORTED",
  "ATTACK_EVADE_NULL_VALUE",
  "ATTACK_PROFILE_INVALID",
  "ATTACK_RESOLUTION_PLAN_INVALID",
  "ATTACK_RESOLUTION_PROFILE_MISMATCH",
  "ATTACK_TARGET_OUT_OF_RANGE",
  "RANGED_ATTACK_V4_ACTION_INVALID",
  "RANGED_ATTACK_V4_ACTION_MISMATCH",
  "RANGED_ATTACK_V4_ACTION_STALE",
  "RANGED_ATTACK_V4_ALREADY_ACTIVATED",
  "RANGED_ATTACK_V4_BASE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V4_DATA_SNAPSHOT_MISMATCH",
  "RANGED_ATTACK_V4_ENGAGED_TARGET_REQUIRED",
  "RANGED_ATTACK_V4_MODEL_GEOMETRY_INVALID",
  "RANGED_ATTACK_V4_NOT_ACTIVE_SIDE",
  "RANGED_ATTACK_V4_POST_DISENGAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V4_PROFILE_SOURCE_MISMATCH",
  "RANGED_ATTACK_V4_SIDE_PASSED",
  "RANGED_ATTACK_V4_STATE_INVALID",
  "RANGED_ATTACK_V4_TARGET_DAMAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V4_TARGET_UNAVAILABLE",
  "RANGED_ATTACK_V4_TERRAIN_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V4_UNIT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V4_UNIT_UNAVAILABLE",
  "RANGED_ATTACK_V4_WRONG_PHASE",
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
    fail("official_ranged_attack_v4_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 629
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v4_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_ranged_attack_v4_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "ranged-attack-v4:");
  return {
    positiveFixtureIds: [`${slug}:engaged-adept-glaive-vs-marine`],
    negativeFixtureIds: [`${slug}:nonengaged-null-evade-modified-or-drifted-scope-rejects`],
    interactionFixtureIds: [`${slug}:anti-evade-armour-evade-damage-stage-order`],
    lifecycleFixtureIds: [`${slug}:activation-damage-casualty-and-phase-settlement`],
    replayFixtureIds: [`${slug}:ed25519-replay-survives-hmac-rotation`],
    sourceDriftFixtureIds: [`${slug}:profile-modifier-base-source-and-snapshot-drift`],
  };
}

function executableRangedV4Atom(atom, clauseById, rulesVersion, reassigned) {
  return {
    atomId: atom.atomId,
    atomVersion: reassigned ? "4.0.0" : "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "assault", window: "ranged_attack", priority: 340 },
    preconditions: [
      {
        predicateId: "assault.atomic_attack_profile_matches_frozen_official_snapshot",
        inputSchema: "starcraft_tmg_official_attack_profile_catalogue_v1",
        failureCode: "RANGED_ATTACK_V4_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "assault.attacker_and_target_share_the_exact_engagement_edge",
        inputSchema: "starcraft_tmg_official_engagement_graph_v2",
        failureCode: "RANGED_ATTACK_V4_ENGAGED_TARGET_REQUIRED",
      },
      {
        predicateId: "assault.evade_is_granted_and_has_a_non_null_target_number",
        inputSchema: "starcraft_tmg_official_attack_resolution_plan_v3",
        failureCode: "ATTACK_EVADE_NULL_VALUE",
      },
      {
        predicateId: "assault.modifier_changes_target_number_before_roll_with_natural_bounds",
        inputSchema: "starcraft_tmg_official_attack_resolution_plan_v3",
        failureCode: "ATTACK_ANTI_EVADE_PARAMETERS_INVALID",
      },
      {
        predicateId: "assault.unmodified_single_model_adept_vs_engaged_marine_or_frozen_v3_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "RANGED_ATTACK_V4_UNIT_SCOPE_UNSUPPORTED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RANGED_ATTACK_V4_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...RANGED_V4_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_RANGED_ATTACK_V4_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialRangedAttackRuleSliceV4(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableRangedV4Atom(atom, clauseById, base.rulesVersion, false);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return executableRangedV4Atom(atom, clauseById, base.rulesVersion, true);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_ranged_attack_v4_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE],
    transitionSchema: OFFICIAL_RANGED_ATTACK_V4_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.26.0-official-anti-evade-and-engaged-ranged-evade",
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
    || catalogueAudit.counts.byDisposition.review_required !== 613
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v4_catalogue_invalid");
  }
  const kernel = createOfficialAttackResolutionKernelV3();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID],
    effectKernel: {
      kernelId: kernel.descriptor.kernelId,
      kernelVersion: kernel.descriptor.kernelVersion,
      kernelHash: kernel.descriptor.kernelHash,
      stageOrder: [...kernel.descriptor.stages],
      profileDenominator: 51,
      registeredEffectAtoms: 13,
      executableEffectAtomIds: [...kernel.descriptor.supportedEffectAtomIds],
      knownUnimplementedEffectAtoms: 9,
      unknownEffectPolicy: "quarantine_and_fail_closed",
      dataChangeCannotGrantRuleAuthority: true,
    },
    executableScope:
      "frozen_v3_ranged_subset_plus_unmodified_single_model_adept_glaive_cannon_vs_exactly_engaged_marine_with_atomic_anti_evade_and_evade",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash:
        "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c",
      officialDatasetHash:
        "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      baseAuthority:
        "latest_official_protoss_and_terran_p2p_may_2026_40mm_32mm_plus_command_center_profiles",
      liveRevalidatedAt: "2026-08-25",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 24,
      remainingActionableAtomsBeforeThisSlice: 629,
      completedAfterThisSlice: 25,
      averageAtomsPerSliceAfterThisSlice: 299 / 25,
      remainingActionableAtomsAfterThisSlice: 613,
      forecastRemainingSlicesAfterThisSlice: 52,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      v3ActionsDelegatedWithoutChangingV3Implementation: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: ["official_anti_evade_kernel", "official_anti_evade_authority_replay"],
      crossTimeReplayResult: "historical_v3_runtime_hash_preserved",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "nine-known-attack-effect-atoms-remain-quarantined",
        "remaining-613-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 613,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      uiTraceEvidence: [],
      agentDecisionEvidence:
        "legal-action-binds-engagement-edge-anti-evade-target-number-and-armour-evade-damage-order",
      memoryTraceEvidence: "no-memory-skill-or-training-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "profile-modifier-engagement-kernel-base-source-or-replay-drift-demotes-current-slice",
      ],
      userVisibleChecks: [],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "nine-known-attack-effect-kinds-not-yet-executable",
      "ranged-upgrades-sidearms-multiple-models-and-target-splitting-pending",
      "terrain-cover-elevation-hidden-indirect-fire-and-non-engagement-evade-grants-pending",
      "shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRangedAttackRuleSliceV4(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_ranged_attack_v4_slice_hash_mismatch");
  }
  const expected = createOfficialRangedAttackRuleSliceV4(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_ranged_attack_v4_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      newlyExecutableRuleAtoms: OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth:
      "official_atomic_anti_evade_modifier_engaged_targeting_evade_and_historical_v3_ranged_subset",
    trainingTruth: false,
  });
}
