import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_NEW_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_TRANSITION_SCHEMA,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "./official-marine-stimpack-kernel-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
  OFFICIAL_CLEANUP_REFRESH_V4_TRANSITION_SCHEMA,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_TRANSITION_SCHEMA,
} from "./official-stimpack-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS,
  OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_RANGED_TRANSITION_SCHEMA,
} from "./official-stimpack-ranged-consumer-executor-v1.mjs";
import { OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE } from
  "./official-cleanup-refresh-executor-v1.mjs";
import { OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE } from
  "./official-end-of-round-effects-executor-v2.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_marine_stimpack_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_life_support_damage_reaction_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "f54e29d1156331539b8cbb3cbda9517d9b56785acbbe598ef48428bd01154aed";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "bccab94b7e9d1979581125acedefa3d28e8707756ac4c5a5a09198c3df5abe0e";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "4a7344b351459dabcd05649efdaf8d4f7a69abd76e2cca534c9568e315c09eb5";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 420;
const EXPECTED_REVIEW_COUNT = 492;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const TARGET_IDS = Object.freeze([...OFFICIAL_MARINE_STIMPACK_ACTIVE_NEW_ATOM_IDS]);

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
    || previousSlice.combatEffectDenominatorHash !== EXPECTED_EFFECT_DENOMINATOR_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("STIMPACK_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 414
    || audit.counts.byDisposition.review_required !== 498
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("STIMPACK_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) fail("STIMPACK_SOURCE_CLAUSE_MISSING", atom.atomId);
  return ids;
}

function roleForAtom(atomId) {
  if (atomId.includes("precision") || atomId.includes("standard-damage-trigger")) {
    return {
      actionType: OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
      executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
      transitionSchema: OFFICIAL_STIMPACK_RANGED_TRANSITION_SCHEMA,
      window: "after_hit_roll_before_armour_pool_or_later_standard_damage",
      priority: 77,
      precondition: "stimpack.exact_status_attack_plan_hit_reveal_and_selection_or_standard_damage",
      inputSchema: "starcraft_tmg_official_stimpack_precision_pending_v1",
      failureCode: "STIMPACK_RANGED_ACTION_STALE",
      dependencies: OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS,
    };
  }
  if (atomId.includes("duration") || atomId.includes("default-end-round-expiry")) {
    return {
      actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
      executorId: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLEANUP_REFRESH_V4_TRANSITION_SCHEMA,
      window: "end_of_round_then_cleanup_and_refresh",
      priority: 96,
      precondition: "stimpack.exact_status_marker_and_cleanup_progress",
      inputSchema: "starcraft_tmg_official_stimpack_cleanup_resolution_v4",
      failureCode: "STIMPACK_CLEANUP_STALE",
      dependencies: OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
    };
  }
  return {
    actionType: OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
    executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
    transitionSchema: OFFICIAL_MARINE_STIMPACK_ACTIVE_TRANSITION_SCHEMA,
    window: "movement_active_ability_before_or_after_hold",
    priority: 62,
    precondition: "stimpack.current_marine_ready_cp_and_exact_unhandled_reaction_free_scope",
    inputSchema: "starcraft_tmg_official_marine_stimpack_plan_v1",
    failureCode: "STIMPACK_ACTION_STALE",
    dependencies: OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
  };
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "stimpack:");
  return {
    positiveFixtureIds: [
      `${slug}:active-pays-one-cp-and-adds-two-non-lethal-damage-without-casualty`,
      `${slug}:precision-post-hit-legal-space-converts-declared-failed-dice`,
    ],
    negativeFixtureIds: [
      `${slug}:reserve-repeat-stale-payment-status-and-marker-drift-reject`,
      `${slug}:speed-and-close-combat-consumers-remain-fail-closed`,
    ],
    interactionFixtureIds: [
      `${slug}:converted-hits-participate-in-surge-before-armour`,
      `${slug}:later-positive-standard-damage-combines-non-lethal-marker`,
    ],
    lifecycleFixtureIds: [
      `${slug}:buff-and-precision-persist-through-eor-then-cleanup-removes-state`,
      `${slug}:cleanup-retains-two-point-non-lethal-damage-marker`,
    ],
    replayFixtureIds: [
      `${slug}:both-seats-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-marine-parts-8-10-11-and-core-terran-pdfs`,
    ],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const role = roleForAtom(atom.atomId);
  const lifecycle = atom.atomId.includes("duration")
    || atom.atomId.includes("default-end-round-expiry");
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: lifecycle ? "cleanup" : "movement_or_assault", window: role.window, priority: role.priority },
    preconditions: [{
      predicateId: role.precondition,
      inputSchema: role.inputSchema,
      failureCode: role.failureCode,
    }],
    legalSpace: { kind: "finite", actionType: role.actionType, parameterSchema: null },
    effect: { executorId: role.executorId, transitionSchema: role.transitionSchema },
    chance: atom.atomId.includes("precision")
      ? { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" }
      : { kind: "none" },
    rejectionCodes: [
      role.failureCode,
      "STIMPACK_LATEST_OFFICIAL_DATA_REQUIRED",
      "STIMPACK_UNHANDLED_REACTION_CARRIER_SCOPE",
      "STIMPACK_PRECISION_PENDING_STATE_DRIFT",
      "STIMPACK_LIFECYCLE_UNKNOWN_STATUS",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: role.dependencies.filter((atomId) => !TARGET_IDS.includes(atomId)),
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialMarineStimpackRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(TARGET_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...TARGET_IDS].sort())) {
    fail("STIMPACK_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push(
    {
      executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
      executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE],
      transitionSchema: OFFICIAL_MARINE_STIMPACK_ACTIVE_TRANSITION_SCHEMA,
    },
    {
      executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
      executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
      actionTypes: [
        OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
        OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
      ].sort(),
      transitionSchema: OFFICIAL_STIMPACK_RANGED_TRANSITION_SCHEMA,
    },
    {
      executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE],
      transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_V4_TRANSITION_SCHEMA,
    },
    {
      executorId: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE],
      transitionSchema: OFFICIAL_CLEANUP_REFRESH_V4_TRANSITION_SCHEMA,
    },
  );
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.41.0-official-marine-stimpack",
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
    fail("STIMPACK_CATALOGUE_INVALID");
  }
  const kernel = createOfficialMarineStimpackKernelV1();
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
    effectKernel: clone(input.previousSlice.effectKernel),
    healResolutionKernel: clone(input.previousSlice.healResolutionKernel),
    totalDamageReactionKernel: clone(input.previousSlice.totalDamageReactionKernel),
    medpackProgress: clone(input.previousSlice.medpackProgress),
    academyOpticalFlareProgress: clone(input.previousSlice.academyOpticalFlareProgress),
    restorationRangeProgress: clone(input.previousSlice.restorationRangeProgress),
    lifeSupportProgress: clone(input.previousSlice.lifeSupportProgress),
    marineStimpackKernel: clone(kernel.descriptor),
    newlyExecutableRuleAtomIds: [...TARGET_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
      OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
      OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
      OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    ].sort(),
    executableScope:
      "current_single_model_marine_stimpack_before_or_after_hold_non_lethal_two_typed_speed_buff_and_c14_precision_post_hit_choice_later_standard_damage_and_cleanup_lifecycle",
    stimpackProgress: {
      sourceUnit: "Marine",
      exactCostCp: 1,
      activeAbilityWindows: ["before_action", "after_action"],
      underlyingAction: "hold",
      nonLethalDamage: 2,
      nonLethalMayMeetOrExceedHitPointsWithoutCasualty: true,
      speedBuffStored: 3,
      speedValueConsumerExecutable: false,
      c14Precision: 3,
      precisionChoiceTiming: "after_hit_roll_before_armour_pool",
      precisionLegalSpace:
        "all_subsets_of_failed_hit_dice_up_to_three_including_empty",
      convertedHitsParticipateInSurge: true,
      closeCombatPrecisionConsumerExecutable: false,
      laterPositiveStandardDamageCombinesPriorMarker: true,
      effectStateRemovedAtCleanup: true,
      damageMarkerRetainedAtCleanup: true,
      nestedAcademyReactionExecutable: false,
      unhandledReactionCarrierPolicy: "fail_closed",
    },
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      officialDatasetHash: CURRENT_DATASET_HASH,
      gameplayDataBundleHash:
        "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b",
      liveVersionsDocumentCanonicalHash:
        "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
      liveMarineDocumentCanonicalHash:
        "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
      livePart8DocumentCanonicalHash:
        "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
      livePart10DocumentCanonicalHash:
        "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
      livePart11DocumentCanonicalHash:
        "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 39,
      remainingActionableAtomsBeforeThisSlice: 498,
      completedAfterThisSlice: 40,
      averageAtomsPerSliceAfterThisSlice: 10.5,
      remainingActionableAtomsAfterThisSlice: 492,
      forecastRemainingSlicesAfterThisSlice: 47,
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
      actionSchemaVersion: "hybrid_legal_space_v10",
      previousActionSchemaVersion: "hybrid_legal_space_v9",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "stimpack_active_non_lethal_and_typed_status",
        "precision_post_hit_complete_finite_choice_legal_space",
        "precision_converted_hits_participate_in_surge",
        "later_standard_damage_combines_non_lethal_marker",
        "stimpack_eor_cleanup_and_damage_marker_retention",
        "authority_both_seats_replay_and_tamper_reject",
      ],
      crossTimeReplayResult:
        "slice39_life_support_and_slice40_stimpack_multistep_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "speed-movement-consumer-remains-review-required",
        "close-combat-precision-consumer-remains-review-required",
        "remaining-492-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 492,
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
      ],
      uiTraceEvidence: [
        "stimpack-shows-cp-non-lethal-marker-buff-and-precision-state",
        "post-hit-precision-shows-every-distinct-failed-die-subset-up-to-three",
        "cleanup-removes-effect-state-but-retains-damage-marker",
      ],
      agentDecisionEvidence: [
        "rules-own-hit-reveal-and-agent-chooses-only-from-post-hit-precision-legal-space",
        "harness-never-auto-maximizes-the-optional-precision-choice",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-marine-or-parts-8-10-11-drift-demotes-slice-40",
        "precision-choice-completeness-lifecycle-authority-or-replay-failure-demotes-slice-40",
      ],
      userVisibleChecks: [
        "stimpack-marine-survives-two-non-lethal-damage-at-two-hp",
        "player-sees-zero-through-up-to-three-failed-die-conversion-choices",
        "converted-hit-can-be-bypassed-by-surge-before-armour",
        "later-positive-standard-damage-removes-the-stimpacked-marine",
        "cleanup-removes-stimpack-and-refreshes-card-without-healing-damage",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "speed-and-close-combat-consumers-pending",
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
  if (changedNonTargetAtoms !== 0) fail("STIMPACK_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialMarineStimpackRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("STIMPACK_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineStimpackRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("STIMPACK_SLICE_CONTENT_MISMATCH");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(TARGET_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_marine_stimpack_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
    marineStimpackKernelHash: input.slice.marineStimpackKernel.kernelHash,
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
    rulesTruth: "official_current_marine_stimpack_composition_exact_subset",
    trainingTruth: false,
  });
}
