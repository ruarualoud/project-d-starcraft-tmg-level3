import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS,
} from "./official-ranged-attack-executor-v1.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V2_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_TRANSITION_SCHEMA,
} from "./official-ranged-attack-executor-v2.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v2";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "08d813bd5437b4dbe33dbd3b32873889af18b282b218092f0a218c515bc31be7";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "735f437bfd501f9940730e8782eb4afd9110346fb33ac7bf4e8a6654146e134b";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 278;
const EXPECTED_EXECUTABLE_COUNT = 282;
const RANGED_V2_REJECTION_CODES = Object.freeze([
  "ATTACK_CHANCE_REVEALS_REQUIRED",
  "ATTACK_CHANCE_REVEAL_INVALID",
  "ATTACK_EFFECT_HANDLER_UNAVAILABLE",
  "ATTACK_PROFILE_INVALID",
  "ATTACK_TARGET_OUT_OF_RANGE",
  "RANGED_ATTACK_V2_ACTION_INVALID",
  "RANGED_ATTACK_V2_ACTION_MISMATCH",
  "RANGED_ATTACK_V2_ACTION_STALE",
  "RANGED_ATTACK_V2_ALREADY_ACTIVATED",
  "RANGED_ATTACK_V2_BASE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V2_DATA_SNAPSHOT_MISMATCH",
  "RANGED_ATTACK_V2_ENGAGEMENT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V2_MODEL_GEOMETRY_INVALID",
  "RANGED_ATTACK_V2_NOT_ACTIVE_SIDE",
  "RANGED_ATTACK_V2_POST_DISENGAGE_PROHIBITED",
  "RANGED_ATTACK_V2_POST_DISENGAGE_RESTRICTION_INVALID",
  "RANGED_ATTACK_V2_PROFILE_SOURCE_MISMATCH",
  "RANGED_ATTACK_V2_SIDE_PASSED",
  "RANGED_ATTACK_V2_STATE_INVALID",
  "RANGED_ATTACK_V2_TARGET_DAMAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V2_TARGET_UNAVAILABLE",
  "RANGED_ATTACK_V2_TERRAIN_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V2_UNIT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_V2_UNIT_UNAVAILABLE",
  "RANGED_ATTACK_V2_WRONG_PHASE",
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
    fail("official_ranged_attack_v2_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 634
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v2_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_ranged_attack_v2_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "ranged-attack-v2:");
  return {
    positiveFixtureIds: [`${slug}:marine-c14-and-goliath-autocannon`],
    negativeFixtureIds: [`${slug}:range-source-profile-effect-and-scope-rejects`],
    interactionFixtureIds: [`${slug}:atomic-effect-kernel-los-engagement-and-lifecycle`],
    lifecycleFixtureIds: [`${slug}:activation-damage-casualty-and-restriction-consumption`],
    replayFixtureIds: [`${slug}:versioned-plan-resolution-and-sealed-replay`],
    sourceDriftFixtureIds: [`${slug}:unknown-effect-quarantine-and-profile-hash-drift`],
  };
}

function executableRangedV2Atom(atom, clauseById, rulesVersion, reassigned) {
  return {
    atomId: atom.atomId,
    atomVersion: reassigned ? "2.0.0" : "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "assault", window: "ranged_attack", priority: 320 },
    preconditions: [
      {
        predicateId: "assault.atomic_attack_profile_matches_frozen_official_snapshot",
        inputSchema: "starcraft_tmg_official_attack_profile_catalogue_v1",
        failureCode: "RANGED_ATTACK_V2_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "assault.required_effect_handlers_are_explicitly_available",
        inputSchema: "starcraft_tmg_official_attack_resolution_kernel_descriptor_v1",
        failureCode: "ATTACK_EFFECT_HANDLER_UNAVAILABLE",
      },
      {
        predicateId: "assault.unengaged_single_model_marine_or_goliath_vs_marine_no_terrain_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "RANGED_ATTACK_V2_UNIT_SCOPE_UNSUPPORTED",
      },
      {
        predicateId: "assault.post_disengage_restriction_is_hash_bound_and_allows_ranged_attack",
        inputSchema: "starcraft_tmg_official_post_disengage_assault_restriction_v1",
        failureCode: "RANGED_ATTACK_V2_POST_DISENGAGE_PROHIBITED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RANGED_ATTACK_V2_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...RANGED_V2_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_RANGED_ATTACK_V2_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialRangedAttackRuleSliceV2(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableRangedV2Atom(atom, clauseById, base.rulesVersion, false);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return executableRangedV2Atom(atom, clauseById, base.rulesVersion, true);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_ranged_attack_v2_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_RANGED_ATTACK_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE],
    transitionSchema: OFFICIAL_RANGED_ATTACK_V2_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.24.0-official-atomic-attack-effects",
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
    || catalogueAudit.counts.byDisposition.review_required !== 630
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_v2_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID],
    effectKernel: {
      profileDenominator: 51,
      registeredEffectAtoms: 13,
      executableEffectAtomIds: [
        "attack-effect:long-range-v1",
        "attack-effect:surge-armour-bypass-v1",
      ],
      knownUnimplementedEffectAtoms: 11,
      unknownEffectPolicy: "quarantine_and_fail_closed",
      dataChangeCannotGrantRuleAuthority: true,
    },
    executableScope:
      "unmodified_single_model_marine_c14_or_goliath_autocannon_vs_ground_marine_no_terrain_no_shield_with_atomic_surge_and_long_range",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      baseAuthority: "latest_official_terran_p2p_may_2026_32mm_and_80mm",
      liveRevalidatedAt: "2026-08-25",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 22,
      remainingActionableAtomsBeforeThisSlice: 634,
      completedAfterThisSlice: 23,
      averageAtomsPerSliceAfterThisSlice: 282 / 23,
      remainingActionableAtomsAfterThisSlice: 630,
      forecastRemainingSlicesAfterThisSlice: 52,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      skillsRead: [],
      skillsGenerated: [],
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "known-unimplemented-effect-atoms-remain-quarantined",
        "remaining-630-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 630,
    },
    harness: {
      harnessLoopUsed: true,
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      agentDecisionEvidence:
        "legal-actions-bind-profile-effect-ids-range-band-plan-hash-and-dynamic-chance-layout",
      memoryTraceEvidence: "no-memory-skill-or-training-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "unknown-official-effect-quarantines-new-profile-catalogue",
        "missing-handler-profile-plan-receipt-or-replay-failure-demotes-current-slice",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "eleven-known-attack-effect-kinds-not-yet-executable",
      "ranged-upgrades-sidearms-multiple-models-and-target-splitting-pending",
      "terrain-cover-elevation-hidden-indirect-fire-and-engaged-ranged-pending",
      "evade-grants-shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRangedAttackRuleSliceV2(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_ranged_attack_v2_slice_hash_mismatch");
  }
  const expected = createOfficialRangedAttackRuleSliceV2(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_ranged_attack_v2_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS);
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
      newlyExecutableRuleAtoms: OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms: OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_atomic_attack_profiles_surge_long_range_and_assault_lifecycle",
    trainingTruth: false,
  });
}
