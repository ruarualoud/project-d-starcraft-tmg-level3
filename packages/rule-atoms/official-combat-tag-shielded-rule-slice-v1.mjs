import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCombatEffectDenominatorV4 } from
  "./official-combat-effect-denominator-v4.mjs";
import {
  createOfficialCombatTagShieldedDefenseKernelV1,
  OFFICIAL_COMBAT_TAGS,
} from "./official-combat-tag-shielded-defense-kernel-v1.mjs";
import {
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_DEPENDENCY_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_TRANSITION_SCHEMA,
} from "./official-combat-tag-shielded-ranged-executor-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_combat_tag_shielded_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_indirect_fire_locked_in_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "c3e818e93def152d406a6a5171bb5d588029009e46372a78e925030974522767";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "4f97e3b354cdf0a47f9b72083379fa2111a19193900eec401358ef3b801aab7f";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "a6f1264ecee7adb0ce99d2ff8357d137bc44c14031c2663ed6e1609d31037258";
const EXPECTED_PREVIOUS_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 365;
const EXPECTED_REVIEW_COUNT = 547;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const REJECTION_CODES = Object.freeze([
  "ATTACK_CHANCE_REVEALS_REQUIRED",
  "ATTACK_TARGET_OUT_OF_RANGE",
  "COMBAT_TAG_SHIELDED_ACTION_INVALID",
  "COMBAT_TAG_SHIELDED_ACTION_MISMATCH",
  "COMBAT_TAG_SHIELDED_ACTION_STALE",
  "COMBAT_TAG_SHIELDED_ATTACK_PROFILE_DRIFT",
  "COMBAT_TAG_SHIELDED_ENGAGEMENT_SCOPE_UNSUPPORTED",
  "COMBAT_TAG_SHIELDED_LATEST_OFFICIAL_DATA_REQUIRED",
  "COMBAT_TAG_SHIELDED_OFFICIAL_PROFILE_DRIFT",
  "COMBAT_TAG_SHIELDED_TARGET_TAG_MISMATCH",
  "COMBAT_TAG_SHIELDED_TERRAIN_SCOPE_UNSUPPORTED",
  "COMBAT_TAG_SHIELDED_UNIT_SCOPE_UNSUPPORTED",
  "COMBAT_TAG_UNKNOWN",
  "SHIELDED_DAMAGE_MARKER_LIFECYCLE_INVALID",
  "SHIELDED_STATE_INVALID",
  "SHIELDED_STATUS_MISMATCH",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || previousSlice.combatEffectDenominatorHash
      !== EXPECTED_PREVIOUS_EFFECT_DENOMINATOR_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("COMBAT_TAG_SHIELDED_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  verifyOfficialCombatEffectDenominatorV4(previousSlice.combatEffectDenominator);
  if (audit.counts.byDisposition.executable !== 355
    || audit.counts.byDisposition.review_required !== 557
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("COMBAT_TAG_SHIELDED_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("COMBAT_TAG_SHIELDED_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "combat-tag-shielded:");
  return {
    positiveFixtureIds: [
      `${slug}:ground-target-authorized-and-light-surge-matched`,
      `${slug}:shield-adds-first-model-hit-points`,
    ],
    negativeFixtureIds: [
      `${slug}:ground-weapon-cannot-target-flying-drone`,
      `${slug}:missing-or-early-shielded-status-fails-closed`,
    ],
    interactionFixtureIds: [
      `${slug}:target-all-light-surge-and-shielded-damage-compose`,
      `${slug}:non-light-target-does-not-gain-surge-bypass`,
    ],
    lifecycleFixtureIds: [
      `${slug}:equal-shield-retains-status-exceeding-shield-loses-status`,
      `${slug}:first-model-removal-ends-shielded`,
    ],
    replayFixtureIds: [
      `${slug}:three-receipt-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-five-units-parts-2-5-11-and-pdf-hashes`,
    ],
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
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "assault", window: "combat_tag_shielded_ranged_attack", priority: 65 },
    preconditions: [{
      predicateId: "combat_tag.profile_target_matches_target_unit",
      inputSchema: "starcraft_tmg_official_combat_tag_target_authorization_v1",
      failureCode: "COMBAT_TAG_SHIELDED_TARGET_TAG_MISMATCH",
    }, {
      predicateId: "shielded.first_model_effective_hit_points_and_status_are_exact",
      inputSchema: "starcraft_tmg_official_shielded_defense_state_v1",
      failureCode: "SHIELDED_STATUS_MISMATCH",
    }, {
      predicateId: "shielded.loss_uses_strict_damage_threshold_or_first_model_removal",
      inputSchema: "starcraft_tmg_official_shielded_damage_transition_v1",
      failureCode: "SHIELDED_DAMAGE_MARKER_LIFECYCLE_INVALID",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
      transitionSchema: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_fixed_roll_sequence_chance_ticket_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialCombatTagShieldedRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("COMBAT_TAG_SHIELDED_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE],
    transitionSchema: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.36.0-official-combat-tag-shielded",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("COMBAT_TAG_SHIELDED_CATALOGUE_INVALID");
  }
  const kernel = createOfficialCombatTagShieldedDefenseKernelV1();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominator: clone(input.previousSlice.combatEffectDenominator),
    combatEffectDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
    combatEffectCorrectionReceiptHash:
      input.previousSlice.combatEffectCorrectionReceiptHash,
    newlyExecutableRuleAtomIds: [
      ...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS,
    ],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID],
    executableScope:
      "one_unmodified_current_goliath_or_marine_vs_one_current_adept_stalker_or_weaponless_point_defense_drone_no_terrain_no_engagement",
    combatTagShieldedProgress: {
      officialCombatTags: [...OFFICIAL_COMBAT_TAGS],
      currentAttackers: ["Goliath:Autocannon", "Marine:C-14 rifle"],
      currentTargets: ["Adept", "Stalker", "Point Defense Drone"],
      groundTargetRestrictionExecutable: true,
      allTargetAuthorizationExecutable: true,
      lightSurgeTagMatchExecutable: true,
      nonLightSurgeMismatchExecutable: true,
      shieldAddsToFirstModelHitPointsExecutable: true,
      equalShieldDamageRetainsShieldedExecutable: true,
      damageExceedingShieldLosesShieldedExecutable: true,
      firstModelRemovalLosesShieldedExecutable: true,
      losingShieldedPreservesRemainingHitPointsExecutable: true,
      deferredReviewRequiredRuleAtomIds: [
        "rule-atom:shielded-status-heal-restoration-forbidden",
        "rule-atom:singleton:core-11-shielded-dependent-abilities:03c5e18dd1a9",
      ],
      deferredReason:
        "heal_and_named_shielded_dependent_ability_need_current_exact_carriers_and_lifecycle_executors",
    },
    combatTagShieldedDefenseKernel: clone(kernel.descriptor),
    effectKernel: clone(input.previousSlice.effectKernel),
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      officialDatasetHash: CURRENT_DATASET_HASH,
      liveVersionsDocumentCanonicalHash:
        "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
      liveGoliathDocumentCanonicalHash:
        "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
      liveMarineDocumentCanonicalHash:
        "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
      liveAdeptDocumentCanonicalHash:
        "adbd3e08cf9d7c0141cc24d4651c81da8f813dafd087f96a63f9d7df2a0cb7b6",
      liveStalkerDocumentCanonicalHash:
        "1f5ebec5ba1b6d429ef0cb9135daa39afed4b60275051ea7959b923a676603bf",
      livePointDefenseDroneDocumentCanonicalHash:
        "db9d0face167edade6f313a1c642a9ea0787fd5100ff557648c9a71274dbcaa4",
      livePart2DocumentCanonicalHash:
        "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
      livePart5DocumentCanonicalHash:
        "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
      livePart11DocumentCanonicalHash:
        "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      protossP2pContentHash:
        "4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 34,
      remainingActionableAtomsBeforeThisSlice: 557,
      completedAfterThisSlice: 35,
      averageAtomsPerSliceAfterThisSlice: 10.4286,
      remainingActionableAtomsAfterThisSlice: 547,
      forecastRemainingSlicesAfterThisSlice: 53,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      previousEffectDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v5",
      previousActionSchemaVersion: "hybrid_legal_space_v4",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "ground_and_all_target_tag_authorization",
        "light_surge_match_and_non_light_mismatch",
        "shield_equal_threshold_crossing_and_first_model_removal",
        "losing_shielded_preserves_remaining_hit_points",
        "authority_three_receipt_replay_and_tamper_reject",
      ],
      crossTimeReplayResult:
        "slice34_indirect_locked_and_slice35_combat_tag_shielded_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "heal-and-shielded-dependent-ability-atoms-remain-review-required",
        "remaining-547-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 547,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt"],
      harnessToolsCalled: [
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      observationContract: [
        "targetCombatTags",
        "profileTargetTags",
        "surgeTagMatched",
        "printedHitPoints",
        "shieldValue",
        "effectiveFirstModelHitPoints",
        "shieldedBefore",
        "targetAuthorizationHash",
        "shieldStateHash",
      ],
      uiTraceEvidence: [
        "ground-autocannon-omits-flying-point-defense-drone",
        "marine-light-surge-match-is-visible-before-confirmation",
        "shielded-threshold-and-preserved-hit-points-are-receipt-visible",
      ],
      agentDecisionEvidence: [
        "rules-own-target-tag-surge-eligibility-and-shield-lifecycle",
        "agent-cannot-invent-ground-to-flying-target-or-early-shield-loss",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-unit-part2-part5-or-part11-drift-demotes-slice-35",
        "tag-shield-state-authority-or-replay-failure-demotes-slice-35",
      ],
      userVisibleChecks: [
        "goliath-autocannon-can-target-ground-adept-and-stalker-not-flying-drone",
        "marine-c14-can-target-all-and-light-surge-only-matches-adept",
        "damage-equal-to-shield-keeps-shielded",
        "damage-exceeding-shield-removes-status-without-removing-remaining-hit-points",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "production-complete-legal-space-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  if (changedNonTargetAtoms !== 0) fail("COMBAT_TAG_SHIELDED_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialCombatTagShieldedRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("COMBAT_TAG_SHIELDED_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialCombatTagShieldedRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("COMBAT_TAG_SHIELDED_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_combat_tag_shielded_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
    newlyExecutableRuleAtomIds: [...input.slice.newlyExecutableRuleAtomIds],
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: input.slice.newlyExecutableRuleAtomIds.length,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_combat_tag_and_shielded_exact_subset",
    trainingTruth: false,
  });
}
