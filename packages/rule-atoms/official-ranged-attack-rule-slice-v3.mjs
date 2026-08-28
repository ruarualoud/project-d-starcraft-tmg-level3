import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV2 } from
  "./official-attack-resolution-kernel-v2.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
} from "./official-ranged-attack-executor-v2.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V3_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V3_NEW_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_TRANSITION_SCHEMA,
} from "./official-ranged-attack-executor-v3.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v3";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v2";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "28089a92a62a280b0b33c49dac057b27344f53a35088f04bfdfd0395a10506a8";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "40de23f202c992ef324dc68a22369cf4f7e09a34c7e18d46703199b93e544e5a";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 282;
const EXPECTED_EXECUTABLE_COUNT = 283;
const RANGED_V3_REJECTION_CODES = Object.freeze([
  "ATTACK_CHANCE_REVEALS_REQUIRED",
  "ATTACK_CHANCE_REVEAL_INVALID",
  "ATTACK_EFFECT_HANDLER_UNAVAILABLE",
  "ATTACK_PIERCE_PARAMETERS_INVALID",
  "ATTACK_PROFILE_INVALID",
  "ATTACK_TARGET_OUT_OF_RANGE",
  "RANGED_ATTACK_V3_ACTION_INVALID",
  "RANGED_ATTACK_V3_ACTION_MISMATCH",
  "RANGED_ATTACK_V3_ACTION_STALE",
  "RANGED_ATTACK_V3_ALREADY_ACTIVATED",
  "RANGED_ATTACK_V3_BASE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V3_DATA_SNAPSHOT_MISMATCH",
  "RANGED_ATTACK_V3_ENGAGEMENT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V3_MODEL_GEOMETRY_INVALID",
  "RANGED_ATTACK_V3_NOT_ACTIVE_SIDE",
  "RANGED_ATTACK_V3_POST_DISENGAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V3_PROFILE_SOURCE_MISMATCH",
  "RANGED_ATTACK_V3_SIDE_PASSED",
  "RANGED_ATTACK_V3_STATE_INVALID",
  "RANGED_ATTACK_V3_TARGET_DAMAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V3_TARGET_UNAVAILABLE",
  "RANGED_ATTACK_V3_TERRAIN_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V3_UNIT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V3_UNIT_UNAVAILABLE",
  "RANGED_ATTACK_V3_WRONG_PHASE",
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
    fail("official_ranged_attack_v3_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 630
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v3_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_ranged_attack_v3_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "ranged-attack-v3:");
  return {
    positiveFixtureIds: [`${slug}:marauder-quad-k12-vs-armoured-roach`],
    negativeFixtureIds: [`${slug}:nonmatching-tag-range-profile-and-scope-rejects`],
    interactionFixtureIds: [`${slug}:surge-pierce-armour-damage-stage-order`],
    lifecycleFixtureIds: [`${slug}:activation-damage-casualty-and-phase-settlement`],
    replayFixtureIds: [`${slug}:versioned-plan-resolution-sealed-authority-replay`],
    sourceDriftFixtureIds: [`${slug}:profile-parameter-base-and-source-hash-drift`],
  };
}

function executableRangedV3Atom(atom, clauseById, rulesVersion, reassigned) {
  return {
    atomId: atom.atomId,
    atomVersion: reassigned ? "3.0.0" : "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "assault", window: "ranged_attack", priority: 330 },
    preconditions: [
      {
        predicateId: "assault.atomic_attack_profile_matches_frozen_official_snapshot",
        inputSchema: "starcraft_tmg_official_attack_profile_catalogue_v1",
        failureCode: "RANGED_ATTACK_V3_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "assault.required_effect_handlers_are_explicitly_available",
        inputSchema: "starcraft_tmg_official_attack_resolution_kernel_descriptor_v2",
        failureCode: "ATTACK_EFFECT_HANDLER_UNAVAILABLE",
      },
      {
        predicateId: "assault.pierce_tag_matches_target_combat_profile_before_damage_replacement",
        inputSchema: "starcraft_tmg_official_attack_resolution_plan_v2",
        failureCode: "ATTACK_PIERCE_PARAMETERS_INVALID",
      },
      {
        predicateId: "assault.unmodified_single_model_pierce_example_or_frozen_v2_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "RANGED_ATTACK_V3_UNIT_SCOPE_UNSUPPORTED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RANGED_ATTACK_V3_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...RANGED_V3_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_RANGED_ATTACK_V3_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialRangedAttackRuleSliceV3(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_RANGED_ATTACK_V3_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableRangedV3Atom(atom, clauseById, base.rulesVersion, false);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return executableRangedV3Atom(atom, clauseById, base.rulesVersion, true);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_ranged_attack_v3_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE],
    transitionSchema: OFFICIAL_RANGED_ATTACK_V3_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.25.0-official-pierce-attack-effect",
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
    || catalogueAudit.counts.byDisposition.review_required !== 629
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v3_catalogue_invalid");
  }
  const kernel = createOfficialAttackResolutionKernelV2();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V3_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID],
    effectKernel: {
      kernelId: kernel.descriptor.kernelId,
      kernelVersion: kernel.descriptor.kernelVersion,
      kernelHash: kernel.descriptor.kernelHash,
      stageOrder: [...kernel.descriptor.stages],
      profileDenominator: 51,
      registeredEffectAtoms: 13,
      executableEffectAtomIds: [...kernel.descriptor.supportedEffectAtomIds],
      knownUnimplementedEffectAtoms: 10,
      unknownEffectPolicy: "quarantine_and_fail_closed",
      dataChangeCannotGrantRuleAuthority: true,
    },
    executableScope:
      "frozen_v2_ranged_subset_plus_unmodified_single_model_marauder_quad_k12_vs_roach_with_atomic_pierce",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      baseAuthority:
        "latest_official_terran_and_zerg_p2p_may_2026_50mm_plus_frozen_v2_bases",
      liveRevalidatedAt: "2026-08-25",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 23,
      remainingActionableAtomsBeforeThisSlice: 630,
      completedAfterThisSlice: 24,
      averageAtomsPerSliceAfterThisSlice: 283 / 24,
      remainingActionableAtomsAfterThisSlice: 629,
      forecastRemainingSlicesAfterThisSlice: 54,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      v2ActionsDelegatedWithoutChangingV2Implementation: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: ["official_pierce_kernel", "official_pierce_authority_replay"],
      crossTimeReplayResult: "historical_v2_runtime_hash_preserved",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "ten-known-attack-effect-atoms-remain-quarantined",
        "remaining-629-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 629,
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
        "legal-action-binds-pierce-tag-base-and-effective-damage-with-versioned-kernel-receipt",
      memoryTraceEvidence: "no-memory-skill-or-training-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "profile-parameter-tag-kernel-base-or-replay-drift-demotes-current-slice",
      ],
      userVisibleChecks: [],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "ten-known-attack-effect-kinds-not-yet-executable",
      "ranged-upgrades-sidearms-multiple-models-and-target-splitting-pending",
      "terrain-cover-elevation-hidden-indirect-fire-and-engaged-ranged-pending",
      "evade-grants-shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRangedAttackRuleSliceV3(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_ranged_attack_v3_slice_hash_mismatch");
  }
  const expected = createOfficialRangedAttackRuleSliceV3(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_ranged_attack_v3_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS);
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
      newlyExecutableRuleAtoms: OFFICIAL_RANGED_ATTACK_V3_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_atomic_pierce_tag_damage_and_historical_v2_ranged_subset",
    trainingTruth: false,
  });
}
