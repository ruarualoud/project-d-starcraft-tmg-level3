import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
} from "./official-ranged-attack-executor-v5.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V6_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V6_TRANSITION_SCHEMA,
} from "./official-ranged-attack-executor-v6.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v6";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v5";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "44cdf6abfe325d8934e999a9b78e20732b17148da3b81500b6d10e6b1f574a0b";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "e6d616c079b627d80a626bb747bd37d8c5fa807e3db8fd2c3bf0d0af6389cb22";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 304;
const EXPECTED_EXECUTABLE_COUNT = 305;
const RANGED_V6_REJECTION_CODES = Object.freeze([
  "ATTACK_BULKY_ENGAGED_PROHIBITION",
  "ATTACK_BULKY_PARAMETERS_INVALID",
  "ATTACK_CHANCE_REVEALS_REQUIRED",
  "ATTACK_CHANCE_REVEAL_INVALID",
  "ATTACK_EFFECT_HANDLER_UNAVAILABLE",
  "ATTACK_ENGAGEMENT_EVIDENCE_REQUIRED",
  "ATTACK_EVADE_ELIGIBILITY_REQUIRED",
  "ATTACK_EVADE_ELIGIBILITY_UNSUPPORTED",
  "ATTACK_PROFILE_INVALID",
  "ATTACK_RESOLUTION_BASE_PLAN_MISMATCH",
  "ATTACK_RESOLUTION_PLAN_INVALID",
  "ATTACK_RESOLUTION_PROFILE_MISMATCH",
  "ATTACK_TARGET_OUT_OF_RANGE",
  "RANGED_ATTACK_V6_ACTION_INVALID",
  "RANGED_ATTACK_V6_ACTION_MISMATCH",
  "RANGED_ATTACK_V6_ACTION_STALE",
  "RANGED_ATTACK_V6_ALREADY_ACTIVATED",
  "RANGED_ATTACK_V6_BASE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V6_DATA_SNAPSHOT_MISMATCH",
  "RANGED_ATTACK_V6_DEFAULT_WEAPON_INACTIVE",
  "RANGED_ATTACK_V6_EXACT_PAIR_REQUIRED",
  "RANGED_ATTACK_V6_MODEL_GEOMETRY_INVALID",
  "RANGED_ATTACK_V6_NOT_ACTIVE_SIDE",
  "RANGED_ATTACK_V6_POST_DISENGAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V6_PROFILE_SOURCE_MISMATCH",
  "RANGED_ATTACK_V6_SIDE_PASSED",
  "RANGED_ATTACK_V6_STATE_INVALID",
  "RANGED_ATTACK_V6_TARGET_DAMAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V6_TARGET_UNAVAILABLE",
  "RANGED_ATTACK_V6_TERRAIN_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V6_UNIT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V6_UNIT_UNAVAILABLE",
  "RANGED_ATTACK_V6_WEAPON_LOADOUT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V6_WRONG_PHASE",
  "WEAPON_LOADOUT_RECEIPT_CONTENT_MISMATCH",
  "WEAPON_LOADOUT_RECEIPT_HASH_MISMATCH",
  "WEAPON_LOADOUT_SELECTED_UPGRADE_DUPLICATE",
  "WEAPON_LOADOUT_SELECTED_UPGRADE_UNKNOWN",
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
    fail("official_ranged_attack_v6_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 608
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v6_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_ranged_attack_v6_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "ranged-attack-v6:");
  return {
    positiveFixtureIds: [`${slug}:unengaged-default-commando-rifle-vs-marine`],
    negativeFixtureIds: [`${slug}:engaged-raynor-rejects-before-chance`],
    interactionFixtureIds: [`${slug}:bulky-surge-pierce-armour-damage-stage-order`],
    lifecycleFixtureIds: [`${slug}:legal-preview-apply-activation-and-phase-settlement`],
    replayFixtureIds: [`${slug}:ed25519-replay-survives-hmac-rotation`],
    sourceDriftFixtureIds: [`${slug}:profile-keyword-base-pdf-and-snapshot-drift`],
  };
}

function executableRangedV6Atom(atom, clauseById, rulesVersion, reassigned) {
  return {
    atomId: atom.atomId,
    atomVersion: reassigned ? "6.0.0" : "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "assault", window: "ranged_attack", priority: 360 },
    preconditions: [
      {
        predicateId: "assault.atomic_attack_profile_matches_frozen_official_snapshot",
        inputSchema: "starcraft_tmg_official_attack_profile_catalogue_v1",
        failureCode: "RANGED_ATTACK_V6_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "assault.default_weapon_loadout_is_active_when_no_replacement_is_selected",
        inputSchema: "starcraft_tmg_official_replacement_weapon_loadout_v1",
        failureCode: "RANGED_ATTACK_V6_DEFAULT_WEAPON_INACTIVE",
      },
      {
        predicateId: "assault.bulky_attacker_is_not_engaged_before_chance_allocation",
        inputSchema: "starcraft_tmg_official_engagement_graph_v2",
        failureCode: "ATTACK_BULKY_ENGAGED_PROHIBITION",
      },
      {
        predicateId: "assault.single_model_raynor_commando_vs_marine_or_frozen_v5_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "RANGED_ATTACK_V6_UNIT_SCOPE_UNSUPPORTED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RANGED_ATTACK_V6_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...RANGED_V6_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_RANGED_ATTACK_V6_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialRangedAttackRuleSliceV6(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableRangedV6Atom(atom, clauseById, base.rulesVersion, false);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return executableRangedV6Atom(atom, clauseById, base.rulesVersion, true);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_ranged_attack_v6_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE],
    transitionSchema: OFFICIAL_RANGED_ATTACK_V6_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.28.0-official-bulky-and-default-commando-rifle",
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
    || catalogueAudit.counts.byDisposition.review_required !== 607
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v6_catalogue_invalid");
  }
  const kernel = createOfficialAttackResolutionKernelV5();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID],
    effectKernel: {
      kernelId: kernel.descriptor.kernelId,
      kernelVersion: kernel.descriptor.kernelVersion,
      kernelHash: kernel.descriptor.kernelHash,
      stageOrder: [...kernel.descriptor.stages],
      profileDenominator: 51,
      registeredEffectAtoms: 13,
      executableEffectAtomIds: [...kernel.descriptor.supportedEffectAtomIds],
      knownUnimplementedEffectAtoms: 7,
      unknownEffectPolicy: "quarantine_and_fail_closed",
      dataChangeCannotGrantRuleAuthority: true,
    },
    executableScope:
      "frozen_v5_ranged_subset_plus_single_model_raynor_empty_upgrade_default_commando_vs_marine_with_pre_chance_bulky_prohibition",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash:
        "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c",
      officialDatasetHash:
        "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pAuthority:
        "official_terran_p2p_sha256_afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      liveRaynorRecordHash:
        "4d03fae1fbe5ed539c0beaad587a3f64add95d649b50dd35298959bedc5135cd",
      liveMarineRecordHash:
        "ed87862a674fe7b6cbc9f6692185d8f53df9048eda46d4823d51a87f7a237498",
      liveRevalidatedAt: "2026-08-25",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 26,
      remainingActionableAtomsBeforeThisSlice: 608,
      completedAfterThisSlice: 27,
      averageAtomsPerSliceAfterThisSlice: 305 / 27,
      remainingActionableAtomsAfterThisSlice: 607,
      forecastRemainingSlicesAfterThisSlice: 54,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      v5ActionsDelegatedWithoutChangingV5Implementation: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "official_bulky_kernel",
        "official_default_commando_loadout",
        "official_bulky_authority_replay",
      ],
      crossTimeReplayResult: "historical_v5_runtime_hash_preserved",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "seven-known-attack-effect-atoms-remain-quarantined",
        "remaining-607-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 607,
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
        "legal-action-binds-default-loadout-engagement-bulky-distance-profile-and-chance-layout",
      memoryTraceEvidence: "no-memory-skill-or-training-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "profile-bulky-engagement-base-source-or-replay-drift-demotes-current-slice",
      ],
      userVisibleChecks: [],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "seven-known-attack-effect-kinds-not-yet-executable",
      "generic-army-builder-upgrade-purchase-validation-and-specialist-assignment-pending",
      "sidearms-multiple-models-target-splitting-terrain-cover-and-elevation-pending",
      "shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRangedAttackRuleSliceV6(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_ranged_attack_v6_slice_hash_mismatch");
  }
  const expected = createOfficialRangedAttackRuleSliceV6(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_ranged_attack_v6_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ATOM_IDS);
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
      newlyExecutableRuleAtoms: OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth:
      "official_atomic_bulky_default_commando_and_historical_v5_ranged_subset",
    trainingTruth: false,
  });
}
