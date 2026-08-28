import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCombatEffectDenominatorV3,
  verifyOfficialCombatEffectDenominatorV3,
} from "./official-combat-effect-denominator-v3.mjs";
import {
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_DEPENDENCY_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_TRANSITION_SCHEMA,
} from "./official-sidearm-pinpoint-ranged-batch-executor-v1.mjs";
import {
  createOfficialSidearmPinpointEffectKernelV1,
  OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS,
  OFFICIAL_SIDEARM_PROFILE_KEYS,
} from "./official-sidearm-pinpoint-effect-kernel-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_sidearm_pinpoint_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_specialist_ranged_batch_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "20b4f2b66597a347e6b7213d8c4fc1c6a3ad59ad136b3c36713925e79ceb4121";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "1889bb7d9f2c5f0b7013a056db8fc50f9ef4c2150a4df5204e3b38e54a1c182c";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "888b4340397e9b504444b0d8094c75b13bb04f50f3766ce325911a5bd893735d";
const EXPECTED_EXECUTABLE_COUNT = 343;
const EXPECTED_REVIEW_COUNT = 569;
const EXPECTED_DISPLAY_COUNT = 114;
const REJECTION_CODES = Object.freeze([
  "SIDEARM_PINPOINT_ACTION_INVALID",
  "SIDEARM_PINPOINT_ACTION_MISMATCH",
  "SIDEARM_PINPOINT_ACTION_STALE",
  "SIDEARM_PINPOINT_ATTACKER_MODEL_INVALID",
  "SIDEARM_PINPOINT_ATTACKER_MUST_BE_UNENGAGED",
  "SIDEARM_PINPOINT_ATTACKER_SCOPE_UNSUPPORTED",
  "SIDEARM_PINPOINT_COMBAT_PROFILE_DRIFT",
  "SIDEARM_PINPOINT_DESTROYED_TARGET_INVALID",
  "SIDEARM_PINPOINT_EFFECT_BINDING_INVALID",
  "SIDEARM_PINPOINT_EFFECT_PARAMETERS_INVALID",
  "SIDEARM_PINPOINT_ENGAGEMENT_FIXTURE_INVALID",
  "SIDEARM_PINPOINT_EXACT_UNITS_REQUIRED",
  "SIDEARM_PINPOINT_GOLIATH_TARGET_MODEL_INVALID",
  "SIDEARM_PINPOINT_GOLIATH_TARGET_SCOPE_UNSUPPORTED",
  "SIDEARM_PINPOINT_LATEST_OFFICIAL_DATA_REQUIRED",
  "SIDEARM_PINPOINT_LOADOUT_INVALID",
  "SIDEARM_PINPOINT_MARINE_MODEL_INVALID",
  "SIDEARM_PINPOINT_MARINE_SCOPE_UNSUPPORTED",
  "SIDEARM_PINPOINT_MODEL_GEOMETRY_INVALID",
  "SIDEARM_PINPOINT_OFFICIAL_PROFILE_DRIFT",
  "SIDEARM_PINPOINT_ONE_WEAPON_LIMIT_NOT_OVERRIDDEN",
  "SIDEARM_PINPOINT_PENDING_SEQUENCE_INVALID",
  "SIDEARM_PINPOINT_PROFILE_DENOMINATOR_INVALID",
  "SIDEARM_PINPOINT_PROFILE_INVALID",
  "SIDEARM_PINPOINT_PROFILE_SHAPE_INVALID",
  "SIDEARM_PINPOINT_RUNTIME_BINDING_REQUIRED",
  "SIDEARM_PINPOINT_SELECTION_INVALID",
  "SIDEARM_PINPOINT_SELECTION_REQUIRED",
  "SIDEARM_PINPOINT_SIDE_REQUIRED",
  "SIDEARM_PINPOINT_STATE_SCOPE_UNSUPPORTED",
  "SIDEARM_PINPOINT_TARGET_DAMAGE_INVALID",
  "SIDEARM_PINPOINT_TARGET_OUT_OF_RANGE",
  "SIDEARM_PINPOINT_TARGET_OVERRIDE_INVALID",
  "SIDEARM_PINPOINT_TARGET_TAG_MISMATCH",
  "SIDEARM_PINPOINT_WEAPON_LOADOUT_INVALID",
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
    fail("SIDEARM_PINPOINT_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 337
    || audit.counts.byDisposition.review_required !== 575
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("SIDEARM_PINPOINT_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("SIDEARM_PINPOINT_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "sidearm-pinpoint:");
  return {
    positiveFixtureIds: [
      `${slug}:goliath-may-select-primary-plus-both-equipped-sidearms`,
      `${slug}:underbelly-pinpoint-targets-engaged-marine`,
    ],
    negativeFixtureIds: [
      `${slug}:ordinary-weapon-engaged-target-and-forged-selection-reject`,
    ],
    interactionFixtureIds: [
      `${slug}:autocannon-underbelly-haywire-resolve-against-independent-targets`,
    ],
    lifecycleFixtureIds: [
      `${slug}:one-two-or-three-selected-batches-complete-at-declared-boundary`,
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
    timing: { phase: "assault", window: "sidearm_ranged_attack_batch", priority: 63 },
    preconditions: [{
      predicateId: "sidearm.selected_profile_subset_obeys_one_ordinary_weapon_limit",
      inputSchema: "starcraft_tmg_official_sidearm_profile_selection_authorization_v1",
      failureCode: "SIDEARM_PINPOINT_ONE_WEAPON_LIMIT_NOT_OVERRIDDEN",
    }, {
      predicateId: "sidearm.pending_sequence_is_hash_bound_and_exclusive",
      inputSchema: "starcraft_tmg_official_sidearm_ranged_sequence_pending_v1",
      failureCode: "SIDEARM_PINPOINT_PENDING_SEQUENCE_INVALID",
    }, {
      predicateId: "pinpoint.override_is_bound_to_the_weapon_and_engaged_target",
      inputSchema: "starcraft_tmg_official_pinpoint_target_authorization_v1",
      failureCode: "SIDEARM_PINPOINT_TARGET_OVERRIDE_INVALID",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
      transitionSchema: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_fixed_roll_sequence_chance_ticket_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialSidearmPinpointRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("SIDEARM_PINPOINT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE],
    transitionSchema: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.34.0-official-sidearm-pinpoint",
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
    fail("SIDEARM_PINPOINT_CATALOGUE_INVALID");
  }
  const kernel = createOfficialSidearmPinpointEffectKernelV1();
  const effectDenominator = createOfficialCombatEffectDenominatorV3({
    previousSlice: input.previousSlice,
    sidearmPinpointKernelDescriptor: kernel.descriptor,
  });
  verifyOfficialCombatEffectDenominatorV3(effectDenominator);
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
    knownUnimplementedEffectAtomIds: [
      ...effectDenominator.knownUnimplementedEffectAtomIds,
    ],
    knownUnimplementedEffectAtoms: 2,
    unknownEffectPolicy: "quarantine_and_fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    sidearmExecutable: true,
    pinpointExecutable: true,
    indirectFireExecutable: false,
    lockedInExecutable: false,
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
      ...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS,
    ],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID],
    executableScope:
      "one_current_goliath_haywire_replaces_hellfire_optional_autocannon_underbelly_haywire_batches_vs_one_engaged_marine_and_two_unengaged_goliaths_no_terrain",
    sidearmPinpointProgress: {
      selectedCurrentUnit: "Goliath",
      selectedReplacementProfile: "Haywire Missiles",
      activeProfileKeys: [...OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS],
      sidearmProfileKeys: [...OFFICIAL_SIDEARM_PROFILE_KEYS],
      optionalSingleWeaponExecutable: true,
      oneOrdinaryWeaponPlusSidearmsExecutable: true,
      allEquippedSidearmsExecutable: true,
      separateSidearmBatchesExecutable: true,
      independentSidearmTargetsExecutable: true,
      pinpointEngagedEnemyTargetExecutable: true,
      indirectFireExecutable: false,
      lockedInExecutable: false,
      effectStatus: "executable_exact_goliath_two_sidearm_and_pinpoint_lifecycle_subset",
    },
    effectKernel,
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      officialDatasetHash: CURRENT_DATASET_HASH,
      goliathSourceRecordHash:
        "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
      goliathPayloadHash:
        "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d",
      marineSourceRecordHash:
        "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
      marinePayloadHash:
        "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6",
      liveGoliathDocumentCanonicalHash:
        "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
      liveMarineDocumentCanonicalHash:
        "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
      autocannonProfileHashV1:
        "3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3",
      autocannonProfileHashV2:
        "67012ccc1b3896877521a87d8533435c698fd448e0b0c6685d26fca63e65634e",
      underbellyProfileHashV1:
        "c7574f07ba693d5c032d05f4cebd67cd665c62f390ce8557582bada9690b745e",
      underbellyProfileHashV2:
        "ff152c91ff0190c047072d14888fc912fc057071ac4a4d0d38c710c390cfc3f9",
      haywireProfileHashV1:
        "af5701e1dfac62a58972ede948f7ac9bd7001214ba4ad1caf5a69b4b9b1a94e4",
      haywireProfileHashV2:
        "88fd9cec9593fdad96f676eb400305e4f6e28434368dcc7a9ccca588ded877b2",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      livePart8DocumentCanonicalHash:
        "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
      livePart11DocumentCanonicalHash:
        "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 32,
      remainingActionableAtomsBeforeThisSlice: 575,
      completedAfterThisSlice: 33,
      averageAtomsPerSliceAfterThisSlice: 10.3939,
      remainingActionableAtomsAfterThisSlice: 569,
      forecastRemainingSlicesAfterThisSlice: 55,
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
      actionSchemaVersion: "hybrid_legal_space_v3",
      previousActionSchemaVersion: "hybrid_legal_space_v2",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "sidearm_nonempty_profile_subset_legal_space",
        "multi_sidearm_independent_target_sequence",
        "pinpoint_engaged_enemy_override",
        "single_weapon_immediate_completion",
        "authority_three_receipt_replay",
      ],
      crossTimeReplayResult:
        "slice32_specialist_and_slice33_sidearm_pinpoint_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "indirect-fire-and-locked-in-remain-unimplemented",
        "remaining-569-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 569,
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
        "pendingRangedAttackSequenceHash",
        "pendingRangedAttackPieceId",
        "remainingBatchProfileKeys",
        "selectedBatchProfileKeys",
        "sidearmUseMode",
      ],
      uiTraceEvidence: [
        "initial-profile-subset-declaration-makes-sidearm-use-optional",
        "pending-sequence-exposes-only-declared-unresolved-profiles",
        "pinpoint-target-override-is-visible-on-underbelly-only",
      ],
      agentDecisionEvidence: [
        "rules-own-profile-subset-batch-order-target-and-chance-domain",
        "agent-cannot-add-skip-or-retarget-an-undeclared-profile",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-goliath-profile-or-replacement-drift-demotes-slice-33",
        "profile-subset-pinpoint-or-three-batch-replay-failure-demotes-slice-33",
      ],
      userVisibleChecks: [
        "goliath-may-fire-one-weapon-two-sidearms-or-all-three-profiles",
        "underbelly-may-target-the-engaged-marine-while-other-weapons-may-not",
        "assault-activation-completes-after-the-last-declared-batch-only",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "remaining-combat-effects-and-global-rule-atoms-pending",
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
  if (changedNonTargetAtoms !== 0) fail("SIDEARM_PINPOINT_NON_TARGET_MUTATION");
  return slice;
}

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";

export function verifyOfficialSidearmPinpointRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("SIDEARM_PINPOINT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialSidearmPinpointRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("SIDEARM_PINPOINT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_sidearm_pinpoint_rule_slice_audit_v1",
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
    rulesTruth: "official_sidearm_pinpoint_sequential_ranged_batch_exact_subset",
    trainingTruth: false,
  });
}
