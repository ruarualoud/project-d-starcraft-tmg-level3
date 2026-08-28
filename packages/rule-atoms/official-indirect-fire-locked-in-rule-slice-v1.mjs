import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCombatEffectDenominatorV4,
  verifyOfficialCombatEffectDenominatorV4,
} from "./official-combat-effect-denominator-v4.mjs";
import {
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_DEPENDENCY_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_TRANSITION_SCHEMA,
} from "./official-goliath-scatter-ranged-batch-executor-v1.mjs";
import {
  createOfficialIndirectFireLockedInEffectKernelV1,
  OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS,
} from "./official-indirect-fire-locked-in-effect-kernel-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_indirect_fire_locked_in_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_sidearm_pinpoint_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "6bdaab04298bd7d3345ccc35161f1d2230c778a08ce91fa789d77281813a89dc";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "95b9bb51ca3dc18c03367ff789976fa64f8453be9cfe4db0cfa652876582d023";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "ad6ede455d3da1ad0532361d96810325934025ab3ba2ee31f77f7438dc5bc794";
const EXPECTED_EXECUTABLE_COUNT = 355;
const EXPECTED_REVIEW_COUNT = 557;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const REJECTION_CODES = Object.freeze([
  "BOUNDED_LOS_AMBIGUOUS_COVER_FAIL_CLOSED",
  "BOUNDED_LOS_EXACTLY_ONE_TERRAIN_REQUIRED",
  "BOUNDED_LOS_MODEL_INVALID",
  "BOUNDED_LOS_TERRAIN_INVALID",
  "GOLIATH_SCATTER_ACTION_INVALID",
  "GOLIATH_SCATTER_ACTION_MISMATCH",
  "GOLIATH_SCATTER_ACTION_STALE",
  "GOLIATH_SCATTER_LATEST_OFFICIAL_DATA_REQUIRED",
  "GOLIATH_SCATTER_OFFICIAL_PROFILE_DRIFT",
  "GOLIATH_SCATTER_PENDING_SEQUENCE_INVALID",
  "GOLIATH_SCATTER_STATE_SCOPE_UNSUPPORTED",
  "GOLIATH_SCATTER_WEAPON_LOADOUT_INVALID",
  "INDIRECT_LOCKED_CHANCE_REVEALS_REQUIRED",
  "INDIRECT_LOCKED_EFFECT_BINDING_INVALID",
  "INDIRECT_LOCKED_EFFECT_PARAMETERS_INVALID",
  "INDIRECT_LOCKED_EVADE_VALUE_REQUIRED",
  "INDIRECT_LOCKED_ONE_WEAPON_LIMIT_NOT_OVERRIDDEN",
  "INDIRECT_LOCKED_PROFILE_INVALID",
  "INDIRECT_LOCKED_PROFILE_SHAPE_INVALID",
  "INDIRECT_LOCKED_TARGET_OUT_OF_RANGE",
  "INDIRECT_LOCKED_VISIBLE_TARGET_REQUIRED",
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
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("INDIRECT_LOCKED_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 343
    || audit.counts.byDisposition.review_required !== 569
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("INDIRECT_LOCKED_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("INDIRECT_LOCKED_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "indirect-locked:");
  return {
    positiveFixtureIds: [
      `${slug}:stationary-off-los-target-gets-roa-twelve-and-evade`,
      `${slug}:visible-target-remains-standard-legal-target`,
    ],
    negativeFixtureIds: [
      `${slug}:ordinary-profile-off-los-and-scatter-beyond-twenty-four-reject`,
      `${slug}:partial-cover-or-size-mismatch-fails-closed`,
    ],
    interactionFixtureIds: [
      `${slug}:scatter-sidearm-long-range-surge-locked-and-indirect-compose`,
    ],
    lifecycleFixtureIds: [
      `${slug}:one-two-three-batch-sequence-retains-priority-until-complete`,
    ],
    replayFixtureIds: [
      `${slug}:three-receipt-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-goliath-marine-part8-part11-and-pdf-hashes`,
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
    timing: { phase: "assault", window: "scatter_ranged_attack_batch", priority: 64 },
    preconditions: [{
      predicateId: "scatter.selected_profile_subset_obeys_sidearm_limit",
      inputSchema:
        "starcraft_tmg_official_scatter_profile_selection_authorization_v1",
      failureCode: "INDIRECT_LOCKED_ONE_WEAPON_LIMIT_NOT_OVERRIDDEN",
    }, {
      predicateId: "full_cover.line_of_sight_has_complete_bounded_proof",
      inputSchema:
        "starcraft_tmg_official_bounded_full_cover_los_receipt_v1",
      failureCode: "BOUNDED_LOS_AMBIGUOUS_COVER_FAIL_CLOSED",
    }, {
      predicateId: "indirect_fire_remains_range_bound_and_off_los_evade_visible",
      inputSchema:
        "starcraft_tmg_official_indirect_fire_locked_in_attack_plan_v1",
      failureCode: "INDIRECT_LOCKED_TARGET_OUT_OF_RANGE",
    }, {
      predicateId: "locked_in_reads_stationary_status_without_mutating_printed_roa",
      inputSchema:
        "starcraft_tmg_official_indirect_locked_scatter_authorization_v1",
      failureCode: "INDIRECT_LOCKED_SCATTER_CONTEXT_INVALID",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
      transitionSchema: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_fixed_roll_sequence_chance_ticket_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialIndirectFireLockedInRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("INDIRECT_LOCKED_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE],
    transitionSchema: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.35.0-official-indirect-fire-locked-in",
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
    fail("INDIRECT_LOCKED_CATALOGUE_INVALID");
  }
  const kernel = createOfficialIndirectFireLockedInEffectKernelV1();
  const effectDenominator = createOfficialCombatEffectDenominatorV4({
    previousSlice: input.previousSlice,
    indirectFireLockedInKernelDescriptor: kernel.descriptor,
  });
  verifyOfficialCombatEffectDenominatorV4(effectDenominator);
  const effectKernel = {
    kernelId: kernel.descriptor.kernelId,
    kernelVersion: kernel.descriptor.kernelVersion,
    kernelHash: kernel.descriptor.kernelHash,
    baseKernel: clone(input.previousSlice.effectKernel),
    profileDenominator: input.previousSlice.effectKernel.profileDenominator,
    profileEffectAtoms: 13,
    contextualEffectAtoms: 1,
    registeredEffectAtoms: 14,
    executableEffectAtomIds: [...effectDenominator.executableEffectAtomIds],
    knownUnimplementedEffectAtomIds: [],
    knownUnimplementedEffectAtoms: 0,
    unknownEffectPolicy: "quarantine_and_fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    sidearmExecutable: true,
    pinpointExecutable: true,
    indirectFireExecutable: true,
    lockedInExecutable: true,
  };
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominator: effectDenominator,
    combatEffectDenominatorHash: effectDenominator.denominatorHash,
    combatEffectCorrectionReceiptHash:
      input.previousSlice.combatEffectCorrectionReceiptHash,
    newlyExecutableRuleAtomIds: [
      ...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS,
    ],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID],
    executableScope:
      "one_current_goliath_scatter_loadout_optional_three_profile_batches_vs_two_visible_goliaths_and_two_marines_behind_one_full_cover_rectangle",
    indirectFireLockedInProgress: {
      selectedCurrentUnit: "Goliath",
      selectedReplacementProfile: "Scatter Missiles",
      activeProfileKeys: [...OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS],
      sidearmProfileKeys: kernel.descriptor.sidearmProfileKeys,
      sevenNonemptyProfileSubsetsExecutable: true,
      separateSidearmBatchesExecutable: true,
      independentSidearmTargetsExecutable: true,
      oneFullCoverRectangleLineOfSightExecutable: true,
      indirectFireOffLineOfSightExecutable: true,
      offLineOfSightEvadeExecutable: true,
      lockedInStationaryAdditionalRateOfAttack: 6,
      longRangeTwentyFourExecutable: true,
      registeredCombatEffectClosure: "14_of_14_executable_bounded_subsets",
    },
    effectKernel,
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
      livePart8DocumentCanonicalHash:
        "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
      livePart11DocumentCanonicalHash:
        "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      scatterProfileHashV1:
        "af871c574958994688cc7e7751ac0fce2d0a09123944f06480511dea0d24f544",
      scatterProfileHashV2:
        "4ce889bb487e7c2d56c2bdeb379f4842382c06e22478795e4764254063690859",
      scatterSourceTextHash:
        "72a2365b85e45f500d03ba34d58800b9f01bbbff1b242f1e96b4f973d95b1bf8",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 33,
      remainingActionableAtomsBeforeThisSlice: 569,
      completedAfterThisSlice: 34,
      averageAtomsPerSliceAfterThisSlice: 10.4412,
      remainingActionableAtomsAfterThisSlice: 557,
      forecastRemainingSlicesAfterThisSlice: 54,
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
      actionSchemaVersion: "hybrid_legal_space_v4",
      previousActionSchemaVersion: "hybrid_legal_space_v3",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "scatter_seven_nonempty_profile_subsets",
        "stationary_normal_range_off_los_roa_twelve_and_evade",
        "moved_extended_range_off_los_roa_six_hit_six_and_evade",
        "ordinary_weapon_off_los_and_scatter_beyond_twenty_four_reject",
        "one_two_three_batch_lifecycle_and_tamper_reject",
        "authority_three_receipt_replay",
      ],
      crossTimeReplayResult:
        "slice33_sidearm_and_slice34_indirect_locked_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "remaining-557-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 557,
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
        "lineOfSightStatus",
        "indirectFireUsed",
        "lockedInAdditionalRateOfAttack",
        "effectiveRateOfAttack",
        "rangeBand",
        "evadeEligibilityReason",
        "blockingTerrainId",
        "pendingRangedAttackSequenceHash",
      ],
      uiTraceEvidence: [
        "off-los-scatter-action-shows-full-cover-indirect-and-evade-reason",
        "stationary-target-shows-effective-roa-twelve-with-printed-roa-six-retained",
        "pending-sequence-exposes-only-declared-unresolved-profiles",
      ],
      agentDecisionEvidence: [
        "rules-own-los-range-stationary-batch-target-and-chance-domain",
        "agent-cannot-invent-off-los-ordinary-attack-or-skip-declared-batch",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-scatter-profile-or-part11-rule-drift-demotes-slice-34",
        "los-indirect-locked-batch-or-replay-failure-demotes-slice-34",
      ],
      userVisibleChecks: [
        "scatter-can-target-proven-off-los-marine-within-twenty-four",
        "stationary-marine-raises-effective-roa-from-six-to-twelve",
        "off-los-marine-may-evade-after-armour-before-damage",
        "activation-completes-after-last-declared-profile-batch-only",
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
  if (changedNonTargetAtoms !== 0) fail("INDIRECT_LOCKED_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialIndirectFireLockedInRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("INDIRECT_LOCKED_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialIndirectFireLockedInRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("INDIRECT_LOCKED_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_indirect_fire_locked_in_rule_slice_audit_v1",
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
    rulesTruth: "official_indirect_fire_locked_in_full_cover_exact_subset",
    trainingTruth: false,
  });
}
