import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
} from "./official-assault-hold-executor-v1.mjs";
import {
  OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS,
  OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
  OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION,
  OFFICIAL_ASSAULT_HOLD_V2_TRANSITION_SCHEMA,
} from "./official-assault-hold-executor-v2.mjs";
import {
  OFFICIAL_RANGED_ATTACK_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_TRANSITION_SCHEMA,
} from "./official-ranged-attack-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_disengage_casualty_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "88ff14e5fec6226472c3aefb64cf9d0921086595d5d6c28dc22e462abd255f86";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "d73e76d759de31b7f008f4ccdfb28c152f8c66bfafd4f858a99b0329f02efe6f";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 239;
const EXPECTED_EXECUTABLE_COUNT = 278;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const RANGED_REJECTION_CODES = Object.freeze([
  "ENGAGEMENT_V2_GEOMETRY_INCOMPLETE",
  "RANGED_ATTACK_ACTION_INVALID",
  "RANGED_ATTACK_ACTION_MISMATCH",
  "RANGED_ATTACK_ACTION_STALE",
  "RANGED_ATTACK_ALREADY_ACTIVATED",
  "RANGED_ATTACK_BASE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_C14_PROFILE_DRIFT",
  "RANGED_ATTACK_CHANCE_REVEALS_REQUIRED",
  "RANGED_ATTACK_CHANCE_REVEAL_INVALID",
  "RANGED_ATTACK_DATA_SNAPSHOT_MISMATCH",
  "RANGED_ATTACK_ENGAGEMENT_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_MARINE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_MODEL_GEOMETRY_INVALID",
  "RANGED_ATTACK_NOT_ACTIVE_SIDE",
  "RANGED_ATTACK_POST_DISENGAGE_PROHIBITED",
  "RANGED_ATTACK_POST_DISENGAGE_RESTRICTION_INVALID",
  "RANGED_ATTACK_SIDE_PASSED",
  "RANGED_ATTACK_STATE_INVALID",
  "RANGED_ATTACK_TARGET_DAMAGE_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_TARGET_OUT_OF_RANGE",
  "RANGED_ATTACK_TARGET_TAG_INELIGIBLE",
  "RANGED_ATTACK_TARGET_UNAVAILABLE",
  "RANGED_ATTACK_TERRAIN_SCOPE_UNSUPPORTED",
  "RANGED_ATTACK_UNIT_UNAVAILABLE",
  "RANGED_ATTACK_WRONG_PHASE",
]);
const HOLD_V2_REJECTION_CODES = Object.freeze([
  "ASSAULT_HOLD_POST_DISENGAGE_RESTRICTION_INVALID",
  "ASSAULT_HOLD_V2_ACTION_INVALID",
  "ASSAULT_HOLD_V2_ACTION_MISMATCH",
  "ASSAULT_HOLD_V2_ACTION_STALE",
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
    fail("official_ranged_attack_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 673
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_ranged_attack_source_clause_missing", atom.atomId);
  }
  return ids;
}

function rangedEvidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "ranged-attack:");
  return {
    positiveFixtureIds: [`${slug}:marine-c14-light-d3-damage`],
    negativeFixtureIds: [`${slug}:range-source-restriction-and-scope-rejects`],
    interactionFixtureIds: [`${slug}:engagement-los-three-pool-and-tactical-mass`],
    lifecycleFixtureIds: [`${slug}:assault-activation-damage-casualty-and-restriction-consumption`],
    replayFixtureIds: [`${slug}:ed25519-hmac-chance-reveal-replay`],
    sourceDriftFixtureIds: [`${slug}:live-core-command-center-and-runtime-drift`],
  };
}

function holdEvidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "assault-hold-v2:");
  return {
    positiveFixtureIds: [`${slug}:hold-remains-legal-after-disengage`],
    negativeFixtureIds: [`${slug}:tampered-or-stale-restriction-rejected`],
    interactionFixtureIds: [`${slug}:post-disengage-ranged-charge-prohibition-lifecycle`],
    lifecycleFixtureIds: [`${slug}:following-assault-consumes-restriction`],
    replayFixtureIds: [`${slug}:hold-consumption-receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:historical-v1-and-current-v2-drift`],
  };
}

function executableRangedAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "assault", window: "ranged_attack", priority: 320 },
    preconditions: [
      {
        predicateId: "assault.official_current_ranged_profile_matches_frozen_data_snapshot",
        inputSchema: "starcraft_tmg_official_assault_ranged_profile_bundle_v1",
        failureCode: "RANGED_ATTACK_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "assault.unengaged_single_model_ground_marine_no_terrain_subset",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "RANGED_ATTACK_MARINE_SCOPE_UNSUPPORTED",
      },
      {
        predicateId: "assault.post_disengage_restriction_is_hash_bound_and_allows_ranged_attack",
        inputSchema: "starcraft_tmg_official_post_disengage_assault_restriction_v1",
        failureCode: "RANGED_ATTACK_POST_DISENGAGE_PROHIBITED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_RANGED_ATTACK_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RANGED_ATTACK_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...RANGED_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_RANGED_ATTACK_DEPENDENCY_ATOM_IDS],
    },
    evidence: rangedEvidence(atom.atomId),
  };
}

function reassignedHoldAtom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: "2.0.0",
    effect: {
      executorId: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_ASSAULT_HOLD_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...(atom.rejectionCodes || []),
      ...HOLD_V2_REJECTION_CODES,
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: holdEvidence(atom.atomId),
  };
}

export function createOfficialRangedAttackRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableRangedAtom(atom, clauseById, base.rulesVersion);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return reassignedHoldAtom(atom);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_ranged_attack_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID
  ));
  executorManifest.push(
    {
      executorId: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION,
      actionTypes: ["hold"],
      transitionSchema: OFFICIAL_ASSAULT_HOLD_V2_TRANSITION_SCHEMA,
    },
    {
      executorId: OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
      executorVersion: OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_RANGED_ATTACK_ACTION_TYPE],
      transitionSchema: OFFICIAL_RANGED_ATTACK_TRANSITION_SCHEMA,
    },
  );
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.23.0-official-ranged-attack",
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
    || catalogueAudit.counts.byDisposition.review_required !== 634
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_ranged_attack_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
      OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
    ],
    executableScope:
      "single_model_unmodified_ground_marine_c14_no_terrain_no_shield_ranged_attack_with_post_disengage_assault_lifecycle",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      marineBaseAuthority: "latest_official_terran_p2p_may_2026_page_1",
      liveRevalidatedAt: "2026-08-25",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 21,
      historicalAverageAtomsPerSlice: 239 / 21,
      remainingActionableAtomsBeforeThisSlice: 673,
      forecastRemainingSlicesBeforeThisSlice: 60,
      completedAfterThisSlice: 22,
      averageAtomsPerSliceAfterThisSlice: 278 / 22,
      remainingActionableAtomsAfterThisSlice: 634,
      forecastRemainingSlicesAfterThisSlice: 51,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash:
        "e94bd5d6ef839fb96c1077da532c5d4314c1c0d7c60754523a410613aaea4541",
      replacedExecutorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
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
      crossTimeReplayResult: "ranged_chance_receipt_replay_required_no_promotion",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "upgrades-terrain-engaged-ranged-multi-model-and-evade-remain-fail-closed",
        "remaining-634-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 634,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [
        "referee_prompt",
        "opponent_prompt",
        "selfplay_agent_prompt",
        "rule_skill_builder_prompt",
      ],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence:
        "finite_ranged_attack_exposes_source_bound_target_weapon_range_and_hidden_chance_contract",
      memoryTraceEvidence: "no-memory-skill-or-training-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-source-profile-or-runtime-drift-quarantines-current-slice",
        "chance-reveal-receipt-or-replay-failure-demotes-current-slice",
      ],
      userVisibleChecks: [
        "post-disengage-prohibition-removes-ranged-action-from-legal-space",
        "preview-commits-five-hidden-d6-tickets",
        "receipt-reveals-d3-surge-three-pool-damage-and-restriction-consumption",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "run-and-charge-actions-pending",
      "ranged-upgrades-sidearms-multiple-models-and-target-splitting-pending",
      "terrain-cover-elevation-hidden-indirect-fire-and-engaged-ranged-pending",
      "evade-grants-shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRangedAttackRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_ranged_attack_slice_hash_mismatch");
  }
  const expected = createOfficialRangedAttackRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_ranged_attack_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set([
    ...OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS,
    ...OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS,
  ]);
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
      newlyExecutableRuleAtoms: OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms: OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_current_profile_bound_ranged_attack_and_assault_restriction_lifecycle",
    trainingTruth: false,
  });
}
